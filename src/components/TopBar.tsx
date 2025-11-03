import { User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface TopBarProps {
  user: { email: string; role: string } | null;
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
              <div className="flex items-center gap-2 text-white/90 text-sm bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{user.role}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-white hover:bg-white/20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
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
