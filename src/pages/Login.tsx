import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { api, handleApiError } from "@/lib/api";

interface LoginProps {
  onLogin: (payload: { token: string; user: any }) => void;
  isBootstrapping?: boolean;
}

const Login = ({ onLogin, isBootstrapping = false }: LoginProps) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Invalid credentials", { description: "Email and password are required" });
      return;
    }

    setSubmitting(true);
    try {
      const auth = await api.login({ email, password });
      onLogin(auth);
      toast.success("Login successful!", { description: `Welcome back, ${auth.user.fname}!` });

      const role = auth.user.role;
      if (role === "admin") navigate("/admin");
      else if (role === "staff") navigate("/staff");
      else navigate("/customer");
    } catch (error) {
      handleApiError(error, "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-subtle">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-2">
            <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">Welcome Back</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button 
            className="w-full bg-gradient-primary hover:opacity-90" 
            onClick={handleLogin}
            disabled={submitting || isBootstrapping}
          >
            {submitting ? "Signing in..." : "Login"}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Don't have an account?{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={() => navigate('/register')}
            >
              Register here
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
