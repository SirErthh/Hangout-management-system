import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Ticket, CheckCircle, XCircle, Search, Eye, Loader2 } from "lucide-react";
import { api, handleApiError } from "@/lib/api";
import { getFlatStatusBadgeClass, statusBadgeBase } from "@/lib/statusColors";
import { Textarea } from "@/components/ui/textarea";
import { PaginationControls } from "@/components/PaginationControls";

type TicketOrder = {
  id: number;
  order_code?: string;
  customer?: string;
  event?: string;
  quantity: number;
  total: number;
  status: "pending" | "confirmed" | "cancelled";
  tickets: string[];
  confirmedTickets?: string[];
  reservation?: {
    table?: string | null;
    tables?: string[];
    status?: string;
    holdExpiresAt?: string | null;
    isPlaceholder?: boolean;
  };
};

const PAGE_SIZE = 20;
const DEFAULT_STATS: Record<string, number> = {
  pending: 0,
  confirmed: 0,
  cancelled: 0,
  revenue: 0,
};

const VIEW_OPTIONS: { value: "active" | "completed" | "all"; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
];

const StaffTickets = () => {
  const [orders, setOrders] = useState<TicketOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ticketNoteDialog, setTicketNoteDialog] = useState<{ orderId: number; code: string } | null>(null);
  const [ticketNote, setTicketNote] = useState("");
  const [confirmingTicketNote, setConfirmingTicketNote] = useState(false);
  const [confirmAllDialog, setConfirmAllDialog] = useState<number | null>(null);
  const [confirmAllNote, setConfirmAllNote] = useState("");
  const [confirmingAllNotes, setConfirmingAllNotes] = useState(false);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"active" | "completed" | "all">("active");
  const [meta, setMeta] = useState({
    total: 0,
    per_page: PAGE_SIZE,
    page: 1,
    last_page: 1,
  });
  const [stats, setStats] = useState(DEFAULT_STATS);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const loadOrders = useCallback(
    async (pageToLoad: number, signal?: AbortSignal) => {
      setLoading(true);
      try {
        const payload = await api.getTicketOrders({
          mine: false,
          page: pageToLoad,
          perPage: PAGE_SIZE,
          view,
          query: debouncedSearch || undefined,
          signal,
        });
        if (!signal?.aborted) {
          setOrders((payload.orders ?? []) as TicketOrder[]);
          setMeta(
            payload.meta ?? {
              total: payload.orders?.length ?? 0,
              per_page: PAGE_SIZE,
              page: pageToLoad,
              last_page: 1,
            },
          );
          setStats({
            pending: payload.stats?.pending ?? 0,
            confirmed: payload.stats?.confirmed ?? 0,
            cancelled: payload.stats?.cancelled ?? 0,
            revenue: payload.stats?.revenue ?? 0,
          });
        }
      } catch (error) {
        if (!signal?.aborted) {
          handleApiError(error, "Failed to load ticket orders");
          setOrders([]);
          setStats(DEFAULT_STATS);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [view, debouncedSearch],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadOrders(page, controller.signal);
    return () => controller.abort();
  }, [loadOrders, page]);

  const replaceOrder = (updated: TicketOrder) => {
    setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));
  };

  const updateOrderStatus = async (orderId: number, newStatus: TicketOrder["status"]) => {
    try {
      const { order } = await api.updateTicketOrderStatus(orderId, newStatus);
      replaceOrder(order);
      toast.success(`Order ${newStatus}`);
      await loadOrders(page);
    } catch (error) {
      handleApiError(error, "Failed to update order status");
    }
  };

  const confirmTicket = async (orderId: number, ticketCode: string, note?: string) => {
    try {
      const { order } = await api.confirmTicket(orderId, ticketCode, note);
      replaceOrder(order);
      toast.success(`Ticket ${ticketCode} confirmed`);
      await loadOrders(page);
      return true;
    } catch (error) {
      handleApiError(error, "Failed to confirm ticket");
      return false;
    }
  };

  const confirmAllTickets = async (orderId: number, note?: string) => {
    try {
      const { order } = await api.confirmAllTickets(orderId, note);
      replaceOrder(order);
      toast.success("All tickets confirmed");
      await loadOrders(page);
      return true;
    } catch (error) {
      handleApiError(error, "Failed to confirm all tickets");
      return false;
    }
  };

  const openTicketNoteDialog = (orderId: number, code: string) => {
    setTicketNoteDialog({ orderId, code });
    setTicketNote("");
  };

  const handleTicketNoteConfirm = async () => {
    if (!ticketNoteDialog) return;
    setConfirmingTicketNote(true);
    try {
      const payload = ticketNote.trim();
      const succeeded = await confirmTicket(
        ticketNoteDialog.orderId,
        ticketNoteDialog.code,
        payload.length > 0 ? payload : undefined,
      );
      if (succeeded) {
        setTicketNoteDialog(null);
        setTicketNote("");
      }
    } finally {
      setConfirmingTicketNote(false);
    }
  };

  const openConfirmAllDialog = (orderId: number) => {
    setConfirmAllDialog(orderId);
    setConfirmAllNote("");
  };

  const handleConfirmAll = async () => {
    if (confirmAllDialog === null) return;
    setConfirmingAllNotes(true);
    try {
      const payload = confirmAllNote.trim();
      const succeeded = await confirmAllTickets(confirmAllDialog, payload.length > 0 ? payload : undefined);
      if (succeeded) {
        setConfirmAllDialog(null);
        setConfirmAllNote("");
      }
    } finally {
      setConfirmingAllNotes(false);
    }
  };

  const summary = useMemo(() => {
    return {
      pending: stats.pending ?? 0,
      confirmed: stats.confirmed ?? 0,
      revenue: stats.revenue ?? 0,
    };
  }, [stats]);

  const perPage = meta.per_page ?? PAGE_SIZE;
  const totalOrders = meta.total ?? orders.length;
  const totalPages = Math.max(1, meta.last_page ?? 1);
  const startItem = totalOrders === 0 ? 0 : (page - 1) * perPage + 1;
  const endItem = totalOrders === 0 ? 0 : Math.min(page * perPage, totalOrders);

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Ticket Orders</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage and process ticket purchases</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ticket, customer, or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
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
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 mb-6">
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Pending Orders</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.pending}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Confirmed Orders</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.confirmed}</p>
          </CardContent>
        </Card>
        <Card className="glass-effect">
          <CardHeader className="pb-2">
            <CardDescription>Total Revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">฿{Number(summary.revenue || 0).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading ticket orders…
        </div>
      ) : orders.length === 0 ? (
        <Card className="glass-effect border-2">
          <CardContent className="py-12 text-center text-muted-foreground">
            No ticket orders to display.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {orders.map((order) => {
              const confirmedTickets = order.confirmedTickets ?? [];
              return (
              <Card key={order.id} className="glass-effect border-2 h-full flex flex-col">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base sm:text-lg">
                        Order #{order.id}
                        {order.order_code ? ` • ${order.order_code}` : ""}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm break-words">
                        {order.customer} • {order.event}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${statusBadgeBase} ${getFlatStatusBadgeClass(order.status)}`}
                    >
                      <span className="text-xs sm:text-sm">{order.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-3">
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <Ticket className="h-4 w-4" />
                        <span>{order.quantity} tickets</span>
                      </div>
                      <p className="text-xl sm:text-2xl font-bold">
                        ฿{Number(order.total || 0).toLocaleString()}
                      </p>
                    </div>
                    {order.reservation && (
                      <div className="rounded-2xl border border-white/30 p-3 text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Table</span>
                          <span className="font-semibold">
                            {order.reservation.table ||
                              (order.reservation.tables?.length
                                ? order.reservation.tables.join(" + ")
                                : order.reservation.isPlaceholder
                                  ? "Placeholder"
                                  : "Unassigned")}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Reservation Status</span>
                          <span className="capitalize">
                            {order.reservation.status ?? "pending"}
                          </span>
                        </div>
                        {order.reservation.holdExpiresAt && order.status === "pending" && (
                          <p className="text-xs text-destructive">
                            Hold expires at{" "}
                            {new Date(order.reservation.holdExpiresAt).toLocaleString()}
                          </p>
                        )}
                        {order.reservation.isPlaceholder && (
                          <p className="text-xs text-muted-foreground">
                            Placeholder guest — assign seating after confirming payment.
                          </p>
                        )}
                      </div>
                    )}

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          View Ticket Codes
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Ticket Codes - Order #{order.id}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {order.tickets?.map((code, idx) => {
                            const isConfirmed = confirmedTickets.includes(code);
                            return (
                              <div key={idx} className="flex items-center gap-2">
                                <div className="flex-1 p-2 bg-muted rounded font-mono text-center">
                                  {code}
                                </div>
                                {order.status === "pending" && !isConfirmed && (
                                  <Button
                                    size="sm"
                                    onClick={() => openTicketNoteDialog(order.id, code)}
                                    className="bg-green-500 hover:bg-green-600"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                {isConfirmed && <Badge className="bg-green-500 text-white">✓</Badge>}
                              </div>
                            );
                          })}
                        </div>
                        {order.status === "pending" && (
                          <Button
                            onClick={() => openConfirmAllDialog(order.id)}
                            className="w-full bg-green-500 hover:bg-green-600"
                          >
                            Confirm All Tickets
                          </Button>
                        )}
                      </DialogContent>
                    </Dialog>

                    {order.status === "pending" && (
                      <Button
                        onClick={() => updateOrderStatus(order.id, "cancelled")}
                        variant="destructive"
                        size="sm"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Order
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
              <span className="font-medium">{totalOrders}</span> orders
            </p>
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}
      </div>

      <Dialog
        open={!!ticketNoteDialog}
        onOpenChange={(open) => {
          if (!open) {
            setTicketNoteDialog(null);
            setTicketNote("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Ticket</DialogTitle>
            <DialogDescription>
              {ticketNoteDialog ? `Ticket code ${ticketNoteDialog.code}` : "Confirm ticket"}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={ticketNote}
            onChange={(event) => setTicketNote(event.target.value)}
            placeholder="Optional note..."
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setTicketNoteDialog(null);
                setTicketNote("");
              }}
              disabled={confirmingTicketNote}
            >
              Cancel
            </Button>
            <Button onClick={handleTicketNoteConfirm} disabled={confirmingTicketNote}>
              {confirmingTicketNote ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirm Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmAllDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmAllDialog(null);
            setConfirmAllNote("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm All Tickets</DialogTitle>
            <DialogDescription>
              {confirmAllDialog ? `Order #${confirmAllDialog}` : "Confirm all tickets"}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={confirmAllNote}
            onChange={(event) => setConfirmAllNote(event.target.value)}
            placeholder="Optional note for this batch..."
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmAllDialog(null);
                setConfirmAllNote("");
              }}
              disabled={confirmingAllNotes}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmAll} disabled={confirmingAllNotes}>
              {confirmingAllNotes ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Confirm All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StaffTickets;
