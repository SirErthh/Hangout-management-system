import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Ticket, CheckCircle, XCircle, Search, Eye, Loader2 } from "lucide-react";
import { api, handleApiError } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";

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
};

const StaffTickets = () => {
  const [orders, setOrders] = useState<TicketOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketNoteDialog, setTicketNoteDialog] = useState<{ orderId: number; code: string } | null>(null);
  const [ticketNote, setTicketNote] = useState("");
  const [confirmingTicketNote, setConfirmingTicketNote] = useState(false);
  const [confirmAllDialog, setConfirmAllDialog] = useState<number | null>(null);
  const [confirmAllNote, setConfirmAllNote] = useState("");
  const [confirmingAllNotes, setConfirmingAllNotes] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadOrders = async () => {
      setLoading(true);
      try {
        const { orders: fetched } = await api.getTicketOrders(false, controller.signal);
        if (!controller.signal.aborted) {
          setOrders((fetched ?? []) as TicketOrder[]);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          handleApiError(error, "Failed to load ticket orders");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadOrders();
    return () => controller.abort();
  }, []);

  const replaceOrder = (updated: TicketOrder) => {
    setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));
  };

  const updateOrderStatus = async (orderId: number, newStatus: TicketOrder["status"]) => {
    try {
      const { order } = await api.updateTicketOrderStatus(orderId, newStatus);
      replaceOrder(order);
      toast.success(`Order ${newStatus}`);
    } catch (error) {
      handleApiError(error, "Failed to update order status");
    }
  };

  const confirmTicket = async (orderId: number, ticketCode: string, note?: string) => {
    try {
      const { order } = await api.confirmTicket(orderId, ticketCode, note);
      replaceOrder(order);
      toast.success(`Ticket ${ticketCode} confirmed`);
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

  const getStatusColor = (status: TicketOrder["status"]) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500 text-white";
      case "confirmed":
        return "bg-green-500 text-white";
      case "cancelled":
        return "bg-red-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) => {
      const ticketsMatch = order.tickets?.some((code) => code.toLowerCase().includes(query));
      const orderCodeMatch = order.order_code?.toLowerCase().includes(query);
      const customerMatch = `${order.customer ?? ""}`.toLowerCase().includes(query);
      const eventMatch = `${order.event ?? ""}`.toLowerCase().includes(query);
      return ticketsMatch || orderCodeMatch || customerMatch || eventMatch;
    });
  }, [orders, searchQuery]);

  const summary = useMemo(() => {
    const pending = orders.filter((o) => o.status === "pending").length;
    const confirmed = orders.filter((o) => o.status === "confirmed").length;
    const total = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    return { pending, confirmed, total };
  }, [orders]);

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Ticket Orders</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage and process ticket purchases</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ticket, customer, or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
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
            <p className="text-3xl font-bold">฿{summary.total.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading ticket orders…
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="glass-effect border-2">
          <CardContent className="py-12 text-center text-muted-foreground">
            No ticket orders to display.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const confirmedTickets = order.confirmedTickets ?? [];
            return (
              <Card key={order.id} className="glass-effect border-2">
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
                    <Badge className={getStatusColor(order.status)}>
                      <span className="text-xs sm:text-sm">{order.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
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
