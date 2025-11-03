import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, UtensilsCrossed } from "lucide-react";

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState([
    { id: 1, name: "Signature Burger", category: "food", price: 280, image: "🍔" },
    { id: 2, name: "Truffle Pasta", category: "food", price: 320, image: "🍝" },
    { id: 3, name: "Mojito", category: "drinks", price: 220, image: "🍹" },
    { id: 4, name: "Craft Beer", category: "drinks", price: 180, image: "🍺" }
  ]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "food",
    price: "",
    image: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingItem) {
      setMenuItems(menuItems.map(item => 
        item.id === editingItem.id 
          ? { ...item, name: formData.name, category: formData.category, price: parseInt(formData.price), image: formData.image }
          : item
      ));
      toast.success("Menu item updated!");
    } else {
      const newItem = {
        id: Date.now(),
        name: formData.name,
        category: formData.category,
        price: parseInt(formData.price),
        image: formData.image
      };
      setMenuItems([...menuItems, newItem]);
      toast.success("Menu item created!");
    }

    setIsOpen(false);
    setEditingItem(null);
    setFormData({ name: "", category: "food", price: "", image: "" });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      image: item.image
    });
    setIsOpen(true);
  };

  const handleDelete = (id: number) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
    toast.success("Menu item deleted");
  };

  const handleNewItem = () => {
    setEditingItem(null);
    setFormData({ name: "", category: "food", price: "", image: "" });
    setIsOpen(true);
  };

  return (
    <div className="p-6 space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">F&B Menu Management</h1>
          <p className="text-muted-foreground">Manage food & beverage items</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="lg" onClick={handleNewItem}>
              <Plus className="h-4 w-4 mr-2" />
              Create Menu Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Menu Item' : 'Create New Menu Item'}</DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update the menu item details' : 'Add a new item to the menu'}
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
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="drinks">Drinks</SelectItem>
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
                <Label htmlFor="image">Image (Emoji)</Label>
                <Input
                  id="image"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="🍔"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingItem ? 'Update Item' : 'Create Item'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Food Items</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.filter(item => item.category === 'food').map(item => (
            <Card key={item.id} className="glass-effect border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-4xl mb-2">{item.image}</div>
                    <CardTitle>{item.name}</CardTitle>
                    <CardDescription className="mt-2 text-xl font-bold">฿{item.price}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(item)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <h2 className="text-xl font-semibold pt-6">Drink Items</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.filter(item => item.category === 'drinks').map(item => (
            <Card key={item.id} className="glass-effect border-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-4xl mb-2">{item.image}</div>
                    <CardTitle>{item.name}</CardTitle>
                    <CardDescription className="mt-2 text-xl font-bold">฿{item.price}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(item)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id)}>
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
