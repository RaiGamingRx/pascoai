import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  Globe,
  Shield,
  Cookie,
  AlertTriangle,
  CheckCircle,
  Server,
  Network,
  Lock,
  FileCode,
} from "lucide-react";
import { scanWebsite, type WebSecurityResult } from "@/lib/webSecurity";

const headerMeta: Record<string, { label: string; severity: "critical" | "high" | "medium" | "low"; why: string; fix: string }> = {
  "content-security-policy": {
    label: "Content-Security-Policy",
    severity: "critical",
    why: "Helps prevent XSS by controlling what scripts/resources can load.",
    fix: "Add a strict CSP (avoid unsafe-inline where possible).",
  },
  "strict-transport-security": {
    label: "Strict-Transport-Security",
    severity: "high",
    why: "Forces browsers to use HTTPS (prevents downgrade attacks).",
    fix: "Enable HSTS with long max-age + includeSubDomains.",
  },
  "x-frame-options": {
    label: "X-Frame-Options",
    severity: "high",
    why: "Stops clickjacking by controlling iframe embedding.",
    fix: "Set to DENY or SAMEORIGIN (or use CSP frame-ancestors).",
  },
  "x-content-type-options": {
    label: "X-Content-Type-Options",
    severity: "medium",
    why: "Prevents MIME sniffing issues.",
    fix: "Set to nosniff.",
  },
  "referrer-policy": {
    label: "Referrer-Policy",
    severity: "low",
    why: "Controls how much referrer info is leaked.",
    fix: "Use strict-origin-when-cross-origin or no-referrer.",
  },
  "permissions-policy": {
    label: "Permissions-Policy",
    severity: "low",
    why: "Restricts access to powerful browser features (camera, geo, etc.).",
    fix: "Define policy for features your site does not need.",
  },
};

export default function WebSecurity() {
  const [url, setUrl] = useState("https://example.com");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<WebSecurityResult | null>(null);
  const [history, setHistory] = useState<WebSecurityResult[]>([]);

  const clearHistory = () => {
    setHistory([]);
  };  

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical": return "threat-critical";
      case "high": return "threat-high";
      case "medium": return "threat-medium";
      case "low": return "threat-low";
      default: return "threat-info";
    }
  };

  const scoreBadge = useMemo(() => {
    if (!result) return null;
    const cls =
      result.score >= 90 ? "threat-low" :
      result.score >= 75 ? "threat-medium" :
      result.score >= 60 ? "threat-high" :
      "threat-critical";
    return <Badge className={cls}>{result.grade} • {result.score}/100</Badge>;
  }, [result]);

  async function onScan() {
    setErr(null);
    setLoading(true);
    try {
      const r = await scanWebsite(url);
      setResult(r);
      setHistory((prev) => [r, ...prev].slice(0, 10));
    } catch (e: any) {
      setErr(e?.message || "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gradient-cyber">Web Security Scanner Suite</h1>
        <p className="text-muted-foreground mt-1">
          Real, legal checks: headers, cookies, HTTPS/SSL, DNS and HTTP method exposure.
        </p>
      </div>

      {/* Scan Bar */}
      <Card variant="glass" className="border-primary/30">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">Target URL</p>
              <div className="flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                />
                <Button onClick={onScan} disabled={loading} className="min-w-[140px]">
                  {loading ? "Scanning..." : "Scan Website"}
                </Button>
              </div>
              {err && (
                <div className="mt-2 text-sm text-warning flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{err}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {result ? (
                <>
                  {scoreBadge}
                  <Badge variant="outline" className="font-mono">
                    {new URL(result.finalUrl).hostname}
                  </Badge>
                </>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  No scan yet
                </Badge>
              )}
            </div>
          </div>

          {result && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    <p className="font-medium">HTTPS</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.https ? "Enabled ✅" : "Not enabled ❌"}
                  </p>
                  {result.certificate && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Cert: {result.certificate.issuer} • {result.certificate.daysRemaining} days left
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-secondary" />
                    <p className="font-medium">Redirects</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {result.redirects?.length ? `${Math.max(result.redirects.length - 1, 0)} hops` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 break-all">
                    Final: {result.finalUrl}
                  </p>
                </CardContent>
              </Card>

              <Card variant="glass">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-accent" />
                    <p className="font-medium">DNS</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {Array.isArray(result.dns) ? `${result.dns.length} records` : "—"}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="headers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="headers">
            <Shield className="w-4 h-4 mr-2" />
            Security Headers
          </TabsTrigger>
          <TabsTrigger value="cookies">
            <Cookie className="w-4 h-4 mr-2" />
            Cookie Security
          </TabsTrigger>
          <TabsTrigger value="http">
            <Network className="w-4 h-4 mr-2" />
            HTTP Exposure
          </TabsTrigger>
        </TabsList>

        {/* Headers (REAL) */}
        <TabsContent value="headers" className="space-y-4">
          <Card variant="cyber">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                HTTP Security Headers (Live)
              </CardTitle>
              <CardDescription>
                Scan results from the target response headers.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!result ? (
                <div className="text-sm text-muted-foreground">
                  Run a scan to view real header status.
                </div>
              ) : (
                <Accordion type="single" collapsible className="space-y-2">
                  {Object.entries(result.headerStatus).map(([key, st]) => {
                    const meta = headerMeta[key] || { label: key, severity: "low", why: "", fix: "" };
                    const badge = st.present ? (
                      <Badge className="threat-low">PRESENT</Badge>
                    ) : (
                      <Badge className={getStatusColor(meta.severity)}>{meta.severity.toUpperCase()}</Badge>
                    );

                    return (
                      <AccordionItem key={key} value={key} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            {badge}
                            <span className="font-mono text-sm">{meta.label}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pt-2">
                          <div className="text-sm text-muted-foreground">
                            {st.present ? "Detected on target response." : "Not detected on target response."}
                          </div>

                          {st.present && st.value ? (
                            <div className="p-3 rounded-lg bg-muted/50">
                              <p className="text-xs text-muted-foreground mb-1">Value:</p>
                              <code className="text-sm font-mono text-primary break-all">{st.value}</code>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                                <div>
                                  <p className="font-medium text-warning text-sm">Why it matters</p>
                                  <p className="text-sm text-muted-foreground">{meta.why}</p>
                                  <p className="text-sm text-muted-foreground mt-2">
                                    <span className="text-primary font-medium">Fix:</span> {meta.fix}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>

          {/* Issues Summary */}
          {result && (
            <Card variant="glass" className="border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileCode className="w-4 h-4 text-primary" />
                  <p className="font-medium">Findings</p>
                </div>
                {result.issues.length ? (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {result.issues.slice(0, 10).map((i, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-success" />
                    No major issues detected.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Cookies (REAL) */}
        <TabsContent value="cookies" className="space-y-4">
          <Card variant="cyber">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="w-5 h-5 text-accent" />
                Cookie Security (Live)
              </CardTitle>
              <CardDescription>
                Parsed from Set-Cookie headers (if present).
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!result ? (
                <div className="text-sm text-muted-foreground">Run a scan to view real cookie flags.</div>
              ) : result.cookieFindings.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No <span className="font-mono">Set-Cookie</span> headers detected.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.cookieFindings.map((c, idx) => (
                    <Card key={idx} variant="glass">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className="font-mono text-xs">COOKIE #{idx + 1}</Badge>
                          <div className="flex gap-2">
                            <Badge className={c.secure ? "threat-low" : "threat-high"}>Secure</Badge>
                            <Badge className={c.httpOnly ? "threat-low" : "threat-high"}>HttpOnly</Badge>
                            <Badge className={c.sameSite !== "missing" ? "threat-low" : "threat-medium"}>
                              SameSite: {c.sameSite}
                            </Badge>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/50">
                          <code className="text-sm font-mono text-primary break-all">{c.raw}</code>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* HTTP Exposure (REAL) */}
        <TabsContent value="http" className="space-y-4">
          <Card variant="cyber">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5 text-secondary" />
                HTTP Exposure (Live)
              </CardTitle>
              <CardDescription>
                Based on server OPTIONS response (Allow header).
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!result ? (
                <div className="text-sm text-muted-foreground">Run a scan to view allowed methods.</div>
              ) : result.allowedMethods.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Server did not expose an Allow header via OPTIONS.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {result.allowedMethods.map((m) => (
                    <Badge
                      key={m}
                      variant="outline"
                      className={`font-mono ${
                        ["TRACE"].includes(m) ? "threat-high" : ["DELETE", "PUT", "PATCH"].includes(m) ? "threat-medium" : "threat-low"
                      }`}
                    >
                      {m}
                    </Badge>
                  ))}
                </div>
              )}

              {result && (
                <Card variant="glass" className="mt-6">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-2">
                      <Server className="w-4 h-4 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Server Info (from headers)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {String(result.headers["server"] || result.headers["x-powered-by"] || "Not exposed")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* History */}
      {history.length > 0 && (
        <Card variant="glass" className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  History
                </CardTitle>
                <CardDescription>Last {history.length} scans</CardDescription>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={clearHistory}
                className="
                  border-cyan-500/30
                  text-cyan-300
                  hover:bg-cyan-500/10
                  hover:text-cyan-200
                  transition
                "
              >
                Clear History
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-2">
            {history.map((h, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm truncate">{h.finalUrl}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.scannedAt).toLocaleString()}
                  </p>
                </div>
                <Badge
                  className={
                    h.score >= 90
                      ? "threat-low"
                      : h.score >= 75
                      ? "threat-medium"
                      : h.score >= 60
                      ? "threat-high"
                      : "threat-critical"
                  }
                >
                  {h.grade} • {h.score}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
