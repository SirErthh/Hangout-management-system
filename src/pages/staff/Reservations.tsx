import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Users, CheckCircle, XCircle, LayoutGrid } from "lucide-react";
import { api, handleApiError } from "@/lib/api";

type Reservation = {
  id: number;
  customer: string;
  event: string;
  partySize: number;
  status: string;
  table?: string | null;
  tables?: string[];
  tableIds?: number[];
  tableCapacity?: number | null;
  reservedDate?: string;
  assigned_table_id?: number | null;
};

type TableRow = {
  id: number;
  number: string;
  capacity: number;
  status: "available" | "occupied" | "inactive";
};

const StaffReservations = () => {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadTables = async () => {
    try {
      const { tables: fetched } = await api.getTables();
      setTables(fetched ?? []);
    } catch (error) {
      handleApiError(error, "Failed to load table status");
    }
  };

  const fetchReservations = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const [reservationsRes, tablesRes] = await Promise.all([
          api.getReservations(false, signal),
          api.getTables(signal),
        ]);
        if (!signal?.aborted) {
          setReservations(reservationsRes.reservations ?? []);
          setTables(tablesRes.tables ?? []);
        }
      } catch (error) {
        if (!signal?.aborted) {
          handleApiError(error, "Failed to load reservations");
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchReservations(controller.signal);
    return () => controller.abort();
  }, [fetchReservations]);

  useEffect(() => {
    const handler = () => {
      fetchReservations();
    };
    window.addEventListener("day-closure-updated", handler);
    return () => window.removeEventListener("day-closure-updated", handler);
  }, [fetchReservations]);

  const updateReservation = (updated: Reservation) => {
    setReservations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleStatusUpdate = async (reservationId: number, status: string) => {
    setUpdatingId(reservationId);
    try {
      const { reservation } = await api.updateReservationStatus(reservationId, status);
      updateReservation(reservation);
      toast.success(`Reservation updated to ${status}`);
      await fetchReservations();
    } catch (error) {
      handleApiError(error, "Failed to update reservation status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleManualAssign = (reservation: Reservation) => {
    navigate("/staff/table-assignment", { state: { reservation } });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "confirmed":
      case "seated":
        return "bg-green-500";
      case "completed":
        return "bg-blue-500";
      case "canceled":
      case "cancelled":
      case "no_show":
        return "bg-red-500";
      default:
        return "bg-blue-500";
    }
  };

  const summary = useMemo(() => {
    return {
      pending: reservations.filter((r) => r.status === "pending").length,
      confirmed: reservations.filter((r) => r.status === "confirmed").length,
      totalGuests: reservations.reduce((sum, r) => sum + r.partySize, 0),
    };
  }, [reservations]);

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
              {tables.map((table) => (
                <Card
                  key={table.id}
                  className={`glass-effect border-2 ${
                    table.status === "occupied"
                      ? "border-red-500/50"
                      : table.status === "inactive"
                      ? "border-yellow-500/50"
                      : "border-green-500/50"
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
                          : table.status === "inactive"
                          ? "bg-yellow-500/20 text-yellow-600"
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
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.pending}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Confirmed</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.confirmed}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Total Reservations</CardDescription>
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
            <p className="text-3xl font-bold">{summary.totalGuests}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Loading reservations...
          </CardContent>
        </Card>
      ) : reservations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No reservations yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => {
            const reservedDate = reservation.reservedDate
              ? new Date(reservation.reservedDate)
              : null;
            const dateLabel = reservedDate ? reservedDate.toLocaleDateString() : "-";
            const timeLabel = reservedDate
              ? reservedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "-";
            const normalizedStatus = reservation.status?.toLowerCase?.() ?? "";
            const isConfirmed =
              normalizedStatus === "confirmed" ||
              normalizedStatus === "seated" ||
              normalizedStatus === "completed";
            const isCancelled =
              normalizedStatus === "cancelled" ||
              normalizedStatus === "canceled" ||
              normalizedStatus === "no_show";
            const canAssignTable = !(isConfirmed || isCancelled) && !reservation.assigned_table_id;
            const canMarkConfirmed = !(isConfirmed || isCancelled);
            const canSeatGuests = normalizedStatus === "confirmed";

            return (
              <Card key={reservation.id} className="glass-effect border-2">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base sm:text-lg">
                        Reservation #{reservation.id}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {reservation.customer} • {reservation.event}
                      </CardDescription>
                      <CardDescription className="text-xs sm:text-sm flex items-center gap-1 mt-1">
                        <Users className="h-3 w-3" />
                        {reservation.partySize} guests
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(reservation.status)}>
                      <span className="text-xs sm:text-sm capitalize">
                        {reservation.status.replace("_", " ")}
                      </span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
                    <div>
                      <p className="text-muted-foreground">Date</p>
                      <p className="font-medium">{dateLabel}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Time</p>
                      <p className="font-medium">{timeLabel}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Table</p>
                      <p className="font-medium">
                        {reservation.tables && reservation.tables.length > 0
                          ? reservation.tables.join(" + ")
                          : reservation.table ?? "Unassigned"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {canMarkConfirmed && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleStatusUpdate(reservation.id, "confirmed")}
                        disabled={updatingId === reservation.id}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Confirmed
                      </Button>
                    )}
                    {canSeatGuests && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleStatusUpdate(reservation.id, "seated")}
                        disabled={updatingId === reservation.id}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Seat Guests
                      </Button>
                    )}
                    {!isCancelled && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusUpdate(reservation.id, "canceled")}
                        disabled={updatingId === reservation.id}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    )}
                    {canAssignTable && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleManualAssign(reservation)}
                        disabled={updatingId === reservation.id}
                      >
                        Assign Table
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StaffReservations;
