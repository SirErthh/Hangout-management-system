import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calendar, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

const Events = () => {
  const [quantities, setQuantities] = useState<{ [key: number]: number }>({
    101: 1,
    102: 1,
  });

  const events = [
    { id: 101, name: "Jazz Night", date: "20 Nov 2025", price: 250 },
    { id: 102, name: "Rock & Chill", date: "22 Nov 2025", price: 300 },
  ];

  const updateQuantity = (id: number, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta),
    }));
  };

  const handleConfirmOrder = (event: typeof events[0]) => {
    const qty = quantities[event.id] || 1;
    toast.success("Order Confirmed!", {
      description: `${qty}x ${event.name} - Total: ${event.price * qty} THB`,
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
                        <div className="w-24 h-16 rounded-lg bg-gradient-primary flex items-center justify-center shadow-md">
                          <Calendar className="h-8 w-8 text-white" />
                        </div>
                        <span className="font-semibold">{event.name}</span>
                      </div>
                    </td>
                    <td className="p-4">{event.date}</td>
                    <td className="p-4 font-semibold">{event.price} THB</td>
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
                        Confirm Order
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
