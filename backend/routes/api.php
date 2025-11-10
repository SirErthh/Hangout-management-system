<?php

declare(strict_types=1);

use App\Controllers\AuthController;
use App\Controllers\EventController;
use App\Controllers\MenuController;
use App\Controllers\ReservationController;
use App\Controllers\TicketController;
use App\Controllers\FnbController;
use App\Controllers\DayClosureController;
use App\Controllers\ProfileController;
use App\Controllers\UserController;
use App\Controllers\UploadController;
use App\Support\Router;

$router = new Router();

$auth = new AuthController();
$events = new EventController();
$menu = new MenuController();
$reservations = new ReservationController();
$tickets = new TicketController();
$fnb = new FnbController();
$dayClosure = new DayClosureController();
$profile = new ProfileController();
$users = new UserController();
$uploads = new UploadController();

$router->post('/api/auth/register', [$auth, 'register']);
$router->post('/api/auth/login', [$auth, 'login']);
$router->get('/api/auth/me', [$auth, 'me'], ['auth']);

$router->put('/api/profile', [$profile, 'update'], ['auth']);
$router->delete('/api/profile', [$profile, 'destroy'], ['auth']);

$router->get('/api/events', [$events, 'index']);
$router->get('/api/events/{id}', [$events, 'show']);
$router->post('/api/events', [$events, 'store'], ['auth']);
$router->put('/api/events/{id}', [$events, 'update'], ['auth']);
$router->delete('/api/events/{id}', [$events, 'destroy'], ['auth']);
$router->post('/api/events/{id}/orders', [$events, 'orderTickets'], ['auth']);

$router->get('/api/ticket-orders', [$tickets, 'index'], ['auth']);
$router->patch('/api/ticket-orders/{id}/status', [$tickets, 'updateStatus'], ['auth']);
$router->post('/api/ticket-orders/{id}/confirm', [$tickets, 'confirmTicket'], ['auth']);
$router->post('/api/ticket-orders/{id}/confirm-all', [$tickets, 'confirmAll'], ['auth']);

$router->get('/api/menu-items', [$menu, 'index']);
$router->post('/api/menu-items', [$menu, 'store'], ['auth']);
$router->put('/api/menu-items/{id}', [$menu, 'update'], ['auth']);
$router->delete('/api/menu-items/{id}', [$menu, 'destroy'], ['auth']);
$router->post('/api/menu-orders', [$menu, 'order'], ['auth']);

$router->get('/api/fnb-orders', [$fnb, 'index'], ['auth']);
$router->patch('/api/fnb-orders/{id}/status', [$fnb, 'updateStatus'], ['auth']);

$router->get('/api/reservations', [$reservations, 'index'], ['auth']);
$router->post('/api/reservations', [$reservations, 'store'], ['auth']);
$router->patch('/api/reservations/{id}/status', [$reservations, 'updateStatus'], ['auth']);
$router->post('/api/reservations/{id}/assign-table', [$reservations, 'assignTable'], ['auth']);
$router->get('/api/tables', [$reservations, 'tables'], ['auth']);

$router->get('/api/day-closure', [$dayClosure, 'show'], ['auth']);
$router->post('/api/day-closure', [$dayClosure, 'store'], ['auth']);

$router->get('/api/users', [$users, 'index'], ['auth']);
$router->patch('/api/users/{id}/role', [$users, 'updateRole'], ['auth']);
$router->post('/api/uploads', [$uploads, 'store'], ['auth']);

return $router;
