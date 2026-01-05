import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Shield,
  Globe,
  MailCheck,
  Lock,
  Key,
  Search,
  Beaker,
  Settings,
  ChevronLeft,
  Menu,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },

  { icon: Shield, label: "Scanner", path: "/scanner" },
  { icon: Globe, label: "Web Security", path: "/web-security" },
  { icon: MailCheck, label: "Email Security", path: "/email-security" },

  { icon: Lock, label: "Crypto Lab", path: "/crypto" },
  { icon: Key, label: "Password Lab", path: "/password-lab" },

  { icon: Search, label: "Research Suite", path: "/research" },
  { icon: Beaker, label: "Simulations", path: "/simulations" },

  { icon: Settings, label: "Settings", path: "/settings" },
];

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isMobile: boolean;
}

export function Sidebar({ isOpen, onToggle, isMobile }: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && (
        <div
          className={cn(
            "fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity duration-300 ease-in-out",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        data-tour="sidebar"
        className={cn(
          "fixed top-0 left-0 z-50 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col",
          isOpen ? "w-64" : "w-16",
          isMobile && !isOpen && "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          {isOpen && (
            <div className="flex items-center gap-2 animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-neon-cyan">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-gradient-cyber">PascoAI</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-sidebar-foreground hover:text-primary"
          >
            {isOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (isMobile) onToggle();
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                  isActive
                    ? "bg-primary/10 text-primary neon-border"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-primary"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5 transition-all duration-200",
                    isActive && "neon-text"
                  )}
                />
                {isOpen && (
                  <span className="font-medium animate-fade-in">{item.label}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        {isOpen && (
          <div className="p-4 border-t border-sidebar-border">
            <p className="text-xs text-muted-foreground text-center">
              Powered by <span className="text-primary">Raay</span>
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
