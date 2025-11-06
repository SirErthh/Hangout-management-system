import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { api, handleApiError } from "@/lib/api";

interface RegisterProps {
  onRegister?: (payload: { token: string; user: any }) => void;
}

const Register = ({ onRegister }: RegisterProps) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    email: "",
    phone: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async () => {
    const trimmed = {
      fname: formData.fname.trim(),
      lname: formData.lname.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      password: formData.password,
    };

    if (!trimmed.fname || !trimmed.email || !trimmed.password || !trimmed.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const payload = await api.register({
        fname: trimmed.fname,
        lname: trimmed.lname,
        email: trimmed.email,
        phone: trimmed.phone,
        password: trimmed.password,
      });

      toast.success("Account created successfully!", {
        description: "You are now signed in",
      });

      if (onRegister) {
        onRegister(payload);
      }

      navigate("/customer", { replace: true });
    } catch (error) {
      handleApiError(error, "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-subtle">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-2">
            <UserPlus className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">Create Account</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Join us and start your hangout experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fname">First Name *</Label>
              <Input
                id="fname"
                value={formData.fname}
                onChange={(e) => setFormData({ ...formData, fname: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lname">Last Name</Label>
              <Input
                id="lname"
                value={formData.lname}
                onChange={(e) => setFormData({ ...formData, lname: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Contact number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <div className="bg-muted p-3 rounded-lg text-sm text-muted-foreground">
            Default role after registration: <span className="font-semibold text-foreground">Customer</span>
          </div>
          <Button 
            className="w-full bg-gradient-primary hover:opacity-90" 
            onClick={handleRegister}
            disabled={submitting}
          >
            {submitting ? "Creating account..." : "Create Account"}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={() => navigate('/login')}
            >
              Login here
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
