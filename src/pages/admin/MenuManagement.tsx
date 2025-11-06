import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { api, handleApiError } from "@/lib/api";

type MenuItem = {
  id: number;
  name: string;
  type: "food" | "drink";
  price: number;
  image_url?: string;
  is_active: boolean;
  description?: string | null;
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "food" as "food" | "drink",
    price: "",
    imageUrl: "",
    description: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const { items } = await api.getMenuItems(controller.signal);
        setMenuItems(items || []);
      } catch (error) {
        if (!controller.signal.aborted) {
          handleApiError(error, "Failed to load menu items");
          setMenuItems([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => controller.abort();
  }, []);

  const notifyMenuUpdated = () => {
    window.dispatchEvent(new Event("menu-updated"));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "food",
      price: "",
      imageUrl: "",
      description: "",
    });
    setEditingItem(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      price: String(item.price),
      imageUrl: item.image_url ?? "",
      description: item.description ?? "",
    });
    setDialogOpen(true);
  };

  const handleFileChange = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File size exceeds 2MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, imageUrl: (reader.result as string) || "" }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const priceNum = Number(formData.price);
    if (!formData.name.trim() || isNaN(priceNum) || priceNum < 0) {
      toast.error("Please provide a valid name and price");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      type: formData.type,
      price: priceNum,
      image_url: formData.imageUrl,
      description: formData.description,
      is_active: editingItem ? editingItem.is_active : true,
    };

    setSaving(true);
    try {
      if (editingItem) {
        const { item } = await api.updateMenuItem(editingItem.id, payload);
        setMenuItems((prev) =>
          prev.map((it) => (it.id === item.id ? item : it)),
        );
        toast.success("Menu item updated successfully!");
      } else {
        const { item } = await api.createMenuItem(payload);
        setMenuItems((prev) => [item, ...prev]);
        toast.success("Menu item created successfully!");
      }
      notifyMenuUpdated();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      handleApiError(error, "Failed to save menu item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`Delete "${item.name}"?`)) {
      return;
    }

    try {
      await api.deleteMenuItem(item.id);
      setMenuItems((prev) => prev.filter((m) => m.id !== item.id));
      toast.success("Menu item deleted successfully!");
      notifyMenuUpdated();
    } catch (error) {
      handleApiError(error, "Failed to delete menu item");
    }
  };

  const toggleActive = async (item: MenuItem) => {
    try {
      const { item: updated } = await api.updateMenuItem(item.id, {
        ...item,
        image_url: item.image_url,
        is_active: !item.is_active,
      });
      setMenuItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      toast.success("Menu item visibility updated!");
      notifyMenuUpdated();
    } catch (error) {
      handleApiError(error, "Failed to update visibility");
    }
  };

  const renderThumb = (urlOrEmoji: string | undefined, name: string, large = false) => {
    const isImage =
      typeof urlOrEmoji === "string" &&
      (urlOrEmoji.startsWith("http") ||
        urlOrEmoji.startsWith("https://") ||
        urlOrEmoji.startsWith("data:") ||
        urlOrEmoji.startsWith("blob:"));
    const height = large ? "h-40" : "h-32";
    if (!urlOrEmoji) {
      return (
        <div className={`text-4xl mb-2 flex items-center justify-center rounded-lg bg-muted/40 ${height}`}>
          🖼️
        </div>
      );
    }
    if (isImage) {
      return (
        <div className={`w-full ${height} mb-2 overflow-hidden rounded-lg`}>
          <img src={urlOrEmoji} alt={name} className="w-full h-full object-cover" />
        </div>
      );
    }
    return (
      <div className={`text-4xl mb-2 flex items-center justify-center rounded-lg bg-muted/40 ${height}`}>
        {urlOrEmoji}
      </div>
    );
  };

  const categorized = useMemo(() => {
    const food = menuItems.filter((item) => item.type === "food");
    const drink = menuItems.filter((item) => item.type === "drink");
    return { food, drink };
  }, [menuItems]);

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-2">F&B Menu Management</h1>
          <p className="text-muted-foreground">Create, edit, and organize menu items</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" onClick={openCreateDialog} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Menu Item" : "Create Menu Item"}</DialogTitle>
              <DialogDescription>
                Provide details about the food or drink you want to offer.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "food" | "drink") =>
                      setFormData((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="drink">Drink</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (THB)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Highlight ingredients, dietary info, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Thumbnail</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                />
                <Input
                  placeholder="Or paste emoji / image URL"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Supports emoji, external URL, data URI, or uploaded image (max 2MB).
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editingItem ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Loading menu items...
          </CardContent>
        </Card>
      ) : menuItems.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No menu items yet. Click &ldquo;New Item&rdquo; to create the first one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...categorized.food, ...categorized.drink].map((item) => (
            <Card key={item.id} className="glass-effect border-2">
              <CardHeader>
                {renderThumb(item.image_url, item.name)}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription>{item.description || "No description provided"}</CardDescription>
                  </div>
                  <span className="font-bold text-xl">฿{item.price}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="uppercase text-muted-foreground font-semibold">{item.type}</span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      item.is_active ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                    }`}
                  >
                    {item.is_active ? "Visible" : "Hidden"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleEdit(item)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(item)}>
                    {item.is_active ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Show
                      </>
                    )}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(item)}>
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
  );
};

export default MenuManagement;
