import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Users, Clock, CheckCircle, XCircle } from "lucide-react";

const StaffReservations = () => {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);

  useEffect(() => {
    // Load reservations from localStorage
    const storedReservations = localStorage.getItem('reservations');
    if (storedReservations) {
      setReservations(JSON.parse(storedReservations));
    } else {
      const defaultReservations = [
        { id: 1, customer: "Alice Johnson", date: "2025-11-01", partySize: 4, status: "pending" },
        { id: 2, customer: "Mike Brown", date: "2025-11-01", partySize: 2, status: "pending" },
        { id: 3, customer: "Sarah Davis", date: "2025-11-02", partySize: 6, status: "confirmed", table: "4" }
      ];
      localStorage.setItem('reservations', JSON.stringify(defaultReservations));
      setReservations(defaultReservations);
    }

    // Load tables from localStorage
    const storedTables = localStorage.getItem('tables');
    if (storedTables) {
      setTables(JSON.parse(storedTables));
    } else {
      const defaultTables = [
        { id: 1, number: "1", capacity: 2, status: "available" },
        { id: 2, number: "2", capacity: 4, status: "available" },
        { id: 3, number: "3", capacity: 4, status: "occupied" },
        { id: 4, number: "4", capacity: 6, status: "available" },
        { id: 5, number: "5", capacity: 2, status: "occupied" },
        { id: 6, number: "6", capacity: 8, status: "available" },
        { id: 7, number: "7", capacity: 4, status: "available" },
        { id: 8, number: "8", capacity: 2, status: "available" },
      ];
      localStorage.setItem('tables', JSON.stringify(defaultTables));
      setTables(defaultTables);
    }
  }, []);

  const updateReservationStatus = (id: number, newStatus: string) => {
    const updated = reservations.map(r => 
      r.id === id ? { ...r, status: newStatus } : r
    );
    setReservations(updated);
    localStorage.setItem('reservations', JSON.stringify(updated));
    toast.success(`Reservation ${newStatus}`);
  };

  const handleAutoAssign = (reservation: any) => {
    // Find first available table that fits party size
    const availableTable = tables.find(t => 
      t.status === 'available' && t.capacity >= reservation.partySize
    );

    if (!availableTable) {
      toast.error('No available tables for this party size');
      return;
    }

    // Update reservation with table assignment
    const updatedReservations = reservations.map(r => 
      r.id === reservation.id 
        ? { ...r, status: 'confirmed', table: availableTable.number } 
        : r
    );
    setReservations(updatedReservations);
    localStorage.setItem('reservations', JSON.stringify(updatedReservations));

    // Update table to occupied
    const updatedTables = tables.map(t => 
      t.number === availableTable.number ? { ...t, status: 'occupied' } : t
    );
    setTables(updatedTables);
    localStorage.setItem('tables', JSON.stringify(updatedTables));

    toast.success(`Table ${availableTable.number} auto-assigned for ${reservation.customer}`);
  };

  const handleManualAssign = (reservation: any) => {
    navigate('/staff/table-assignment', { state: { reservation } });
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
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{reservation.partySize} guests</span>
                  </div>
                  {reservation.table && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">Table: {reservation.table}</span>
                    </div>
                  )}
                </div>

                {reservation.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAutoAssign(reservation)}
                      className="bg-green-500 hover:bg-green-600"
                      size="sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Auto Assign
                    </Button>
                    <Button
                      onClick={() => handleManualAssign(reservation)}
                      variant="outline"
                      size="sm"
                    >
                      Manual Assign
                    </Button>
                    <Button
                      onClick={() => updateReservationStatus(reservation.id, 'cancelled')}
                      variant="destructive"
                      size="sm"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}

                {reservation.status === 'confirmed' && (
                  <Badge className="bg-green-500">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmed
                  </Badge>
                )}

                {reservation.status === 'cancelled' && (
                  <Badge variant="destructive">
                    Cancelled
                  </Badge>
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
