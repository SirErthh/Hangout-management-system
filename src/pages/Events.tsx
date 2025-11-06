import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, Minus, Plus } from "lucide-react";
import { api, handleApiError } from "@/lib/api";

type EventItem = {
  id: number;
  name: string;
  image_url?: string;
  date?: string | null;
  price: number;
  ticketCodePrefix?: string;
};

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const loadEvents = async () => {
      setLoading(true);
      try {
        const { events: fetched } = await api.getEvents(controller.signal);
        setEvents(fetched);
        setQuantities((prev) => {
          const next: Record<number, number> = {};
          fetched.forEach((event) => {
            next[event.id] = prev[event.id] ?? 1;
          });
          return next;
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          handleApiError(error, "Failed to load events");
          setEvents([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadEvents();

    return () => controller.abort();
  }, []);

  const updateQuantity = (id: number, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta),
    }));
  };

  const handleConfirmOrder = (event: EventItem) => {
    const qty = quantities[event.id] || 1;
    navigate("/confirm-order", {
      state: {
        order: {
          eventId: event.id,
          event: event.name,
          date: event.date,
          price: event.price,
          quantity: qty,
          total: event.price * qty,
          ticketCodePrefix: event.ticketCodePrefix || "HAN",
        },
      },
    });
  };

  const renderImage = (event: EventItem, size: "sm" | "lg") => {
    const isImageLike =
      typeof event.image_url === "string" &&
      (event.image_url.startsWith("http") ||
        event.image_url.startsWith("data:") ||
        event.image_url.startsWith("blob:"));

    const baseClasses =
      size === "sm"
        ? "w-20 h-16 rounded-lg flex-shrink-0"
        : "w-24 h-16 rounded-lg";

    if (!event.image_url) {
      return (
        <div
          className={`${baseClasses} bg-gradient-primary flex items-center justify-center shadow-md`}
        >
          <Calendar className={size === "sm" ? "h-6 w-6 text-white" : "h-8 w-8 text-white"} />
        </div>
      );
    }

    if (isImageLike) {
      return (
        <div className={`${baseClasses} overflow-hidden shadow-md`}>
          <img src={event.image_url} alt={event.name} className="w-full h-full object-cover" />
        </div>
      );
    }

    return (
      <div
        className={`${baseClasses} bg-muted/40 flex items-center justify-center shadow-md ${
          size === "sm" ? "text-2xl" : "text-3xl"
        }`}
      >
        {event.image_url}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Browse Events</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Check out our upcoming events and book your tickets
        </p>
      </div>

      {/* Mobile */}
      <div className="block sm:hidden space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              Loading events...
            </CardContent>
          </Card>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No events available. Please check back later.</p>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id} className="glass-effect">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    {renderImage(event, "sm")}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base mb-1">{event.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {event.date ? new Date(event.date).toLocaleDateString() : "-"}
                      </p>
                      <p className="text-lg font-bold mt-1">฿{event.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(event.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={quantities[event.id] || 1}
                        onChange={(e) =>
                          setQuantities((prev) => ({
                            ...prev,
                            [event.id]: Math.max(1, parseInt(e.target.value, 10) || 1),
                          }))
                        }
                        className="w-16 text-center text-sm"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(event.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button
                      onClick={() => handleConfirmOrder(event)}
                      className="bg-gradient-primary hover:opacity-90 flex-1"
                      size="sm"
                    >
                      Order
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Desktop */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="text-left p-4 font-semibold text-sm">Event</th>
                  <th className="text-left p-4 font-semibold text-sm">Date</th>
                  <th className="text-left p-4 font-semibold text-sm">Price</th>
                  <th className="text-left p-4 font-semibold text-sm">Quantity</th>
                  <th className="text-left p-4 font-semibold text-sm">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground" colSpan={5}>
                      Loading events...
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground" colSpan={5}>
                      No events available. Please check back later.
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b last:border-0 hover:bg-muted/50 transition-smooth"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          {renderImage(event, "lg")}
                          <span className="font-semibold">{event.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {event.date ? new Date(event.date).toLocaleDateString() : "-"}
                      </td>
                      <td className="p-4 font-semibold">฿{event.price}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateQuantity(event.id, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={quantities[event.id] || 1}
                            onChange={(e) =>
                              setQuantities((prev) => ({
                                ...prev,
                                [event.id]: Math.max(1, parseInt(e.target.value, 10) || 1),
                              }))
                            }
                            className="w-20 text-center"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateQuantity(event.id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                      <td className="p-4">
                        <Button
                          onClick={() => handleConfirmOrder(event)}
                          className="bg-gradient-primary hover:opacity-90"
                        >
                          Order
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Events;
