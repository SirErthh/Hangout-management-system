import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";

type MenuItem = {
  id: number;
  name: string;
  type: "food" | "drink";
  price: number;
  image_url: string;   // http(s):// | data: | emoji
  is_active: boolean;
  description?: string;
  // legacy fields that might exist in old data
  category?: string;
  image?: string;
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "food" as "food" | "drink",
    price: "",
    imageUrl: "",
    description: ""
  });

  // --- normalize legacy data to new schema ---
  const normalize = (items: any[]): MenuItem[] =>
    (items || []).map((raw: any) => {
      const type: "food" | "drink" =
        raw.type ??
        (raw.category === "drinks" ? "drink" : raw.category) ??
        "food";
      const image_url: string = raw.image_url ?? raw.image ?? "";
      const is_active: boolean = raw.is_active ?? true;
      return {
        id: Number(raw.id),
        name: String(raw.name ?? ""),
        type,
        price: Number(raw.price ?? 0),
        image_url,
        is_active,
        description: raw.description ? String(raw.description) : ""
      };
    });

  useEffect(() => {
    const stored = localStorage.getItem("menuItems");
    if (stored) {
      setMenuItems(normalize(JSON.parse(stored)));
    } else {
      const seed: MenuItem[] = normalize([
        { id: 1, type: "food",  name: "Signature Burger", price: 280, image_url: "🍔", is_active: true, description: "Angus beef, special sauce" },
        { id: 2, type: "food",  name: "Truffle Pasta",    price: 320, image_url: "🍝", is_active: true, description: "Mushrooms, truffle cream" },
        { id: 3, type: "drink", name: "Mojito",           price: 220, image_url: "🍹", is_active: true, description: "Rum, mint, lime" },
        { id: 4, type: "drink", name: "Craft Beer",       price: 180, image_url: "🍺", is_active: true, description: "Local IPA on tap" },
      ]);
      setMenuItems(seed);
      localStorage.setItem("menuItems", JSON.stringify(seed));
    }
  }, []);

  const persistAndNotify = (items: MenuItem[]) => {
    setMenuItems(items);
    localStorage.setItem("menuItems", JSON.stringify(items));
    // แจ้งหน้าอื่น/แท็บอื่นให้รีโหลดเมนู
    window.dispatchEvent(new Event("menu-updated"));
  };

  const handleFileChange = (file?: File) => {
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("file size exceeds 2MB limit");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, imageUrl: (reader.result as string) || "" }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const priceNum = Number(formData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Price must be a valid non-negative number");
      return;
    }

    let updated: MenuItem[];
    if (editingItem) {
      updated = menuItems.map((m) =>
        m.id === editingItem.id
          ? {
              ...m,
              name: formData.name.trim(),
              type: formData.type,
              price: priceNum,
              image_url: formData.imageUrl,
              description: formData.description,
              is_active: m.is_active ?? true,
            }
          : m
      );
      toast.success("Menu item updated successfully!");
    } else {
      const newItem: MenuItem = {
        id: Date.now(),
        name: formData.name.trim(),
        type: formData.type,
        price: priceNum,
        image_url: formData.imageUrl,
        is_active: true,
        description: formData.description
      };
      updated = [newItem, ...menuItems];
      toast.success("Menu item created successfully!");
    }
    persistAndNotify(updated);
    setIsOpen(false);
    setEditingItem(null);
    setFormData({ name: "", type: "food", price: "", imageUrl: "", description: "" });
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      price: String(item.price),
      imageUrl: item.image_url ?? "",
      description: item.description ?? ""
    });
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    const updated = menuItems.filter((m) => m.id !== id);
    persistAndNotify(updated);
    toast.success("Menu item deleted successfully!");
  };

  const toggleActive = (id: number) => {
    const updated = menuItems.map((m) =>
      m.id === id ? { ...m, is_active: !m.is_active } : m
    );
    persistAndNotify(updated);
    toast.success("Menu item visibility updated!");
  };

  const handleNewItem = () => {
    setEditingItem(null);
    setFormData({ name: "", type: "food", price: "", imageUrl: "", description: "" });
    setIsOpen(true);
  };

  const renderThumb = (urlOrEmoji: string, name: string, large = false) => {
    const isImg =
      typeof urlOrEmoji === "string" &&
      (urlOrEmoji.startsWith("http") ||
        urlOrEmoji.startsWith("https://") ||
        urlOrEmoji.startsWith("data:") ||
        urlOrEmoji.startsWith("blob:"));
    const h = large ? "h-40" : "h-32";
    return isImg ? (
      <div className={`w-full ${h} mb-2 overflow-hidden rounded-lg`}>
        <img src={urlOrEmoji} alt={name} className="w-full h-full object-cover" />
      </div>
    ) : (
      <div className={`text-4xl mb-2 flex items-center justify-center rounded-lg bg-muted/40 ${h}`}>
        {urlOrEmoji || "🖼️"}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-2">F&B Menu Management</h1>
          <p className="text-muted-foreground">Create, edit, and organize menu items</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="lg" onClick={handleNewItem} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create Menu Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? "Edit Menu Item" : "Create New Menu Item"}</DialogTitle>
              <DialogDescription>
                {editingItem ? "Update the menu item details" : "Add a new item to the menu"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Category</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "food" | "drink") => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="drink">Drinks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (฿)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short description to show on menu"
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
                  placeholder="Upload above or enter https://... or 🍔"
                />
                <p className="text-xs text-muted-foreground">
                  If a file is uploaded, it will be used first.
                </p>
              </div>

              <Button type="submit" className="w-full">
                {editingItem ? "Update Item" : "Create Item"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Food List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Food Items</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {menuItems.filter(i => i.type === "food").map(item => (
            <Card key={item.id} className="glass-effect border-2">
              <CardHeader>
                {renderThumb(item.image_url, item.name)}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription className="text-sm mt-1">{item.description}</CardDescription>
                    <CardDescription className="mt-2 text-xl font-bold">฿{item.price}</CardDescription>
                    <div className="mt-2">
                      {item.is_active ? (
                        <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700">Active</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-700">Inactive</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="secondary" size="sm" onClick={() => toggleActive(item.id)} className="w-full sm:w-auto">
                    {item.is_active ? <><EyeOff className="h-4 w-4 mr-2" /> Hide</> : <><Eye className="h-4 w-4 mr-2" /> Show</>}
                  </Button>
                  <Button variant="outline" size="sm" className="w-full sm:flex-1" onClick={() => handleEdit(item)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)} className="w-full sm:w-auto">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Drinks List */}
        <h2 className="text-xl font-semibold pt-6">Drink Items</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {menuItems.filter(i => i.type === "drink").map(item => (
            <Card key={item.id} className="glass-effect border-2">
              <CardHeader>
                {renderThumb(item.image_url, item.name)}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <CardDescription className="text-sm mt-1">{item.description}</CardDescription>
                    <CardDescription className="mt-2 text-xl font-bold">฿{item.price}</CardDescription>
                    <div className="mt-2">
                      {item.is_active ? (
                        <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700">Active</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded bg-rose-100 text-rose-700">Inactive</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="secondary" size="sm" onClick={() => toggleActive(item.id)} className="w-full sm:w-auto">
                    {item.is_active ? <><EyeOff className="h-4 w-4 mr-2" /> Hide</> : <><Eye className="h-4 w-4 mr-2" /> Show</>}
                  </Button>
                  <Button variant="outline" size="sm" className="w-full sm:flex-1" onClick={() => handleEdit(item)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)} className="w-full sm:w-auto">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MenuManagement;
