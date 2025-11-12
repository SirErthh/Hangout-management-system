import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { DollarSign, CheckCircle } from "lucide-react";
import { api, handleApiError } from "@/lib/api";

type ClosureSummary = {
  date: string;
  tickets: { count: number; amount: number; orders: number };
  fnb: { count: number; amount: number };
  cash: number;
};

type ClosureRecord = {
  id: number;
  closureDate: string;
  openedAt: string;
  closedAt: string | null;
  status: string;
  ticketSales: number;
  fnbSales: number;
  promptpay: number;
  note?: string | null;
};

const DayClosure = () => {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [summary, setSummary] = useState<ClosureSummary | null>(null);
  const [summaryDate, setSummaryDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [closure, setClosure] = useState<ClosureRecord | null>(null);
  const [note, setNote] = useState("");
  const [previousClosure, setPreviousClosure] = useState<ClosureRecord | null>(null);
  const [nextDate, setNextDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [pendingStartDate, setPendingStartDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const {
        closure: existing,
        summary: fetched,
        summaryDate: apiSummaryDate,
        previousClosure,
        nextDate: apiNextDate,
      } =
        await api.getDayClosure();
      setSummary(fetched);
      setSummaryDate(apiSummaryDate);
      setClosure(existing);
      setNote(existing?.note ?? "");
      setPreviousClosure(previousClosure ?? null);
      setNextDate(apiNextDate ?? apiSummaryDate);
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
    setIsSubmitting(true);
    try {
      const {
        closure: closed,
        summary: refreshed,
        summaryDate: apiSummaryDate,
        nextDate: apiNextDate,
        previousClosure,
      } = await api.closeDay({
        note,
        date: closure?.closureDate ?? summaryDate,
      });
      setClosure(closed);
      setSummary(refreshed);
      setSummaryDate(apiSummaryDate);
      setPreviousClosure(previousClosure ?? closed ?? null);
      setNextDate(apiNextDate ?? apiSummaryDate);
      toast.success("Day closed successfully!");
      window.dispatchEvent(new Event("day-closure-updated"));
      await load();
    } catch (error) {
      handleApiError(error, "Failed to close the day");
    } finally {
      setIsSubmitting(false);
      setCloseDialogOpen(false);
    }
  };

  const handleStartDay = async (dateOverride?: string) => {
    const date = dateOverride ?? summaryDate;
    setIsStarting(true);
    try {
      const {
        closure: opened,
        summary: refreshed,
        summaryDate: apiSummaryDate,
        nextDate: apiNextDate,
        previousClosure,
      } = await api.startDay({
        date,
      });
      setClosure(opened);
      setSummary(refreshed);
      setSummaryDate(apiSummaryDate);
      setNote(opened?.note ?? "");
      setPreviousClosure(previousClosure ?? null);
      setNextDate(apiNextDate ?? apiSummaryDate);
      toast.success("Day started successfully!");
      window.dispatchEvent(new Event("day-closure-updated"));
      await load();
    } catch (error) {
      handleApiError(error, "Failed to start the day");
    } finally {
      setIsStarting(false);
      setStartDialogOpen(false);
      setPendingStartDate(null);
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
  const startTargetDate = useMemo(
    () => (isClosed ? nextDate : summaryDate),
    [isClosed, nextDate, summaryDate],
  );

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

      {previousClosure && (
        <Card className="glass-effect border-2">
          <CardHeader>
            <CardTitle>Last Closed Day Summary</CardTitle>
            <CardDescription>
              Closed on {new Date(previousClosure.closureDate).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Ticket Sales</p>
              <p className="text-2xl font-semibold">฿{previousClosure.ticketSales.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">F&B Sales</p>
              <p className="text-2xl font-semibold">฿{previousClosure.fnbSales.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">PromptPay / Cash</p>
              <p className="text-xl font-semibold">฿{previousClosure.promptpay.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Note</p>
              <p className="text-sm">{previousClosure.note ?? "-"}</p>
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
                onClick={() => {
                  setPendingStartDate(startTargetDate);
                  setStartDialogOpen(true);
                }}
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
                onClick={() => setCloseDialogOpen(true)}
                disabled={isSubmitting || loading}
                className="flex-1"
                size="lg"
              >
                {isSubmitting ? "Closing..." : "Close Day"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={startDialogOpen} onOpenChange={(open) => {
        setStartDialogOpen(open);
        if (!open) setPendingStartDate(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Day</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStartDate
                ? `Start a new operational day for ${new Date(pendingStartDate).toLocaleDateString()}?`
                : "Start a new operational day?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isStarting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isStarting}
              onClick={() => handleStartDay(pendingStartDate ?? summaryDate)}
            >
              {isStarting ? "Starting..." : "Start Day"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Day</AlertDialogTitle>
            <AlertDialogDescription>
              Closing the day will finalize today&apos;s sales, release all table assignments, and mark in-progress
              reservations as completed. This cannot be undone. Proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isSubmitting} onClick={handleClosureSubmit}>
              {isSubmitting ? "Closing..." : "Close Day"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DayClosure;
