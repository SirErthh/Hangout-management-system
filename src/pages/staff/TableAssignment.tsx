import { useEffect, useMemo, useState } from "react";
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

  // เก็บข้อมูลโต๊ะ สถานะโหลด และโหมดรวมโต๊ะ
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTableIds, setSelectedTableIds] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [combineMode, setCombineMode] = useState(false);

  // โหลดโต๊ะทั้งหมด
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

  useEffect(() => {
    setSelectedTableIds([]);
  }, [tables, combineMode]);

  const tableOrderMap = useMemo(() => {
    const map: Record<number, number> = {};
    tables.forEach((table, index) => {
      map[table.id] = index;
    });
    return map;
  }, [tables]);

  const selectedTables = useMemo(
    () => tables.filter((table) => selectedTableIds.includes(table.id)),
    [tables, selectedTableIds],
  );

  const totalCapacity = useMemo(
    () => selectedTables.reduce((sum, table) => sum + table.capacity, 0),
    [selectedTables],
  );

  const areAdjacent = useMemo(() => {
    if (selectedTables.length <= 1) {
      return true;
    }
    const sorted = [...selectedTables].sort(
      (a, b) => (tableOrderMap[a.id] ?? 0) - (tableOrderMap[b.id] ?? 0),
    );
    for (let i = 1; i < sorted.length; i++) {
      const prevOrder = tableOrderMap[sorted[i - 1].id] ?? 0;
      const currentOrder = tableOrderMap[sorted[i].id] ?? 0;
      if (currentOrder - prevOrder !== 1) {
        return false;
      }
    }
    return true;
  }, [selectedTables, tableOrderMap]);

  const capacityMet = reservation ? totalCapacity >= reservation.partySize : false;
  const canAssign =
    Boolean(reservation) && selectedTableIds.length > 0 && areAdjacent && capacityMet && !assigning;

  const assignSingleTable = async (tableId: number, label: string) => {
    if (!reservation) return;
    setAssigning(true);
    try {
      await api.assignReservationTable(reservation.id, tableId);
      toast.success(`Table ${label} assigned successfully`);
      navigate("/staff/reservations", { replace: true });
    } catch (error) {
      handleApiError(error, "Failed to assign table");
    } finally {
      setAssigning(false);
    }
  };

  const toggleSelection = (table: TableRow) => {
    if (table.status !== "available") {
      return;
    }

    if (!combineMode) {
      if (table.capacity < reservation.partySize) {
        toast.error("Table capacity too small. Enable combine mode to merge tables.");
        return;
      }
      assignSingleTable(table.id, table.number);
      return;
    }

    setSelectedTableIds((prev) =>
      prev.includes(table.id) ? prev.filter((id) => id !== table.id) : [...prev, table.id],
    );
  };

  const handleAssignSelected = async () => {
    if (!reservation || !canAssign) {
      return;
    }
    const orderedIds = [...selectedTableIds].sort(
      (a, b) => (tableOrderMap[a] ?? 0) - (tableOrderMap[b] ?? 0),
    );

    setAssigning(true);
    try {
      await api.assignReservationTable(reservation.id, orderedIds);
      toast.success("Tables assigned and marked as occupied!");
      navigate("/staff/reservations", { replace: true });
    } catch (error) {
      handleApiError(error, "Failed to assign tables");
    } finally {
      setAssigning(false);
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
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">
                {combineMode
                  ? "Select adjacent tables to cover the full party size, then click Assign."
                  : "Click a table to assign immediately. Enable combine mode to merge tables."}
              </p>
            </div>
            <Button
              variant={combineMode ? "default" : "outline"}
              onClick={() => setCombineMode((prev) => !prev)}
              disabled={assigning}
            >
              {combineMode ? "Combine mode: ON" : "Combine mode: OFF"}
            </Button>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {tables.map((table) => {
              const isSelected = selectedTableIds.includes(table.id);
              const isDisabled = table.status !== "available";
              return (
                <Card
                  key={table.id}
                  className={`glass-effect border-2 cursor-pointer transition-smooth ${
                    isDisabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-xl hover:scale-105"
                  } ${isSelected ? "ring-2 ring-primary border-primary" : ""}`}
                  onClick={() => toggleSelection(table)}
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
                    {isSelected && (
                      <p className="text-xs text-center text-primary mt-2 font-semibold">
                        Selected
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {combineMode && (
            <Card className="glass-effect border-2">
              <CardHeader>
                <CardTitle>Selection Summary</CardTitle>
                <CardDescription>
                  Combine adjacent tables until you reach the required capacity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Selected tables</span>
                  <span className="font-semibold">
                    {selectedTables.length > 0
                      ? selectedTables.map((table) => table.number).join(" + ")
                      : "None"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total capacity</span>
                  <span className="font-semibold">
                    {totalCapacity} / {reservation.partySize} guests
                  </span>
                </div>
                {!areAdjacent && (
                  <p className="text-xs text-red-500">
                    Selected tables must be next to each other.
                  </p>
                )}
                {!capacityMet && selectedTables.length > 0 && (
                  <p className="text-xs text-red-500">
                    Combined capacity is not enough for this reservation.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="w-1/3"
                    onClick={() => setSelectedTableIds([])}
                    disabled={selectedTableIds.length === 0 || assigning}
                  >
                    Clear
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleAssignSelected}
                    disabled={!canAssign}
                  >
                    {assigning ? "Assigning..." : "Assign Selected Tables"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Button
        variant="outline"
        onClick={() => navigate("/staff/reservations")}
        className="w-full"
        disabled={assigning}
      >
        Cancel
      </Button>
    </div>
  );
};

export default TableAssignment;
