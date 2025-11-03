import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, Users, Clock, CheckCircle, XCircle } from "lucide-react";

const StaffReservations = () => {
  const [reservations, setReservations] = useState([
    { id: 1, customer: "Alice Johnson", date: "2025-11-01", time: "19:00", partySize: 4, status: "pending" },
    { id: 2, customer: "Mike Brown", date: "2025-11-01", time: "20:30", partySize: 2, status: "pending" },
    { id: 3, customer: "Sarah Davis", date: "2025-11-02", time: "18:00", partySize: 6, status: "confirmed" }
  ]);

  const updateReservationStatus = (id: number, newStatus: string) => {
    setReservations(reservations.map(r => 
      r.id === id ? { ...r, status: newStatus } : r
    ));
    toast.success(`Reservation ${newStatus}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold mb-2">Reservations</h1>
        <p className="text-muted-foreground">Manage table bookings</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {reservations.filter(r => r.status === 'pending').length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Confirmed</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {reservations.filter(r => r.status === 'confirmed').length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Today's Total</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{reservations.length}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Total Guests</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {reservations.reduce((sum, r) => sum + r.partySize, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {reservations.map(reservation => (
          <Card key={reservation.id} className="glass-effect border-2">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Reservation #{reservation.id}</CardTitle>
                  <CardDescription>{reservation.customer}</CardDescription>
                </div>
                <Badge className={getStatusColor(reservation.status)}>
                  {reservation.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(reservation.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{reservation.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{reservation.partySize} guests</span>
                  </div>
                </div>

                {reservation.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateReservationStatus(reservation.id, 'confirmed')}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirm
                    </Button>
                    <Button
                      onClick={() => updateReservationStatus(reservation.id, 'cancelled')}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}

                {reservation.status !== 'pending' && (
                  <Select
                    value={reservation.status}
                    onValueChange={(newStatus) => updateReservationStatus(reservation.id, newStatus)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StaffReservations;
