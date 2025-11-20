import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { User, Trash2 } from "lucide-react";
import { api, authStorage, handleApiError } from "@/lib/api";

interface ProfileProps {
  onProfileUpdate?: (user: any) => void;
  onAccountDeleted?: () => void;
}

const Profile = ({ onProfileUpdate, onAccountDeleted }: ProfileProps) => {
  // ใช้เปลี่ยนหน้าเมื่อ token หมดอายุหรือหลังลบแอคเคานต์
  const navigate = useNavigate();
  // เก็บข้อมูลฟอร์มโปรไฟล์
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    email: "",
    phone: "",
  });
  // state คุมสถานะโหลด/บันทึก/ลบ
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // ดึงข้อมูลโปรไฟล์ตอนเข้าเพจ
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const { user } = await api.me();
        setFormData({
          fname: user.fname ?? "",
          lname: user.lname ?? "",
          email: user.email ?? "",
          phone: user.phone ?? "",
        });
      } catch (error) {
        handleApiError(error, "Failed to load profile");
        authStorage.clearAll();
        navigate("/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  // กดเซฟข้อมูลโปรไฟล์
  const handleUpdate = async () => {
    setSaving(true);
    try {
      const { user } = await api.updateProfile({
        fname: formData.fname,
        lname: formData.lname,
        email: formData.email,
        phone: formData.phone,
      });
      authStorage.setUser(user);
      onProfileUpdate?.(user);
      toast.success("Profile updated successfully!");
    } catch (error) {
      handleApiError(error, "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // กดยืนยันลบบัญชี
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteProfile();
      authStorage.clearAll();
      toast.success("Account deleted successfully");
      onAccountDeleted?.();
      navigate("/login", { replace: true });
    } catch (error) {
      handleApiError(error, "Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 animate-slide-up max-w-2xl mx-auto">
        <Card className="glass-effect border-2">
          <CardHeader>
            <CardTitle>Loading profile…</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">Please wait while we load your details.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Manage your account settings</p>
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
              onChange={(e) => setFormData((prev) => ({ ...prev, fname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lname">Last Name</Label>
            <Input
              id="lname"
              value={formData.lname}
              onChange={(e) => setFormData((prev) => ({ ...prev, lname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <Button onClick={handleUpdate} className="w-full" disabled={saving}>
            {saving ? "Updating…" : "Update Profile"}
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
              <Button variant="destructive" className="w-full" disabled={deleting}>
                Delete Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete your account and remove all of your
                  data.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Yes, Delete My Account"}
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
