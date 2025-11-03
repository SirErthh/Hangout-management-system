import { NavLink } from "react-router-dom";
import { 
  Home, 
  Calendar, 
  UtensilsCrossed, 
  ShoppingBag, 
  LayoutDashboard,
  Ticket,
  Users,
  BookOpen,
  DollarSign
} from "lucide-react";

interface SidebarProps {
  role: string;
}

const Sidebar = ({ role }: SidebarProps) => {
  const customerLinks = [
    { to: "/customer", icon: Home, label: "Home" },
    { to: "/events", icon: Calendar, label: "Events" },
    { to: "/reserve", icon: BookOpen, label: "Reserve Table" },
    { to: "/menu", icon: UtensilsCrossed, label: "Menu" },
    { to: "/my-orders", icon: ShoppingBag, label: "My Orders" },
  ];

  const staffLinks = [
    { to: "/staff", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/staff/tickets", icon: Ticket, label: "Ticket Orders" },
    { to: "/staff/reservations", icon: BookOpen, label: "Reservations" },
    { to: "/staff/fnb", icon: UtensilsCrossed, label: "F&B / Kitchen" },
  ];

  const adminLinks = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/admin/users", icon: Users, label: "Users & Roles" },
    { to: "/admin/events", icon: Calendar, label: "Events" },
    { to: "/admin/closure", icon: DollarSign, label: "Day Closure" },
  ];

  let links = customerLinks;
  if (role === "staff") links = staffLinks;
  if (role === "admin") links = adminLinks;

  return (
    <aside className="sticky top-16 h-[calc(100vh-4rem)] w-64 border-r bg-sidebar overflow-auto">
      <nav className="p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-smooth ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:bg-sidebar-accent text-sidebar-foreground"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
