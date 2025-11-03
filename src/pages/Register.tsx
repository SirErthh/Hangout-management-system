import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    email: "",
    password: "",
  });

  const handleRegister = () => {
    if (!formData.fname || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const newUser = {
      id: Date.now(),
      ...formData,
      pass: formData.password,
      role: 'customer'
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));

    toast.success("Account created successfully!", {
      description: "You can now login with your credentials"
    });
    
    setTimeout(() => navigate('/login'), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-subtle">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-2">
            <UserPlus className="h-6 w-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Create Account</CardTitle>
          <CardDescription>Join us and start your hangout experience</CardDescription>
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
          >
            Create Account
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
