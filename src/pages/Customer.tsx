import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, BookOpen, UtensilsCrossed, ShoppingBag } from "lucide-react";

const Customer = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: ShoppingBag,
      title: "My Orders",
      description: "Tickets, tables, and F&B",
      action: () => navigate('/my-orders'),
      gradient: "from-purple-500 to-blue-500",
    },
    {
      icon: Calendar,
      title: "Browse Events",
      description: "See events & buy tickets",
      action: () => navigate('/events'),
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: BookOpen,
      title: "Reserve Table",
      description: "Date & party size",
      action: () => navigate('/reserve'),
      gradient: "from-pink-500 to-purple-500",
    },
    {
      icon: UtensilsCrossed,
      title: "Menu",
      description: "Food & drinks",
      action: () => navigate('/menu'),
      gradient: "from-orange-500 to-pink-500",
    },
  ];

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div>
        <h1 className="text-3xl font-bold mb-2">Customer Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! What would you like to do today?</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <Card 
              key={idx}
              className="group hover:shadow-xl transition-smooth cursor-pointer border-2 hover:border-primary/50"
              onClick={feature.action}
            >
              <CardHeader>
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-smooth shadow-lg`}>
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="ghost" 
                  className="w-full group-hover:bg-primary group-hover:text-white transition-smooth"
                >
                  Open
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Customer;
