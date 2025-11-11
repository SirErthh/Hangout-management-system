import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, AlertCircle, Calendar as CalendarIcon } from "lucide-react";
import { api, handleApiError } from "@/lib/api";

const formatDateKey = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const extractDateKey = (raw?: string | null): string | null => {
  if (!raw) return null;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match && match[1]) {
    return match[1];
  }
  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return formatDateKey(new Date(timestamp));
};

const Reserve = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [partySize, setPartySize] = useState<number>(2);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [eventDates, setEventDates] = useState<string[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadEvents = async () => {
      try {
        setLoadingEvents(true);
        setEventsError(null);
        const { events = [] } = await api.getEvents({
          activeOnly: true,
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        const dates = events
          .map((event: any) => extractDateKey(event.starts_at || event.date))
          .filter((value): value is string => Boolean(value));

        setEventDates(Array.from(new Set(dates)));
      } catch (error) {
        if (!controller.signal.aborted) {
          handleApiError(error, "Failed to load event schedule");
          setEventsError("Unable to check event schedule right now.");
          setEventDates([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingEvents(false);
        }
      }
    };

    loadEvents();

    return () => controller.abort();
  }, []);

  const eventDateSet = useMemo(() => new Set(eventDates), [eventDates]);

  const isEventDate = (selectedDate: Date | undefined) => {
    if (!selectedDate) return false;
    const dateStr = formatDateKey(selectedDate);
    return eventDateSet.has(dateStr);
  };

  const handleReserve = () => {
    if (!date) {
      toast.error("Please select a date");
      return;
    }

    if (!partySize || partySize < 1) {
      toast.error("Cannot book with 0 people. At least 1 person is required.");
      return;
    }

    if (isEventDate(date)) {
      setShowEventDialog(true);
      return;
    }
    navigate("/reserve/confirm", {
      state: {
        date: date.toISOString(),
        partySize,
      },
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Reserve a Table</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Choose your date, time, and party size</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="glass-effect border-2">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>Pick your preferred date</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-effect border-2">
            <CardHeader>
              <CardTitle>Reservation Details</CardTitle>
              <CardDescription>Complete your booking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tables are available until 10:00 PM. If not confirmed, reservations will be released automatically.
                </AlertDescription>
              </Alert>

              {loadingEvents && (
                <Alert>
                  <CalendarIcon className="h-4 w-4" />
                  <AlertDescription>Checking event schedule...</AlertDescription>
                </Alert>
              )}

              {eventsError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{eventsError}</AlertDescription>
                </Alert>
              )}

              {isEventDate(date) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This date has an event. Reservations are closed. Please purchase event tickets instead.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="partySize" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Party Size
                </Label>
                <Input
                  id="partySize"
                  type="number"
                  min="1"
                  max="20"
                  value={partySize === 0 ? "" : partySize}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    setPartySize(Number.isNaN(value) ? 0 : value);
                  }}
                  className="w-full"
                />
              </div>

              <div className="pt-4 space-y-3">
                <div className="p-4 rounded-lg bg-primary/10 space-y-2">
                  <p className="text-sm font-medium">Reservation Summary</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Date: {date?.toLocaleDateString()}</p>
                    <p>
                      Party Size:{" "}
                      {partySize > 0
                        ? `${partySize} ${partySize === 1 ? 'person' : 'people'}`
                        : "Not set"}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={handleReserve}
                  className="w-full"
                  size="lg"
                  disabled={isEventDate(date)}
                >
                  Reserve
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Day - Reservations Closed</DialogTitle>
            <DialogDescription>
              This date has a special event. Table reservations are not available. 
              Would you like to purchase event tickets instead?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowEventDialog(false);
              window.location.href = '/events';
            }}>
              View Events
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reserve;
