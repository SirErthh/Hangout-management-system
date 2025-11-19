import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, AlertTriangle, Loader2 } from "lucide-react";
import { api, handleApiError } from "@/lib/api";
import { toast } from "sonner";

type TableOption = {
  id: number;
  number: string;
  capacity: number;
  available: boolean;
};

const TicketSeating = () => {
  const { id } = useParams();
  const eventId = Number(id);
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state?.order;
  const seededEvent = location.state?.event;

  const [event, setEvent] = useState<any>(seededEvent ?? null);
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [selectedTables, setSelectedTables] = useState<number[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!order) {
      navigate("/events", { replace: true });
    }
  }, [order, navigate]);

  useEffect(() => {
    if (!eventId || !order) {
      return;
    }
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const [eventRes, tablesRes] = await Promise.all([
          api.getEvent(eventId, controller.signal),
          api.getAvailableTables(eventId, controller.signal),
        ]);
        setEvent(eventRes.event);
        setTables((tablesRes.tables ?? []).filter((table: TableOption) => table.available));
      } catch (error) {
        handleApiError(error, "Unable to load seating information");
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [eventId, order]);

  const selectedTablesInfo = useMemo(
    () => tables.filter((table) => selectedTables.includes(table.id)),
    [tables, selectedTables],
  );

  const selectedCapacity = selectedTablesInfo.reduce((sum, table) => sum + table.capacity, 0);
  const capacityOk = selectedCapacity >= (order?.quantity ?? 0);

  const arrivalReminder = useMemo(() => {
    const startsAt = event?.starts_at ?? order?.startsAt ?? order?.starts_at;
    if (!startsAt) {
      return null;
    }
    const eventDate = new Date(startsAt);
    if (Number.isNaN(eventDate.getTime())) {
      return null;
    }
    const reminderTime = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000);
    return reminderTime.toLocaleString();
  }, [event, order]);

  const toggleTableSelection = (tableId: number) => {
    const table = tables.find((t) => t.id === tableId);
    const partySize = order?.quantity ?? 0;
    if (!table || partySize <= 0) {
      return;
    }

    const maxFirstTableCapacity = partySize === 1 ? 2 : partySize;

    setSelectedTables((prev) => {
      if (prev.includes(tableId)) {
        return prev.filter((id) => id !== tableId);
      }

      if (prev.length === 0) {
        if (table.capacity > maxFirstTableCapacity) {
          toast.error(`Largest table for your party is ${maxFirstTableCapacity} seat(s).`);
          return prev;
        }
        if (table.capacity > partySize) {
          toast.info("Table successfully choose");
        }
        return [...prev, tableId];
      }

      const currentCapacity = tables
        .filter((t) => prev.includes(t.id))
        .reduce((sum, t) => sum + t.capacity, 0);
      if (currentCapacity + table.capacity > partySize) {
        toast.error("Selected tables would exceed your party size.");
        return prev;
      }

      return [...prev, tableId];
    });
  };

  const handleContinue = () => {
    if (!order) return;
    if (selectedTables.length === 0) {
      handleApiError(new Error("Please select at least one table"), "Table selection required");
      return;
    }
    if (!capacityOk) {
      handleApiError(new Error("Selected tables do not cover your entire group."), "Capacity too low");
      return;
    }

    const seatingPayload = {
      table_ids: selectedTables,
      table_labels: selectedTablesInfo.map((table) => table.number),
      party_size: order.quantity,
      note: note.trim() || undefined,
    };

    setSubmitting(true);
    navigate("/confirm-order", {
      state: {
        order,
        seating: seatingPayload,
        event,
      },
    });
  };

  if (!order) {
    return null;
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading seating options…
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl mx-auto animate-slide-up">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Choose Your Seating</h1>
        <p className="text-muted-foreground">
          Select how you would like to be seated for this event before confirming your ticket order.
        </p>
      </div>

      <Card className="glass-panel border-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">{order.event}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            <span>{order.date}</span>
            <Badge variant="outline">x{order.quantity} tickets</Badge>
            <Badge variant="outline">฿{order.total}</Badge>
          </CardDescription>
        </CardHeader>
      </Card>

      {arrivalReminder && (
        <Alert className="glass-effect border-primary/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Please plan to arrive by <strong>{arrivalReminder}</strong> (2 hours before the event) so
            we can get your table settled.
          </AlertDescription>
        </Alert>
      )}

      <Card className="glass-panel border-none">
        <CardHeader>
          <CardTitle>Select Tables</CardTitle>
          <CardDescription>
            Pick one or more tables whose combined capacity covers your {order.quantity} ticket(s).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {tables.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All tables are currently reserved for this event. Please contact staff for assistance.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {tables.map((table) => {
                  const partySize = order.quantity ?? 0;
                  const maxFirstTableCapacity = partySize === 1 ? 2 : partySize;
                  const isSelected = selectedTables.includes(table.id);
                  const disableSelection =
                    !isSelected &&
                    ((selectedTables.length === 0 && table.capacity > maxFirstTableCapacity) ||
                      (selectedTables.length > 0 && selectedCapacity + table.capacity > partySize));
                  return (
                    <button
                      key={table.id}
                      type="button"
                      className={`rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-white/40 hover:border-primary"
                      } ${disableSelection ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => toggleTableSelection(table.id)}
                      disabled={disableSelection}
                      title={
                        disableSelection
                          ? "Table capacity exceeds your party size"
                          : undefined
                      }
                    >
                      <p className="font-semibold">{table.number}</p>
                      <p className="text-sm text-muted-foreground">{table.capacity} seats</p>
                      {disableSelection && (
                        <p className="mt-2 text-xs text-destructive">
                          Too large for your party
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-sm">
                <p>
                  Selected capacity:{" "}
                  <span className={capacityOk ? "font-semibold text-primary" : "text-destructive"}>
                    {selectedCapacity} / {order.quantity}
                  </span>
                </p>
                {!capacityOk && selectedTables.length > 0 && (
                  <span className="text-destructive">Add another table to cover everyone.</span>
                )}
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="seating-note">Notes (optional)</Label>
            <Input
              id="seating-note"
              placeholder="Birthday, preferences, etc."
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" className="flex-1" type="button" onClick={() => navigate(-1)} disabled={submitting}>
          Back
        </Button>
        <Button
          className="flex-1 gradient-button"
          type="button"
          onClick={handleContinue}
          disabled={submitting || loading || selectedTables.length === 0 || !capacityOk}
        >
          {submitting ? "Preparing..." : "Review & Confirm"}
        </Button>
      </div>
    </div>
  );
};

export default TicketSeating;
