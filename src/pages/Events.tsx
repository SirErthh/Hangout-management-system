import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, Info, Minus, Plus } from "lucide-react";
import { api, handleApiError } from "@/lib/api";

type EventItem = {
  id: number;
  name: string;
  image_url?: string;
  date?: string | null;
  starts_at?: string | null;
  price: number;
  ticketCodePrefix?: string;
  description?: string | null;
  artist?: string | null;
  capacity?: number | null;
};

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const { events: fetched = [] } = await api.getEvents({
          signal,
          activeOnly: true,
        });
        if (signal?.aborted) {
          return;
        }
        setEvents(fetched);
        setQuantities((prev) => {
          const next: Record<number, number> = {};
          fetched.forEach((event) => {
            next[event.id] = prev[event.id] ?? 1;
          });
          return next;
        });
      } catch (error) {
        if (!signal?.aborted) {
          handleApiError(error, "Failed to load events");
          setEvents([]);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchEvents(controller.signal);
    return () => controller.abort();
  }, [fetchEvents]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchEvents();
    };
    window.addEventListener("events-updated", handleRefresh);
    return () => window.removeEventListener("events-updated", handleRefresh);
  }, [fetchEvents]);

  const updateQuantity = (id: number, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta),
    }));
  };

  const handleConfirmOrder = (event: EventItem) => {
    const qty = quantities[event.id] || 1;
    navigate(`/events/${event.id}/seating`, {
      state: {
        order: {
          eventId: event.id,
          event: event.name,
          date: event.date,
          startsAt: event.starts_at,
          price: event.price,
          quantity: qty,
          total: event.price * qty,
          ticketCodePrefix: event.ticketCodePrefix || "HAN",
        },
        event,
      },
    });
  };

  const openInfo = (event: EventItem) => {
    navigate(`/events/${event.id}`, { state: { event } });
  };

  const formatEventDate = (date?: string | null) => {
    if (!date) {
      return "Date TBA";
    }
    try {
      return new Date(date).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return date;
    }
  };

  const renderCoverImage = (event: EventItem) => {
    const isImageLike =
      typeof event.image_url === "string" &&
      (event.image_url.startsWith("http") ||
        event.image_url.startsWith("data:") ||
        event.image_url.startsWith("blob:") ||
        event.image_url.startsWith("/"));

    const imageWrapper =
      "w-full aspect-[16/9] rounded-[1.75rem] border border-white/60 bg-muted/40 flex items-center justify-center shadow-md overflow-hidden";

    if (!event.image_url) {
      return (
        <div className={`${imageWrapper} gradient-primary border-none`}>
          <Calendar className="h-10 w-10 text-white" />
        </div>
      );
    }

    if (isImageLike) {
      return (
        <div className={`${imageWrapper} bg-white/40`}>
          <img
            src={event.image_url}
            alt={event.name}
            className="h-full w-full object-contain"
          />
        </div>
      );
    }

    return (
      <div className={`${imageWrapper} bg-muted/40 text-5xl`}>
        {event.image_url}
      </div>
    );
  };

  const renderEventCard = (event: EventItem) => {
    const qty = quantities[event.id] || 1;
    const eventDate = formatEventDate(event.date);
    return (
      <Card
        key={event.id}
        className="glass-panel border-none overflow-hidden shadow-sm hover:shadow-glow transition-smooth flex flex-col"
      >
        <div className="relative">
          {renderCoverImage(event)}
          <div className="absolute inset-x-6 bottom-6 flex flex-wrap items-center justify-between gap-2">
            <Badge className="bg-white/80 text-foreground border border-white/60 font-medium shadow-sm">
              {eventDate}
            </Badge>
            <span className="px-3 py-1 rounded-full bg-slate-900/85 text-white text-sm font-semibold shadow-glow">
              ฿{event.price.toLocaleString()}
            </span>
          </div>
        </div>
        <CardContent className="space-y-4 p-5 sm:p-6 flex-1 flex flex-col">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {event.artist || "Live performance"}
            </p>
            <h3 className="text-xl font-semibold">{event.name}</h3>
            {event.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {event.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-white/70 border-white/60 text-foreground shadow-sm">
              Code: {event.ticketCodePrefix || "HAN"}
            </Badge>
            {typeof event.capacity === "number" && event.capacity > 0 && (
              <Badge variant="outline" className="bg-white/70 border-white/60 text-foreground shadow-sm">
                Capacity {event.capacity.toLocaleString()}
              </Badge>
            )}
          </div>

          <div className="mt-auto space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-full border border-border/60 bg-background/95 text-foreground shadow-sm dark:border-white/10 dark:bg-slate-900/80 px-3 py-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-full bg-foreground/95 text-background shadow hover:brightness-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring dark:bg-white dark:text-slate-900"
                onClick={() => updateQuantity(event.id, -1)}
                aria-label="Decrease tickets"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                value={qty}
                onChange={(e) =>
                  setQuantities((prev) => ({
                    ...prev,
                    [event.id]: Math.max(1, parseInt(e.target.value, 10) || 1),
                  }))
                }
                className="w-16 rounded-full border border-border/70 bg-background text-center text-base font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-white/20 dark:bg-slate-900/60"
                min={1}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-full bg-foreground/95 text-background shadow hover:brightness-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring dark:bg-white dark:text-slate-900"
                onClick={() => updateQuantity(event.id, 1)}
                aria-label="Increase tickets"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => handleConfirmOrder(event)}
                className="gradient-button px-6 py-5 text-base font-semibold shadow-glow hover:brightness-110"
              >
                Order Tickets
              </Button>
              <Button
                variant="outline"
                className="border border-white/70 bg-white/70 text-foreground hover:bg-white"
                onClick={() => openInfo(event)}
              >
                <Info className="h-4 w-4 mr-2" />
                Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div className="relative glass-panel gradient-subtle border-none shadow-glow p-6 sm:p-8 space-y-4 overflow-hidden">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-gradient-to-br from-primary to-secondary opacity-30 blur-3xl" />
        <div className="absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-gradient-to-br from-accent to-primary opacity-20 blur-2xl" />
        <div className="relative space-y-3">
          <p className="text-xs sm:text-sm uppercase tracking-[0.35em] text-muted-foreground">
            Nightlife Highlights
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold">Browse Events</h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl">
            Check out our upcoming experiences, reserve your table, and secure tickets before the dance floor fills up.
          </p>
        </div>
      </div>

      {loading ? (
        <Card className="glass-panel border-none">
          <CardContent className="p-12 text-center text-muted-foreground">
            Loading events...
          </CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card className="glass-panel border-none">
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              No events available. Please check back later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          {events.map(renderEventCard)}
        </div>
      )}
    </div>
  );
};

export default Events;
