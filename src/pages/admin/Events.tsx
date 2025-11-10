import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Calendar, Edit, Trash2 } from "lucide-react";
import { api, handleApiError } from "@/lib/api";

type EventItem = {
  id: number;
  name: string;
  date?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  price: number;
  description?: string;
  image_url?: string;
  ticketCodePrefix?: string;
  artist?: string;
  status?: string;
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const AdminEvents = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    artist: "",
    date: "",
    price: "",
    description: "",
    imageUrl: "",
    ticketCodePrefix: "",
  });

  const loadEvents = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const { events: fetched } = await api.getEvents(signal);
        if (!signal?.aborted) {
          setEvents(fetched ?? []);
        }
      } catch (error) {
        if (!signal?.aborted) {
          handleApiError(error, "Failed to load events");
          setEvents([]);
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadEvents(controller.signal);
    return () => controller.abort();
  }, [loadEvents]);

  useEffect(() => {
    if (!dialogOpen) {
      setEditingEvent(null);
      setFormData({
        name: "",
        artist: "",
        date: "",
        price: "",
        description: "",
        imageUrl: "",
        ticketCodePrefix: "",
      });
      setImagePreview("");
    }
  }, [dialogOpen]);

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }
    const preview = resolvePreview(formData.imageUrl);
    setImagePreview(preview);
  }, [dialogOpen, formData.imageUrl]);

  const notifyEventsUpdated = () => {
    window.dispatchEvent(new Event("events-updated"));
  };

  const handleFileChange = (file?: File) => {
    if (uploadingImage) {
      toast.error("Please wait for the current upload to finish");
      return;
    }
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File is larger than 2MB. Please compress it first.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = (reader.result as string) || "";
      if (!dataUrl) {
        toast.error("Failed to read image");
        return;
      }
      setUploadingImage(true);
      api
        .uploadImage(dataUrl)
        .then(({ path, url }) => {
          setFormData((prev) => ({ ...prev, imageUrl: path }));
          setImagePreview(url || path);
          toast.success("Image uploaded");
        })
        .catch((error) => handleApiError(error, "Failed to upload image"))
        .finally(() => setUploadingImage(false));
    };
    reader.readAsDataURL(file);
  };

  const resolvePreview = (value?: string | null) => {
    if (!value) return "";
    if (
      value.startsWith("http") ||
      value.startsWith("https://") ||
      value.startsWith("data:") ||
      value.startsWith("blob:") ||
      value.startsWith("/")
    ) {
      return value;
    }
    return "";
  };

  const openNewEventDialog = () => {
    setEditingEvent(null);
    setFormData({
      name: "",
      date: "",
      price: "",
      description: "",
      imageUrl: "",
      ticketCodePrefix: "",
    });
    setDialogOpen(true);
  };

  const handleEdit = (event: EventItem) => {
    setEditingEvent(event);
    setFormData({
      name: event.name ?? "",
      artist: event.artist ?? "",
      date: event.date ?? "",
      price: String(event.price ?? ""),
      description: event.description ?? "",
      imageUrl: event.image_url ?? "",
      ticketCodePrefix: (event.ticketCodePrefix ?? "").toUpperCase(),
    });
    setImagePreview(resolvePreview(event.image_url));
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const priceNum = Number(formData.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast.error("Invalid price");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      artist: formData.artist.trim(),
      date: formData.date,
      price: priceNum,
      description: formData.description,
      image_url: formData.imageUrl,
      ticketCodePrefix: formData.ticketCodePrefix.trim().toUpperCase(),
    };

    if (!payload.name || !payload.ticketCodePrefix || payload.ticketCodePrefix.length !== 3) {
      toast.error("Ticket code prefix must be exactly 3 characters");
      return;
    }

    if (formData.imageUrl && formData.imageUrl.startsWith("data:")) {
      toast.error("Please upload the selected image before saving");
      return;
    }

    if (uploadingImage) {
      toast.error("Please wait for the image upload to finish");
      return;
    }

    setSaving(true);
    try {
      let updated: EventItem;
      if (editingEvent) {
        const { event } = await api.updateEvent(editingEvent.id, payload);
        updated = event;
        toast.success("Event updated successfully!");
      } else {
        const { event } = await api.createEvent(payload);
        updated = event;
        toast.success("Event created successfully!");
      }
      await loadEvents();
      notifyEventsUpdated();
      setDialogOpen(false);
      setEditingEvent(null);
      setFormData({
        name: "",
        date: "",
        price: "",
        description: "",
        imageUrl: "",
        ticketCodePrefix: "",
      });
      setImagePreview("");
    } catch (error) {
      handleApiError(error, "Failed to save event");
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = (event: EventItem) => {
    setDeleteTarget(event);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    try {
      await api.deleteEvent(deleteTarget.id);
      await loadEvents();
      notifyEventsUpdated();
      toast.success("Event deleted");
      setDeleteTarget(null);
    } catch (error) {
      handleApiError(error, "Failed to delete event");
    } finally {
      setDeleting(false);
    }
  };

  const renderThumb = (urlOrEmoji: string | undefined, name: string) => {
    const isImageURL =
      typeof urlOrEmoji === "string" &&
      (urlOrEmoji.startsWith("http://") ||
        urlOrEmoji.startsWith("https://") ||
        urlOrEmoji.startsWith("data:") ||
        urlOrEmoji.startsWith("blob:") ||
        urlOrEmoji.startsWith("/"));
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
    <>
      <div className="p-6 space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Events Management</h1>
          <p className="text-muted-foreground">Create and manage events</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" onClick={openNewEventDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle>
              <DialogDescription>Provide event details for guests.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Event Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="artist">Artist / Headliner</Label>
                  <Input
                    id="artist"
                    value={formData.artist}
                    onChange={(e) => setFormData((prev) => ({ ...prev, artist: e.target.value }))}
                    placeholder="Resident DJ"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Ticket Price (THB)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticketCodePrefix">Ticket Code Prefix</Label>
                <Input
                  id="ticketCodePrefix"
                  maxLength={3}
                  value={formData.ticketCodePrefix}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      ticketCodePrefix: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="e.g. GEF"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="What should guests expect?"
                />
              </div>

              <div className="space-y-2">
                <Label>Cover Image</Label>
                <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e.target.files?.[0])} />
                <Input
                  value={formData.imageUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="Or paste emoji / image URL"
                />
                <p className="text-xs text-muted-foreground">
                  Uploads support up to 2MB. You can also provide an emoji or hosted URL.
                </p>
                {imagePreview && (
                  <div className="rounded-lg border overflow-hidden">
                    <img src={imagePreview} alt="Event preview" className="h-40 w-full object-cover" />
                  </div>
                )}
                {uploadingImage && (
                  <p className="text-xs text-muted-foreground">Uploading image...</p>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || uploadingImage}>
                  {saving
                    ? "Saving…"
                    : uploadingImage
                    ? "Uploading…"
                    : editingEvent
                    ? "Update Event"
                    : "Create Event"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card className="glass-effect">
          <CardContent className="p-12 text-center text-muted-foreground">Loading events…</CardContent>
        </Card>
      ) : events.length === 0 ? (
        <Card className="glass-effect">
          <CardContent className="p-12 text-center text-muted-foreground">
            No events yet. Click “New Event” to add one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {events.map((event) => (
            <Card key={event.id} className="glass-effect border-2 overflow-hidden">
              {renderThumb(event.image_url, event.name)}
              <CardHeader className="space-y-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {event.name}
                </CardTitle>
                <CardDescription className="space-y-1">
                  <div>
                    <span className="font-semibold">Date:</span>{" "}
                    {event.date ? new Date(event.date).toLocaleDateString() : "TBA"}
                  </div>
                  <div>
                    <span className="font-semibold">Price:</span> ฿{event.price}
                  </div>
                  <div>
                    <span className="font-semibold">Ticket Code Prefix:</span>{" "}
                    {event.ticketCodePrefix ?? "—"}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground min-h-[3rem]">
                  {event.description || "No description provided."}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={() => handleEdit(event)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => deleteEvent(event)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </div>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{" "}
              <span className="font-semibold">{deleteTarget?.name ?? "this event"}</span>. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} onClick={() => setDeleteTarget(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AdminEvents;
