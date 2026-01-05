// src/lib/email.ts

export type EmailFlagLevel = "safe" | "warning";

export interface EmailScanFlag {
  level: EmailFlagLevel;
  message: string;
}

export interface EmailScanResult {
  email: string;
  valid: boolean;
  disposable: boolean;
  roleBased: boolean;
  provider: "gmail" | "yahoo" | "outlook" | "custom";
  confidence: "high" | "medium" | "low";
  score: number;
  flags: EmailScanFlag[];
  scannedAt: number;
}

/* ---------------- CONFIG ---------------- */

const DISPOSABLE_KEYWORDS = [
  "tempmail",
  "mailinator",
  "10minutemail",
  "guerrillamail",
  "yopmail",
  "trashmail",
  "fakeinbox",
];

const ROLE_PREFIXES = [
  "admin",
  "support",
  "info",
  "contact",
  "sales",
  "billing",
  "security",
  "help",
];

const PHISHING_PATTERNS = [
  /urgent/i,
  /verify/i,
  /account/i,
  /password/i,
  /click\s*here/i,
  /login/i,
  /suspended/i,
  /limited\s*time/i,
  /confirm\s*now/i,
  /reset\s*password/i,
  /unusual\s*activity/i,
  /security\s*alert/i,
  /act\s*now/i,
];

/* ---------------- HELPERS ---------------- */

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function detectProvider(domain: string) {
  if (domain === "gmail.com") return "gmail";
  if (domain === "yahoo.com") return "yahoo";
  if (domain === "outlook.com" || domain === "hotmail.com") return "outlook";
  return "custom";
}

function isDisposableDomain(domain: string): boolean {
  return DISPOSABLE_KEYWORDS.some((k) =>
    domain.toLowerCase().includes(k)
  );
}

function isRoleBasedLocal(local: string): boolean {
  return ROLE_PREFIXES.includes(local.toLowerCase());
}

function hasSuspiciousContent(content?: string): boolean {
  if (!content) return false;

  const keywordHit = PHISHING_PATTERNS.some((r) => r.test(content));
  const linkCount = (content.match(/https?:\/\//gi) || []).length;
  const shortLinks = /(bit\.ly|tinyurl|t\.co|goo\.gl)/i.test(content);

  return keywordHit || linkCount > 2 || shortLinks;
}

/* ---------------- MAIN ANALYZER ---------------- */

export async function analyzeEmail(
  email: string,
  content?: string
): Promise<EmailScanResult> {
  const flags: EmailScanFlag[] = [];
  let score = 100;

  const valid = isValidEmail(email);
  if (!valid) {
    flags.push({ level: "warning", message: "Invalid email format" });
    score -= 40;
  } else {
    flags.push({ level: "safe", message: "Valid email format" });
  }

  const [local = "", domain = ""] = email.split("@");
  const provider = detectProvider(domain);

  const disposable = isDisposableDomain(domain);
  if (disposable) {
    flags.push({ level: "warning", message: "Disposable email provider detected" });
    score -= 30;
  }

  const roleBased = isRoleBasedLocal(local);
  if (roleBased) {
    flags.push({ level: "warning", message: "Role-based address (higher abuse risk)" });
    score -= 15;
  }

  if (hasSuspiciousContent(content)) {
    flags.push({ level: "warning", message: "Phishing-style language or links detected" });
    score -= 20;
  } else if (content) {
    flags.push({ level: "safe", message: "No obvious phishing indicators in content" });
  }

  let confidence: "high" | "medium" | "low" = "high";
  if (provider !== "custom") confidence = "medium";
  if (!valid || disposable) confidence = "low";

  score = Math.max(0, Math.min(100, score));

  return {
    email,
    valid,
    disposable,
    roleBased,
    provider,
    confidence,
    score,
    flags,
    scannedAt: Date.now(),
  };
}
