import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, Clock } from "lucide-react";

const Reserve = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [partySize, setPartySize] = useState<number>(2);
  const [time, setTime] = useState<string>("19:00");

  const handleReserve = () => {
    if (!date) {
      toast.error("Please select a date");
      return;
    }
    
    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    const newReservation = {
      id: Date.now(),
      userId: currentUser.id,
      date: date.toISOString(),
      time,
      partySize,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    reservations.push(newReservation);
    localStorage.setItem('reservations', JSON.stringify(reservations));
    
    toast.success("Table reserved successfully!");
  };

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold mb-2">Reserve a Table</h1>
        <p className="text-muted-foreground">Choose your date, time, and party size</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
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
              disabled={(date) => date < new Date()}
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
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full"
                />
              </div>

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
                    <p>Time: {time}</p>
                    <p>Party Size: {partySize} {partySize === 1 ? 'person' : 'people'}</p>
                  </div>
                </div>

                <Button 
                  onClick={handleReserve}
                  className="w-full"
                  size="lg"
                >
                  Confirm Reservation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reserve;
