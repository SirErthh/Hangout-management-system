import { ComponentType } from "react";
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

type LinkConfig = {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  end?: boolean;
};

const Sidebar = ({ role }: SidebarProps) => {
  const customerLinks: LinkConfig[] = [
    { to: "/customer", icon: Home, label: "Home", end: true },
    { to: "/events", icon: Calendar, label: "Events", end: true },
    { to: "/reserve", icon: BookOpen, label: "Reserve Table", end: true },
    { to: "/menu", icon: UtensilsCrossed, label: "Menu", end: true },
    { to: "/my-orders", icon: ShoppingBag, label: "My Orders", end: true },
  ];

  const staffLinks: LinkConfig[] = [
    { to: "/staff", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/staff/tickets", icon: Ticket, label: "Ticket Orders", end: true },
    { to: "/staff/reservations", icon: BookOpen, label: "Reservations", end: true },
    { to: "/staff/fnb", icon: UtensilsCrossed, label: "F&B / Kitchen", end: true },
  ];

  const adminLinks: LinkConfig[] = [
    { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/admin/users", icon: Users, label: "Users & Roles", end: true },
    { to: "/admin/events", icon: Calendar, label: "Events", end: true },
    { to: "/admin/menu", icon: UtensilsCrossed, label: "F&B Menu", end: true },
    { to: "/admin/closure", icon: DollarSign, label: "Day Closure", end: true },
  ];

  let links = customerLinks;
  if (role === "staff") links = staffLinks;
  if (role === "admin") links = adminLinks;

  return (
    <aside className="sticky top-16 h-[calc(100vh-4rem)] w-full sm:w-64 border-r bg-sidebar overflow-auto">
      <nav className="p-3 sm:p-4 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-smooth ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-foreground"
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
