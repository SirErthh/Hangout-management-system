import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Users, CheckCircle, XCircle, LayoutGrid } from "lucide-react";

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
    const availableTable = tables.find((t: any) =>
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
    const updatedTables = tables.map((t: any) =>
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
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Reservations</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage table bookings</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <LayoutGrid className="h-4 w-4" />
              Table Status
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Table Status Overview</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-4">
              {tables.map((table: any) => (
                <Card
                  key={String(table.id)}
                  className={`glass-effect border-2 ${
                    table.status === "occupied" ? "border-red-500/50" : "border-green-500/50"
                  }`}
                >
                  <CardHeader className="p-4 text-center">
                    <CardTitle className="text-2xl">{table.number}</CardTitle>
                    <CardDescription className="text-xs">
                      {table.capacity} seats
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-2">
                    <div
                      className={`text-center py-1 rounded text-xs font-semibold ${
                        table.status === "available"
                          ? "bg-green-500/20 text-green-500"
                          : "bg-red-500/20 text-red-500"
                      }`}
                    >
                      {table.status}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div> {/* ✅ CLOSE the header container */}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
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
        {reservations.map((reservation: any) => (
          <Card key={reservation.id} className="glass-effect border-2">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-base sm:text-lg">Reservation #{reservation.id}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">{reservation.customer}</CardDescription>
                </div>
                <Badge className={getStatusColor(reservation.status)}>
                  <span className="text-xs sm:text-sm">{reservation.status}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{new Date(reservation.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{reservation.partySize} guests</span>
                  </div>
                  {reservation.table && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <span className="font-semibold">Table: {reservation.table}</span>
                    </div>
                  )}
                </div>

                {reservation.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => handleAutoAssign(reservation)}
                      className="bg-green-500 hover:bg-green-600 w-full sm:w-auto"
                      size="sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Auto Assign
                    </Button>
                    <Button
                      onClick={() => handleManualAssign(reservation)}
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      Manual Assign
                    </Button>
                    <Button
                      onClick={() => updateReservationStatus(reservation.id, 'cancelled')}
                      variant="destructive"
                      size="sm"
                      className="w-full sm:w-auto"
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
