import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { api, authStorage, handleApiError } from "@/lib/api";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Customer from "./pages/Customer";
import Events from "./pages/Events";
import ConfirmOrder from "./pages/ConfirmOrder";
import Reserve from "./pages/Reserve";
import ReservationConfirm from "./pages/ReservationConfirm";
import Menu from "./pages/Menu";
import MyOrders from "./pages/MyOrders";
import ConfirmMenu from "./pages/ConfirmMenu";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminEvents from "./pages/admin/Events";
import AdminMenu from "./pages/admin/MenuManagement";
import DayClosure from "./pages/admin/DayClosure";
import StaffDashboard from "./pages/staff/Dashboard";
import StaffTickets from "./pages/staff/Tickets";
import StaffReservations from "./pages/staff/Reservations";
import StaffTableAssignment from "./pages/staff/TableAssignment";
import StaffFnB from "./pages/staff/FnB";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [currentUser, setCurrentUser] = useState<any>(authStorage.getUser());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      const token = authStorage.getToken();
      if (!token) {
        authStorage.clearUser();
        setIsBootstrapping(false);
        return;
      }

      try {
        const { user } = await api.me();
        setCurrentUser(user);
        authStorage.setUser(user);
      } catch (error) {
        authStorage.clearAll();
        setCurrentUser(null);
        handleApiError(error, "Session expired. Please login again.");
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrap();
  }, []);

  const handleLogin = (payload: { token: string; user: any }) => {
    authStorage.setToken(payload.token);
    authStorage.setUser(payload.user);
    setCurrentUser(payload.user);
  };

  const handleLogout = () => {
    authStorage.clearAll();
    setCurrentUser(null);
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
                  <Route
                    path="/login"
                    element={<Login onLogin={handleLogin} isBootstrapping={isBootstrapping} />}
                  />
                  <Route path="/register" element={<Register onRegister={handleLogin} />} />
                  <Route 
                    path="/profile" 
                    element={
                      currentUser ? (
                        <Profile
                          onProfileUpdate={setCurrentUser}
                          onAccountDeleted={handleLogout}
                        />
                      ) : (
                        <Navigate to="/login" replace />
                      )
                    } 
                  />
                  
                  {/* Customer Routes */}
                  <Route 
                    path="/customer" 
                    element={currentUser?.role === 'customer' ? <Customer /> : <Navigate to="/login" replace />} 
                  />
                  <Route 
                    path="/events" 
                    element={<Events />} 
                  />
                  <Route 
                    path="/confirm-order" 
                    element={currentUser?.role === 'customer' ? <ConfirmOrder /> : <Navigate to="/login" replace />} 
                  />
                  <Route 
                    path="/reserve" 
                    element={currentUser?.role === 'customer' ? <Reserve /> : <Navigate to="/login" replace />} 
                  />
                  <Route
                    path="/reserve/confirm"
                    element={currentUser?.role === 'customer' ? <ReservationConfirm /> : <Navigate to="/login" replace />}
                  />
                  <Route 
                    path="/menu" 
                    element={currentUser?.role === 'customer' ? <Menu /> : <Navigate to="/login" replace />} 
                  />
                  <Route 
                    path="/confirm-menu" 
                    element={currentUser?.role === 'customer' ? <ConfirmMenu /> : <Navigate to="/login" replace />} 
                  />
                  <Route 
                    path="/my-orders" 
                    element={currentUser?.role === 'customer' ? <MyOrders /> : <Navigate to="/login" replace />} 
                  />

                  {/* Admin Routes */}
                  <Route 
                    path="/admin" 
                    element={currentUser?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/login" replace />} 
                  />
                  <Route 
                    path="/admin/users" 
                    element={currentUser?.role === 'admin' ? <AdminUsers /> : <Navigate to="/login" replace />} 
                  />
                  <Route 
                    path="/admin/events" 
                    element={currentUser?.role === 'admin' ? <AdminEvents /> : <Navigate to="/login" replace />} 
                  />
                  <Route 
                    path="/admin/menu" 
                    element={currentUser?.role === 'admin' ? <AdminMenu /> : <Navigate to="/login" replace />} 
                  />
                  <Route 
                    path="/admin/closure" 
                    element={currentUser?.role === 'admin' ? <DayClosure /> : <Navigate to="/login" replace />} 
                  />

                  {/* Staff Routes */}
                  <Route 
                    path="/staff" 
                    element={currentUser?.role === 'staff' ? <StaffDashboard /> : <Navigate to="/login" replace />} 
                  />
                  <Route 
                    path="/staff/tickets" 
                    element={currentUser?.role === 'staff' ? <StaffTickets /> : <Navigate to="/login" replace />} 
                  />
                  <Route 
                    path="/staff/reservations" 
                    element={currentUser?.role === 'staff' ? <StaffReservations /> : <Navigate to="/login" replace />} 
                  />
                  <Route 
                    path="/staff/table-assignment" 
                    element={currentUser?.role === 'staff' ? <StaffTableAssignment /> : <Navigate to="/login" replace />} 
                  />
                  <Route 
                    path="/staff/fnb" 
                    element={currentUser?.role === 'staff' ? <StaffFnB /> : <Navigate to="/login" replace />} 
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
