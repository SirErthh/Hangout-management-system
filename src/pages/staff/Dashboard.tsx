import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket, BookOpen, UtensilsCrossed, Clock } from "lucide-react";

const StaffDashboard = () => {
  const pendingTasks = [
    { id: 1, type: "ticket", description: "Process ticket order #1234", priority: "high" },
    { id: 2, type: "reservation", description: "Confirm table reservation for 6pm", priority: "medium" },
    { id: 3, type: "fnb", description: "Kitchen order #5678 - Table 12", priority: "high" },
    { id: 4, type: "reservation", description: "Follow up with customer for 8pm booking", priority: "low" }
  ];

  const stats = [
    {
      title: "Pending Tickets",
      value: "12",
      icon: Ticket,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      title: "Today's Reservations",
      value: "24",
      icon: BookOpen,
      gradient: "from-purple-500 to-pink-500"
    },
    {
      title: "Kitchen Orders",
      value: "8",
      icon: UtensilsCrossed,
      gradient: "from-orange-500 to-red-500"
    },
    {
      title: "Avg. Wait Time",
      value: "15m",
      icon: Clock,
      gradient: "from-green-500 to-emerald-500"
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold mb-2">Staff Dashboard</h1>
        <p className="text-muted-foreground">Your tasks and operations overview</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="glass-effect border-2">
              <CardHeader className="pb-2">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center mb-2`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <CardDescription>{stat.title}</CardDescription>
              </CardHeader>
              <CardContent>
                <h3 className="text-3xl font-bold">{stat.value}</h3>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="glass-effect border-2">
        <CardHeader>
          <CardTitle>Pending Tasks</CardTitle>
          <CardDescription>Items requiring your attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingTasks.map(task => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-smooth cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <div>
                    <p className="font-medium">{task.description}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      Type: {task.type}
                    </p>
                  </div>
                </div>
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button className="w-full p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-smooth text-left">
              <p className="font-medium">Process Ticket Orders</p>
              <p className="text-sm text-muted-foreground">View and confirm ticket purchases</p>
            </button>
            <button className="w-full p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-smooth text-left">
              <p className="font-medium">Manage Reservations</p>
              <p className="text-sm text-muted-foreground">Confirm or modify table bookings</p>
            </button>
            <button className="w-full p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-smooth text-left">
              <p className="font-medium">Kitchen Orders</p>
              <p className="text-sm text-muted-foreground">View F&B orders and status</p>
            </button>
          </CardContent>
        </Card>

        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { time: "18:00", event: "Evening service starts" },
                { time: "19:30", event: "Live music performance" },
                { time: "21:00", event: "Kitchen last orders" },
                { time: "23:00", event: "Venue closes" }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-16 text-sm font-medium text-muted-foreground">
                    {item.time}
                  </div>
                  <div className="flex-1 p-3 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium">{item.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboard;
