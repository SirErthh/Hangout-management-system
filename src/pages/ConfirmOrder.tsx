import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Ticket, Calendar, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { api, handleApiError } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ConfirmOrder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // เก็บข้อมูล order + โต๊ะที่เลือก + รายละเอียดงาน
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [seatingSelection, setSeatingSelection] = useState<any>(null);
  const [eventDetails, setEventDetails] = useState<any>(location.state?.event ?? null);

  // ตรวจว่า state ครบไหม ถ้าไม่ให้ย้อนกลับ
  useEffect(() => {
    if (location.state?.order && location.state?.seating) {
      setOrderDetails(location.state.order);
      setSeatingSelection(location.state.seating);
      if (location.state?.event) {
        setEventDetails(location.state.event);
      }
    } else if (location.state?.order && !location.state?.seating) {
      navigate(`/events/${location.state.order.eventId}/seating`, { replace: true, state: { order: location.state.order, event: location.state?.event } });
    } else {
      navigate('/events');
    }
  }, [location, navigate]);

  // กดยืนยันคำสั่งซื้อ
  const handleConfirm = async () => {
    if (!orderDetails) return;
    if (!orderDetails.eventId) {
      toast.error("Event information is missing");
      return;
    }

    try {
      const { order } = await api.orderTickets(orderDetails.eventId, {
        quantity: orderDetails.quantity,
        price: orderDetails.price,
        reservation: seatingSelection,
      });

      toast.success("Order Confirmed!", {
        description: `${order.quantity}x ${order.event} - Total: ${order.total.toFixed?.(2) ?? order.total} THB`,
      });

      navigate('/my-orders');
    } catch (error) {
      handleApiError(error, "Failed to confirm order");
      const maybeMessage =
        (error as any)?.payload?.message ||
        (error as any)?.message ||
        "";
      if (
        typeof maybeMessage === "string" &&
        maybeMessage.toLowerCase().includes("table")
      ) {
        navigate(`/events/${orderDetails.eventId}/seating`, {
          replace: true,
          state: { order: orderDetails, event: eventDetails },
        });
      }
    }
  };

  const arrivalReminder = useMemo(() => {
    if (!orderDetails) return null;
    const startsAt = orderDetails.startsAt ?? orderDetails.starts_at;
    if (!startsAt) return null;
    const eventDate = new Date(startsAt);
    if (Number.isNaN(eventDate.getTime())) return null;
    const reminderTime = new Date(eventDate.getTime() - 2 * 60 * 60 * 1000);
    return reminderTime.toLocaleString();
  }, [orderDetails]);

  const seatingSummary = useMemo(() => {
    if (!seatingSelection) return "Seating information unavailable.";
    const labels = seatingSelection.table_labels;
    if (Array.isArray(labels) && labels.length) {
      return `Tables: ${labels.join(", ")}`;
    }
    return "Table reservation recorded.";
  }, [seatingSelection]);

  if (!orderDetails || !seatingSelection) {
    return (
      <div className="p-6 flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Preparing your order…
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Confirm Your Order</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Review your event ticket order</p>
      </div>

      {arrivalReminder && (
        <Alert className="glass-effect border-primary/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Please arrive by <strong>{arrivalReminder}</strong> (2 hours before the show) so we can
            finalize payment and seat your party.
          </AlertDescription>
        </Alert>
      )}

      <Alert className="glass-effect border-yellow-500/40 bg-yellow-500/10">
        <AlertDescription className="text-sm">
          Selected tables are held for 30 minutes after you confirm. If you do not check in within
          that window, they may be released to other guests.
        </AlertDescription>
      </Alert>

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
            <Badge className="bg-green-500 text-white">Event Ticket</Badge>
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

          <div className="rounded-2xl border border-white/40 p-4 space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Seating</p>
            <p className="text-base font-semibold">{seatingSummary}</p>
            {seatingSelection?.note && (
              <p className="text-sm text-muted-foreground">Note: {seatingSelection.note}</p>
            )}
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
