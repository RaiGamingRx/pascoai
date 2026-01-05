import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Shield, Trash2, User, LogOut, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

type ExportFormat = "json" | "txt";

export default function Settings() {
  const { user, isDemo, updateDisplayName, logout } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(user?.displayName || "");

  /* ---------------- SECURITY / PASSWORD ---------------- */
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  /* ---------------- EXPORT SETTINGS ---------------- */
  const [exportFormat, setExportFormat] = useState<ExportFormat>("json");

  /* ---------------- DEFAULT PERSONA ---------------- */
  const [persona, setPersona] = useState("Cybersecurity Expert");

  useEffect(() => {
    const savedExport = localStorage.getItem("pasco_export_format");
    const savedPersona = localStorage.getItem("pasco_default_persona");

    if (savedExport === "json" || savedExport === "txt") setExportFormat(savedExport);
    if (savedPersona) setPersona(savedPersona);
  }, []);

  /* ---------------- CHANGE PASSWORD ---------------- */
  const handleChangePassword = () => {
    if (isDemo) {
      toast.error("Password change disabled in demo mode");
      return;
    }

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("All password fields are required");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated successfully");
  };

  /* ---------------- EXPORT SETTINGS ---------------- */
  const saveExportSettings = () => {
    localStorage.setItem("pasco_export_format", exportFormat);

    // ✅ LIVE SYNC across tools in same tab (PasswordLab/CryptoLab/etc.)
    window.dispatchEvent(new Event("pasco_export_format_changed"));

    toast.success("Export settings saved");
  };

  const exportData = (type: "settings" | "security" | "persona") => {
    const payload =
      type === "settings"
        ? { displayName: user?.displayName }
        : type === "security"
        ? {
            email: user?.email,
            demoMode: isDemo,
            lastLogin: user?.lastLogin,
          }
        : { defaultPersona: persona };

    const content =
      exportFormat === "json"
        ? JSON.stringify(payload, null, 2)
        : Object.entries(payload)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join("\n");

    const blob = new Blob([content], {
      type: exportFormat === "json" ? "application/json" : "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pascoai-${type}.${exportFormat}`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported (${exportFormat})`);
  };

  /* ---------------- DELETE ACCOUNT ---------------- */
  const deleteAccount = () => {
    if (isDemo) {
      toast.error("Account deletion disabled in demo mode");
      return;
    }

    if (!confirm("Delete account permanently? This cannot be undone.")) return;

    toast.success("Account deleted (demo placeholder)");
    navigate("/auth");
  };

  /* ---------------- UPDATE DISPLAY NAME ---------------- */
  const updateName = () => {
    if (isDemo) {
      toast.error("Display name cannot be changed in demo mode");
      return;
    }
    if (!displayName.trim()) {
      toast.error("Display name cannot be empty");
      return;
    }
    updateDisplayName(displayName.trim());
    toast.success("Display name updated");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gradient-cyber">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account, exports, and default preferences.
        </p>
      </div>

      {/* Account */}
      <Card variant="glass" className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Account
          </CardTitle>
          <CardDescription>Update your display name (demo mode is locked)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isDemo}
              placeholder="Your name"
            />
          </div>

          <Button onClick={updateName} disabled={isDemo}>
            Save
          </Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card variant="glass" className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Security
          </CardTitle>
          <CardDescription>Change password (disabled in demo)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Old Password</Label>
              <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} disabled={isDemo} />
            </div>
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isDemo} />
            </div>
            <div className="space-y-2">
              <Label>Confirm</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isDemo} />
            </div>
          </div>

          <Button onClick={handleChangePassword} disabled={isDemo}>
            Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Export Settings */}
      <Card variant="glass" className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Export Settings
          </CardTitle>
          <CardDescription>Used by tools export buttons (PasswordLab/CryptoLab/etc.)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Export Format</Label>
            <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as ExportFormat)}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="txt">TXT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={saveExportSettings}>Save</Button>

          <Separator />

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => exportData("settings")}>
              Export Settings
            </Button>
            <Button variant="outline" onClick={() => exportData("security")}>
              Export Security
            </Button>
            <Button variant="outline" onClick={() => exportData("persona")}>
              Export Persona
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card variant="glass" className="border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Permanent actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="destructive" onClick={deleteAccount} disabled={isDemo} className="gap-2">
            <Trash2 className="w-4 h-4" />
            Delete Account
          </Button>
        </CardContent>
      </Card>

      {/* Logout */}
      <Card variant="glass" className="border-primary/10">
        <CardContent className="flex items-center justify-center py-10">
          <Button variant="destructive" className="w-full max-w-md h-12 text-base gap-2" onClick={logout}>
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
