import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { User, Trash2 } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    email: ""
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      const user = JSON.parse(stored);
      setCurrentUser(user);
      setFormData({
        fname: user.fname || "",
        lname: user.lname || "",
        email: user.email || ""
      });
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleUpdate = () => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const updatedUsers = users.map((u: any) => 
      u.id === currentUser.id 
        ? { ...u, fname: formData.fname, lname: formData.lname, email: formData.email }
        : u
    );
    
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    
    const updatedUser = { ...currentUser, fname: formData.fname, lname: formData.lname, email: formData.email };
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    setCurrentUser(updatedUser);
    
    toast.success("Profile updated successfully!");
  };

  const handleDelete = () => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const filteredUsers = users.filter((u: any) => u.id !== currentUser.id);
    
    localStorage.setItem('users', JSON.stringify(filteredUsers));
    localStorage.removeItem('currentUser');
    
    toast.success("Account deleted successfully");
    navigate('/login');
  };

  if (!currentUser) return null;

  return (
    <div className="p-6 space-y-6 animate-slide-up max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <Card className="glass-effect border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fname">First Name</Label>
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
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <Button onClick={handleUpdate} className="w-full">
            Update Profile
          </Button>
        </CardContent>
      </Card>

      <Card className="glass-effect border-2 border-red-500/20">
        <CardHeader>
          <CardTitle className="text-red-500 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Permanently delete your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                Delete Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove all your data.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Yes, Delete My Account
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
