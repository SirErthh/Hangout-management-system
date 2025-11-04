import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, DollarSign, TrendingUp, Zap, ChevronRight } from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const goto = useCallback((path: string) => {
    if (!path) return;
    navigate(path);
  }, [navigate]);

  // Stats with destinations
  const stats = [
    {
      title: "Total Users",
      value: "1,234",
      change: "+12%",
      icon: Users,
      gradient: "from-blue-500 to-cyan-500",
      go: () => goto("/admin/users"),
    },
    {
      title: "Active Events",
      value: "8",
      change: "+2",
      icon: Calendar,
      gradient: "from-purple-500 to-pink-500",
      go: () => goto("/admin/events"),
    },
    {
      title: "Today's Revenue",
      value: "฿45,890",
      change: "+18%",
      icon: DollarSign,
      gradient: "from-green-500 to-emerald-500",
      go: () => goto("/admin/reports"),
    },
    {
      title: "Growth Rate",
      value: "24.5%",
      change: "+5.2%",
      icon: TrendingUp,
      gradient: "from-orange-500 to-red-500",
      go: () => goto("/admin/analytics"),
    },
  ];

  // Reusable QuickAction row (clean, left-aligned, better type scale)
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
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Overview of your venue operations</p>
      </div>

      {/* Clickable KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card
              key={idx}
              className="glass-effect border-2 hover:shadow-xl transition-smooth cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
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
                <div className="flex items-baseline justify-between">
                  <h3 className="text-3xl font-bold">{stat.value}</h3>
                  <span className="text-sm font-medium text-green-500">{stat.change}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="glass-effect">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
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
          <CardHeader className="pb-3">
            {/* Prominent Quick Actions header */}
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
              Jump straight to common admin tasks.
            </p>
          </CardHeader>

          <CardContent className="space-y-3">
            <QuickAction
              title="Create New Event"
              subtitle="Add upcoming show or party"
              onClick={() => goto("/admin/events/new")}
            />
            <QuickAction
              title="Manage Users"
              subtitle="View and edit user roles"
              onClick={() => goto("/admin/users")}
            />
            <QuickAction
              title="Day Closure"
              subtitle="End of day reconciliation"
              onClick={() => goto("/admin/day-closure")}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
