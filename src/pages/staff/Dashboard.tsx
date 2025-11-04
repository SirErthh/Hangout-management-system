import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket, BookOpen, UtensilsCrossed, Clock, Zap, ChevronRight } from "lucide-react";

const StaffDashboard = () => {
  const navigate = useNavigate();

  const routeByType: Record<string, string> = {
    ticket: "/staff/tickets",
    reservation: "/staff/reservations",
    fnb: "/staff/fnb",
  };

  const goto = useCallback((path: string) => {
    if (!path) return;
    navigate(path);
  }, [navigate]);

  const gotoByType = useCallback((type: string) => {
    const path = routeByType[type] || "/";
    goto(path);
  }, [goto]);

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
      gradient: "from-blue-500 to-cyan-500",
      go: () => goto("/staff/tickets")
    },
    {
      title: "Today's Reservations",
      value: "24",
      icon: BookOpen,
      gradient: "from-purple-500 to-pink-500",
      go: () => goto("/staff/reservations")
    },
    {
      title: "Kitchen Orders",
      value: "8",
      icon: UtensilsCrossed,
      gradient: "from-orange-500 to-red-500",
      go: () => goto("/staff/fnb")
    },
    {
      title: "Avg. Wait Time",
      value: "15m",
      icon: Clock,
      gradient: "from-green-500 to-emerald-500",
      go: () => goto("/staff/fnb")
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  // Reusable QuickAction row component (clean, left-aligned, better typography)
  const QuickAction = ({
    title,
    subtitle,
    onClick,
  }: {
    title: string;
    subtitle: string;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="
        w-full rounded-2xl text-left
        bg-primary/5 hover:bg-primary/10
        ring-1 ring-primary/10 hover:ring-primary/20
        transition-smooth
        px-4 py-4
        flex items-center justify-between gap-4
      "
    >
      <div className="flex-1">
        <p className="font-semibold tracking-tight text-xl md:text-2xl leading-tight">
          {title}
        </p>
        <p className="text-sm md:text-base text-muted-foreground leading-snug mt-1">
          {subtitle}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </button>
  );

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold mb-2">Staff Dashboard</h1>
        <p className="text-muted-foreground">Your tasks and operations overview</p>
      </div>

      {/* Stats - clickable */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card
              key={idx}
              className="glass-effect border-2 hover:shadow-lg transition-smooth cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              role="button"
              tabIndex={0}
              onClick={stat.go}
              onKeyDown={(e) => (e.key === "Enter" ? stat.go() : null)}
              aria-label={`Open ${stat.title}`}
            >
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

      {/* Pending tasks - clickable rows */}
      <Card className="glass-effect border-2">
        <CardHeader>
          <CardTitle>Pending Tasks</CardTitle>
          <CardDescription>Items requiring your attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-smooth cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                role="button"
                tabIndex={0}
                onClick={() => gotoByType(task.type)}
                onKeyDown={(e) => (e.key === "Enter" ? gotoByType(task.type) : null)}
                aria-label={`Open ${task.type} task ${task.id}`}
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
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Quick Actions
              </CardTitle>
            </div>
            <div className="h-1 w-24 bg-gradient-to-r from-primary to-secondary rounded-full mt-3" />
            <p className="text-sm md:text-base text-muted-foreground mt-2">
              Jump straight to the most common staff flows.
            </p>
          </CardHeader>

          <CardContent className="space-y-3">
            <QuickAction
              title="Process Ticket Orders"
              subtitle="View and confirm ticket purchases"
              onClick={() => goto("/staff/tickets")}
            />
            <QuickAction
              title="Manage Reservations"
              subtitle="Confirm or modify table bookings"
              onClick={() => goto("/staff/reservations")}
            />
            <QuickAction
              title="Kitchen Orders"
              subtitle="View F&B orders and status"
              onClick={() => goto("/staff/fnb")}
            />
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
