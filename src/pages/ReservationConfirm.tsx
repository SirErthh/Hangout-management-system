import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Calendar, Users, Phone, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { api, authStorage, handleApiError } from "@/lib/api";

type ReservationState = {
  date?: string;
  partySize?: number;
  note?: string;
};

const ReservationConfirm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const state = (location.state ?? {}) as ReservationState;

  const isPayloadValid = Boolean(state.date && state.partySize && state.partySize > 0);

  useEffect(() => {
    if (!isPayloadValid) {
      navigate("/reserve", { replace: true });
    }
  }, [isPayloadValid, navigate]);

  const currentUser = authStorage.getUser();

  const formattedDate = useMemo(() => {
    if (!state.date) {
      return "-";
    }
    try {
      return new Date(state.date).toLocaleString();
    } catch {
      return "-";
    }
  }, [state.date]);

  const handleConfirm = async () => {
    if (!isPayloadValid || !state.date || !state.partySize) {
      toast.error("Missing reservation details. Please try again.");
      navigate("/reserve", { replace: true });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createReservation({
        date: state.date,
        partySize: state.partySize,
        note: state.note,
      });
      toast.success("Reservation submitted successfully!");
      navigate("/my-orders");
    } catch (error) {
      handleApiError(error, "Unable to submit reservation");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isPayloadValid) {
    return null;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Confirm Your Reservation</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Please review the details before submitting your reservation.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => navigate("/reserve")}>
          <ArrowLeft className="h-4 w-4" />
          Edit Details
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="glass-effect border-2">
          <CardHeader>
            <CardTitle>Reservation Summary</CardTitle>
            <CardDescription>Verify the information below</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
              <Calendar className="h-5 w-5 text-primary" />
              <div className="text-sm">
                <p className="font-medium">Date & Time</p>
                <p className="text-muted-foreground">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
              <Users className="h-5 w-5 text-primary" />
              <div className="text-sm">
                <p className="font-medium">Party Size</p>
                <p className="text-muted-foreground">
                  {state.partySize} {state.partySize === 1 ? "guest" : "guests"}
                </p>
              </div>
            </div>
            {state.note && (
              <Alert>
                <AlertDescription>{state.note}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="glass-effect border-2">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>We will use this to reach you if necessary</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
              <Mail className="h-5 w-5 text-primary" />
              <div className="text-sm">
                <p className="font-medium">Email</p>
                <p className="text-muted-foreground">{currentUser?.email ?? "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
              <Phone className="h-5 w-5 text-primary" />
              <div className="text-sm">
                <p className="font-medium">Phone</p>
                <p className="text-muted-foreground">{currentUser?.phone ?? "Not provided"}</p>
              </div>
            </div>
            <Alert>
              <AlertDescription>
                Make sure your contact details are up to date in your profile in case we need to
                reach you about your reservation.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
        <Button variant="outline" onClick={() => navigate("/reserve")} disabled={isSubmitting}>
          Back
        </Button>
        <Button onClick={handleConfirm} disabled={isSubmitting} className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {isSubmitting ? "Submitting..." : "Confirm Reservation"}
        </Button>
      </div>
    </div>
  );
};

export default ReservationConfirm;
