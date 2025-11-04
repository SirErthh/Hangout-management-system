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

  useEffect(() => {
    const storedEvents = localStorage.getItem('events');
    if (storedEvents) {
      const parsedEvents = JSON.parse(storedEvents);
      setEvents(parsedEvents);
      const initialQty: { [key: number]: number } = {};
      parsedEvents.forEach((evt: any) => {
        initialQty[evt.id] = 1;
      });
      setQuantities(initialQty);
    }
  }, []);

  const updateQuantity = (id: number, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta),
    }));
  };

  const handleConfirmOrder = (event: any) => {
    const qty = quantities[event.id] || 1;
    navigate('/confirm-order', {
      state: {
        order: {
          eventId: event.id,
          event: event.name,
          date: event.date,
          price: event.price,
          quantity: qty,
          total: event.price * qty,
          ticketCodePrefix: event.ticketCodePrefix || 'GEF'
        }
      }
    });
  };

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold mb-2">Browse Events</h1>
        <p className="text-muted-foreground">Check out our upcoming events and book your tickets</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">Event</th>
                  <th className="text-left p-4 font-semibold">Date</th>
                  <th className="text-left p-4 font-semibold">Price</th>
                  <th className="text-left p-4 font-semibold">Quantity</th>
                  <th className="text-left p-4 font-semibold">Action</th>
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
                        {event.image ? (
                          <div className="w-24 h-16 rounded-lg overflow-hidden shadow-md">
                            <img src={event.image} alt={event.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-24 h-16 rounded-lg bg-gradient-primary flex items-center justify-center shadow-md">
                            <Calendar className="h-8 w-8 text-white" />
                          </div>
                        )}
                        <span className="font-semibold">{event.name}</span>
                      </div>
                    </td>
                    <td className="p-4">{new Date(event.date).toLocaleDateString()}</td>
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
                            setQuantities({
                              ...quantities,
                              [event.id]: Math.max(1, parseInt(e.target.value) || 1),
                            })
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
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Events;
