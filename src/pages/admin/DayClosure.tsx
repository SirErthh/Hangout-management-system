import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DollarSign, TrendingUp, CreditCard, Wallet, CheckCircle } from "lucide-react";

const DayClosure = () => {
  const [isClosed, setIsClosed] = useState(false);
  const [closureData, setClosureData] = useState({
    tickets: { count: 45, amount: 32500 },
    fnb: { count: 38, amount: 18900 },
    cash: 51400
  });

  const handleClosureSubmit = () => {
    setIsClosed(true);
    toast.success("Day closure completed successfully!");
  };

  const handleReset = () => {
    setIsClosed(false);
    setClosureData({
      tickets: { count: 0, amount: 0 },
      fnb: { count: 0, amount: 0 },
      cash: 0
    });
    toast.success("Day closure reset successfully!");
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

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-effect border-2">
          <CardHeader>
            <CardTitle className="text-lg">Ticket Sales</CardTitle>
            <CardDescription>{closureData.tickets.count} tickets sold</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">฿{closureData.tickets.amount.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="glass-effect border-2">
          <CardHeader>
            <CardTitle className="text-lg">F&B Sales</CardTitle>
            <CardDescription>{closureData.fnb.count} orders</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">฿{closureData.fnb.amount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-effect border-2">
        <CardHeader>
          <CardTitle>Total Revenue (Cash)</CardTitle>
          <CardDescription>End of day total cash revenue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-6 rounded-lg bg-gradient-primary">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <DollarSign className="h-8 w-8 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white/80">Total Revenue</p>
                  <p className="text-4xl font-bold text-white">฿{closureData.cash.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleClosureSubmit}
              disabled={isClosed}
              className="flex-1"
              size="lg"
            >
              {isClosed ? "Day Already Closed" : "Complete Day Closure"}
            </Button>
            {isClosed && (
              <Button 
                onClick={handleReset}
                variant="outline"
                size="lg"
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DayClosure;
