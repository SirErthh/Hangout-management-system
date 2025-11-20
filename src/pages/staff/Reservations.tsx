import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Users, CheckCircle, XCircle, LayoutGrid } from "lucide-react";
import { api, handleApiError } from "@/lib/api";
import { getFlatStatusBadgeClass, statusBadgeBase } from "@/lib/statusColors";
import { PaginationControls } from "@/components/PaginationControls";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

const PAGE_SIZE = 20;
const DEFAULT_STATS = {
  pending: 0,
  confirmed: 0,
  seated: 0,
  no_show: 0,
  canceled: 0,
  guest_total: 0,
};

const VIEW_OPTIONS: { value: "active" | "completed" | "all"; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
];

const DATE_RANGE_OPTIONS = [
  { label: "Today", value: 1 },
  { label: "Last 3 days", value: 3 },
  { label: "Last 7 days", value: 7 },
  { label: "Last 14 days", value: 14 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
];

const StaffReservations = () => {
  const navigate = useNavigate();
  // เก็บรายการจอง โต๊ะทั้งหมด และตัวช่วยกรอง/pagination
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"active" | "completed" | "all">("active");
  const [daysBack, setDaysBack] = useState(14);
  const [meta, setMeta] = useState({
    total: 0,
    per_page: PAGE_SIZE,
    page: 1,
    last_page: 1,
  });
  const [stats, setStats] = useState(DEFAULT_STATS);

  // ดึงข้อมูลจองพร้อมโต๊ะ
  const fetchReservations = useCallback(
    async (pageToLoad: number, signal?: AbortSignal) => {
      setLoading(true);
      try {
        const [reservationsRes, tablesRes] = await Promise.all([
          api.getReservations({ mine: false, page: pageToLoad, perPage: PAGE_SIZE, view, daysBack, signal }),
          api.getTables(signal),
        ]);
        if (!signal?.aborted) {
          const parseDate = (value?: string) => {
            if (!value) return Number.POSITIVE_INFINITY;
            const time = Date.parse(value);
            return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
          };
          const sortedReservations = [...(reservationsRes.reservations ?? [])].sort(
            (a, b) => parseDate(a.reservedDate) - parseDate(b.reservedDate),
          );
          setReservations(sortedReservations);
          setTables(tablesRes.tables ?? []);
          setMeta(
            reservationsRes.meta ?? {
              total: reservationsRes.reservations?.length ?? 0,
              per_page: PAGE_SIZE,
              page: pageToLoad,
              last_page: 1,
            },
          );
          setStats({
            pending: reservationsRes.stats?.pending ?? 0,
            confirmed: reservationsRes.stats?.confirmed ?? 0,
            seated: reservationsRes.stats?.seated ?? 0,
            no_show: reservationsRes.stats?.no_show ?? 0,
            canceled: reservationsRes.stats?.canceled ?? 0,
            guest_total: reservationsRes.stats?.guest_total ?? 0,
          });
        }
      } catch (error) {
        if (!signal?.aborted) {
          handleApiError(error, "Failed to load reservations");
          setReservations([]);
          setStats(DEFAULT_STATS);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [view, daysBack],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchReservations(page, controller.signal);
    return () => controller.abort();
  }, [fetchReservations, page]);

  useEffect(() => {
    const handler = () => {
      fetchReservations(page);
    };
    window.addEventListener("day-closure-updated", handler);
    return () => window.removeEventListener("day-closure-updated", handler);
  }, [fetchReservations, page]);

  const updateReservation = (updated: Reservation) => {
    setReservations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  // อัปเดตสถานะการจอง
  const handleStatusUpdate = async (reservationId: number, status: string) => {
    setUpdatingId(reservationId);
    try {
      const { reservation } = await api.updateReservationStatus(reservationId, status);
      updateReservation(reservation);
      toast.success(`Reservation updated to ${status}`);
      await fetchReservations(page);
    } catch (error) {
      handleApiError(error, "Failed to update reservation status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleManualAssign = (reservation: Reservation) => {
    navigate("/staff/table-assignment", { state: { reservation } });
  };

  const summary = useMemo(() => {
    return {
      pending: stats.pending ?? 0,
      confirmed: stats.confirmed ?? 0,
      totalGuests: stats.guest_total ?? 0,
    };
  }, [stats]);

  const perPage = meta.per_page ?? PAGE_SIZE;
  const totalReservations = meta.total ?? reservations.length;
  const totalPages = Math.max(1, meta.last_page ?? 1);
  const startItem = totalReservations === 0 ? 0 : (page - 1) * perPage + 1;
  const endItem = totalReservations === 0 ? 0 : Math.min(page * perPage, totalReservations);

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Reservations</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage table bookings</p>
        </div>
        <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
          <div className="flex flex-wrap justify-end gap-2">
            {VIEW_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={view === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setView(option.value);
                  setPage(1);
                }}
                disabled={loading && view === option.value}
              >
                {option.label}
              </Button>
            ))}
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
                        <CardDescription className="text-xs">{table.capacity} seats</CardDescription>
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
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Date range</span>
            <Select
              value={String(daysBack)}
              onValueChange={(value) => {
                setDaysBack(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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
            <p className="text-3xl font-bold">{totalReservations}</p>
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
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
              <Card key={reservation.id} className="glass-effect border-2 h-full flex flex-col">
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
                    <Badge
                      variant="outline"
                      className={`${statusBadgeBase} ${getFlatStatusBadgeClass(reservation.status)}`}
                    >
                      <span className="text-xs sm:text-sm capitalize">
                        {reservation.status.replace("_", " ")}
                      </span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
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

                  <div className="flex flex-wrap gap-2 mt-auto">
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border/40">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{startItem}</span>-
              <span className="font-medium">{endItem}</span> of{" "}
              <span className="font-medium">{totalReservations}</span> reservations
            </p>
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffReservations;
