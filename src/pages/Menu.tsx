import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Plus, Minus, ShoppingCart, AlertCircle } from "lucide-react";
import { api, handleApiError } from "@/lib/api";

type MenuItem = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  type: "food" | "drink";
  image_url?: string | null;
  is_active?: boolean;
};

const Menu = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<Record<number, number>>({});
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingReservation, setCheckingReservation] = useState(true);
  const [hasConfirmedReservation, setHasConfirmedReservation] = useState(false);
  const [reservationError, setReservationError] = useState<string | null>(null);

  const fetchMenu = useCallback(async (signal?: AbortSignal) => {
    if (!signal) {
      setLoading(true);
    }
    try {
      const { items } = await api.getMenuItems(signal);
      setMenuItems(items || []);
      setCart((prev) => {
        const ids = new Set((items || []).map((item) => item.id));
        const next: Record<number, number> = {};
        Object.entries(prev).forEach(([idStr, qty]) => {
          const id = Number(idStr);
          if (ids.has(id) && qty > 0) {
            next[id] = qty;
          }
        });
        return next;
      });
    } catch (error) {
      if (!signal?.aborted) {
        handleApiError(error, "Failed to load menu items");
        setMenuItems([]);
        setCart({});
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetchMenu(controller.signal);

    return () => controller.abort();
  }, [fetchMenu]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchMenu();
    };
    window.addEventListener("menu-updated", handleRefresh);
    return () => window.removeEventListener("menu-updated", handleRefresh);
  }, [fetchMenu]);

  const loadReservationStatus = useCallback(
    async (signal?: AbortSignal) => {
      try {
        setCheckingReservation(true);
        setReservationError(null);
        const { reservations = [] } = await api.getReservations({ mine: true, signal });
        if (signal?.aborted) {
          return;
        }
        const hasConfirmed = reservations.some((reservation: any) =>
          ["confirmed", "seated"].includes(String(reservation.status ?? "").toLowerCase()),
        );
        setHasConfirmedReservation(hasConfirmed);
      } catch (error) {
        if (!signal?.aborted) {
          handleApiError(error, "Failed to verify reservation status");
          setReservationError("Unable to verify your reservation status right now.");
          setHasConfirmedReservation(false);
        }
      } finally {
        if (!signal?.aborted) {
          setCheckingReservation(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadReservationStatus(controller.signal);
    return () => controller.abort();
  }, [loadReservationStatus]);

  useEffect(() => {
    const handler = () => loadReservationStatus();
    window.addEventListener("day-closure-updated", handler);
    return () => window.removeEventListener("day-closure-updated", handler);
  }, [loadReservationStatus]);

  const activeItems = useMemo(
    () => menuItems.filter((item) => item.is_active !== false),
    [menuItems],
  );

  const categorized = useMemo(() => {
    const food = activeItems.filter((item) => item.type === "food");
    const drink = activeItems.filter((item) => item.type === "drink");
    return { food, drink };
  }, [activeItems]);

  const reservationBlocked =
    checkingReservation || !!reservationError || !hasConfirmedReservation;

  const updateCart = (itemId: number, delta: number) => {
    if (reservationBlocked) {
      if (checkingReservation) {
        toast.error("Checking your reservation status. Please wait a moment.");
      } else if (reservationError) {
        toast.error(reservationError);
      } else {
        toast.error("Please reserve a table and wait for confirmation before ordering food & beverages.");
      }
      return;
    }
    setCart((prev) => {
      const nextQty = (prev[itemId] || 0) + delta;
      if (nextQty <= 0) {
        const { [itemId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: nextQty };
    });
  };

  const getTotalItems = () => Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const getTotalPrice = () =>
    Object.entries(cart).reduce((sum, [id, qty]) => {
      const item = activeItems.find((i) => i.id === Number(id));
      return sum + (item?.price || 0) * qty;
    }, 0);

  const handleCheckout = () => {
    if (getTotalItems() === 0) {
      toast.error("Your cart is empty");
      return;
    }
    if (reservationBlocked) {
      if (checkingReservation) {
        toast.error("Checking your reservation status. Please wait a moment.");
      } else if (reservationError) {
        toast.error(reservationError);
      } else {
        toast.error("Please reserve a table and wait for confirmation before ordering food & beverages.");
      }
      return;
    }

    const orderItems = Object.entries(cart).map(([itemId, qty]) => {
      const item = activeItems.find((i) => i.id === Number(itemId));
      return {
        id: item?.id,
        name: item?.name,
        price: item?.price,
        quantity: Number(qty),
        lineTotal: (item?.price || 0) * Number(qty),
        remark: "",
      };
    });

    navigate("/confirm-menu", {
      state: {
        cart: orderItems,
        total: getTotalPrice(),
      },
    });
  };

  const renderCard = (item: MenuItem) => {
    const qty = cart[item.id] || 0;
    const image = item.image_url;
    const isImageLike =
      image &&
      (image.startsWith("http") ||
        image.startsWith("data:") ||
        image.startsWith("blob:") ||
        image.startsWith("/"));

    return (
      <Card
        key={item.id}
        className="glass-panel border-none group overflow-hidden transition-smooth hover:shadow-glow flex flex-col"
      >
        <div className="relative w-full h-40 rounded-[1.5rem] overflow-hidden border border-white/50 bg-muted/40">
          {isImageLike ? (
            <img src={image} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-5xl">
              {image || "🖼️"}
            </div>
          )}
          <Badge className="absolute top-3 left-3 bg-white/85 text-foreground border border-white/60 capitalize shadow-sm">
            {item.type}
          </Badge>
          <span className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-slate-900/85 text-white text-sm font-semibold shadow-glow">
            ฿{item.price.toLocaleString()}
          </span>
        </div>
        <CardContent className="p-5 flex flex-col gap-4 flex-1">
          <div>
            <CardTitle className="text-xl font-semibold">{item.name}</CardTitle>
            {item.description && (
              <CardDescription className="mt-1 text-sm leading-relaxed">
                {item.description}
              </CardDescription>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {qty > 0 ? (
              <div className="flex items-center gap-2 rounded-full bg-muted/70 px-3 py-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full border border-white/60 bg-white/80 text-foreground hover:bg-white"
                  onClick={() => updateCart(item.id, -1)}
                  disabled={reservationBlocked}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="font-semibold text-lg w-10 text-center">{qty}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-full border border-white/60 bg-white/80 text-foreground hover:bg-white"
                  onClick={() => updateCart(item.id, 1)}
                  disabled={reservationBlocked}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="gap-2 border border-white/70 bg-white/70 text-foreground hover:bg-white"
                onClick={() => updateCart(item.id, 1)}
                disabled={reservationBlocked}
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            )}
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {qty > 0 ? "In Cart" : "Price"}
              </p>
              <p className="text-lg font-semibold">
                ฿{(qty > 0 ? qty : 1) * item.price}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div className="relative glass-panel gradient-subtle border-none shadow-glow p-6 sm:p-8 space-y-4 overflow-hidden">
        <div className="absolute -top-16 right-6 h-40 w-40 rounded-full bg-gradient-to-br from-primary to-secondary opacity-30 blur-3xl" />
        <div className="absolute -bottom-10 left-0 h-32 w-32 rounded-full bg-gradient-to-br from-accent to-primary opacity-20 blur-2xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Signature Selections
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Food & Beverage Menu</h1>
            <p className="text-muted-foreground max-w-2xl">
              Curated bites and cocktails for your table. Place orders once your reservation is confirmed and we’ll handle the rest.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge
                variant={reservationBlocked ? "destructive" : "secondary"}
                className="px-3 py-1 shadow-sm"
              >
                {reservationBlocked ? "Reservation required" : "Reservation confirmed"}
              </Badge>
              <Badge variant="outline" className="bg-white/80 border-white/60 text-foreground shadow-sm">
                Cart: {getTotalItems()} items
              </Badge>
            </div>
          </div>
          <div className="shrink-0">
            <Button
              size="lg"
              className="gap-2 gradient-button hover:brightness-110"
              onClick={handleCheckout}
              disabled={getTotalItems() === 0 || reservationBlocked}
            >
              <ShoppingCart className="h-4 w-4" />
              Checkout ({getTotalItems()} items)
            </Button>
          </div>
        </div>
      </div>

      {checkingReservation && (
        <Alert className="glass-effect border-primary/20">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Checking your reservation status...</AlertDescription>
        </Alert>
      )}

      {reservationError && (
        <Alert variant="destructive" className="glass-effect border-destructive/30">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{reservationError}</AlertDescription>
        </Alert>
      )}

      {!checkingReservation && !reservationError && !hasConfirmedReservation && (
        <Alert variant="destructive" className="glass-effect border-destructive/30">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need a confirmed table reservation before ordering food & beverages. Please reserve a table and wait
            for staff confirmation first.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="food" className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:w-[360px] rounded-full bg-white/70 backdrop-blur border border-white/60 shadow-sm">
          <TabsTrigger
            value="food"
            className="rounded-full data-[state=active]:gradient-primary data-[state=active]:text-white"
          >
            Food
          </TabsTrigger>
          <TabsTrigger
            value="drink"
            className="rounded-full data-[state=active]:gradient-primary data-[state=active]:text-white"
          >
            Drinks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="food">
          {loading ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                Loading menu...
              </CardContent>
            </Card>
          ) : categorized.food.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No food items available right now.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categorized.food.map(renderCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="drink">
          {loading ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                Loading menu...
              </CardContent>
            </Card>
          ) : categorized.drink.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No drinks available right now.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categorized.drink.map(renderCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Menu;
