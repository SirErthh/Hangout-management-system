import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, DollarSign, TrendingUp } from "lucide-react";

const AdminDashboard = () => {
  const stats = [
    {
      title: "Total Users",
      value: "1,234",
      change: "+12%",
      icon: Users,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      title: "Active Events",
      value: "8",
      change: "+2",
      icon: Calendar,
      gradient: "from-purple-500 to-pink-500"
    },
    {
      title: "Today's Revenue",
      value: "฿45,890",
      change: "+18%",
      icon: DollarSign,
      gradient: "from-green-500 to-emerald-500"
    },
    {
      title: "Growth Rate",
      value: "24.5%",
      change: "+5.2%",
      icon: TrendingUp,
      gradient: "from-orange-500 to-red-500"
    }
  ];

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your venue operations</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="glass-effect border-2 hover:shadow-xl transition-smooth">
              <CardHeader className="pb-2">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-2`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <CardDescription>{stat.title}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-3xl font-bold">{stat.value}</h3>
                  <span className="text-sm font-medium text-green-500">{stat.change}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">New reservation created</p>
                    <p className="text-xs text-muted-foreground">{i} minutes ago</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button className="w-full p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-smooth text-left">
              <p className="font-medium">Create New Event</p>
              <p className="text-sm text-muted-foreground">Add upcoming show or party</p>
            </button>
            <button className="w-full p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-smooth text-left">
              <p className="font-medium">Manage Users</p>
              <p className="text-sm text-muted-foreground">View and edit user roles</p>
            </button>
            <button className="w-full p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-smooth text-left">
              <p className="font-medium">Day Closure</p>
              <p className="text-sm text-muted-foreground">End of day reconciliation</p>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
