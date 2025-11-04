import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Ticket, Calendar, Clock } from "lucide-react";

const ConfirmOrder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    if (location.state?.order) {
      setOrderDetails(location.state.order);
    } else {
      navigate('/events');
    }
  }, [location, navigate]);

  const generateTicketCodes = (quantity: number, prefix: string): string[] => {
    const codes: string[] = [];
    const existingOrders = JSON.parse(localStorage.getItem('ticketOrders') || '[]');
    
    let lastNumber = 0;
    existingOrders.forEach((order: any) => {
      if (order.tickets && order.tickets.length > 0) {
        order.tickets.forEach((ticket: string) => {
          if (ticket.startsWith(prefix)) {
            const match = ticket.match(/\d+$/);
            if (match) {
              const num = parseInt(match[0]);
              if (num > lastNumber) {
                lastNumber = num;
              }
            }
          }
        });
      }
    });

    for (let i = 0; i < quantity; i++) {
      const codeNumber = (lastNumber + i + 1).toString().padStart(3, '0');
      codes.push(`${prefix}${codeNumber}`);
    }

    return codes;
  };

  const handleConfirm = () => {
    if (!orderDetails) return;

    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const orders = JSON.parse(localStorage.getItem('ticketOrders') || '[]');
    
    const prefix = orderDetails.ticketCodePrefix || 'GEF';
    const tickets = generateTicketCodes(orderDetails.quantity, prefix);

    const newOrder = {
      id: Date.now(),
      userId: currentUser.id,
      customer: `${currentUser.fname} ${currentUser.lname}`,
      event: orderDetails.event,
      quantity: orderDetails.quantity,
      total: orderDetails.total,
      tickets: tickets,
      status: 'pending',
      createdAt: new Date().toISOString(),
      date: orderDetails.date
    };

    orders.push(newOrder);
    localStorage.setItem('ticketOrders', JSON.stringify(orders));

    toast.success("Order Confirmed!", {
      description: `${orderDetails.quantity}x ${orderDetails.event} - Total: ${orderDetails.total} THB (Pay at door)`
    });

    navigate('/my-orders');
  };

  if (!orderDetails) return null;

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Confirm Your Order</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Review your event ticket order</p>
      </div>

      <Card className="glass-effect border-2">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-xl sm:text-2xl">{orderDetails.event}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2 text-xs sm:text-sm">
                <Calendar className="h-4 w-4" />
                {orderDetails.date}
              </CardDescription>
            </div>
            <Badge className="bg-green-500">Event Ticket</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Separator />
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-semibold">{orderDetails.quantity} tickets</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Price per ticket</span>
              <span className="font-semibold">{orderDetails.price} THB</span>
            </div>

            <Separator />

            <div className="flex items-center justify-between text-base sm:text-lg">
              <span className="font-semibold">Total Amount</span>
              <span className="font-bold text-xl sm:text-2xl">{orderDetails.total} THB</span>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Ticket className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-yellow-500">Payment at Door</p>
                  <p className="text-muted-foreground mt-1">
                    You will receive {orderDetails.quantity} ticket code(s) after confirmation. 
                    Payment will be collected at the venue. Maximum capacity: 100 guests.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate('/events')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              Confirm Order
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmOrder;
