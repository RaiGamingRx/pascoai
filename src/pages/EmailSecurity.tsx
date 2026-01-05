import { useMemo, useState } from "react";
import { analyzeEmail, type EmailScanResult } from "@/lib/email";
import { useExportFormat } from "@/hooks/useExportFormat";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import {
  Mail,
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

/* ---------------- Risk Bar ---------------- */
function RiskBar({ score }: { score: number }) {
  return (
    <div className="w-full mt-2">
      <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
        <div
          className={`h-full transition-all duration-700 ${
            score >= 80
              ? "bg-emerald-500"
              : score >= 60
              ? "bg-yellow-500"
              : "bg-red-500"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function EmailSecurity() {
  const exportFormat = useExportFormat();

  const [email, setEmail] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailScanResult | null>(null);
  const [history, setHistory] = useState<EmailScanResult[]>([]);
  const [showWhy, setShowWhy] = useState(false);
  const [pasted, setPasted] = useState(false);

  /* ---------------- Score Badge ---------------- */
  const scoreBadge = useMemo(() => {
    if (!result) return null;
    const cls =
      result.score >= 80
        ? "threat-low"
        : result.score >= 60
        ? "threat-medium"
        : "threat-high";
    return <Badge className={cls}>{result.score}/100</Badge>;
  }, [result]);

  /* ---------------- Run Scan ---------------- */
  async function runScan() {
    if (!email.trim()) {
      toast.error("Enter an email address");
      return;
    }

    setLoading(true);
    setResult(null);

    // realistic delay
    await new Promise((r) => setTimeout(r, 3000));

    try {
      const r = await analyzeEmail(email, content);
      setResult(r);
      setHistory((h) => [r, ...h].slice(0, 10));
      toast.success("Email analysis completed");
    } catch (e: any) {
      toast.error(e?.message || "Email check failed");
    } finally {
      setLoading(false);
    }
  }

  /* ---------------- Paste ---------------- */
  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      setContent(text);
      setPasted(true);
      setTimeout(() => setPasted(false), 1500);
    } catch {
      toast.error("Clipboard access denied");
    }
  }

  /* ---------------- Export ---------------- */
  function exportScanResult() {
    if (!result) {
      toast.error("No scan result to export");
      return;
    }

    const payload = {
      tool: "Email Security Checker",
      scannedAt: new Date().toISOString(),
      result,
    };

    const contentData =
      exportFormat === "json"
        ? JSON.stringify(payload, null, 2)
        : Object.entries(payload)
            .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
            .join("\n");

    const blob = new Blob([contentData], {
      type: exportFormat === "json" ? "application/json" : "text/plain",
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `email-security.${exportFormat}`;
    a.click();

    toast.success(`Exported (${exportFormat.toUpperCase()})`);
  }

  const clearHistory = () => setHistory([]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gradient-cyber">
          Email Security Checker
        </h1>
        <p className="text-muted-foreground mt-1">
          Real, safe checks for email validity and phishing signals.
        </p>
      </div>

      {/* Input */}
      <Card variant="glass" className="border-primary/30">
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Email address</p>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Email content (optional)
            </p>
            <div className="relative">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste email body to analyze phishing signals"
                className="min-h-[120px] pr-24"
              />
              <button
                type="button"
                onClick={handlePaste}
                className="absolute top-3 right-3 px-3 py-1 text-xs rounded-md
                  bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition"
              >
                {pasted ? "PASTED" : "PASTE"}
              </button>
            </div>
          </div>

          <Button onClick={runScan} disabled={loading}>
            {loading ? "Analyzing..." : "Analyze Email"}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card variant="cyber">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Scan Result
              </CardTitle>
              <CardDescription>
                Analysis for <b>{result.email}</b>
              </CardDescription>
            </div>

            <Button variant="outline" size="sm" onClick={exportScanResult}>
              Export
            </Button>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              {scoreBadge}
              <Badge variant="outline">
                {result.valid ? "Valid format" : "Invalid format"}
              </Badge>
              {result.disposable && (
                <Badge className="threat-high">Disposable</Badge>
              )}
              {result.roleBased && (
                <Badge className="threat-medium">Role-based</Badge>
              )}
            </div>

            <RiskBar score={result.score} />

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                Risk Analysis Breakdown
              </p>
              <button
                onClick={() => setShowWhy((s) => !s)}
                className="text-xs text-cyan-400 hover:underline"
              >
                {showWhy ? "Hide details" : "Why risky?"}
              </button>
            </div>

            {showWhy && (
              <ul className="space-y-2 mt-2">
                {result.flags.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {f.level === "safe" ? (
                      <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                    )}
                    <span className="text-muted-foreground">{f.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history">
            <Clock className="w-4 h-4 mr-2" /> History
          </TabsTrigger>
          <TabsTrigger value="about">
            <ShieldCheck className="w-4 h-4 mr-2" /> About Checks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <Card variant="glass">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Scans</CardTitle>
              <Button variant="outline" size="sm" onClick={clearHistory}>
                <Trash2 className="w-4 h-4 mr-2" /> Clear
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.length === 0 && (
                <p className="text-sm text-muted-foreground">No scans yet.</p>
              )}
              {history.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                >
                  <span className="font-mono text-sm truncate">{h.email}</span>
                  <Badge>{h.score}/100</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about">
          <Card variant="glass">
            <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
              <p>✔ Syntax & structure validation</p>
              <p>✔ Disposable / temp email detection</p>
              <p>✔ Role-based email risk</p>
              <p>✔ Content phishing signals</p>
              <p>✔ Explainable risk score</p>
              <p className="text-xs text-muted-foreground">
                No emails are sent. Fully legal & safe.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
