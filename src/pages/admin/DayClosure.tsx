import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DollarSign, TrendingUp, CreditCard, Wallet, CheckCircle } from "lucide-react";

const DayClosure = () => {
  const [isClosed, setIsClosed] = useState(false);

  const todaySales = {
    tickets: { count: 45, amount: 32500 },
    reservations: { count: 12, amount: 0 },
    fnb: { count: 38, amount: 18900 },
    cash: 25600,
    card: 25800,
    total: 51400
  };

  const handleClosureSubmit = () => {
    // In a real app, this would save to backend
    setIsClosed(true);
    toast.success("Day closure completed successfully!");
  };

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Day Closure</h1>
          <p className="text-muted-foreground">
            End of day reconciliation • {new Date().toLocaleDateString()}
          </p>
        </div>
        {isClosed && (
          <Badge className="bg-green-500">
            <CheckCircle className="h-4 w-4 mr-2" />
            Day Closed
          </Badge>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="glass-effect border-2">
          <CardHeader>
            <CardTitle className="text-lg">Ticket Sales</CardTitle>
            <CardDescription>{todaySales.tickets.count} tickets sold</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">฿{todaySales.tickets.amount.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="glass-effect border-2">
          <CardHeader>
            <CardTitle className="text-lg">Reservations</CardTitle>
            <CardDescription>{todaySales.reservations.count} tables reserved</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">฿{todaySales.reservations.amount.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="glass-effect border-2">
          <CardHeader>
            <CardTitle className="text-lg">F&B Sales</CardTitle>
            <CardDescription>{todaySales.fnb.count} orders</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">฿{todaySales.fnb.amount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-effect border-2">
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
          <CardDescription>Breakdown by payment method</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cash</p>
                  <p className="text-2xl font-bold">฿{todaySales.cash.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Card</p>
                  <p className="text-2xl font-bold">฿{todaySales.card.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold">฿{todaySales.total.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-green-500">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-lg font-semibold">+18%</span>
                </div>
                <p className="text-xs text-muted-foreground">vs yesterday</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleClosureSubmit}
            disabled={isClosed}
            className="w-full"
            size="lg"
          >
            {isClosed ? "Day Already Closed" : "Complete Day Closure"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DayClosure;
