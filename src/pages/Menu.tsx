import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        const { reservations = [] } = await api.getReservations(true, signal);
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
      <Card key={item.id} className="group hover:shadow-xl transition-smooth border-2">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isImageLike ? (
                <div className="w-full h-32 mb-2 overflow-hidden rounded-lg">
                  <img src={image} alt={item.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="text-4xl mb-2">{image || "🖼️"}</div>
              )}
              <CardTitle className="text-xl">{item.name}</CardTitle>
              {item.description && <CardDescription>{item.description}</CardDescription>}
            </div>
            <Badge className="text-lg px-3 py-1">฿{item.price}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {qty > 0 ? (
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => updateCart(item.id, -1)}
                  disabled={reservationBlocked}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="font-semibold text-lg w-8 text-center">{qty}</span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => updateCart(item.id, 1)}
                  disabled={reservationBlocked}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="gap-2"
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-2">Food & Beverage Menu</h1>
          <p className="text-muted-foreground">Select items and place your order</p>
        </div>
        <Button
          size="lg"
          className="gap-2 bg-gradient-primary hover:opacity-90"
          onClick={handleCheckout}
          disabled={getTotalItems() === 0 || reservationBlocked}
        >
          <ShoppingCart className="h-4 w-4" />
          Checkout ({getTotalItems()} items)
        </Button>
      </div>

      {checkingReservation && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Checking your reservation status...</AlertDescription>
        </Alert>
      )}

      {reservationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{reservationError}</AlertDescription>
        </Alert>
      )}

      {!checkingReservation && !reservationError && !hasConfirmedReservation && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You need a confirmed table reservation before ordering food & beverages. Please reserve a table and wait
            for staff confirmation first.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="food" className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:w-[360px]">
          <TabsTrigger value="food">Food</TabsTrigger>
          <TabsTrigger value="drink">Drinks</TabsTrigger>
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
