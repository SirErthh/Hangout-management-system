import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Minus, ShoppingCart } from "lucide-react";

type MenuItem = {
  id: number;
  name: string;
  description?: string;
  price: number;
  // สคีมาใหม่
  type?: "food" | "drink";
  image_url?: string;
  is_active?: boolean;
  // รองรับของเก่า
  category?: string; // "food" | "drinks"
  image?: string;    // emoji | url
};

const Menu = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState<Record<number, number>>({});
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // --- normalize ข้อมูลให้เป็นสคีมาเดียวกัน ---
  const normalize = (items: any[]): MenuItem[] => {
    return (items || []).map((raw: any) => {
      const type: "food" | "drink" =
        raw.type ??
        (raw.category === "drinks" ? "drink" : raw.category) ??
        "food";

      const image_url: string =
        raw.image_url ?? raw.image ?? "";

      const is_active: boolean = raw.is_active ?? true;

      return {
        id: Number(raw.id),
        name: String(raw.name ?? ""),
        description: raw.description ? String(raw.description) : "",
        price: Number(raw.price ?? 0),
        type,
        image_url,
        is_active,
      };
    });
  };

  // --- โหลดเมนู + sync cart ---
  const load = () => {
    const raw = localStorage.getItem("menuItems");
    let parsed: any[] = raw ? JSON.parse(raw) : [];

    // default สำหรับครั้งแรก
    if (!raw) {
      parsed = [
        { id: 1, type: "food",  name: "Signature Burger", description: "Angus beef, special sauce, lettuce, cheese", price: 280, image_url: "🍔", is_active: true },
        { id: 2, type: "food",  name: "Truffle Pasta",    description: "Creamy truffle sauce with mushrooms",      price: 320, image_url: "🍝", is_active: true },
        { id: 3, type: "food",  name: "Caesar Salad",     description: "Fresh romaine, parmesan, croutons",        price: 180, image_url: "🥗", is_active: true },
        { id: 4, type: "food",  name: "Grilled Salmon",   description: "With asparagus and lemon butter",          price: 420, image_url: "🐟", is_active: true },
        { id: 5, type: "drink", name: "Mojito",           description: "Rum, mint, lime, soda",                    price: 220, image_url: "🍹", is_active: true },
        { id: 6, type: "drink", name: "Craft Beer",       description: "Local IPA on tap",                         price: 180, image_url: "🍺", is_active: true },
        { id: 7, type: "drink", name: "Espresso Martini", description: "Vodka, coffee liqueur, espresso",          price: 260, image_url: "☕", is_active: true },
        { id: 8, type: "drink", name: "Fresh Juice",      description: "Orange, apple, or pineapple",              price: 120, image_url: "🥤", is_active: true },
      ];
      localStorage.setItem("menuItems", JSON.stringify(parsed));
    }

    const normalized = normalize(parsed);
    setMenuItems(normalized);

    // sync cart: เก็บเฉพาะ id ที่ยังอยู่และยัง active
    setCart((prev) => {
      const activeId = new Set(normalized.filter(m => m.is_active !== false).map(m => m.id));
      const next: Record<number, number> = {};
      Object.entries(prev).forEach(([idStr, qty]) => {
        const id = Number(idStr);
        if (activeId.has(id) && (qty ?? 0) > 0) next[id] = qty;
      });
      return next;
    });
  };

  useEffect(() => {
    load();

    // listeners: รับการอัปเดตจากหน้าแอดมิน/แท็บอื่น/กลับมาโฟกัส
    const handleMenuUpdated = () => load();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "menuItems") load();
    };
    const handleFocus = () => load();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") load();
    };

    window.addEventListener("menu-updated", handleMenuUpdated);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("menu-updated", handleMenuUpdated);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateCart = (itemId: number, delta: number) => {
    setCart(prev => {
      const newQty = (prev[itemId] || 0) + delta;
      if (newQty <= 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [itemId]: newQty };
    });
  };

  const getTotalItems = () => Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const getTotalPrice = () => {
    return Object.entries(cart).reduce((sum, [itemId, qty]) => {
      const item = menuItems.find(i => i.id === Number(itemId));
      return sum + (item?.price || 0) * Number(qty);
    }, 0);
  };

  const handleCheckout = () => {
    if (getTotalItems() === 0) {
      toast.error("Your cart is empty");
      return;
    }

    const orderItems = Object.entries(cart).map(([itemId, qty]) => {
      const item = menuItems.find(i => i.id === Number(itemId));
      return {
        id: item?.id,
        name: item?.name,
        price: item?.price,
        quantity: Number(qty),
        lineTotal: (item?.price || 0) * Number(qty),
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

    const isImageLike =
      item.image_url &&
      (item.image_url.startsWith("http") ||
        item.image_url.startsWith("data:") ||
        item.image_url.startsWith("blob:"));

    return (
      <Card key={item.id} className="group hover:shadow-xl transition-smooth border-2">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isImageLike ? (
                <div className="w-full h-32 mb-2 overflow-hidden rounded-lg">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="text-4xl mb-2">{item.image_url || "🖼️"}</div>
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
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="font-semibold text-lg w-8 text-center">{qty}</span>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => updateCart(item.id, 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => updateCart(item.id, 1)}
                className="w-full"
                disabled={item.is_active === false}
              >
                <Plus className="h-4 w-4 mr-2" />
                {item.is_active === false ? "Unavailable" : "Add to Cart"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const foods = useMemo(
    () => menuItems.filter(i => i.type === "food" && i.is_active !== false),
    [menuItems]
  );
  const drinks = useMemo(
    () => menuItems.filter(i => i.type === "drink" && i.is_active !== false),
    [menuItems]
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Menu</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Browse our food & drinks</p>
        </div>

        {getTotalItems() > 0 && (
          <Card className="glass-effect w-full sm:w-auto">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                <div className="text-center sm:text-right">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {getTotalItems()} items
                  </p>
                  <p className="text-lg sm:text-xl font-bold">฿{getTotalPrice()}</p>
                </div>
                <Button onClick={handleCheckout} size="lg" className="w-full sm:w-auto">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Checkout
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="food" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="food" className="text-xs sm:text-sm">Food</TabsTrigger>
          <TabsTrigger value="drink" className="text-xs sm:text-sm">Drinks</TabsTrigger>
        </TabsList>

        <TabsContent value="food" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {foods.map(renderCard)}
            {foods.length === 0 && (
              <div className="text-center text-muted-foreground py-8 col-span-full">
                No food items available.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="drink" className="mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {drinks.map(renderCard)}
            {drinks.length === 0 && (
              <div className="text-center text-muted-foreground py-8 col-span-full">
                No drink items available.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Menu;
