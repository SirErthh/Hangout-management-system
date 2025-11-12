import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Calendar } from "lucide-react";
import { api, handleApiError } from "@/lib/api";

type EventItem = {
  id: number;
  name: string;
  image_url?: string;
  date?: string | null;
  price: number;
  ticketCodePrefix?: string;
  description?: string | null;
  artist?: string | null;
  capacity?: number | null;
};

const EventDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const [event, setEvent] = useState<EventItem | null>(
    (location.state as { event?: EventItem } | null)?.event ?? null,
  );
  const [loading, setLoading] = useState(!event);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (event || !id) {
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        const { event: fetched } = await api.getEvent(Number(id), controller.signal);
        setEvent(fetched);
      } catch (error) {
        if (!controller.signal.aborted) {
          handleApiError(error, "Failed to load event");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => controller.abort();
  }, [event, id]);

  const handleOrder = () => {
    if (!event) return;
    navigate("/confirm-order", {
      state: {
        order: {
          eventId: event.id,
          event: event.name,
          date: event.date,
          price: event.price,
          quantity,
          total: event.price * quantity,
          ticketCodePrefix: event.ticketCodePrefix || "HAN",
        },
      },
    });
  };

  const formattedDate = useMemo(() => {
    if (!event?.date) return "TBA";
    try {
      return new Date(event.date).toLocaleString();
    } catch {
      return event.date;
    }
  }, [event?.date]);

  if (loading || !event) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            {loading ? "Loading event..." : "Event not found."}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
        <span className="text-sm text-muted-foreground">Event #{event.id}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="rounded-3xl border bg-muted/20 flex items-center justify-center overflow-hidden min-h-[360px]">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.name}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-muted">
              <Calendar className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Event</p>
            <h1 className="text-2xl sm:text-3xl font-bold">{event.name}</h1>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground uppercase tracking-wide text-xs">Date</p>
              <p className="font-semibold">{formattedDate}</p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase tracking-wide text-xs">Ticket Code</p>
              <p className="font-semibold">{event.ticketCodePrefix ?? "HAN"}</p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase tracking-wide text-xs">Price</p>
              <p className="font-semibold text-lg">฿{event.price}</p>
            </div>
            {event.artist && (
              <div>
                <p className="text-muted-foreground uppercase tracking-wide text-xs">Artist</p>
                <p className="font-semibold">{event.artist}</p>
              </div>
            )}
          </div>

          <div>
            <p className="text-muted-foreground uppercase tracking-wide text-xs mb-2">About</p>
            <p className="text-sm leading-relaxed">
              {event.description || "No additional details provided."}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground uppercase tracking-wide">Quantity</p>
            <div className="flex items-center gap-3">
              <Button size="icon" variant="outline" onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}>
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                className="w-24 text-center"
                value={quantity}
                min={1}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              />
              <Button size="icon" variant="outline" onClick={() => setQuantity((prev) => prev + 1)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <p className="text-lg font-semibold">
              Total: ฿{(event.price * quantity).toLocaleString()}
            </p>
            <Button className="bg-gradient-primary hover:opacity-90" onClick={handleOrder}>
              Order Tickets
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
