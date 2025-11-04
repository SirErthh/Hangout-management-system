import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Users, AlertCircle, Calendar as CalendarIcon } from "lucide-react";

const Reserve = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [partySize, setPartySize] = useState<number>(2);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [eventDates, setEventDates] = useState<string[]>([]);

  useEffect(() => {
    // Load event dates from localStorage
    const events = JSON.parse(localStorage.getItem('events') || '[]');
    const dates = events.map((e: any) => e.date);
    setEventDates(dates);
  }, []);

  const isEventDate = (selectedDate: Date | undefined) => {
    if (!selectedDate) return false;
    const dateStr = selectedDate.toISOString().split('T')[0];
    return eventDates.includes(dateStr);
  };

  const handleReserve = () => {
    if (!date) {
      toast.error("Please select a date");
      return;
    }

    if (isEventDate(date)) {
      setShowEventDialog(true);
      return;
    }
    
    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    const newReservation = {
      id: Date.now(),
      userId: currentUser.id,
      customer: `${currentUser.fname} ${currentUser.lname}`,
      date: date.toISOString(),
      partySize,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    reservations.push(newReservation);
    localStorage.setItem('reservations', JSON.stringify(reservations));
    
    toast.success("Table reserved successfully!");
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Reserve a Table</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Choose your date, time, and party size</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="glass-effect border-2">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>Pick your preferred date</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-effect border-2">
            <CardHeader>
              <CardTitle>Reservation Details</CardTitle>
              <CardDescription>Complete your booking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Tables are available until 10:00 PM. If not confirmed, reservations will be released automatically.
                </AlertDescription>
              </Alert>

              {isEventDate(date) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This date has an event. Reservations are closed. Please purchase event tickets instead.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="partySize" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Party Size
                </Label>
                <Input
                  id="partySize"
                  type="number"
                  min="1"
                  max="20"
                  value={partySize}
                  onChange={(e) => setPartySize(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="pt-4 space-y-3">
                <div className="p-4 rounded-lg bg-primary/10 space-y-2">
                  <p className="text-sm font-medium">Reservation Summary</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Date: {date?.toLocaleDateString()}</p>
                    <p>Party Size: {partySize} {partySize === 1 ? 'person' : 'people'}</p>
                  </div>
                </div>

                <Button 
                  onClick={handleReserve}
                  className="w-full"
                  size="lg"
                  disabled={isEventDate(date)}
                >
                  Confirm Reservation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event Day - Reservations Closed</DialogTitle>
            <DialogDescription>
              This date has a special event. Table reservations are not available. 
              Would you like to purchase event tickets instead?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowEventDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowEventDialog(false);
              window.location.href = '/events';
            }}>
              View Events
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reserve;
