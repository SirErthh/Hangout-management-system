import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Customer from "./pages/Customer";
import Events from "./pages/Events";
import Reserve from "./pages/Reserve";
import Menu from "./pages/Menu";
import MyOrders from "./pages/MyOrders";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminEvents from "./pages/admin/Events";
import DayClosure from "./pages/admin/DayClosure";
import StaffDashboard from "./pages/staff/Dashboard";
import StaffTickets from "./pages/staff/Tickets";
import StaffReservations from "./pages/staff/Reservations";
import StaffFnB from "./pages/staff/FnB";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Load user from localStorage
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    }

    // Seed admin user if needed
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (!users.some((u: any) => u.role === 'admin')) {
      users.push({
        id: 1,
        fname: 'Admin',
        lname: 'User',
        email: 'admin@hangout',
        pass: '1234',
        role: 'admin'
      });
      localStorage.setItem('users', JSON.stringify(users));
    }
  }, []);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen w-full bg-background">
            <TopBar user={currentUser} onLogout={handleLogout} />
            <div className="flex w-full">
              {currentUser && <Sidebar role={currentUser.role} />}
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login onLogin={handleLogin} />} />
                  <Route path="/register" element={<Register />} />
                  
                  {/* Customer Routes */}
                  <Route 
                    path="/customer" 
                    element={currentUser?.role === 'customer' ? <Customer /> : <Navigate to="/login" />} 
                  />
                  <Route 
                    path="/events" 
                    element={<Events />} 
                  />
                  <Route 
                    path="/reserve" 
                    element={currentUser?.role === 'customer' ? <Reserve /> : <Navigate to="/login" />} 
                  />
                  <Route 
                    path="/menu" 
                    element={currentUser?.role === 'customer' ? <Menu /> : <Navigate to="/login" />} 
                  />
                  <Route 
                    path="/my-orders" 
                    element={currentUser?.role === 'customer' ? <MyOrders /> : <Navigate to="/login" />} 
                  />

                  {/* Admin Routes */}
                  <Route 
                    path="/admin" 
                    element={currentUser?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" />} 
                  />
                  <Route 
                    path="/admin/users" 
                    element={currentUser?.role === 'admin' ? <AdminUsers /> : <Navigate to="/login" />} 
                  />
                  <Route 
                    path="/admin/events" 
                    element={currentUser?.role === 'admin' ? <AdminEvents /> : <Navigate to="/login" />} 
                  />
                  <Route 
                    path="/admin/closure" 
                    element={currentUser?.role === 'admin' ? <DayClosure /> : <Navigate to="/login" />} 
                  />

                  {/* Staff Routes */}
                  <Route 
                    path="/staff" 
                    element={currentUser?.role === 'staff' ? <StaffDashboard /> : <Navigate to="/login" />} 
                  />
                  <Route 
                    path="/staff/tickets" 
                    element={currentUser?.role === 'staff' ? <StaffTickets /> : <Navigate to="/login" />} 
                  />
                  <Route 
                    path="/staff/reservations" 
                    element={currentUser?.role === 'staff' ? <StaffReservations /> : <Navigate to="/login" />} 
                  />
                  <Route 
                    path="/staff/fnb" 
                    element={currentUser?.role === 'staff' ? <StaffFnB /> : <Navigate to="/login" />} 
                  />
                  
                  {/* Catch all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
