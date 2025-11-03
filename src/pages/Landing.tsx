import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, BookOpen, UtensilsCrossed, Sparkles } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  const isLoggedIn = !!localStorage.getItem('currentUser');

  const features = [
    {
      icon: Calendar,
      title: "Browse Events",
      description: "Look up upcoming shows and ticket prices",
      action: () => {
        if (!isLoggedIn) {
          navigate('/login');
        } else {
          navigate('/events');
        }
      },
    },
    {
      icon: BookOpen,
      title: "Reserve Table",
      description: "Pick a date and party size",
      action: () => {
        if (!isLoggedIn) {
          navigate('/login');
        } else {
          navigate('/reserve');
        }
      },
    },
    {
      icon: UtensilsCrossed,
      title: "Order F&B",
      description: "Create an order for your table",
      action: () => navigate('/menu'),
    },
  ];

  const upcomingEvents = [
    { name: "Jazz Night", date: "20 Nov 2025", price: 250 },
    { name: "Rock & Chill", date: "22 Nov 2025", price: 300 },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-primary py-24 px-6">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-white/90 text-sm mb-6 animate-slide-up">
            <Sparkles className="h-4 w-4" />
            Welcome to the ultimate hangout experience
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 animate-slide-up">
            Your Next Great Night
            <br />
            Starts Here
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-8 animate-slide-up">
            Experience live events, reserve tables, and enjoy amazing food & drinks all in one place
          </p>
          <div className="flex gap-4 justify-center animate-slide-up">
            <Button 
              size="lg" 
              onClick={() => navigate('/events')}
              className="bg-white text-primary hover:bg-white/90 shadow-lg"
            >
              Explore Events
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/login')}
              className="bg-white text-primary hover:bg-white/90 shadow-lg"
            >
              Get Started
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">What You Can Do</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card 
                  key={idx} 
                  className="group hover:shadow-lg transition-smooth cursor-pointer border-2 hover:border-primary/50"
                  onClick={feature.action}
                >
                  <CardHeader>
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-smooth">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full group-hover:bg-primary group-hover:text-white transition-smooth">
                      Open
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-20 px-6 bg-muted">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Upcoming Events</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted border-b">
                    <tr>
                      <th className="text-left p-4 font-semibold">Event</th>
                      <th className="text-left p-4 font-semibold">Date</th>
                      <th className="text-left p-4 font-semibold">Price</th>
                      <th className="text-left p-4 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingEvents.map((event, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-muted/50 transition-smooth">
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-24 h-16 rounded-lg bg-gradient-primary flex items-center justify-center">
                              <Calendar className="h-8 w-8 text-white" />
                            </div>
                            <span className="font-semibold">{event.name}</span>
                          </div>
                        </td>
                        <td className="p-4">{event.date}</td>
                        <td className="p-4 font-semibold">{event.price} THB</td>
                        <td className="p-4">
                          <Button onClick={() => navigate('/events')} size="sm">
                            Buy Ticket
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Landing;
