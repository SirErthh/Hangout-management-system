import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, DollarSign, TrendingUp, Zap, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { api, handleApiError } from "@/lib/api";

const AdminDashboard = () => {
  const navigate = useNavigate();
  // เก็บตัวเลขสรุปสำหรับแสดงบนแดชบอร์ด
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeEvents: 0,
    totalRevenue: 0,
    staffCount: 0,
    ticketRevenue: 0,
    fnbRevenue: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const goto = useCallback((path: string) => {
    if (!path) return;
    navigate(path);
  }, [navigate]);

  useEffect(() => {
    let mounted = true;
    const loadMetrics = async () => {
      setLoadingMetrics(true);
      setMetricsError(null);
      try {
        const data = await api.getAdminDashboard();
        if (!mounted) return;
        setMetrics({
          totalUsers: data.totalUsers ?? 0,
          activeEvents: data.activeEvents ?? 0,
          totalRevenue: data.totalRevenue ?? 0,
          staffCount: data.staffCount ?? 0,
          ticketRevenue: data.ticketRevenue ?? 0,
          fnbRevenue: data.fnbRevenue ?? 0,
        });
      } catch (error) {
        if (!mounted) return;
        handleApiError(error, "Failed to load admin metrics");
        setMetricsError("Unable to load live metrics right now.");
      } finally {
        if (mounted) {
          setLoadingMetrics(false);
        }
      }
    };
    loadMetrics();
    return () => {
      mounted = false;
    };
  }, []);

  const formatValue = (value: number) => {
    if (loadingMetrics) return "…";
    return value.toLocaleString();
  };

  const formatCurrency = (value: number) => {
    if (loadingMetrics) return "…";
    return `฿${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Stats with destinations
  const stats = [
    {
      title: "Total Users",
      value: formatValue(metrics.totalUsers),
      change: "",
      icon: Users,
      gradient: "from-blue-500 to-cyan-500",
      go: () => goto("/admin/users"),
    },
    {
      title: "Active Events",
      value: formatValue(metrics.activeEvents),
      change: "",
      icon: Calendar,
      gradient: "from-purple-500 to-pink-500",
      go: () => goto("/admin/events"),
    },
    {
      title: "Total Revenue",
      value: formatCurrency(metrics.totalRevenue),
      change: "",
      icon: DollarSign,
      gradient: "from-green-500 to-emerald-500",
      go: () => goto("/admin/closure"),
    },
    {
      title: "Total Staff",
      value: formatValue(metrics.staffCount),
      change: "",
      icon: TrendingUp,
      gradient: "from-orange-500 to-red-500",
      go: () => goto("/admin/users"),
    },
  ];

  const revenueBreakdown = [
    { label: "Ticket Sales", value: metrics.ticketRevenue || 0, color: "#6366F1" },
    { label: "Food & Beverage", value: metrics.fnbRevenue || 0, color: "#10B981" },
  ];
  const totalBreakdown = revenueBreakdown.reduce((sum, item) => sum + item.value, 0);

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
        bg-white/80 dark:bg-slate-900/60
        border border-white/60 hover:border-primary/40
        shadow-sm hover:shadow-glow
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
      <div className="relative glass-panel gradient-subtle border-none shadow-glow p-6 sm:p-8 overflow-hidden">
        <div className="absolute -top-10 -right-6 h-48 w-48 rounded-full bg-gradient-to-br from-primary to-secondary opacity-30 blur-3xl" />
        <div className="absolute -bottom-12 -left-4 h-40 w-40 rounded-full bg-gradient-to-br from-accent to-primary opacity-20 blur-2xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Operations Command
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
              Monitor the entire venue at a glance. Keep events, users, tickets, and finances in sync with one tap.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="gradient-button hover:brightness-110" onClick={() => goto("/admin/events")}>
              Create Event
            </Button>
            <Button
              variant="outline"
              className="border border-white/70 bg-white/70 text-foreground hover:bg-white"
              onClick={() => goto("/admin/closure")}
            >
              Day Closure
            </Button>
          </div>
        </div>
      </div>
      {metricsError && <p className="text-sm text-destructive">{metricsError}</p>}

      {/* Clickable KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card
              key={idx}
              className="glass-panel border-none hover:shadow-glow transition-smooth cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              role="button"
              tabIndex={0}
              onClick={stat.go}
              onKeyDown={(e) => (e.key === "Enter" ? stat.go() : null)}
              aria-label={`Open ${stat.title}`}
            >
              <CardHeader className="pb-2 space-y-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <CardDescription>{stat.title}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-3xl font-bold break-words break-all leading-tight max-w-[70%]">
                    {stat.value}
                  </h3>
                  {stat.change && (
                    <span className="text-sm font-medium text-green-500 text-right break-words">
                      {stat.change}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="glass-panel border-none">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Revenue Mix</CardTitle>
            <CardDescription>Ticket vs FNB contribution</CardDescription>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Total: {loadingMetrics ? "…" : formatCurrency(metrics.totalRevenue)}
          </p>
        </CardHeader>
        <CardContent>
          {totalBreakdown <= 0 ? (
            <p className="text-sm text-muted-foreground">Revenue data will appear once orders are recorded.</p>
          ) : (
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="w-full md:w-1/2 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueBreakdown}
                      innerRadius={70}
                      outerRadius={100}
                      dataKey="value"
                      paddingAngle={4}
                    >
                      {revenueBreakdown.map((entry, index) => (
                        <Cell key={entry.label} fill={entry.color} stroke="transparent" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-4 w-full">
                {revenueBreakdown.map((item) => {
                  const percent = totalBreakdown > 0 ? ((item.value / totalBreakdown) * 100).toFixed(1) : "0";
                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/50 bg-white/70 dark:bg-slate-900/50 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <div>
                          <p className="font-semibold">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{percent}% of revenue</p>
                        </div>
                      </div>
                      <p className="text-lg font-semibold">
                        {formatCurrency(item.value)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="glass-panel border-none">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-white/70 dark:bg-slate-900/50 border border-white/60">
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

        <Card className="glass-panel border-none">
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
              onClick={() => goto("/admin/events")}
            />
            <QuickAction
              title="Manage Users"
              subtitle="View and edit user roles"
              onClick={() => goto("/admin/users")}
            />
            <QuickAction
              title="Day Closure"
              subtitle="End of day reconciliation"
              onClick={() => goto("/admin/closure")}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
