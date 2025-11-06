import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Search, UserCog } from "lucide-react";
import { api, authStorage, handleApiError } from "@/lib/api";

type UserItem = {
  id: number;
  fname: string;
  lname: string;
  email: string;
  phone?: string;
  role?: string;
};

const AdminUsers = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadUsers = async () => {
      setLoading(true);
      try {
        const { users: fetched } = await api.getUsers(controller.signal);
        setUsers(
          (fetched ?? []).map((user) => ({
            ...user,
            role: user.role ?? "customer",
          })),
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          handleApiError(error, "Failed to load users");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadUsers();

    return () => controller.abort();
  }, []);

  const updateUserRole = async (userId: number, newRole: string) => {
    setUpdatingId(userId);
    try {
      const { user } = await api.updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: user?.role ?? newRole } : u)),
      );

      const currentUser = authStorage.getUser();
      if (currentUser && Number(currentUser.id) === userId) {
        const nextUser = { ...currentUser, role: user?.role ?? newRole };
        authStorage.setUser(nextUser);
      }

      toast.success("User role updated successfully");
    } catch (error) {
      handleApiError(error, "Failed to update user role");
    } finally {
      setUpdatingId(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500";
      case "staff":
        return "bg-blue-500";
      case "customer":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return users.filter((user) => {
      const fullName = `${user.fname ?? ""} ${user.lname ?? ""}`.toLowerCase();
      return (
        fullName.includes(term) ||
        (user.email ?? "").toLowerCase().includes(term) ||
        (user.role ?? "").toLowerCase().includes(term)
      );
    });
  }, [users, searchTerm]);

  const totals = useMemo(() => {
    const totalUsers = users.length;
    const staff = users.filter((u) => u.role === "staff").length;
    const customers = users.filter((u) => u.role === "customer").length;
    return { totalUsers, staff, customers };
  }, [users]);

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold mb-2">Users & Roles</h1>
        <p className="text-muted-foreground">Manage user accounts and permissions</p>
      </div>

      <Card className="glass-effect">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and modify user roles</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading users…</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UserCog className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current Role</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.fname} {user.lname}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role ?? "customer")}>
                        {user.role ?? "customer"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role ?? "customer"}
                        onValueChange={(newRole) => updateUserRole(user.id, newRole)}
                        disabled={updatingId === user.id}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="text-lg">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{totals.totalUsers}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="text-lg">Staff Members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{totals.staff}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle className="text-lg">Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{totals.customers}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUsers;
