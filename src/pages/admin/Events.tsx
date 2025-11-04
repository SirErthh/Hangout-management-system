import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Calendar, Edit, Trash2 } from "lucide-react";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const AdminEvents = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    price: "",
    description: "",
    imageUrl: "",          // http(s)://, data:, หรือ emoji
    ticketCodePrefix: ""
  });

  useEffect(() => {
    const storedEvents = localStorage.getItem("events");
    if (storedEvents) {
      setEvents(JSON.parse(storedEvents));
    } else {
      const defaultEvents = [
        { id: 1, name: "Jazz Night", date: "2025-11-01", price: 500, description: "Live jazz performance", image_url: "🎷", ticketCodePrefix: "GEF" },
        { id: 2, name: "EDM Party",  date: "2025-11-15", price: 800, description: "Electronic dance music festival", image_url: "🎧", ticketCodePrefix: "TMD" }
      ];
      setEvents(defaultEvents);
      localStorage.setItem("events", JSON.stringify(defaultEvents));
    }
  }, []);

  const handleFileChange = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is larger than 2MB. Please compress it first.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, imageUrl: (reader.result as string) || "" }));
    };
    reader.readAsDataURL(file);
  };

  const validatePrefix = (val: string) => /^[A-Z]{3}$/.test(val);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // guards
    const priceNum = Number(formData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Invalid price");
      return;
    }
    if (!validatePrefix(formData.ticketCodePrefix)) {
      toast.error("Ticket code prefix must be exactly 3 uppercase letters (e.g., GEF)");
      return;
    }

    let updatedEvents;
    if (editingEvent) {
      updatedEvents = events.map((evt) =>
        evt.id === editingEvent.id
          ? {
              ...evt,
              name: formData.name,
              date: formData.date,
              price: priceNum,
              description: formData.description,
              image_url: formData.imageUrl,
              ticketCodePrefix: formData.ticketCodePrefix
            }
          : evt
      );
      toast.success("Event updated successfully!");
    } else {
      const newEvent = {
        id: Date.now(),
        name: formData.name,
        date: formData.date,
        price: priceNum,
        description: formData.description,
        image_url: formData.imageUrl,
        ticketCodePrefix: formData.ticketCodePrefix
      };
      updatedEvents = [...events, newEvent];
      toast.success("Event created successfully!");
    }

    setEvents(updatedEvents);
    localStorage.setItem("events", JSON.stringify(updatedEvents));

    setIsOpen(false);
    setEditingEvent(null);
    setFormData({ name: "", date: "", price: "", description: "", imageUrl: "", ticketCodePrefix: "" });
  };

  const handleEdit = (event: any) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      date: event.date,
      price: String(event.price),
      description: event.description,
      imageUrl: event.image_url || "",
      ticketCodePrefix: (event.ticketCodePrefix || "").toUpperCase()
    });
    setIsOpen(true);
  };

  const handleNewEvent = () => {
    setEditingEvent(null);
    setFormData({ name: "", date: "", price: "", description: "", imageUrl: "", ticketCodePrefix: "" });
    setIsOpen(true);
  };

  const deleteEvent = (id: number) => {
    const updatedEvents = events.filter((e) => e.id !== id);
    setEvents(updatedEvents);
    localStorage.setItem("events", JSON.stringify(updatedEvents));
    toast.success("Event deleted");
  };

  const renderThumb = (urlOrEmoji: string, name: string) => {
    const isImageURL =
      typeof urlOrEmoji === "string" &&
      (urlOrEmoji.startsWith("http://") ||
        urlOrEmoji.startsWith("https://") ||
        urlOrEmoji.startsWith("data:") ||
        urlOrEmoji.startsWith("blob:"));
    return isImageURL ? (
      <div className="w-full h-48 overflow-hidden rounded-t-lg">
        <img src={urlOrEmoji} alt={name} className="w-full h-full object-cover" />
      </div>
    ) : urlOrEmoji ? (
      <div className="w-full h-48 flex items-center justify-center text-6xl rounded-t-lg bg-muted/40">
        {urlOrEmoji}
      </div>
    ) : null;
  };

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Events Management</h1>
          <p className="text-muted-foreground">Create and manage events</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="lg" onClick={handleNewEvent}>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
              <DialogDescription>
                {editingEvent ? "Update event details" : "Add a new event to the system"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Event Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Ticket Price (฿)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              {/* Upload local image */}
              <div className="space-y-2">
                <Label>Upload Image (optional)</Label>
                <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e.target.files?.[0])} />
                {formData.imageUrl && (formData.imageUrl.startsWith("data:") || formData.imageUrl.startsWith("http")) && (
                  <div className="w-full h-40 mt-2 overflow-hidden rounded-lg border">
                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* URL or Emoji fallback */}
              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL or Emoji (fallback)</Label>
                <Input
                  id="image_url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="Upload above or enter https://... or 🎟️"
                />
                <p className="text-xs text-muted-foreground">If a file is uploaded, it will be used first.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticketCodePrefix">Ticket Code Prefix (3 letters)</Label>
                <Input
                  id="ticketCodePrefix"
                  value={formData.ticketCodePrefix.toUpperCase()}
                  onChange={(e) =>
                    setFormData({ ...formData, ticketCodePrefix: e.target.value.toUpperCase().slice(0, 3) })
                  }
                  placeholder="GEF, TMD, etc."
                  maxLength={3}
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                {editingEvent ? "Update Event" : "Create Event"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <Card key={event.id} className="glass-effect border-2 hover:shadow-xl transition-smooth">
            {renderThumb(event.image_url, event.name)}
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle>{event.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(event.date).toLocaleDateString()}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{event.description}</p>
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl font-bold">฿{event.price}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(event)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => deleteEvent(event.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminEvents;
