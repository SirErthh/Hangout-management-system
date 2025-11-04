import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

const Events = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>([]);
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({});

  // โหลด events + sync quantities
  const load = () => {
    const raw = localStorage.getItem("events");
    const parsed = raw ? JSON.parse(raw) : [];
    setEvents(parsed);

    setQuantities((prev) => {
      const next: { [key: number]: number } = {};
      parsed.forEach((evt: any) => {
        next[evt.id] = prev[evt.id] ?? 1;
      });
      return next;
    });
  };

  useEffect(() => {
    load();

    // handler แยกชื่อเพื่อถอด event listener ได้ถูกต้อง
    const handleEventsUpdated = () => load();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "events") load();
    };
    const handleFocus = () => load();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") load();
    };

    window.addEventListener("events-updated", handleEventsUpdated);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("events-updated", handleEventsUpdated);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateQuantity = (id: number, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta),
    }));
  };

  const handleConfirmOrder = (event: any) => {
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
          ticketCodePrefix: event.ticketCodePrefix || "GEF",
        },
      },
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Browse Events</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Check out our upcoming events and book your tickets</p>
      </div>

      {/* Mobile: Card layout, Desktop: Table layout */}
      <div className="block sm:hidden space-y-4">
        {events.length === 0 ? (
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
                    {event.image_url ? (
                      (event.image_url.startsWith("http") ||
                        event.image_url.startsWith("data:") ||
                        event.image_url.startsWith("blob:")) ? (
                        <div className="w-20 h-16 rounded-lg overflow-hidden shadow-md flex-shrink-0">
                          <img
                            src={event.image_url}
                            alt={event.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-20 h-16 rounded-lg bg-muted/40 flex items-center justify-center text-2xl shadow-md flex-shrink-0">
                          {event.image_url}
                        </div>
                      )
                    ) : (
                      <div className="w-20 h-16 rounded-lg bg-gradient-primary flex items-center justify-center shadow-md flex-shrink-0">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                    )}
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
                            [event.id]: Math.max(1, parseInt(e.target.value) || 1),
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

      {/* Desktop: Table layout */}
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
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b last:border-0 hover:bg-muted/50 transition-smooth"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        {event.image_url ? (
                          (event.image_url.startsWith("http") ||
                            event.image_url.startsWith("data:") ||
                            event.image_url.startsWith("blob:")) ? (
                            <div className="w-24 h-16 rounded-lg overflow-hidden shadow-md">
                              <img
                                src={event.image_url}
                                alt={event.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-24 h-16 rounded-lg bg-muted/40 flex items-center justify-center text-3xl shadow-md">
                              {event.image_url}
                            </div>
                          )
                        ) : (
                          <div className="w-24 h-16 rounded-lg bg-gradient-primary flex items-center justify-center shadow-md">
                            <Calendar className="h-8 w-8 text-white" />
                          </div>
                        )}
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
                              [event.id]: Math.max(1, parseInt(e.target.value) || 1),
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
                ))}

                {events.length === 0 && (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground" colSpan={5}>
                      No events available. Please check back later.
                    </td>
                  </tr>
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
