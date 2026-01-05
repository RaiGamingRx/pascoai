import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Shield,
  Key,
  Search,
  Settings,
  Globe,
  Scan,
  FileText,
  Lock,
} from "lucide-react";

const navigationItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Shield, label: "Scanner", path: "/scanner" },
  { icon: Key, label: "Password Lab", path: "/password-lab" },
  { icon: Search, label: "Research Suite", path: "/research" },
  { icon: Globe, label: "Web Security", path: "/web-security" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const quickActions = [
  { icon: Scan, label: "Start New Scan", path: "/scanner", action: "scan" },
  { icon: Lock, label: "Check Password Strength", path: "/password-lab" },
  { icon: FileText, label: "New Research Session", path: "/research" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." className="font-mono" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Quick Actions">
          {quickActions.map((item) => (
            <CommandItem
              key={item.label}
              onSelect={() => handleSelect(item.path)}
              className="flex items-center gap-3"
            >
              <item.icon className="w-4 h-4 text-primary" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => handleSelect(item.path)}
              className="flex items-center gap-3"
            >
              <item.icon className="w-4 h-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
