import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Calendar, Users, Phone } from "lucide-react";

interface PendingReservation {
  date: string;
  partySize: number;
}

interface CustomerProfile {
  fname?: string;
  lname?: string;
  phone?: string;
}

const formatPhone = (phone?: string) => {
  if (!phone) return "Not provided";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return cleaned || "Not provided";
};

const ConfirmReservation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [reservation, setReservation] = useState<PendingReservation | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);

  useEffect(() => {
    const pending = location.state?.reservation as PendingReservation | undefined;
    if (pending && pending.date && pending.partySize >= 1) {
      setReservation(pending);
    } else {
      navigate("/reserve", { replace: true });
      return;
    }

    const storedUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (storedUser?.id) {
      setCustomer(storedUser);
    }
  }, [location.state, navigate]);

  const friendlyDate = useMemo(() => {
    if (!reservation) return "";
    const parsed = new Date(reservation.date);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleString(undefined, {
      dateStyle: "full",
      timeStyle: "short",
    });
  }, [reservation]);

  const handleConfirm = () => {
    if (!reservation) return;

    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "null");
    if (!currentUser?.id) {
      toast.error("Session expired. Please log in again.");
      navigate("/login");
      return;
    }

    const reservations = JSON.parse(localStorage.getItem("reservations") || "[]");

    const newReservation = {
      id: Date.now(),
      userId: currentUser.id,
      customer: `${currentUser.fname ?? ""} ${currentUser.lname ?? ""}`.trim(),
      date: reservation.date,
      partySize: reservation.partySize,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    reservations.push(newReservation);
    localStorage.setItem("reservations", JSON.stringify(reservations));

    toast.success("Reservation confirmed", {
      description: `We have secured a table for ${reservation.partySize} ${
        reservation.partySize === 1 ? "guest" : "guests"
      }.`,
    });

    navigate("/customer");
  };

  if (!reservation) {
    return null;
  }

  const guestLabel = reservation.partySize === 1 ? "Guest" : "Guests";

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Review Reservation Details</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Confirm the summary below before submitting your reservation. You can still edit the details if
          anything looks off.
        </p>
      </div>

      <Card className="glass-effect border-2">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-xl sm:text-2xl">Hangout Lounge</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2 text-xs sm:text-sm">
                <Calendar className="h-4 w-4" />
                {friendlyDate || "Date unavailable"}
              </CardDescription>
            </div>
            <Badge className="bg-blue-500">Table Reservation</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Reservation
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Date &amp; Time
                  </span>
                  <span className="font-medium text-right">
                    {friendlyDate || "Pending selection"}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    Party Size
                  </span>
                  <span className="font-medium">
                    {reservation.partySize} {guestLabel}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contact
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium text-right">
                    {`${customer?.fname ?? ""} ${customer?.lname ?? ""}`.trim() || "Not specified"}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    Phone
                  </span>
                  <span className="font-medium">{formatPhone(customer?.phone)}</span>
                </div>
              </div>
            </section>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              Please arrive at least 10 minutes before your slot. Tables are released if the party is more than 15 minutes late.
            </AlertDescription>
          </Alert>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
            Need to adjust later? Contact our team using the phone number in your confirmation email and reference the reservation date above.
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={() => navigate("/reserve")} className="flex-1">
              Make Changes
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              Confirm Reservation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmReservation;
