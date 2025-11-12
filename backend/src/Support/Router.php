<?php

declare(strict_types=1);

namespace App\Support;

use App\Middleware\AuthMiddleware;
use App\Support\Request;
use App\Support\Response;
use RuntimeException;

final class Router
{
    /**
     * @var array<int, array{methods: array<int, string>, pattern: string, callback: callable, middleware: array<int, string>}>
     */
    private array $routes = [];

    public function add(string $method, string $path, callable $callback, array $middleware = []): void
    {
        $pattern = preg_replace('#\{([\w_]+)\}#', '(?P<$1>[^/]+)', $path);
        $pattern = '#^' . $pattern . '$#';

        $this->routes[] = [
            'methods' => [strtoupper($method)],
            'pattern' => $pattern,
            'callback' => $callback,
            'middleware' => $middleware,
        ];
    }

    public function get(string $path, callable $callback, array $middleware = []): void
    {
        $this->add('GET', $path, $callback, $middleware);
    }

    public function post(string $path, callable $callback, array $middleware = []): void
    {
        $this->add('POST', $path, $callback, $middleware);
    }

    public function put(string $path, callable $callback, array $middleware = []): void
    {
        $this->add('PUT', $path, $callback, $middleware);
    }

    public function patch(string $path, callable $callback, array $middleware = []): void
    {
        $this->add('PATCH', $path, $callback, $middleware);
    }

    public function delete(string $path, callable $callback, array $middleware = []): void
    {
        $this->add('DELETE', $path, $callback, $middleware);
    }

    public function dispatch(string $method, string $uri): void
    {
        $method = strtoupper($method);
        $path = rtrim($uri, '/') ?: '/';

        foreach ($this->routes as $route) {
            if (!in_array($method, $route['methods'], true)) {
                continue;
            }

            if (preg_match($route['pattern'], $path, $matches)) {
                $params = [];
                foreach ($matches as $key => $value) {
                    if (is_string($key)) {
                        $params[$key] = $value;
                    }
                }

                $request = Request::capture($params);
                $response = new Response();

                $handler = $route['callback'];
                $middlewareStack = $this->makeMiddlewareStack($route['middleware'], $handler);

                try {
                    $payload = $middlewareStack($request, $response);
                    if ($payload !== null) {
                        $response->json($payload);
                    }
                } catch (\Throwable $e) {
                    $status = $e->getCode() >= 400 ? (int)$e->getCode() : 500;
                    error_log(sprintf(
                        '[router] %s %s failed: %s in %s:%d',
                        $method,
                        $uri,
                        $e->getMessage(),
                        $e->getFile(),
                        $e->getLine(),
                    ));
                    $response->json([
                        'message' => $status === 500 ? 'Internal server error' : $e->getMessage(),
                    ], $status);
                }
                return;
            }
        }

        (new Response())->json(['message' => 'Not found'], 404);
    }

    private function makeMiddlewareStack(array $middleware, callable $handler): callable
    {
        $stack = array_reverse($middleware);
        $next = function (Request $request, Response $response) use ($handler) {
            return $this->invokeHandler($handler, $request, $response);
        };

        foreach ($stack as $middlewareName) {
            $next = match ($middlewareName) {
                'auth' => function (Request $request, Response $response) use ($next) {
                    $user = AuthMiddleware::handle($request);
                    $request->setUser($user);
                    return $next($request, $response);
                },
                default => $next,
            };
        }

        return $next;
    }

    private function invokeHandler(callable $handler, Request $request, Response $response): mixed
    {
        if (is_array($handler)) {
            $reflection = new \ReflectionMethod($handler[0], $handler[1]);
        } elseif ($handler instanceof \Closure) {
            $reflection = new \ReflectionFunction($handler);
        } elseif (is_string($handler) && function_exists($handler)) {
            $reflection = new \ReflectionFunction($handler);
        } elseif (is_object($handler) && method_exists($handler, '__invoke')) {
            $reflection = new \ReflectionMethod($handler, '__invoke');
        } else {
            throw new \RuntimeException('Unable to resolve route handler');
        }

        $arity = $reflection->getNumberOfParameters();
        $args = [];
        if ($arity >= 1) {
            $args[] = $request;
        }
        if ($arity >= 2) {
            $args[] = $response;
        }

        return call_user_func_array($handler, $args);
    }
}
