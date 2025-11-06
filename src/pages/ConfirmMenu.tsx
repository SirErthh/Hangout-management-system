import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { UtensilsCrossed } from "lucide-react";
import { api, handleApiError } from "@/lib/api";

const ConfirmMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (location.state?.cart) {
      setCartItems(location.state.cart);
    } else {
      navigate('/menu');
    }
  }, [location, navigate]);

  const getTotalPrice = () => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleConfirm = async () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        items: cartItems.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
      };

      const { order } = await api.orderMenu(payload);
      toast.success("Order confirmed!", {
        description: `Total: ${order.total?.toFixed ? order.total.toFixed(2) : getTotalPrice()} THB`,
      });
      navigate("/my-orders", { replace: true });
    } catch (error) {
      handleApiError(error, "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const total = getTotalPrice();

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Confirm Your Order</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Review your food & beverage order</p>
      </div>

      <Card className="glass-effect border-2">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 sm:h-6 sm:w-6" />
                Order Summary
              </CardTitle>
              <CardDescription className="mt-2 text-xs sm:text-sm">
                {cartItems.length} item(s) in your order
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            {cartItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex-1">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Quantity: {item.quantity}</p>
                </div>
                <p className="font-semibold">{item.price * item.quantity} THB</p>
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex items-center justify-between text-base sm:text-lg">
            <span className="font-semibold">Total Amount</span>
            <span className="font-bold text-xl sm:text-2xl">{total} THB</span>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate('/menu')}
              className="flex-1"
            >
              Back to Menu
            </Button>
            <Button 
              onClick={handleConfirm}
              className="flex-1 bg-gradient-primary hover:opacity-90"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Confirm Order"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmMenu;
