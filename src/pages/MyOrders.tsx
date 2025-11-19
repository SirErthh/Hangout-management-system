import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, UtensilsCrossed, Ticket, Eye } from "lucide-react";
import { api, handleApiError } from "@/lib/api";
import { getFlatStatusBadgeClass, statusBadgeBase } from "@/lib/statusColors";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";

type TicketOrder = {
  id: number;
  event: string;
  status: string;
  quantity: number;
  total: number;
  createdAt: string;
  tickets?: string[];
  reservation?: {
    id?: number;
    table?: string;
    tables?: string[];
    status?: string;
    isPlaceholder?: boolean;
    holdExpiresAt?: string | null;
  };
};

type Reservation = {
  id: number;
  event: string | null;
  partySize: number;
  status: string;
  reservedDate?: string;
  table?: string | null;
  tables?: string[];
  tableIds?: number[];
  tableCapacity?: number | null;
  ticketOrderId?: number | null;
  isEventReservation?: boolean;
};

type FnbOrder = {
  id: number;
  status: string;
  createdAt: string;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    line_total?: number;
    remark?: string | null;
  }>;
};

const MyOrders = () => {
  const [ticketOrders, setTicketOrders] = useState<TicketOrder[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [fnbOrders, setFnbOrders] = useState<FnbOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const ticketPagination = usePagination(ticketOrders);
  const reservationPagination = usePagination(reservations);
  const fnbPagination = usePagination(fnbOrders);

  useEffect(() => {
    const controller = new AbortController();
    const safeDate = (value?: string | null) => {
      if (!value) return 0;
      const time = Date.parse(value);
      return Number.isNaN(time) ? 0 : time;
    };

    const sortByDateDesc = <T,>(list: T[], getDate: (item: T) => number) =>
      [...(list ?? [])].sort((a, b) => getDate(b) - getDate(a));

    const load = async () => {
      setLoading(true);
      try {
        const [ticketRes, reservationRes, fnbRes] = await Promise.all([
          api.getTicketOrders({ mine: true, perPage: 100, view: "all", signal: controller.signal }),
          api.getReservations({ mine: true, perPage: 100, view: "all", signal: controller.signal }),
          api.getFnbOrders({ mine: true, signal: controller.signal }),
        ]);

        setTicketOrders(sortByDateDesc(ticketRes.orders ?? [], (order) => safeDate(order.createdAt)));
        setReservations(
          sortByDateDesc(reservationRes.reservations ?? [], (reservation) => safeDate(reservation.reservedDate ?? reservation.createdAt)),
        );
        setFnbOrders(sortByDateDesc(fnbRes.orders ?? [], (order) => safeDate(order.createdAt)));
      } catch (error) {
        if (!controller.signal.aborted) {
          handleApiError(error, "Failed to load your orders");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => controller.abort();
  }, []);

  const renderTicketContent = () => {
    if (loading) {
      return (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">Loading tickets...</CardContent>
        </Card>
      );
    }

    if (ticketOrders.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No ticket orders yet</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {ticketPagination.pageItems.map((order) => {
            const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-";
            return (
              <Card key={order.id} className="glass-effect h-full flex flex-col">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base sm:text-lg">{order.event}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Order #{order.id} • {createdAt}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${statusBadgeBase} ${getFlatStatusBadgeClass(order.status)}`}
                    >
                      <span className="text-xs sm:text-sm capitalize">{order.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantity:</span>
                    <span className="font-medium">{order.quantity} tickets</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-bold">฿{order.total.toFixed(2)}</span>
                  </div>
                  {order.reservation && (
                    <div className="rounded-2xl border border-white/40 px-3 py-2 text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Table</span>
                        <span className="font-semibold">
                          {order.reservation.table ||
                            (order.reservation.tables && order.reservation.tables.length
                              ? order.reservation.tables.join(" + ")
                              : "Unassigned")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className="capitalize">{order.reservation.status ?? "pending"}</span>
                      </div>
                      {order.reservation.isPlaceholder && (
                        <p className="text-xs text-muted-foreground">
                          Placeholder reservation — please see staff upon arrival.
                        </p>
                      )}
                    </div>
                  )}
                  {order.tickets && order.tickets.length > 0 && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          View Ticket Codes
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Ticket Codes</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2">
                          {order.tickets.map((code, idx) => (
                            <div key={idx} className="p-3 bg-muted rounded-lg font-mono text-center text-lg">
                              {code}
                            </div>
                          ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border/40">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{ticketPagination.startItem}</span>-
            <span className="font-medium">{ticketPagination.endItem}</span> of{" "}
            <span className="font-medium">{ticketPagination.totalItems}</span> orders
          </p>
          <PaginationControls
            page={ticketPagination.page}
            totalPages={ticketPagination.totalPages}
            onPageChange={ticketPagination.setPage}
          />
        </div>
      </>
    );
  };

  const renderReservationsContent = () => {
    if (loading) {
      return (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Loading reservations...
          </CardContent>
        </Card>
      );
    }

    if (reservations.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No reservations yet</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {reservationPagination.pageItems.map((reservation) => {
            const reservedDate = reservation.reservedDate
              ? new Date(reservation.reservedDate)
              : null;
            const dateLabel = reservedDate ? reservedDate.toLocaleDateString() : "-";
            const timeLabel = reservedDate
              ? reservedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "-";
            const tableLabel =
              reservation.tables && reservation.tables.length > 0
                ? reservation.tables.join(" + ")
                : reservation.table;

            return (
              <Card key={reservation.id} className="glass-effect h-full flex flex-col">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base sm:text-lg">
                        Reservation #{reservation.id}
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {reservation.event ?? "Normal Reservation"}
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
                <CardContent className="flex-1">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Date:</span>
                      <span className="font-medium">{dateLabel}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time:</span>
                      <span className="font-medium">{timeLabel}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Party Size:</span>
                      <span className="font-medium">
                        {reservation.partySize} {reservation.partySize === 1 ? "person" : "people"}
                      </span>
                    </div>
                    {tableLabel ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Table:</span>
                        <span className="font-medium">{tableLabel}</span>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border/40">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{reservationPagination.startItem}</span>-
            <span className="font-medium">{reservationPagination.endItem}</span> of{" "}
            <span className="font-medium">{reservationPagination.totalItems}</span> reservations
          </p>
          <PaginationControls
            page={reservationPagination.page}
            totalPages={reservationPagination.totalPages}
            onPageChange={reservationPagination.setPage}
          />
        </div>
      </>
    );
  };

  const renderFnbContent = () => {
    if (loading) {
      return (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">Loading orders...</CardContent>
        </Card>
      );
    }

    if (fnbOrders.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <UtensilsCrossed className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No F&B orders yet</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {fnbPagination.pageItems.map((order) => {
            const created = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "-";
            return (
              <Card key={order.id} className="glass-effect h-full flex flex-col">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base sm:text-lg">Food & Beverage Order</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        Order #{order.id} • {created}
                      </CardDescription>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${statusBadgeBase} ${getFlatStatusBadgeClass(order.status)}`}
                    >
                      <span className="text-xs sm:text-sm capitalize">{order.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-3">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>
                            {item.name} ×{item.quantity}
                          </span>
                          <span className="font-medium">
                            ฿{((item.line_total ?? item.price * item.quantity) || 0).toFixed(2)}
                          </span>
                        </div>
                        {item.remark && (
                          <p className="text-xs text-muted-foreground">Remark: {item.remark}</p>
                        )}
                      </div>
                    ))}
                    <div className="pt-2 border-t flex justify-between text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-bold">฿{order.total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-border/40">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{fnbPagination.startItem}</span>-
            <span className="font-medium">{fnbPagination.endItem}</span> of{" "}
            <span className="font-medium">{fnbPagination.totalItems}</span> orders
          </p>
          <PaginationControls
            page={fnbPagination.page}
            totalPages={fnbPagination.totalPages}
            onPageChange={fnbPagination.setPage}
          />
        </div>
      </>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Orders</h1>
        <p className="text-muted-foreground text-sm sm:text-base">View all your bookings and purchases</p>
      </div>

      <Tabs defaultValue="tickets" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tickets" className="text-xs sm:text-sm">
            <Ticket className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Tickets</span>
          </TabsTrigger>
          <TabsTrigger value="reservations" className="text-xs sm:text-sm">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Reservations</span>
          </TabsTrigger>
          <TabsTrigger value="fnb" className="text-xs sm:text-sm">
            <UtensilsCrossed className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">F&B</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-6 space-y-4">
          {renderTicketContent()}
        </TabsContent>

        <TabsContent value="reservations" className="mt-6 space-y-4">
          {renderReservationsContent()}
        </TabsContent>

        <TabsContent value="fnb" className="mt-6 space-y-4">
          {renderFnbContent()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyOrders;
