import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, BookOpen, UtensilsCrossed, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { api, authStorage, handleApiError } from "@/lib/api";

type EventItem = {
  id: number;
  name: string;
  price: number;
  date?: string | null;
  starts_at?: string | null;
  image_url?: string | null;
  cover_img?: string | null;
};

type DisplayEvent = EventItem & { eventDate: Date | null };

const isImageSource = (value: string) => /^(https?:\/\/|\/|data:)/i.test(value.trim());

const Landing = () => {
  const navigate = useNavigate();
  // รายการอีเวนต์
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const isLoggedIn = !!authStorage.getUser();

  // โหลดอีเวนต์ที่กำลังจะมาถึง
  useEffect(() => {
    const controller = new AbortController();

    const loadEvents = async () => {
      try {
        setLoadingEvents(true);
        const { events: payload } = await api.getEvents({
          signal: controller.signal,
          activeOnly: true,
        });
        if (!controller.signal.aborted) {
          setEvents((payload ?? []) as EventItem[]);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          handleApiError(error, "Failed to load events");
          setEvents([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingEvents(false);
        }
      }
    };

    loadEvents();

    return () => controller.abort();
  }, []);

  // โชว์อีเวนต์ที่กำลังจะมาถึง 4 อีเวนต์
  const upcomingEvents: DisplayEvent[] = useMemo(() => {
    const now = new Date();

    const parseEventDate = (item: EventItem): Date | null => {
      const raw = item.starts_at ?? item.date ?? null;
      if (!raw) return null;
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    return (events ?? [])
      .map((event) => ({
        ...event,
        eventDate: parseEventDate(event),
      }))
      .filter((event) => !event.eventDate || event.eventDate >= now)
      .sort((a, b) => {
        if (!a.eventDate && !b.eventDate) return 0;
        if (!a.eventDate) return 1;
        if (!b.eventDate) return -1;
        return a.eventDate.getTime() - b.eventDate.getTime();
      })
      .slice(0, 4);
  }, [events]);

  // ปุดฟีเจอร์หลัก
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

  const hasEvents = upcomingEvents.length > 0;

  const formatEventDate = (event: DisplayEvent) =>
    event.eventDate ? format(event.eventDate, "dd MMM yyyy") : "TBA";

  const formatEventPrice = (price?: number) =>
    typeof price === "number" && !Number.isNaN(price) ? `${price.toLocaleString()} THB` : "TBA";

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-primary py-12 sm:py-24 px-4 sm:px-6">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full text-white/90 text-xs sm:text-sm mb-4 sm:mb-6 animate-slide-up">
            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Welcome to the ultimate hangout experience</span>
            <span className="sm:hidden">Welcome</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-white mb-4 sm:mb-6 animate-slide-up">
            Your Next Great Night
            <br />
            Starts Here
          </h1>
          <p className="text-base sm:text-xl text-white/80 max-w-2xl mx-auto mb-6 sm:mb-8 px-4 sm:px-0 animate-slide-up">
            Experience live events, reserve tables, and enjoy amazing food & drinks all in one place
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-slide-up px-4 sm:px-0">
            <Button 
              size="lg" 
              onClick={() => navigate('/events')}
              className="bg-white text-primary hover:bg-white/90 shadow-lg w-full sm:w-auto"
            >
              Explore Events
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate('/login')}
              className="bg-white text-primary hover:bg-white/90 shadow-lg w-full sm:w-auto"
            >
              Get Started
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">What You Can Do</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
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
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-muted">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Upcoming Events</h2>
          {/* Mobile: Card layout */}
          <div className="block sm:hidden space-y-4">
            {loadingEvents ? (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground">Loading events...</CardContent>
              </Card>
            ) : hasEvents ? (
              upcomingEvents.map((event) => (
                <Card key={event.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {renderCover(event, "sm")}
                      <div className="flex-1">
                        <h3 className="font-semibold text-base">{event.name}</h3>
                        <p className="text-xs text-muted-foreground">{formatEventDate(event)}</p>
                        <p className="text-sm font-semibold mt-1">{formatEventPrice(event.price)}</p>
                      </div>
                    </div>
                    <Button onClick={() => navigate('/events')} size="sm" className="w-full">
                      Buy Ticket
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground">
                  No upcoming events yet. Check back soon!
                </CardContent>
              </Card>
            )}
          </div>
          {/* Desktop: Table layout */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted border-b">
                    <tr>
                      <th className="text-left p-4 font-semibold text-sm">Event</th>
                      <th className="text-left p-4 font-semibold text-sm">Date</th>
                      <th className="text-left p-4 font-semibold text-sm">Price</th>
                      <th className="text-left p-4 font-semibold text-sm">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingEvents ? (
                      <tr>
                        <td className="p-4 text-center text-muted-foreground" colSpan={4}>
                          Loading events...
                        </td>
                      </tr>
                    ) : hasEvents ? (
                      upcomingEvents.map((event) => (
                        <tr key={event.id} className="border-b last:border-0 hover:bg-muted/50 transition-smooth">
                          <td className="p-4">
                            <div className="flex items-center gap-4">
                              {renderCover(event, "lg")}
                              <span className="font-semibold">{event.name}</span>
                            </div>
                          </td>
                          <td className="p-4">{formatEventDate(event)}</td>
                          <td className="p-4 font-semibold">{formatEventPrice(event.price)}</td>
                          <td className="p-4">
                            <Button onClick={() => navigate('/events')} size="sm">
                              Buy Ticket
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-4 text-center text-muted-foreground" colSpan={4}>
                          No events have been scheduled yet.
                        </td>
                      </tr>
                    )}
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
  const renderCover = (event: DisplayEvent, variant: "sm" | "lg") => {
    const cover = (event.image_url ?? event.cover_img ?? "").trim();
    const showImage = cover !== "" && isImageSource(cover);
    const sizeClasses = variant === "sm" ? "w-16 h-12" : "w-24 h-16";
    const iconSize = variant === "sm" ? "h-5 w-5" : "h-8 w-8";
    const emojiSize = variant === "sm" ? "text-2xl" : "text-3xl";

    return (
      <div
        className={`${sizeClasses} rounded-lg flex items-center justify-center flex-shrink-0 ${
          showImage ? "bg-muted overflow-hidden" : "bg-gradient-primary"
        }`}
      >
        {cover ? (
          showImage ? (
            <img src={cover} alt={`${event.name} cover`} className="w-full h-full object-cover" />
          ) : (
            <span className={emojiSize}>{cover}</span>
          )
        ) : (
          <Calendar className={`${iconSize} text-white`} />
        )}
      </div>
    );
  };
