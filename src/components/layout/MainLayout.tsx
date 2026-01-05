import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "@/components/CommandPalette";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { AppTour } from "./AppTour";

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const open = () => setSidebarOpen(true);
    const close = () => setSidebarOpen(false);
  
    window.addEventListener("tour:open-menu", open);
    window.addEventListener("tour:close-menu", close);
  
    return () => {
      window.removeEventListener("tour:open-menu", open);
      window.removeEventListener("tour:close-menu", close);
    };
  }, []);  

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isMobile={isMobile}
      />

      <div
        className={cn(
          "transition-all duration-300",
          sidebarOpen && !isMobile ? "ml-64" : "ml-0 md:ml-16"
        )}
      >
        <TopBar
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          showMenuButton={isMobile || !sidebarOpen}
          user={user}
          onLogout={handleLogout}
        />

        <main className="p-4 md:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>

        <footer className="py-4 text-center text-sm text-muted-foreground border-t border-border">
          Powered by <span className="text-primary font-medium">Raay</span>
        </footer>
      </div>

      <CommandPalette />

      {/* ✅ App Tour Overlay */}
      <AppTour />

    </div>
  );
}
