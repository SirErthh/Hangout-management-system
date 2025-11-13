import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket, BookOpen, UtensilsCrossed, Users, Zap, ChevronRight } from "lucide-react";
import { api, handleApiError } from "@/lib/api";

const StaffDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    ticketsToday: 0,
    reservationsToday: 0,
    fnbOrdersToday: 0,
    guestsToday: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadMetrics = async () => {
      setLoadingMetrics(true);
      setMetricsError(null);
      try {
        const data = await api.getStaffDashboard();
        if (!mounted) return;
        setMetrics({
          ticketsToday: data.ticketsToday ?? 0,
          reservationsToday: data.reservationsToday ?? 0,
          fnbOrdersToday: data.fnbOrdersToday ?? 0,
          guestsToday: data.guestsToday ?? 0,
        });
      } catch (error) {
        if (!mounted) return;
        handleApiError(error, "Failed to load dashboard metrics");
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

  const goto = useCallback((path: string) => {
    if (!path) return;
    navigate(path);
  }, [navigate]);

  const formatStatValue = (value: number) =>
    loadingMetrics ? "…" : value.toLocaleString();

  const stats = [
    {
      title: "Tickets Today",
      value: formatStatValue(metrics.ticketsToday),
      icon: Ticket,
      gradient: "from-blue-500 to-cyan-500",
      go: () => goto("/staff/tickets"),
    },
    {
      title: "Today's Reservations",
      value: formatStatValue(metrics.reservationsToday),
      icon: BookOpen,
      gradient: "from-purple-500 to-pink-500",
      go: () => goto("/staff/reservations"),
    },
    {
      title: "Today's F&B Orders",
      value: formatStatValue(metrics.fnbOrdersToday),
      icon: UtensilsCrossed,
      gradient: "from-orange-500 to-red-500",
      go: () => goto("/staff/fnb"),
    },
    {
      title: "Guests In-House",
      value: formatStatValue(metrics.guestsToday),
      icon: Users,
      gradient: "from-green-500 to-emerald-500",
      go: () => goto("/staff/reservations"),
    },
  ];

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
    <div className="p-6 space-y-6 animate-slide-up">
      <div className="relative glass-panel gradient-subtle border-none shadow-glow p-6 sm:p-8 overflow-hidden">
        <div className="absolute -top-12 right-0 h-44 w-44 rounded-full bg-gradient-to-br from-primary to-secondary opacity-30 blur-3xl" />
        <div className="absolute -bottom-8 left-4 h-32 w-32 rounded-full bg-gradient-to-br from-accent to-primary opacity-25 blur-2xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Frontline Ops</p>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Staff Dashboard</h1>
            <p className="text-muted-foreground max-w-2xl">
              Track tickets, reservations, and kitchen orders in real time. Keep every guest experience flawless.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              className="gradient-button hover:brightness-110"
              onClick={() => goto("/staff/tickets")}
            >
              Process Tickets
            </Button>
            <Button
              variant="outline"
              className="border border-white/70 bg-white/70 text-foreground hover:bg-white"
              onClick={() => goto("/staff/fnb")}
            >
              View Kitchen
            </Button>
          </div>
        </div>
      </div>
      {metricsError && (
        <p className="text-sm text-destructive">{metricsError}</p>
      )}

      {/* Stats - clickable */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Quick Actions */}
      <Card className="glass-panel border-none">
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
    </div>
  );
};

export default StaffDashboard;
