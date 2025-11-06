import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { api, handleApiError } from "@/lib/api";

type TableRow = {
  id: number;
  number: string;
  capacity: number;
  status: "available" | "occupied" | "inactive";
};

const TableAssignment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const reservation = location.state?.reservation;

  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadTables = async () => {
      setLoading(true);
      try {
        const { tables: fetched } = await api.getTables(controller.signal);
        if (!controller.signal.aborted) {
          setTables(fetched ?? []);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          handleApiError(error, "Failed to load tables");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadTables();

    return () => controller.abort();
  }, []);

  const handleAssignTable = async (table: TableRow) => {
    if (!reservation) {
      navigate("/staff/reservations");
      return;
    }

    setAssigningId(table.id);
    try {
      await api.assignReservationTable(reservation.id, table.id);
      toast.success(`Table ${table.number} assigned and marked as occupied!`);
      navigate("/staff/reservations", { replace: true });
    } catch (error) {
      handleApiError(error, "Failed to assign table");
    } finally {
      setAssigningId(null);
    }
  };

  if (!reservation) {
    navigate("/staff/reservations", { replace: true });
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

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Loading tables...
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-4 gap-4">
          {tables.map((table) => (
            <Card
              key={table.id}
              className={`glass-effect border-2 cursor-pointer transition-smooth ${
                table.status !== "available" || table.capacity < reservation.partySize
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:shadow-xl hover:scale-105"
              }`}
              onClick={() => {
                if (
                  assigningId === null &&
                  table.status === "available" &&
                  table.capacity >= reservation.partySize
                ) {
                  handleAssignTable(table);
                }
              }}
            >
              <CardHeader>
                <CardTitle className="text-center text-4xl">{table.number}</CardTitle>
                <CardDescription className="text-center flex items-center justify-center gap-2">
                  <Users className="h-4 w-4" />
                  {table.capacity} seats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-center py-2 rounded-lg font-semibold ${
                    table.status === "available"
                      ? "bg-green-500/20 text-green-500"
                      : table.status === "inactive"
                      ? "bg-yellow-500/20 text-yellow-600"
                      : "bg-red-500/20 text-red-500"
                  }`}
                >
                  {table.status}
                </div>
                {table.capacity < reservation.partySize && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    Capacity too small
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        onClick={() => navigate("/staff/reservations")}
        className="w-full"
        disabled={assigningId !== null}
      >
        Cancel
      </Button>
    </div>
  );
};

export default TableAssignment;
