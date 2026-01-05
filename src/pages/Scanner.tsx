import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Shield,
  Scan,
  Globe,
  CheckCircle,
  Info,
  Loader2,
  Download,
  RefreshCw,
  Clock,
  Target,
  Lock,
  Bug,
  Eye,
  Network,
} from "lucide-react";
import { toast } from "sonner";

import { runRealScan, type RealScanResult } from "../lib/scanner";

interface ScanResultUI {
  category: string;
  icon: React.ElementType;
  findings: {
    title: string;
    severity: "critical" | "high" | "medium" | "low" | "info";
    description: string;
    recommendation: string;
  }[];
}

type HistoryItem = { target: string; date: string; score: number };

const HISTORY_KEY = "pasco_scan_history_v1";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizeToUrlLike(input: string) {
  const v = input.trim();
  if (!v) return "";
  // If user typed domain/ip without scheme, prepend https://
  if (!/^https?:\/\//i.test(v)) return `https://${v}`;
  return v;
}

export default function Scanner() {
  const [target, setTarget] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResults, setScanResults] = useState<ScanResultUI[] | null>(null);
  const [threatScore, setThreatScore] = useState<number | null>(null);
  const [scanHistory, setScanHistory] = useState<HistoryItem[]>([]);

  // Load history once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setScanHistory(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const isValidTarget = (value: string) => {
    // domain / ip (same as your old logic)
    const domainRegex =
      /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return domainRegex.test(value) || ipRegex.test(value);
  };

  const iconMap = useMemo(
    () => ({
      Eye,
      Bug,
      Network,
      Lock,
    }),
    []
  );

  const runScan = async () => {
    setScanResults(null);
    setThreatScore(null);
    const raw = target.trim();

    // ---- Pretty error like you asked ----
    if (!raw) {
      toast.error("Your URL is incorrect");
      return;
    }

    // If user types full URL, extract hostname for validation
    let hostForValidation = raw;
    try {
      const maybeUrl = new URL(normalizeToUrlLike(raw));
      hostForValidation = maybeUrl.hostname || raw;
    } catch {
      // if URL parsing fails, fallback to raw
      hostForValidation = raw;
    }

    if (!isValidTarget(hostForValidation)) {
      toast.error("Your URL is incorrect");
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setScanResults(null);
    setThreatScore(null);

    toast.info("Running safe, non-intrusive analysis...");

    // Smooth progress (NOT fake results, only UI)
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        const next = prev + 8;
        return next >= 90 ? 90 : next;
      });
    }, 250);

    try {
      const res: RealScanResult = await runRealScan(raw);

      // Convert backend result to UI format (keeps your old UI)
      const uiResults: ScanResultUI[] = res.results.map((r) => {
        const Icon = iconMap[r.icon] ?? Info;
        return {
          category: r.category,
          icon: Icon,
          findings: r.findings,
        };
      });

      setScanResults(uiResults);
      setThreatScore(res.score);

      // Save history
      const item: HistoryItem = {
        target: hostForValidation,
        date: todayISO(),
        score: res.score,
      };
      const updated = [item, ...scanHistory]
        // remove duplicates by target (keep latest)
        .filter((x, i, arr) => arr.findIndex((y) => y.target === x.target) === i)
        .slice(0, 12);

      setScanHistory(updated);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }

      toast.success("Scan completed successfully!");
    } catch (e: any) {
      toast.error(e?.message || "Scan failed");
    } finally {
      clearInterval(progressInterval);
      setScanProgress(100);
      setTimeout(() => {
        setIsScanning(false);
        setScanProgress(0);
      }, 450);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "threat-critical";
      case "high":
        return "threat-high";
      case "medium":
        return "threat-medium";
      case "low":
        return "threat-low";
      default:
        return "threat-info";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const exportReport = () => {
    if (!scanResults || threatScore == null) return;

    const payload = {
      target: target.trim(),
      score: threatScore,
      date: new Date().toISOString(),
      results: scanResults,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pasco-scan-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Report exported");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gradient-cyber">AI Cybersecurity Scanner</h1>
        <p className="text-muted-foreground mt-1">
          Perform safe, non-intrusive security analysis on domains and IP addresses
        </p>
      </div>

      {/* Scanner Input */}
      <Card variant="cyber">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="target">Target Domain or IP</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="target"
                  placeholder="example.com or 192.168.1.1"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="pl-10"
                  disabled={isScanning}
                />
              </div>
            </div>
            <div className="flex items-end">
              <Button onClick={runScan} disabled={!target || isScanning} className="w-full md:w-auto">
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Scan className="w-4 h-4 mr-2" />
                    Start Scan
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Scan Progress */}
          {isScanning && (
            <div className="mt-6 space-y-2 animate-fade-in">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Scanning in progress...</span>
                <span className="font-mono text-primary">{Math.round(scanProgress)}%</span>
              </div>
              <Progress value={scanProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center animate-pulse">
                Running safe, non-intrusive analysis...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {scanResults && threatScore != null && (
        <div className="space-y-6 animate-fade-in">
          {/* Threat Score */}
          <Card variant="glow" className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-muted flex items-center justify-center">
                      <span className={`text-3xl font-bold ${getScoreColor(threatScore)}`}>
                        {threatScore}
                      </span>
                    </div>
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `conic-gradient(hsl(var(--primary)) ${threatScore}%, transparent ${threatScore}%)`,
                        opacity: 0.2,
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Security Score</h3>
                    <p className="text-muted-foreground">
                      Target: <span className="font-mono text-foreground">{target}</span>
                    </p>
                    <Badge variant="outline" className="mt-2">
                      {threatScore >= 80 ? "Good" : threatScore >= 60 ? "Fair" : "Needs Attention"}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={runScan}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Re-scan
                  </Button>
                  <Button variant="secondary" size="sm" onClick={exportReport}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Findings */}
          <Tabs
            defaultValue={scanResults[0]?.category}
            className="space-y-6 mt-6"
          >
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6 gap-2">
              {scanResults.map((category) => (
                <TabsTrigger key={category.category} value={category.category} className="text-xs md:text-sm">
                  <category.icon className="w-4 h-4 mr-2" />
                  {category.category}
                </TabsTrigger>
              ))}
            </TabsList>

            {scanResults.map((category) => (
              <TabsContent key={category.category} value={category.category}>
                <div className="space-y-4">
                  {category.findings.map((finding, index) => (
                    <Card key={index} variant="glass">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{finding.title}</h4>
                              <Badge className={getSeverityColor(finding.severity)}>
                                {finding.severity.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{finding.description}</p>
                            <div className="flex items-start gap-2 mt-2 p-3 rounded-lg bg-muted/50">
                              <CheckCircle className="w-4 h-4 text-success mt-0.5" />
                              <p className="text-sm">{finding.recommendation}</p>
                            </div>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Info className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Header-based, non-intrusive scan</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}

      {/* Scan History */}
      {!isScanning && (
        <Card variant="cyber">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Scan History
                </CardTitle>
                <CardDescription>Your recent security scans</CardDescription>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (!scanHistory.length) return;

                  if (confirm("Clear all scan history?")) {
                    localStorage.removeItem(HISTORY_KEY);
                    setScanHistory([]);
                    toast.success("Scan history cleared");
                  }
                }}
              >
                Clear History
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {scanHistory.length > 0 ? (
              <div className="space-y-3">
                {scanHistory.map((scan, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setTarget(scan.target)}
                  >
                    <div className="flex items-center gap-3">
                      <Target className="w-4 h-4 text-primary" />
                      <span className="font-mono">{scan.target}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className={scan.score >= 80 ? "threat-low" : "threat-medium"}>
                        {scan.score}/100
                      </Badge>
                      <span className="text-sm text-muted-foreground">{scan.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-60" />
                <p>No scans yet. Start your first scan above.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
