import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users } from "lucide-react";

const TableAssignment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const reservation = location.state?.reservation;
  
  const [tables, setTables] = useState([
    { id: 1, number: "1", capacity: 2, status: "available" },
    { id: 2, number: "2", capacity: 4, status: "available" },
    { id: 3, number: "3", capacity: 4, status: "occupied" },
    { id: 4, number: "4", capacity: 6, status: "available" },
    { id: 5, number: "5", capacity: 2, status: "occupied" },
    { id: 6, number: "6", capacity: 8, status: "available" },
    { id: 7, number: "7", capacity: 4, status: "available" },
    { id: 8, number: "8", capacity: 2, status: "available" },
  ]);

  const handleAssignTable = (tableNumber: string) => {
    if (!reservation) return;
    
    // Update reservation status
    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    const updated = reservations.map((r: any) =>
      r.id === reservation.id ? { ...r, status: 'confirmed', table: tableNumber } : r
    );
    localStorage.setItem('reservations', JSON.stringify(updated));
    
    // Update table to occupied
    const updatedTables = tables.map(t => 
      t.number === tableNumber ? { ...t, status: 'occupied' } : t
    );
    setTables(updatedTables);
    
    toast.success(`Table ${tableNumber} assigned and marked as occupied!`);
    navigate('/staff/reservations');
  };

  if (!reservation) {
    navigate('/staff/reservations');
    return null;
  }

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold mb-2">Assign Table</h1>
        <p className="text-muted-foreground">
          Select a table for {reservation.customer} ({reservation.partySize} guests)
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {tables.map((table) => (
          <Card 
            key={table.id}
            className={`glass-effect border-2 cursor-pointer transition-smooth ${
              table.status === 'occupied'
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:shadow-xl hover:scale-105'
            }`}
            onClick={() => table.status === 'available' && handleAssignTable(table.number)}
          >
            <CardHeader>
              <CardTitle className="text-center text-4xl">
                {table.number}
              </CardTitle>
              <CardDescription className="text-center flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                {table.capacity} seats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`text-center py-2 rounded-lg font-semibold ${
                table.status === 'available' 
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-red-500/20 text-red-500'
              }`}>
                {table.status}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button 
        variant="outline" 
        onClick={() => navigate('/staff/reservations')}
        className="w-full"
      >
        Cancel
      </Button>
    </div>
  );
};

export default TableAssignment;
