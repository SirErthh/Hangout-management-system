import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DollarSign, CheckCircle } from "lucide-react";
import { api, handleApiError } from "@/lib/api";

type ClosureSummary = {
  date: string;
  tickets: { count: number; amount: number; orders: number };
  fnb: { count: number; amount: number };
  cash: number;
};

const DayClosure = () => {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [summary, setSummary] = useState<ClosureSummary | null>(null);
  const [summaryDate, setSummaryDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [closure, setClosure] = useState<any | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { closure: existing, summary: fetched, summaryDate } = await api.getDayClosure();
      setSummary(fetched);
      setSummaryDate(summaryDate);
      setClosure(existing);
      setNote(existing?.note ?? "");
    } catch (error) {
      handleApiError(error, "Failed to load day closure data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClosureSubmit = async () => {
    if (!window.confirm("Are you sure you want to close the current day?")) {
      return;
    }
    setIsSubmitting(true);
    try {
      const { closure: closed, summary: refreshed, summaryDate } = await api.closeDay({
        note,
        date: closure?.closureDate ?? summaryDate,
      });
      setClosure(closed);
      setSummary(refreshed);
      setSummaryDate(summaryDate);
      toast.success("Day closed successfully!");
    } catch (error) {
      handleApiError(error, "Failed to close the day");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartDay = async (dateOverride?: string) => {
    const date = dateOverride ?? summaryDate;
    if (!window.confirm(`Start a new day for ${new Date(date).toLocaleDateString()}?`)) {
      return;
    }
    setIsStarting(true);
    try {
      const { closure: opened, summary: refreshed, summaryDate } = await api.startDay({
        date,
      });
      setClosure(opened);
      setSummary(refreshed);
      setSummaryDate(summaryDate);
      setNote(opened?.note ?? "");
      toast.success("Day started successfully!");
    } catch (error) {
      handleApiError(error, "Failed to start the day");
    } finally {
      setIsStarting(false);
    }
  };

  const ticketsCount = summary?.tickets.count ?? 0;
  const ticketsAmount = summary?.tickets.amount ?? 0;
  const fnbCount = summary?.fnb.count ?? 0;
  const fnbAmount = summary?.fnb.amount ?? 0;
  const cashTotal = summary?.cash ?? 0;
  const liveDateLabel = useMemo(() => new Date(summaryDate).toLocaleDateString(), [summaryDate]);
  const isOpen = closure?.status === "open";
  const isClosed = closure?.status === "closed";
  const showStartButton = !closure || closure?.status === "closed";
  const nextDayDate = useMemo(() => {
    if (!closure) return summaryDate;
    const base = new Date(closure.closureDate);
    base.setDate(base.getDate() + 1);
    return base.toISOString().slice(0, 10);
  }, [closure, summaryDate]);

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Day Closure</h1>
          <p className="text-muted-foreground">
            Live totals for {liveDateLabel}
          </p>
          {closure?.closedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Last closed at {new Date(closure.closedAt).toLocaleString()}
            </p>
          )}
        </div>
        {isClosed && (
          <Badge className="bg-green-500">
            <CheckCircle className="h-4 w-4 mr-2" />
            Day Closed
          </Badge>
        )}
      </div>

      {isClosed && (
        <Card className="glass-effect border-2">
          <CardHeader>
            <CardTitle>Yesterday Summary</CardTitle>
            <CardDescription>
              Closed on {new Date(closure.closureDate).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Ticket Sales</p>
              <p className="text-2xl font-semibold">฿{closure.ticketSales.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">F&B Sales</p>
              <p className="text-2xl font-semibold">฿{closure.fnbSales.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">PromptPay / Cash</p>
              <p className="text-xl font-semibold">฿{closure.promptpay.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Note</p>
              <p className="text-sm">{closure.note ?? "-"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-effect border-2">
          <CardHeader>
            <CardTitle className="text-lg">Ticket Sales</CardTitle>
            <CardDescription>
              {loading ? "Loading..." : `${ticketsCount} tickets sold`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loading ? "—" : `฿${ticketsAmount.toLocaleString()}`}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-effect border-2">
          <CardHeader>
            <CardTitle className="text-lg">F&B Sales</CardTitle>
            <CardDescription>
              {loading ? "Loading..." : `${fnbCount} orders`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loading ? "—" : `฿${fnbAmount.toLocaleString()}`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-effect border-2">
        <CardHeader>
          <CardTitle>Total Revenue (Cash)</CardTitle>
          <CardDescription>Live total for {liveDateLabel}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-6 rounded-lg bg-gradient-primary">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/80">Total Revenue</p>
                  <p className="text-4xl font-bold text-white">
                    {loading ? "—" : `฿${cashTotal.toLocaleString()}`}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Notes</p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add any observation..."
                disabled={!isOpen || isSubmitting}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {showStartButton && (
              <Button
                onClick={() => handleStartDay(isClosed ? nextDayDate : summaryDate)}
                disabled={isStarting || loading}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                {isStarting ? "Starting..." : "Start Day"}
              </Button>
            )}
            {isOpen && (
              <Button
                onClick={handleClosureSubmit}
                disabled={isSubmitting || loading}
                className="flex-1"
                size="lg"
              >
                {isSubmitting ? "Closing..." : "Complete Day Closure"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DayClosure;
