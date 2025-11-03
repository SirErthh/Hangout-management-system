import { User, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TopBarProps {
  user: { fname?: string; lname?: string; email: string; role: string } | null;
  onLogout: () => void;
}

const TopBar = ({ user, onLogout }: TopBarProps) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-gradient-primary backdrop-blur-lg">
      <div className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <button 
            onClick={() => navigate('/')}
            className="text-2xl font-bold text-white tracking-tight hover:scale-105 transition-smooth"
          >
            HANGOUT
          </button>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="text-white hover:bg-white/20 gap-2"
                  >
                    <User className="h-4 w-4" />
                    <span>{user.fname || user.lname ? `${user.fname} ${user.lname}`.trim() : user.email}</span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{user.role}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
                className="text-white hover:bg-white/20"
              >
                Login
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/register')}
                className="bg-white text-primary hover:bg-white/90"
              >
                Register
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
