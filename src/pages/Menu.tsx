import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Minus, ShoppingCart } from "lucide-react";

const Menu = () => {
  const [cart, setCart] = useState<Record<number, number>>({});

  const menuItems = [
    {
      id: 1,
      category: "food",
      name: "Signature Burger",
      description: "Angus beef, special sauce, lettuce, cheese",
      price: 280,
      image: "🍔"
    },
    {
      id: 2,
      category: "food",
      name: "Truffle Pasta",
      description: "Creamy truffle sauce with mushrooms",
      price: 320,
      image: "🍝"
    },
    {
      id: 3,
      category: "food",
      name: "Caesar Salad",
      description: "Fresh romaine, parmesan, croutons",
      price: 180,
      image: "🥗"
    },
    {
      id: 4,
      category: "food",
      name: "Grilled Salmon",
      description: "With asparagus and lemon butter",
      price: 420,
      image: "🐟"
    },
    {
      id: 5,
      category: "drinks",
      name: "Mojito",
      description: "Rum, mint, lime, soda",
      price: 220,
      image: "🍹"
    },
    {
      id: 6,
      category: "drinks",
      name: "Craft Beer",
      description: "Local IPA on tap",
      price: 180,
      image: "🍺"
    },
    {
      id: 7,
      category: "drinks",
      name: "Espresso Martini",
      description: "Vodka, coffee liqueur, espresso",
      price: 260,
      image: "☕"
    },
    {
      id: 8,
      category: "drinks",
      name: "Fresh Juice",
      description: "Orange, apple, or pineapple",
      price: 120,
      image: "🥤"
    }
  ];

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
      const item = menuItems.find(i => i.id === parseInt(itemId));
      return sum + (item?.price || 0) * qty;
    }, 0);
  };

  const handleCheckout = () => {
    if (getTotalItems() === 0) {
      toast.error("Your cart is empty");
      return;
    }

    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    const orderItems = Object.entries(cart).map(([itemId, qty]) => {
      const item = menuItems.find(i => i.id === parseInt(itemId));
      return {
        ...item,
        quantity: qty
      };
    });

    const newOrder = {
      id: Date.now(),
      userId: currentUser.id,
      type: 'fnb',
      items: orderItems,
      total: getTotalPrice(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    orders.push(newOrder);
    localStorage.setItem('orders', JSON.stringify(orders));
    setCart({});
    toast.success("Order placed successfully!");
  };

  const renderMenuItems = (category: string) => {
    return menuItems
      .filter(item => item.category === category)
      .map(item => (
        <Card key={item.id} className="group hover:shadow-xl transition-smooth border-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-4xl mb-2">{item.image}</div>
                <CardTitle className="text-xl">{item.name}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </div>
              <Badge className="text-lg px-3 py-1">฿{item.price}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {cart[item.id] > 0 ? (
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => updateCart(item.id, -1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="font-semibold text-lg w-8 text-center">
                    {cart[item.id]}
                  </span>
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
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ));
  };

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Menu</h1>
          <p className="text-muted-foreground">Browse our food & drinks</p>
        </div>
        
        {getTotalItems() > 0 && (
          <Card className="glass-effect">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {getTotalItems()} items
                  </p>
                  <p className="text-xl font-bold">฿{getTotalPrice()}</p>
                </div>
                <Button onClick={handleCheckout} size="lg">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Checkout
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="food" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="food">Food</TabsTrigger>
          <TabsTrigger value="drinks">Drinks</TabsTrigger>
        </TabsList>
        
        <TabsContent value="food" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {renderMenuItems("food")}
          </div>
        </TabsContent>
        
        <TabsContent value="drinks" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {renderMenuItems("drinks")}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Menu;
