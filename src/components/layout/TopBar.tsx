import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Command, LogOut, Settings, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface TopBarProps {
  onMenuClick: () => void;
  showMenuButton: boolean;
  user: { email: string } | null;
  onLogout: () => void;
}

export function TopBar({
  onMenuClick,
  showMenuButton,
  user,
  onLogout,
}: TopBarProps) {
  const navigate = useNavigate();
  const { user: authUser, isDemo } = useAuth();

  // ✅ ORIGINAL avatar logic (UNCHANGED)
  const avatarLetter = isDemo
    ? "D"
    : authUser?.displayName
    ? authUser.displayName.charAt(0).toUpperCase()
    : authUser?.email?.charAt(0).toUpperCase() || "U";

  /* ✅ ONLY ADDITION: listen for tour auto-open */
  useEffect(() => {
    const openFromTour = () => {
      onMenuClick();

      // sidebar animation ke baad tour ko notify
      setTimeout(() => {
        window.dispatchEvent(new Event("tour:menu-opened"));
      }, 120);
    };

    window.addEventListener("tour:open-menu", openFromTour);
    return () =>
      window.removeEventListener("tour:open-menu", openFromTour);
  }, [onMenuClick]);

  return (
    <header
      data-tour="topbar"
      className="h-16 bg-card/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 sticky top-0 z-30"
    >
      {/* LEFT */}
      <div className="flex items-center gap-4">
        {showMenuButton && (
          <Button
            data-tour="hamburger"
            variant="ghost"
            size="icon"
            onClick={() => {
              onMenuClick();

              // ✅ notify tour on manual mobile click
              window.dispatchEvent(new Event("tour:menu-opened"));
            }}
            className="md:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}

        {/* Command palette (ORIGINAL UI) */}
        <Button
          variant="outline"
          className="hidden md:flex items-center gap-2 text-muted-foreground w-64"
          onClick={() => {
            onMenuClick();
            window.dispatchEvent(new Event("tour:menu-opened"));
          }}
        >
          <Command className="w-4 h-4" />
          <span className="text-sm">Quick actions...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3">
        {/* ✅ ORIGINAL DEMO MODE GLOW (UNCHANGED) */}
        {isDemo && (
          <div className="relative">
            <span className="absolute -inset-1 rounded-full bg-cyan-400/40 blur-md animate-pulse" />
            <span className="relative px-3 py-1 text-xs font-semibold rounded-full bg-cyan-500 text-black shadow-lg">
              DEMO MODE
            </span>
          </div>
        )}

        {/* User menu (ORIGINAL UI) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10 border-2 border-primary/30">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {avatarLetter}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {authUser?.displayName || "Account"}
                </p>
                <p className="text-xs leading-none text-muted-foreground font-mono">
                  {authUser?.email || "user@example.com"}
                </p>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => navigate("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={onLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
