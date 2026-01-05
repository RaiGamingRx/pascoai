import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Key,
  Search,
  Scan,
  ArrowRight,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Activity,
  Zap,
  FileText,
} from "lucide-react";

/**
 * IMPORTANT:
 * UI classes/structure are kept SAME as your original Dashboard.
 * Only data is made real via localStorage histories.
 */

/* -------------------- Storage Keys (real app history) -------------------- */
const SCAN_HISTORY_KEYS = [
  "pasco_scan_history",
  "pasco_scanner_history",
  "scanner_history",
  "scan_history",
];

const PASSWORD_HISTORY_KEYS = [
  "pasco_password_history",
  "pasco_password_lab_history",
  "password_history",
  "passwordlab_history",
];

const RESEARCH_HISTORY_KEYS = [
  "pasco_research_history_v1",
  "pasco_research_history",
  "research_history",
];

/* -------------------- Safe helpers -------------------- */
function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readFirstArray(keys: string[]): any[] {
  for (const k of keys) {
    const v = safeJson<any[]>(localStorage.getItem(k), []);
    if (Array.isArray(v) && v.length) return v;
  }
  // return empty if none exist
  return [];
}

function pickString(obj: any, keys: string[], fallback = ""): string {
  for (const k of keys) {
    const v = obj?.[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return fallback;
}

function pickNumber(obj: any, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj?.[k];
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/* Pretty time for dashboard (keeps same UI text style) */
function timeLabelFromAny(item: any): string {
  const d =
    pickString(item, ["date", "createdAt", "time", "timestamp"], "") ||
    (typeof item === "string" ? item : "");
  if (!d) return "Just now";
  // If it's already “2 hours ago / 1 day ago” keep it
  if (/\bago\b/i.test(d)) return d;

  // Try parse ISO / Date
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return String(d).slice(0, 24);

  const diffMs = Date.now() - parsed.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

type ActivityItem = {
  type: "scan" | "password" | "research";
  title: string;
  target: string;
  time: string;
  status: "success" | "warning" | "error";
  score: number | null;
};

const quickActions = [
  {
    icon: Scan,
    label: "Start Scan",
    description: "Run AI-powered security analysis",
    path: "/scanner",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Key,
    label: "Check Password",
    description: "Analyze password strength",
    path: "/password-lab",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: FileText,
    label: "New Research",
    description: "Start research session",
    path: "/research",
    color: "text-secondary",
    bgColor: "bg-secondary/10",
  },
];

const securityTips = [
  "Enable two-factor authentication on all critical accounts",
  "Regularly rotate API keys and access tokens",
  "Monitor your domains for SSL certificate expiration",
  "Keep your security scanner database updated",
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [passwordHistory, setPasswordHistory] = useState<any[]>([]);
  const [researchHistory, setResearchHistory] = useState<any[]>([]);

  useEffect(() => {
    // load real histories (whichever key exists in your app)
    setScanHistory(readFirstArray(SCAN_HISTORY_KEYS));
    setPasswordHistory(readFirstArray(PASSWORD_HISTORY_KEYS));
    setResearchHistory(readFirstArray(RESEARCH_HISTORY_KEYS));
  }, []);

  const derived = useMemo(() => {
    // ---- scans ----
    const scansRun = scanHistory.length;

    // common shapes:
    // { status: "success"|"warning"|"error" }, or { ok: true/false }, or { success: true/false }
    const scanSuccess = scanHistory.filter((s) => {
      const st = pickString(s, ["status", "state"], "").toLowerCase();
      if (st) return st === "success" || st === "ok" || st === "passed";
      if (typeof s?.ok === "boolean") return s.ok;
      if (typeof s?.success === "boolean") return s.success;
      return false;
    }).length;

    const scanErrors = scanHistory.filter((s) => {
      const st = pickString(s, ["status", "state"], "").toLowerCase();
      if (st) return st === "error" || st === "failed" || st === "fail";
      if (typeof s?.ok === "boolean") return !s.ok;
      if (typeof s?.success === "boolean") return !s.success;
      return false;
    }).length;

    // issues fixed/open from scan results (if you store vulnerabilities)
    // try common fields: fixedCount/openCount/issuesFixed/openIssues/findings
    const fixedFromCounts = scanHistory.reduce((acc, s) => {
      const n = pickNumber(s, ["fixedCount", "issuesFixed", "resolved", "resolvedCount"]);
      return acc + (n ?? 0);
    }, 0);

    const openFromCounts = scanHistory.reduce((acc, s) => {
      const n = pickNumber(s, ["openCount", "openIssues", "unresolved", "unresolvedCount"]);
      return acc + (n ?? 0);
    }, 0);

    // fallback if counts not present: treat non-success scans as open issues count
    const issuesFixed = fixedFromCounts > 0 ? fixedFromCounts : scanSuccess;
    const openIssues = openFromCounts > 0 ? openFromCounts : scanErrors;

    // avg score
    const scores = scanHistory
      .map((s) => pickNumber(s, ["score", "riskScore", "overallScore"]))
      .filter((n): n is number => typeof n === "number" && Number.isFinite(n));

    const avgScore =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    // ---- system badge status ----
    // If there are recent failures -> warning/error; otherwise operational.
    const systemStatus: "success" | "warning" | "error" =
      scanErrors > 0 ? "warning" : "success";

    return {
      scansRun,
      issuesFixed,
      openIssues,
      avgScore,
      systemStatus,
    };
  }, [scanHistory]);

  const recentActivity: ActivityItem[] = useMemo(() => {
    const scanItems: ActivityItem[] = scanHistory.slice(-8).map((s) => {
      const target =
        pickString(s, ["target", "host", "domain", "url", "ip"], "Scan Target");

      const score = pickNumber(s, ["score", "riskScore", "overallScore"]);
      const stRaw = pickString(s, ["status", "state"], "").toLowerCase();

      const status: ActivityItem["status"] =
        stRaw === "error" || stRaw === "failed" || stRaw === "fail"
          ? "error"
          : stRaw === "warning"
          ? "warning"
          : stRaw === "success" || stRaw === "ok" || stRaw === "passed"
          ? "success"
          : typeof s?.ok === "boolean"
          ? s.ok
            ? "success"
            : "error"
          : typeof s?.success === "boolean"
          ? s.success
            ? "success"
            : "error"
          : "success";

      return {
        type: "scan",
        title: "Domain scan completed",
        target,
        time: timeLabelFromAny(s),
        status,
        score: typeof score === "number" ? Math.max(0, Math.min(100, Math.round(score))) : null,
      };
    });

    const passwordItems: ActivityItem[] = passwordHistory.slice(-8).map((p) => {
      const target = pickString(p, ["label", "name", "title", "context"], "Password analysis");
      const score = pickNumber(p, ["score", "strength", "rating"]);

      const status: ActivityItem["status"] =
        typeof score === "number"
          ? score >= 70
            ? "success"
            : score >= 45
            ? "warning"
            : "error"
          : "success";

      return {
        type: "password",
        title: "Password analysis",
        target,
        time: timeLabelFromAny(p),
        status,
        score: typeof score === "number" ? Math.max(0, Math.min(100, Math.round(score))) : null,
      };
    });

    const researchItems: ActivityItem[] = researchHistory.slice(-8).map((r) => {
      const target = pickString(r, ["topic", "query", "title"], "Research session");
      return {
        type: "research",
        title: "Research session",
        target,
        time: timeLabelFromAny(r),
        status: "success",
        score: null,
      };
    });

    // merge & keep latest 8
    const merged = [...scanItems, ...passwordItems, ...researchItems];

    // If items contain parseable dates, sort by that; else keep insertion order
    const withTs = merged.map((x) => {
      const raw = x.time;
      const d = new Date(raw);
      const ts = isNaN(d.getTime()) ? 0 : d.getTime();
      return { x, ts };
    });

    // If any timestamps exist, sort; else just reverse by newest added
    const hasTs = withTs.some((t) => t.ts !== 0);
    const sorted = hasTs
      ? withTs.sort((a, b) => b.ts - a.ts).map((t) => t.x)
      : merged.reverse();

    return sorted.slice(0, 8);
  }, [scanHistory, passwordHistory, researchHistory]);

  const clearHistory = () => {
    // remove all possible keys (so it works even if you rename later)
    [...SCAN_HISTORY_KEYS, ...PASSWORD_HISTORY_KEYS, ...RESEARCH_HISTORY_KEYS].forEach((k) =>
      localStorage.removeItem(k)
    );
    setScanHistory([]);
    setPasswordHistory([]);
    setResearchHistory([]);
  };

  const hasAnyHistory =
    scanHistory.length > 0 || passwordHistory.length > 0 || researchHistory.length > 0;

  // Keep SAME badge styling, only change the text/icon color (minimal)
  const badgeText =
    derived.systemStatus === "success"
      ? "All systems operational"
      : derived.systemStatus === "warning"
      ? "Minor issues detected"
      : "Service issue detected";

  const badgeIconClass =
    derived.systemStatus === "success"
      ? "text-success animate-pulse"
      : derived.systemStatus === "warning"
      ? "text-warning animate-pulse"
      : "text-destructive animate-pulse";

  return (
    <div data-tour="dashboard" className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gradient-cyber">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome to your cybersecurity command center
          </p>
        </div>
        <Badge variant="outline" className="w-fit flex items-center gap-2 py-1.5 px-3">
          <Activity className={`w-4 h-4 ${badgeIconClass}`} />
          <span>{badgeText}</span>
        </Badge>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Card
            key={action.label}
            variant="cyber"
            className="cursor-pointer group"
            onClick={() => navigate(action.path)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl ${action.bgColor}`}>
                  <action.icon className={`w-6 h-6 ${action.color}`} />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{action.label}</h3>
              <p className="text-sm text-muted-foreground">{action.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats (UI SAME, only values real) */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="glass" className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{derived.scansRun}</p>
                <p className="text-xs text-muted-foreground">Scans Run</p>
              </div>
            </div>
          </Card>

          <Card variant="glass" className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{derived.issuesFixed}</p>
                <p className="text-xs text-muted-foreground">Issues Fixed</p>
              </div>
            </div>
          </Card>

          <Card variant="glass" className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{derived.openIssues}</p>
                <p className="text-xs text-muted-foreground">Open Issues</p>
              </div>
            </div>
          </Card>

          <Card variant="glass" className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/10">
                <TrendingUp className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{derived.avgScore}%</p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Security Tips (unchanged UI/content) */}
        <Card variant="cyber" className="p-0">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-warning" />
              <CardTitle className="text-lg">Security Tips</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {securityTips.map((tip, index) => (
              <div key={index} className="flex items-start gap-2 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <p className="text-muted-foreground">{tip}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card variant="cyber">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Recent Activity
            </CardTitle>

            {/* View all removed -> Clear History (red) */}
            <Button
              variant="destructive"
              size="sm"
              onClick={clearHistory}
              disabled={!hasAnyHistory}
              title={!hasAnyHistory ? "No history to clear" : "Clear history"}
            >
              Clear History
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {recentActivity.length === 0 ? (
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  No recent activity yet. Run a scan, check a password, or start research.
                </p>
              </div>
            ) : (
              recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        activity.type === "scan"
                          ? "bg-primary/10"
                          : activity.type === "password"
                          ? "bg-accent/10"
                          : "bg-secondary/10"
                      }`}
                    >
                      {activity.type === "scan" && <Shield className="w-4 h-4 text-primary" />}
                      {activity.type === "password" && <Key className="w-4 h-4 text-accent" />}
                      {activity.type === "research" && <Search className="w-4 h-4 text-secondary" />}
                    </div>
                    <div>
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground font-mono">{activity.target}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {activity.score !== null && (
                      <Badge
                        variant="outline"
                        className={
                          activity.score >= 80
                            ? "threat-low"
                            : activity.score >= 60
                            ? "threat-medium"
                            : "threat-high"
                        }
                      >
                        {activity.score}/100
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">{activity.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
