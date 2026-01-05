import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Shield,
  KeyRound,
  MailWarning,
  Network,
  Cloud,
  Users,
  ShieldCheck,
  Play,
  RotateCcw,
  BookOpen,
  Info,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Trash2,
  FileText,
  Pause,
  ChevronLeft,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";

/**
 * SIMULATIONS TAB (Future + Current Proof)
 * - Category tabs -> tool grid -> focus-mode tool panel
 * - After selecting a tool: tools auto-hide, user sees ONLY the selected tool working
 * - Split view: Visual Simulation (left) + Explanation/Prevention/Log (right)
 * - User interactions (safe inputs) influence outcome & risk (education-only)
 */

type Risk = "LOW" | "MEDIUM" | "HIGH";
type Outcome = "PREVENTED" | "PARTIAL" | "HIGH_RISK";

type CategoryId = "password" | "phishing" | "network" | "cloud" | "social" | "defense";

type ToolId =
  | "dictionary"
  | "bruteforce"
  | "rainbow"
  | "stuffing"
  | "spraying"
  | "reuse"
  | "weakpolicy"
  | "phish_landing"
  | "phish_spear"
  | "phish_oauth"
  | "dns_spoof_concept"
  | "mitm_concept"
  | "port_exposure"
  | "s3_public"
  | "iam_overpriv"
  | "secrets_leak"
  | "pretexting"
  | "baiting"
  | "tailgating"
  | "mfa_rollout"
  | "log_alerting"
  | "backup_restore";

type SimTool = {
  id: ToolId;
  title: string;
  short: string;
  risk: Risk;
  impact: number; // 0..100
  difficulty: number; // 0..100 (simulation complexity, not attack difficulty)
  tags: string[];
  educationOnly: true;

  whatIsIt: string;
  howItWorks: string[];
  whatCanGoWrong: string[];
  howToBeSafe: string[];

  stages: { label: string; detail: string }[];
};

type SimCategory = {
  id: CategoryId;
  label: string;
  icon: any;
  description: string;
  tools: SimTool[];
};

type RunHistoryItem = {
  toolId: ToolId;
  categoryId: CategoryId;
  title: string;
  date: string; // YYYY-MM-DD
};

type SimInputs = {
  // universal knobs
  mfaEnabled: boolean;
  rateLimit: boolean;
  monitoring: boolean;

  // password-specific
  passwordLength: number; // 6..32
  reuseDetected: boolean;

  // phishing-specific
  userAwareness: number; // 0..100
  domainSimilarity: number; // 0..100 (higher = more convincing)

  // cloud/network/general hardening
  patched: boolean;
  leastPrivilege: boolean;
  publicExposure: boolean;

  // animation / training
  learningMode: number; // 0..100 (higher = slower/more explanatory)
};

const HISTORY_KEY = "pasco_simulations_history_v2";
const MAX_HISTORY = 20;

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function riskBadgeClass(r: Risk) {
  if (r === "HIGH") return "threat-high";
  if (r === "MEDIUM") return "threat-medium";
  return "threat-low";
}

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function fmtAttempts(n: number) {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return `${n}`;
}

/* ----------------------- DATA (same as your file; extend later safely) ----------------------- */
const categories: SimCategory[] = [
  {
    id: "password",
    label: "🔐 Password Attacks",
    icon: KeyRound,
    description: "Learn common password compromise patterns and defenses (simulation-only).",
    tools: [
      {
        id: "dictionary",
        title: "Dictionary Attack Simulation",
        short: "Common words + patterns guessing (education-only).",
        risk: "HIGH",
        impact: 80,
        difficulty: 35,
        tags: ["Simulation", "Credential Risk", "Defense-first"],
        educationOnly: true,
        whatIsIt:
          "A dictionary attack is a credential-risk scenario where weak passwords are guessed using common wordlists and predictable patterns.",
        howItWorks: [
          "A list of common passwords/patterns is tested conceptually.",
          "Weak passwords match quickly because users reuse simple words and variations.",
          "Rate-limits and MFA dramatically reduce real-world risk.",
        ],
        whatCanGoWrong: [
          "Account takeover if weak/reused passwords exist.",
          "Credential reuse increases blast radius across services.",
          "Inadequate rate-limiting allows repeated attempts.",
        ],
        howToBeSafe: [
          "Use long, unique passwords (passphrases).",
          "Enable MFA (prefer app/hardware keys).",
          "Use rate limiting, lockouts, and anomaly detection.",
          "Monitor failed login spikes & credential stuffing signals.",
        ],
        stages: [
          { label: "Setup", detail: "Load common password patterns (education simulation)." },
          { label: "Testing", detail: "Simulate repeated guesses against a protected login." },
          { label: "Detection", detail: "Show how rate limiting & alerts reduce risk." },
          { label: "Outcome", detail: "Summarize risk factors and defensive controls." },
        ],
      },
      {
        id: "bruteforce",
        title: "Brute Force Simulation",
        short: "Combination guessing concept (education-only).",
        risk: "MEDIUM",
        impact: 65,
        difficulty: 45,
        tags: ["Simulation", "Rate Limiting", "MFA"],
        educationOnly: true,
        whatIsIt:
          "Brute force is the concept of trying many combinations. In modern systems, online brute force is usually mitigated by rate-limits and MFA.",
        howItWorks: [
          "Attempts increase in volume over time (concept).",
          "Online protections slow attempts dramatically (rate-limits/lockouts).",
          "Password length and uniqueness change feasibility.",
        ],
        whatCanGoWrong: [
          "Without rate limits, attackers can try many guesses quickly.",
          "Weak policies (short passwords) reduce search space.",
          "Credential reuse makes compromise easier through other paths.",
        ],
        howToBeSafe: [
          "Enforce minimum length + complexity + banned passwords list.",
          "Enable MFA and adaptive challenges.",
          "Rate limit by IP/user/device; add progressive delays.",
          "Alert on abnormal failed logins.",
        ],
        stages: [
          { label: "Setup", detail: "Define password policy context (education-only)." },
          { label: "Attempt Burst", detail: "Simulate rapid attempts and throttling." },
          { label: "Controls", detail: "Show lockout/delay and MFA stop conditions." },
          { label: "Outcome", detail: "Explain feasibility vs defenses." },
        ],
      },
      {
        id: "rainbow",
        title: "Rainbow Tables Concept (Safe)",
        short: "Precomputed hash lookup concept (education-only).",
        risk: "MEDIUM",
        impact: 60,
        difficulty: 50,
        tags: ["Concept", "Hashing", "Salts"],
        educationOnly: true,
        whatIsIt:
          "Rainbow tables are a historical concept involving precomputed hash lookups. Modern best practice uses unique salts and slow hashing to reduce this risk.",
        howItWorks: [
          "Hashes can be compared to precomputed sets (conceptually).",
          "Unique salts prevent reuse of precomputed results.",
          "Slow password hashing increases work required for guessing.",
        ],
        whatCanGoWrong: [
          "Unsalted or weakly hashed password databases are at risk.",
          "Reuse of the same hash scheme across systems increases exposure.",
        ],
        howToBeSafe: [
          "Use Argon2id/bcrypt/scrypt for password hashing.",
          "Always use unique per-user salts.",
          "Rotate credentials if exposure suspected; monitor breach sources.",
        ],
        stages: [
          { label: "Setup", detail: "Explain hashes + why precomputation matters (education-only)." },
          { label: "Comparison", detail: "Simulate lookup vs salted hashes." },
          { label: "Hardening", detail: "Show effect of salts + slow hashing." },
          { label: "Outcome", detail: "Summarize defensive posture." },
        ],
      },
      {
        id: "stuffing",
        title: "Credential Stuffing Simulation",
        short: "Reuse of leaked credentials (education-only).",
        risk: "HIGH",
        impact: 85,
        difficulty: 55,
        tags: ["Simulation", "BOT Signals", "MFA"],
        educationOnly: true,
        whatIsIt:
          "Credential stuffing is an account risk scenario where previously leaked credentials are tried across other services due to password reuse.",
        howItWorks: [
          "Large volumes of login attempts come from automation (concept).",
          "Attackers rely on password reuse across sites.",
          "Detection uses rate-limit, IP reputation, device fingerprinting, and behavior analytics.",
        ],
        whatCanGoWrong: ["Account takeover if reused passwords exist.", "Fraud, data exposure, and lockouts impacting real users."],
        howToBeSafe: [
          "Enforce MFA, especially on high-value accounts.",
          "Add bot mitigation and anomaly detection.",
          "Use breached-password checks at login and password change.",
          "Throttle + challenge suspicious attempts (CAPTCHA/step-up).",
        ],
        stages: [
          { label: "Setup", detail: "Simulate leaked credential reuse scenario." },
          { label: "Attempt Wave", detail: "Show burst behavior patterns (education-only)." },
          { label: "Detection", detail: "Highlight bot signals + rate limiting." },
          { label: "Outcome", detail: "Explain controls that stop the risk." },
        ],
      },
      {
        id: "spraying",
        title: "Password Spraying Simulation",
        short: "Few common passwords across many accounts (education-only).",
        risk: "MEDIUM",
        impact: 70,
        difficulty: 50,
        tags: ["Simulation", "Identity", "Policy"],
        educationOnly: true,
        whatIsIt:
          "Password spraying is a risk pattern where a small set of common passwords is tried across many accounts to avoid lockouts.",
        howItWorks: [
          "Attempts are spread across accounts and time windows (concept).",
          "Attackers try 'popular' passwords rather than many tries on one user.",
          "Detection needs cross-account correlation.",
        ],
        whatCanGoWrong: [
          "Weak default passwords or poor hygiene can lead to compromise.",
          "If monitoring is per-user only, attacks can slip through.",
        ],
        howToBeSafe: [
          "Block common passwords and enforce strong password policies.",
          "Use MFA and conditional access.",
          "Detect patterns across many users, not just single accounts.",
        ],
        stages: [
          { label: "Setup", detail: "Define many-user environment (education-only)." },
          { label: "Spray", detail: "Simulate low-and-slow cross-account attempts." },
          { label: "Correlation", detail: "Show how SOC detects multi-user patterns." },
          { label: "Outcome", detail: "Summarize defenses." },
        ],
      },
      {
        id: "reuse",
        title: "Reused Password Risk Simulator",
        short: "See how reuse amplifies breach impact (education-only).",
        risk: "HIGH",
        impact: 75,
        difficulty: 30,
        tags: ["Education", "Hygiene", "Best Practice"],
        educationOnly: true,
        whatIsIt:
          "Password reuse isn't an 'attack tool'—it's a user-risk pattern. This simulation demonstrates how one breach can affect multiple accounts.",
        howItWorks: [
          "A single set of leaked credentials is assumed (concept).",
          "Reuse across multiple services increases takeover probability.",
          "MFA and unique passwords break the chain.",
        ],
        whatCanGoWrong: ["Cascade compromise across email, banking, and social accounts.", "Identity theft and long-term account recovery issues."],
        howToBeSafe: [
          "Use a password manager to generate unique passwords.",
          "Enable MFA on email and critical services first.",
          "Change passwords quickly after breach notifications.",
        ],
        stages: [
          { label: "Setup", detail: "Assume a breach event (education-only)." },
          { label: "Propagation", detail: "Simulate reuse across services." },
          { label: "Controls", detail: "Show how MFA + uniqueness prevents spread." },
          { label: "Outcome", detail: "Best-practice summary." },
        ],
      },
      {
        id: "weakpolicy",
        title: "Weak Policy Simulation",
        short: "Short length, no blocklist, no MFA (education-only).",
        risk: "HIGH",
        impact: 78,
        difficulty: 40,
        tags: ["Simulation", "Policy", "Governance"],
        educationOnly: true,
        whatIsIt:
          "This simulation shows how weak password policies increase credential risk—even without any 'attack steps'.",
        howItWorks: ["Short minimum length reduces entropy (concept).", "No banned-password list allows common passwords.", "No MFA leaves single-factor accounts vulnerable."],
        whatCanGoWrong: ["High success rates for guessing and reuse patterns.", "Support burden increases due to account lockouts and compromises."],
        howToBeSafe: [
          "Enforce length (12–16+), block common passwords.",
          "Add MFA and adaptive authentication.",
          "Monitor auth logs and implement risk-based access controls.",
        ],
        stages: [
          { label: "Setup", detail: "Choose a weak policy (education-only)." },
          { label: "Risk", detail: "Simulate how common patterns succeed." },
          { label: "Harden", detail: "Apply stronger policy + MFA and compare." },
          { label: "Outcome", detail: "Policy recommendations summary." },
        ],
      },
    ],
  },

  {
    id: "phishing",
    label: "🎣 Phishing Simulation",
    icon: MailWarning,
    description: "Understand phishing patterns and defenses (simulation-only).",
    tools: [
      {
        id: "phish_landing",
        title: "Phishing Landing Page Simulation",
        short: "How fake login flows trick users (education-only).",
        risk: "HIGH",
        impact: 85,
        difficulty: 45,
        tags: ["Simulation", "User Training", "MFA"],
        educationOnly: true,
        whatIsIt:
          "A simulation of how attackers mimic login pages to steal credentials—focused on recognition and prevention.",
        howItWorks: ["User receives a deceptive message with urgency cues.", "User is redirected to a look-alike page (concept).", "Credentials entered are captured by attacker (concept)."],
        whatCanGoWrong: ["Account takeover, mailbox compromise, and downstream resets.", "Business email compromise (BEC) if corporate email is affected."],
        howToBeSafe: ["Verify domains carefully; use password managers (they detect wrong domains).", "Enable MFA; prefer phishing-resistant methods.", "Use email security + user awareness training."],
        stages: [
          { label: "Setup", detail: "Present a deceptive message scenario (education-only)." },
          { label: "Redirect", detail: "Show look-alike domain warning cues." },
          { label: "Detection", detail: "Simulate user/reporting and email filtering." },
          { label: "Outcome", detail: "Defense checklist summary." },
        ],
      },
      {
        id: "phish_spear",
        title: "Spear Phishing Simulation",
        short: "Targeted message patterns & SOC response (education-only).",
        risk: "HIGH",
        impact: 88,
        difficulty: 55,
        tags: ["Simulation", "SOC", "Detection"],
        educationOnly: true,
        whatIsIt:
          "Spear phishing is targeted deception (often personalized). This simulation shows detection signals and safe response.",
        howItWorks: ["Attacker uses public info to craft a believable message (concept).", "Message requests action: invoice, credential check, or urgent approval.", "SOC correlates sender anomalies + link reputation + user reports."],
        whatCanGoWrong: ["Fraudulent payments, credential theft, or sensitive data leaks."],
        howToBeSafe: ["Out-of-band verification for payment/urgent requests.", "DMARC/SPF/DKIM + email security gateway.", "User reporting workflows + SOC triage playbooks."],
        stages: [
          { label: "Setup", detail: "Simulate a targeted request scenario." },
          { label: "Signal", detail: "Highlight anomaly indicators (headers, domain, wording)." },
          { label: "Response", detail: "Simulate reporting + SOC triage steps." },
          { label: "Outcome", detail: "Prevention checklist summary." },
        ],
      },
      {
        id: "phish_oauth",
        title: "OAuth Consent Phishing (Concept)",
        short: "Consent screen abuse awareness (education-only).",
        risk: "MEDIUM",
        impact: 70,
        difficulty: 60,
        tags: ["Concept", "Identity", "App Controls"],
        educationOnly: true,
        whatIsIt:
          "A consent phishing concept where users grant access to a malicious app. This simulation focuses on safe review and controls.",
        howItWorks: ["User is prompted to approve app permissions (concept).", "Over-broad scopes can allow mailbox/data access.", "Admins can restrict app consent and monitor risky grants."],
        whatCanGoWrong: ["Persistent access without password compromise.", "Data exposure through granted scopes."],
        howToBeSafe: ["Restrict app consent; review OAuth grants regularly.", "Educate users about scopes and verified publishers.", "Use conditional access and identity governance."],
        stages: [
          { label: "Setup", detail: "Show a permission request scenario." },
          { label: "Scopes", detail: "Explain risk of over-broad scopes." },
          { label: "Controls", detail: "Simulate admin restrictions + monitoring." },
          { label: "Outcome", detail: "Best practices summary." },
        ],
      },
    ],
  },

  {
    id: "network",
    label: "🌐 Network Attacks",
    icon: Network,
    description: "Network threat concepts and defenses (simulation-only).",
    tools: [
      {
        id: "dns_spoof_concept",
        title: "DNS Spoofing Concept",
        short: "How wrong DNS responses mislead traffic (education-only).",
        risk: "MEDIUM",
        impact: 65,
        difficulty: 55,
        tags: ["Concept", "DNS", "Defense"],
        educationOnly: true,
        whatIsIt:
          "A conceptual simulation of how incorrect DNS answers can redirect users—focused on recognizing and preventing the risk.",
        howItWorks: ["User requests a domain; DNS answer determines destination (concept).", "If answers are manipulated, traffic may go to a malicious destination.", "DNSSEC and secure resolvers reduce risk."],
        whatCanGoWrong: ["Traffic redirection and credential capture through deception."],
        howToBeSafe: ["Use secure DNS resolvers and enable DNSSEC where possible.", "Use HTTPS with certificate validation (HSTS).", "Monitor DNS anomalies and resolver logs."],
        stages: [
          { label: "Setup", detail: "Simulate DNS resolution flow." },
          { label: "Anomaly", detail: "Introduce incorrect DNS response concept." },
          { label: "Defense", detail: "Show DNSSEC/HTTPS validation protection." },
          { label: "Outcome", detail: "Defense checklist summary." },
        ],
      },
      {
        id: "mitm_concept",
        title: "Man-in-the-Middle (Concept)",
        short: "Interception risk on untrusted networks (education-only).",
        risk: "MEDIUM",
        impact: 60,
        difficulty: 60,
        tags: ["Concept", "HTTPS", "VPN"],
        educationOnly: true,
        whatIsIt:
          "A conceptual simulation of interception risk on untrusted networks—focused on defenses like HTTPS and VPN.",
        howItWorks: ["On untrusted networks, traffic can be observed (concept).", "HTTPS encrypts application traffic; VPN adds a secure tunnel.", "Certificate warnings are critical indicators."],
        whatCanGoWrong: ["Sensitive data exposure on misconfigured or non-HTTPS services."],
        howToBeSafe: ["Prefer HTTPS everywhere; heed certificate warnings.", "Use VPN on public networks.", "Use secure Wi-Fi and disable auto-join to open networks."],
        stages: [
          { label: "Setup", detail: "Simulate untrusted network scenario." },
          { label: "Exposure", detail: "Explain where plaintext would be visible." },
          { label: "Defense", detail: "Show HTTPS/VPN protection conceptually." },
          { label: "Outcome", detail: "Best practices summary." },
        ],
      },
      {
        id: "port_exposure",
        title: "Service Exposure Risk (Concept)",
        short: "Why exposed services need hardening (education-only).",
        risk: "HIGH",
        impact: 78,
        difficulty: 45,
        tags: ["Concept", "Hardening", "SOC"],
        educationOnly: true,
        whatIsIt:
          "A safe simulation showing why publicly exposed services increase risk and why hardening and patching matter.",
        howItWorks: ["Public services are discoverable (concept).", "Outdated software increases vulnerability risk.", "Defense: patching, WAF, allowlists, and monitoring."],
        whatCanGoWrong: ["Increased attack surface and potential compromise when misconfigured."],
        howToBeSafe: ["Minimize exposure; use allowlists/VPN/Zero Trust access.", "Patch regularly; monitor vulnerabilities.", "Add WAF/reverse proxy and strong authentication."],
        stages: [
          { label: "Setup", detail: "List service exposure assumptions." },
          { label: "Risk", detail: "Explain attack surface concept." },
          { label: "Hardening", detail: "Apply controls and show risk reduction." },
          { label: "Outcome", detail: "Hardening checklist summary." },
        ],
      },
    ],
  },

  {
    id: "cloud",
    label: "☁️ Cloud Misconfigurations",
    icon: Cloud,
    description: "Cloud misconfig patterns and prevention (simulation-only).",
    tools: [
      {
        id: "s3_public",
        title: "Public Storage Bucket Risk",
        short: "Why public buckets leak data (education-only).",
        risk: "HIGH",
        impact: 90,
        difficulty: 35,
        tags: ["Simulation", "Cloud", "Data Exposure"],
        educationOnly: true,
        whatIsIt:
          "A simulation of how public storage misconfigurations can expose sensitive data—focused on safe prevention steps.",
        howItWorks: ["Buckets/containers can be accidentally set to public (concept).", "Sensitive files become downloadable by anyone with access.", "Defense: least privilege, policies, and continuous monitoring."],
        whatCanGoWrong: ["Data leakage, compliance violations, and incident response costs."],
        howToBeSafe: ["Block public access and enforce least privilege policies.", "Enable logging and alerts for permission changes.", "Use CSPM checks and regular audits."],
        stages: [
          { label: "Setup", detail: "Assume a bucket with misconfigured ACL/policy." },
          { label: "Exposure", detail: "Show how data becomes accessible (concept)." },
          { label: "Fix", detail: "Apply block-public-access + least privilege." },
          { label: "Outcome", detail: "Prevention checklist summary." },
        ],
      },
      {
        id: "iam_overpriv",
        title: "Over-Privileged IAM Role Risk",
        short: "Least privilege simulation (education-only).",
        risk: "HIGH",
        impact: 85,
        difficulty: 50,
        tags: ["Simulation", "IAM", "Governance"],
        educationOnly: true,
        whatIsIt:
          "A simulation showing why over-privileged roles are risky and how least privilege reduces blast radius.",
        howItWorks: ["Broad permissions allow unintended actions (concept).", "Compromised credentials become more damaging with admin scopes.", "Defense: least privilege, role separation, and monitoring."],
        whatCanGoWrong: ["Unauthorized access to data, infra changes, and persistence."],
        howToBeSafe: ["Audit IAM permissions; remove unused privileges.", "Use role separation and just-in-time access.", "Alert on privilege changes and anomalous actions."],
        stages: [
          { label: "Setup", detail: "Assume a role with excessive permissions." },
          { label: "Risk", detail: "Show what broad access enables (concept)." },
          { label: "Harden", detail: "Reduce scopes; enable monitoring." },
          { label: "Outcome", detail: "IAM checklist summary." },
        ],
      },
      {
        id: "secrets_leak",
        title: "Secrets in Code Risk",
        short: "API keys in repos (education-only).",
        risk: "HIGH",
        impact: 88,
        difficulty: 40,
        tags: ["Education", "Secrets", "DevSecOps"],
        educationOnly: true,
        whatIsIt:
          "A simulation of the risk when API keys/secrets are committed to code repositories and later abused.",
        howItWorks: ["Secrets in code can be discovered by scans or leaks (concept).", "Keys may grant access to APIs, storage, or services.", "Defense: secret managers, scanning, and rotation."],
        whatCanGoWrong: ["Unauthorized API usage, data access, and unexpected billing."],
        howToBeSafe: ["Use secret managers and environment variables.", "Enable secret scanning in CI and repositories.", "Rotate exposed keys and add least privilege scopes."],
        stages: [
          { label: "Setup", detail: "Assume a secret is committed (education-only)." },
          { label: "Discovery", detail: "Explain how secrets get found." },
          { label: "Response", detail: "Rotate keys; revoke and monitor usage." },
          { label: "Outcome", detail: "DevSecOps checklist summary." },
        ],
      },
    ],
  },

  {
    id: "social",
    label: "🧠 Social Engineering",
    icon: Users,
    description: "Human-focused deception patterns (education-only).",
    tools: [
      {
        id: "pretexting",
        title: "Pretexting Simulation",
        short: "Fake identity + urgency (education-only).",
        risk: "MEDIUM",
        impact: 70,
        difficulty: 45,
        tags: ["Simulation", "Training", "Policy"],
        educationOnly: true,
        whatIsIt:
          "Pretexting is a deception method where an attacker pretends to be a trusted person to obtain sensitive information.",
        howItWorks: ["Attacker creates a believable story (concept).", "Uses urgency/authority cues to pressure action.", "Defense: verification procedures and training."],
        whatCanGoWrong: ["Data disclosure, credential exposure, or unauthorized changes."],
        howToBeSafe: ["Require verification for sensitive requests (callbacks).", "Train staff to identify pressure tactics.", "Use approval workflows for high-risk actions."],
        stages: [
          { label: "Setup", detail: "Simulate a request from a 'trusted' role." },
          { label: "Pressure", detail: "Highlight urgency cues." },
          { label: "Verify", detail: "Apply verification workflow." },
          { label: "Outcome", detail: "Training checklist summary." },
        ],
      },
      {
        id: "baiting",
        title: "Baiting Simulation",
        short: "Tempting offer leads to risk (education-only).",
        risk: "MEDIUM",
        impact: 60,
        difficulty: 35,
        tags: ["Education", "Awareness"],
        educationOnly: true,
        whatIsIt:
          "Baiting is a deception method that uses curiosity or offers to lure users into unsafe actions.",
        howItWorks: ["A tempting offer or file is presented (concept).", "User interacts without verification.", "Defense: policies and safe handling."],
        whatCanGoWrong: ["Malicious downloads, account compromise, or data exposure."],
        howToBeSafe: ["Follow safe download policies and verify sources.", "Use endpoint protection and sandboxing.", "Educate on social-engineering tactics."],
        stages: [
          { label: "Setup", detail: "Present a tempting offer scenario." },
          { label: "Decision", detail: "Show safe vs unsafe decision points." },
          { label: "Control", detail: "Apply endpoint controls conceptually." },
          { label: "Outcome", detail: "Best practices summary." },
        ],
      },
      {
        id: "tailgating",
        title: "Tailgating Awareness",
        short: "Physical access awareness (education-only).",
        risk: "LOW",
        impact: 45,
        difficulty: 30,
        tags: ["Awareness", "Physical Security"],
        educationOnly: true,
        whatIsIt:
          "Tailgating is when an unauthorized person follows someone into a restricted area. This simulation focuses on awareness and policy.",
        howItWorks: ["Attacker relies on politeness and social norms (concept).", "Access controls are bypassed by following closely.", "Defense: badges, mantraps, and policy enforcement."],
        whatCanGoWrong: ["Unauthorized physical access can lead to theft or device compromise."],
        howToBeSafe: ["Enforce badge checks and escort policies.", "Use physical access controls (turnstiles/mantraps).", "Security awareness training."],
        stages: [
          { label: "Setup", detail: "Simulate entering a restricted area." },
          { label: "Risk", detail: "Show how tailgating happens conceptually." },
          { label: "Policy", detail: "Apply escort/badge verification." },
          { label: "Outcome", detail: "Physical security checklist summary." },
        ],
      },
    ],
  },

  {
    id: "defense",
    label: "🛡️ Defense Scenarios",
    icon: ShieldCheck,
    description: "Blue-team playbooks and hardening simulations.",
    tools: [
      {
        id: "mfa_rollout",
        title: "MFA Rollout Planner (Simulation)",
        short: "Step-by-step hardening rollout plan (education-only).",
        risk: "LOW",
        impact: 40,
        difficulty: 35,
        tags: ["Defense", "Identity", "Roadmap"],
        educationOnly: true,
        whatIsIt:
          "A defensive simulation to plan MFA rollout in phases—focused on reducing account takeover risk.",
        howItWorks: ["Identify high-value accounts first (admins, email, finance).", "Choose MFA methods and recovery policies.", "Roll out with monitoring, training, and enforcement."],
        whatCanGoWrong: ["Poor rollout can lock out users or create support overload."],
        howToBeSafe: ["Use staged rollout + pilot groups.", "Provide recovery mechanisms and support playbooks.", "Monitor sign-in logs and enforce conditional access."],
        stages: [
          { label: "Inventory", detail: "Identify critical accounts and apps." },
          { label: "Pilot", detail: "Simulate pilot rollout and training." },
          { label: "Enforce", detail: "Gradual enforcement with monitoring." },
          { label: "Outcome", detail: "Hardening checklist summary." },
        ],
      },
      {
        id: "log_alerting",
        title: "SOC Alert Tuning (Simulation)",
        short: "Reduce noise and catch real signals (education-only).",
        risk: "LOW",
        impact: 35,
        difficulty: 55,
        tags: ["Defense", "SOC", "Playbook"],
        educationOnly: true,
        whatIsIt:
          "A defense scenario that simulates improving alerts: reduce false positives and highlight high-signal detections.",
        howItWorks: ["Group alerts by source/asset and add context.", "Set severity based on business impact and confidence.", "Validate with test cases and monitoring."],
        whatCanGoWrong: ["Over-tuning can suppress important alerts."],
        howToBeSafe: ["Use change control and validation checks.", "Track metrics: precision, recall, and analyst time.", "Keep a rollback plan."],
        stages: [
          { label: "Baseline", detail: "Measure current alert noise." },
          { label: "Tune", detail: "Add context and thresholds." },
          { label: "Validate", detail: "Simulate validation and QA." },
          { label: "Outcome", detail: "SOC checklist summary." },
        ],
      },
      {
        id: "backup_restore",
        title: "Backup & Restore Readiness",
        short: "Recovery readiness simulation (education-only).",
        risk: "LOW",
        impact: 30,
        difficulty: 45,
        tags: ["Defense", "Resilience", "IR"],
        educationOnly: true,
        whatIsIt:
          "A defensive simulation for backup hygiene and restore drills to improve resilience.",
        howItWorks: ["Define RPO/RTO targets and critical assets.", "Test restores regularly and document steps.", "Monitor backup integrity and access controls."],
        whatCanGoWrong: ["Untested backups may fail when needed most."],
        howToBeSafe: ["Run restore drills and keep runbooks updated.", "Use immutable backups and least privilege access.", "Monitor backup jobs and storage health."],
        stages: [
          { label: "Plan", detail: "Set RPO/RTO and critical scope." },
          { label: "Drill", detail: "Simulate restore test and validation." },
          { label: "Harden", detail: "Apply immutability and access controls." },
          { label: "Outcome", detail: "Resilience checklist summary." },
        ],
      },
    ],
  },
];

/* ----------------------- Visual Simulation (safe + deterministic) ----------------------- */
function seededRng(seed: number) {
  // deterministic pseudo-rng (educational visuals only)
  let a = (seed + 1) * 0x9e3779b1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toolAttemptsPerTick(toolId: ToolId) {
  // Visual-only counters to convey scale; NOT real cracking.
  if (toolId === "dictionary") return 1400;
  if (toolId === "stuffing") return 70;
  if (toolId === "rainbow") return 9000;
  if (toolId === "bruteforce") return 42000;
  if (toolId === "spraying") return 200;
  if (toolId === "reuse") return 90;
  if (toolId === "weakpolicy") return 650;
  if (toolId.startsWith("phish")) return 90;
  if (toolId === "port_exposure") return 250;
  if (toolId === "s3_public") return 180;
  if (toolId === "iam_overpriv") return 120;
  if (toolId === "secrets_leak") return 140;
  if (toolId === "pretexting") return 40;
  if (toolId === "baiting") return 40;
  if (toolId === "tailgating") return 20;
  if (toolId === "mfa_rollout") return 25;
  if (toolId === "log_alerting") return 25;
  if (toolId === "backup_restore") return 25;
  return 120;
}

function VisualSimulationPanel({
  tool,
  inputs,
  visualRunning,
  setVisualRunning,
  speedMs,
  setSpeedMs,
  onResetVisual,
  outcome,
  adjustedImpact,
  adjustedRisk,
}: {
  tool: SimTool;
  inputs: SimInputs;
  visualRunning: boolean;
  setVisualRunning: (v: boolean) => void;
  speedMs: number;
  setSpeedMs: (n: number) => void;
  onResetVisual: () => void;
  outcome: Outcome;
  adjustedImpact: number;
  adjustedRisk: Risk;
}) {
  const [tick, setTick] = useState(0);
  const [events, setEvents] = useState<Array<{ t: number; msg: string; ok?: boolean }>>([]);

  // reset when tool changes
  useEffect(() => {
    setTick(0);
    setEvents([]);
    // do not auto-play here; controlled by parent
  }, [tool.id]);

  useEffect(() => {
    if (!visualRunning) return;
    const id = window.setInterval(() => setTick((t) => t + 1), Math.max(30, speedMs));
    return () => window.clearInterval(id);
  }, [visualRunning, speedMs]);

  const rng = useMemo(() => seededRng(tick + tool.id.length * 17 + inputs.learningMode), [tick, tool.id, inputs.learningMode]);

  const attempts = useMemo(() => tick * toolAttemptsPerTick(tool.id), [tick, tool.id]);
  const progressPct = useMemo(() => Math.min(100, (tick % 100) * 1), [tick]); // looped visual

  const dictionaryWords = useMemo(
    () => ["password", "welcome", "admin", "qwerty", "iloveyou", "pakistan", "summer", "football", "letmein", "abc123"],
    []
  );
  const charset = useMemo(() => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$", []);
  const fakeGuess = useMemo(() => {
    const len = 8 + Math.floor(rng() * 5);
    let s = "";
    for (let i = 0; i < len; i++) s += charset[Math.floor(rng() * charset.length)];
    return s;
  }, [rng, charset]);

  const fakeHash = useMemo(() => {
    const hex = "0123456789abcdef";
    let out = "";
    for (let i = 0; i < 48; i++) out += hex[Math.floor(rng() * 16)];
    return out;
  }, [rng]);

  // outcome styling
  const outcomeBadge = useMemo(() => {
    if (outcome === "PREVENTED") return { text: "Prevented", cls: "border-emerald-400/30 text-emerald-300 bg-emerald-400/10" };
    if (outcome === "PARTIAL") return { text: "Partial Risk", cls: "border-yellow-400/30 text-yellow-200 bg-yellow-400/10" };
    return { text: "High Risk", cls: "border-red-500/30 text-red-300 bg-red-500/10" };
  }, [outcome]);

  const pushEvent = (msg: string, ok?: boolean) => {
    setEvents((prev) => {
      const next = [{ t: Date.now(), msg, ok }, ...prev];
      return next.slice(0, 9);
    });
  };

  useEffect(() => {
    if (!visualRunning) return;

    // Keep these *conceptual*, no real steps, no payloads
    const mfa = inputs.mfaEnabled ? "MFA ON" : "MFA OFF";
    const rl = inputs.rateLimit ? "Rate-limit ON" : "Rate-limit OFF";
    const mon = inputs.monitoring ? "Monitoring ON" : "Monitoring OFF";

    if (tool.id === "dictionary") {
      const w = dictionaryWords[tick % dictionaryWords.length];
      const variant =
        rng() < 0.33 ? w : rng() < 0.66 ? `${w}${Math.floor(rng() * 100)}` : `${w}${["!", "@", "#"][Math.floor(rng() * 3)]}`;
      pushEvent(`Guess pattern (demo): “${variant}” → ${rl}`, inputs.rateLimit);
      if (tick % 10 === 0) pushEvent(`Controls: ${mfa} | ${mon}`, inputs.mfaEnabled && inputs.monitoring);
    } else if (tool.id === "bruteforce") {
      pushEvent(`Enumerate combos (demo): “${fakeGuess}” → ${rl}`, inputs.rateLimit);
      if (tick % 10 === 0) pushEvent(`Password length factor (demo): ${inputs.passwordLength} chars`, inputs.passwordLength >= 12);
    } else if (tool.id === "rainbow") {
      pushEvent(`Lookup hash prefix (concept): ${fakeHash.slice(0, 10)}… → salt stops reuse`, true);
      if (tick % 12 === 0) pushEvent(`Defense: slow hashing + unique salts`, true);
    } else if (tool.id === "stuffing") {
      const services = ["Email", "Shop", "Social", "Bank", "Cloud"];
      const svc = services[Math.floor(rng() * services.length)];
      const blocked = inputs.mfaEnabled || inputs.rateLimit;
      pushEvent(`${svc}: reuse attempt (demo) → ${blocked ? "Blocked" : "Denied/Retry"} (${mfa})`, blocked);
      if (tick % 10 === 0) pushEvent(`Signal: bot-like login wave (concept) → ${mon}`, inputs.monitoring);
    } else if (tool.id.startsWith("phish")) {
      const score = Math.round((inputs.domainSimilarity * 0.6 + (100 - inputs.userAwareness) * 0.4));
      const caught = inputs.userAwareness >= 60 || inputs.mfaEnabled;
      pushEvent(`Inbox lure (demo): similarity ${inputs.domainSimilarity}% → risk ${score}%`, !caught);
      if (tick % 10 === 0) pushEvent(`User awareness ${inputs.userAwareness}% + ${mfa}`, caught);
    } else if (tool.id === "port_exposure") {
      pushEvent(`Public service exposure (concept) → ${inputs.publicExposure ? "Exposed" : "Restricted"}`, !inputs.publicExposure);
      if (tick % 10 === 0) pushEvent(`Patch state: ${inputs.patched ? "Up-to-date" : "Outdated"} + ${mon}`, inputs.patched && inputs.monitoring);
    } else if (tool.id === "s3_public") {
      pushEvent(`Bucket policy (concept) → ${inputs.publicExposure ? "PUBLIC" : "BLOCKED"}`, !inputs.publicExposure);
      if (tick % 12 === 0) pushEvent(`Least privilege: ${inputs.leastPrivilege ? "Enforced" : "Over-broad"}`, inputs.leastPrivilege);
    } else if (tool.id === "iam_overpriv") {
      pushEvent(`Role scopes (concept) → ${inputs.leastPrivilege ? "Minimal" : "Admin-like"}`, inputs.leastPrivilege);
      if (tick % 12 === 0) pushEvent(`Monitoring: ${mon}`, inputs.monitoring);
    } else if (tool.id === "secrets_leak") {
      pushEvent(`Repo scan (concept) → secret detected? ${rng() < 0.4 ? "Yes" : "No"}`, true);
      if (tick % 12 === 0) pushEvent(`Response: rotate keys + limit scopes (best practice)`, true);
    } else if (tool.id === "pretexting" || tool.id === "baiting" || tool.id === "tailgating") {
      const aware = inputs.userAwareness >= 60;
      pushEvent(`Human factor (demo) → verify & follow policy: ${aware ? "Yes" : "No"}`, aware);
      if (tick % 10 === 0) pushEvent(`Controls: training + procedure + reporting`, true);
    } else {
      // defense scenarios or generic
      pushEvent(`Defense playbook step (demo): ${tool.stages[Math.floor(rng() * tool.stages.length)].label}`, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, tool.id, visualRunning]);

  return (
    <Card variant="cyber">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Visual Simulation
          </span>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className={riskBadgeClass(adjustedRisk)}>
              {adjustedRisk} (Adjusted)
            </Badge>
            <Badge variant="outline" className={outcomeBadge.cls}>
              {outcomeBadge.text}
            </Badge>
          </div>
        </CardTitle>
        <CardDescription>Safe animation only — no real attacks, no exploit steps, no credential harvesting.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* controls */}
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
            <Button
              onClick={() => setVisualRunning(!visualRunning)}
              variant={visualRunning ? "outline" : "default"}
              className="gap-2"
            >
              {visualRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {visualRunning ? "Pause" : "Play"}
            </Button>

            <Button variant="outline" onClick={onResetVisual} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="text-xs text-muted-foreground whitespace-nowrap">Speed</div>
            <input
              type="range"
              min={40}
              max={160}
              value={speedMs}
              onChange={(e) => setSpeedMs(Number(e.target.value))}
              className="w-full md:w-44"
            />
            <div className="text-xs text-muted-foreground w-16 text-right">{speedMs}ms</div>
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl bg-muted/30 p-3 border border-border/60">
            <div className="text-xs text-muted-foreground">Mode</div>
            <div className="mt-1 text-sm font-semibold">{tool.id}</div>
          </div>

          <div className="rounded-xl bg-muted/30 p-3 border border-border/60">
            <div className="text-xs text-muted-foreground">Attempts (visual counter)</div>
            <div className="mt-1 text-sm font-semibold text-primary">{fmtAttempts(attempts)}</div>
          </div>

          <div className="rounded-xl bg-muted/30 p-3 border border-border/60">
            <div className="text-xs text-muted-foreground">Adjusted Impact</div>
            <div className="mt-1 text-sm font-semibold">{adjustedImpact}%</div>
          </div>
        </div>

        {/* main visual */}
        <div className="rounded-xl bg-muted/30 p-4 border border-border/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">What’s happening (demo)</div>
            <Badge variant="outline" className="text-xs">
              education-only
            </Badge>
          </div>

          <div className="w-full h-2 rounded-full bg-background/40 overflow-hidden">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
          </div>

          {/* tool-specific visuals */}
          {tool.id === "dictionary" && (
            <div>
              <div className="text-xs text-muted-foreground mb-2">Common words (demo)</div>
              <div className="grid grid-cols-2 gap-2">
                {dictionaryWords.slice(0, 8).map((w, i) => {
                  const active = (tick % dictionaryWords.length) === i;
                  return (
                    <div
                      key={w}
                      className={`rounded-lg border px-3 py-2 font-mono text-xs transition ${
                        active ? "border-primary/40 bg-primary/10" : "border-border/60 bg-background/20"
                      }`}
                    >
                      {w}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tool.id === "bruteforce" && (
            <div className="rounded-xl border border-border/60 bg-background/20 p-4 font-mono">
              <div className="text-xs text-muted-foreground">current guess (demo)</div>
              <div className="mt-1 text-primary font-semibold tracking-wider">{fakeGuess}</div>
              <div className="mt-3 text-xs text-muted-foreground">
                Visual idea: brute force grows with <span className="text-foreground">length</span> +{" "}
                <span className="text-foreground">charset size</span>. Defenses (MFA/rate-limits) stop online attempts.
              </div>
            </div>
          )}

          {tool.id === "rainbow" && (
            <div className="rounded-xl border border-border/60 bg-background/20 p-4 font-mono text-xs">
              <div className="text-xs text-muted-foreground">hash (demo)</div>
              <div className="mt-1 text-primary break-all">{fakeHash}</div>
              <div className="mt-3 text-xs text-muted-foreground">
                Key idea: <span className="text-foreground">salted</span> hashes prevent precomputed reuse across users.
              </div>
            </div>
          )}

          {(tool.id === "stuffing" || tool.id.startsWith("phish") || tool.id === "s3_public" || tool.id === "iam_overpriv" || tool.id === "port_exposure") && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Event feed (demo)</div>
              {events.slice(0, 6).map((e) => (
                <div
                  key={e.t}
                  className={`rounded-lg border px-3 py-2 text-xs ${
                    e.ok ? "border-emerald-400/25 bg-emerald-400/10" : "border-border/60 bg-background/20"
                  }`}
                >
                  {e.msg}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* event log */}
        <div className="rounded-xl bg-muted/30 p-4 border border-border/60">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Event log (educational)</div>
            <Badge variant="outline" className="text-xs border-yellow-400/25 bg-yellow-400/10 text-yellow-200">
              no real hacking
            </Badge>
          </div>

          <div className="mt-3 space-y-2">
            {events.length === 0 ? (
              <div className="rounded-lg border border-border/60 bg-background/20 p-3 text-xs text-muted-foreground">
                Press <span className="text-primary">Play</span> to start the visual demo.
              </div>
            ) : (
              events.map((e) => (
                <div key={e.t} className="rounded-lg border border-border/60 bg-background/20 p-3 text-xs text-muted-foreground">
                  {e.msg}
                </div>
              ))
            )}
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            Defense focus: <span className="text-foreground font-semibold">Unique passwords + MFA + rate limits + monitoring</span>.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ----------------------- Inputs (safe interaction layer) ----------------------- */
function defaultInputsForCategory(categoryId: CategoryId): SimInputs {
  // tuned defaults: looks good in demo, still realistic.
  const base: SimInputs = {
    mfaEnabled: true,
    rateLimit: true,
    monitoring: true,

    passwordLength: 14,
    reuseDetected: false,

    userAwareness: 65,
    domainSimilarity: 70,

    patched: true,
    leastPrivilege: true,
    publicExposure: false,

    learningMode: 35,
  };

  if (categoryId === "password") return { ...base, passwordLength: 14, reuseDetected: false, mfaEnabled: true, rateLimit: true };
  if (categoryId === "phishing") return { ...base, mfaEnabled: true, userAwareness: 60, domainSimilarity: 72, rateLimit: true };
  if (categoryId === "network") return { ...base, patched: true, monitoring: true, publicExposure: false };
  if (categoryId === "cloud") return { ...base, leastPrivilege: true, monitoring: true, publicExposure: false };
  if (categoryId === "social") return { ...base, userAwareness: 65, monitoring: true };
  return { ...base };
}

function computeAdjusted(tool: SimTool, categoryId: CategoryId, inputs: SimInputs): { impact: number; risk: Risk; outcome: Outcome; rationale: string[] } {
  // start from tool defaults
  let impact = tool.impact;
  const rationale: string[] = [];

  // universal reducers
  if (inputs.mfaEnabled) {
    impact -= 10;
    rationale.push("MFA reduces account takeover likelihood.");
  } else {
    impact += 10;
    rationale.push("No MFA increases takeover risk.");
  }

  if (inputs.rateLimit) {
    impact -= 8;
    rationale.push("Rate limiting slows automated attempts and reduces online feasibility.");
  } else {
    impact += 8;
    rationale.push("No rate limiting allows repeated attempts to accumulate.");
  }

  if (inputs.monitoring) {
    impact -= 6;
    rationale.push("Monitoring/alerts improve detection and response speed.");
  } else {
    impact += 6;
    rationale.push("No monitoring delays detection and increases dwell time.");
  }

  // category-specific factors
  if (categoryId === "password") {
    const len = inputs.passwordLength;
    if (len >= 16) {
      impact -= 10;
      rationale.push("Long password length increases entropy (harder to guess conceptually).");
    } else if (len >= 12) {
      impact -= 4;
      rationale.push("12+ characters improves baseline strength.");
    } else {
      impact += 10;
      rationale.push("Short password length increases guessability.");
    }

    if (inputs.reuseDetected) {
      impact += 12;
      rationale.push("Password reuse amplifies breach impact across services.");
    } else {
      impact -= 2;
      rationale.push("No reuse reduces cascading compromise risk.");
    }
  }

  if (categoryId === "phishing") {
    const lure = inputs.domainSimilarity;
    const aware = inputs.userAwareness;
    // more convincing + low awareness => higher impact
    const delta = Math.round(((lure - 50) * 0.18 + (50 - aware) * 0.22));
    impact += delta;
    rationale.push(`Phishing risk shifts with domain similarity (${lure}%) and user awareness (${aware}%).`);
  }

  if (categoryId === "network") {
    if (!inputs.patched) {
      impact += 10;
      rationale.push("Unpatched services increase risk exposure over time.");
    } else {
      impact -= 4;
      rationale.push("Patching reduces known-risk exposure.");
    }
    if (inputs.publicExposure) {
      impact += 10;
      rationale.push("Public exposure increases attack surface.");
    } else {
      impact -= 2;
      rationale.push("Restricted exposure reduces attack surface.");
    }
  }

  if (categoryId === "cloud") {
    if (!inputs.leastPrivilege) {
      impact += 12;
      rationale.push("Over-privileged access increases blast radius.");
    } else {
      impact -= 6;
      rationale.push("Least privilege reduces blast radius.");
    }
    if (inputs.publicExposure) {
      impact += 12;
      rationale.push("Public access misconfig can expose data broadly.");
    } else {
      impact -= 4;
      rationale.push("Blocking public access reduces accidental leaks.");
    }
  }

  if (categoryId === "social") {
    const aware = inputs.userAwareness;
    if (aware >= 70) {
      impact -= 8;
      rationale.push("High user awareness reduces successful social engineering.");
    } else if (aware >= 50) {
      impact -= 2;
      rationale.push("Moderate awareness helps, but gaps remain.");
    } else {
      impact += 10;
      rationale.push("Low awareness increases susceptibility to pressure tactics.");
    }
  }

  if (categoryId === "defense") {
    // defensive scenarios should generally reduce risk
    impact -= 10;
    rationale.push("Defense scenarios focus on risk reduction and readiness improvements.");
  }

  impact = clamp(impact, 0, 100);

  // map adjusted impact => adjusted risk
  let risk: Risk = "LOW";
  if (impact >= 75) risk = "HIGH";
  else if (impact >= 50) risk = "MEDIUM";

  // determine outcome
  let outcome: Outcome = "PARTIAL";
  if (impact <= 40) outcome = "PREVENTED";
  if (impact >= 75) outcome = "HIGH_RISK";

  // small guard: if MFA + monitoring + rateLimit are all ON, rarely show HIGH_RISK (unless extreme)
  if (inputs.mfaEnabled && inputs.monitoring && inputs.rateLimit && impact < 85 && outcome === "HIGH_RISK") {
    outcome = "PARTIAL";
    rationale.push("Strong baseline controls often prevent worst-case outcomes.");
  }

  return { impact, risk, outcome, rationale: rationale.slice(0, 6) };
}

/* ----------------------- Page ----------------------- */
export default function Simulations() {
  const [activeCategoryId, setActiveCategoryId] = useState<CategoryId>("password");
  const [activeToolId, setActiveToolId] = useState<ToolId>("dictionary");

  // focus mode: after selecting a tool, show only that tool experience
  const [focusMode, setFocusMode] = useState(false);

  // stage simulation (your original)
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [runLog, setRunLog] = useState<string[]>([]);
  const runTimerRef = useRef<number | null>(null);

  // visual simulation (new)
  const [visualRunning, setVisualRunning] = useState(false);
  const [speedMs, setSpeedMs] = useState(80);

  const [history, setHistory] = useState<RunHistoryItem[]>([]);

  // safe user inputs
  const [inputs, setInputs] = useState<SimInputs>(() => defaultInputsForCategory("password"));

  useEffect(() => {
    const saved = safeJson<RunHistoryItem[]>(localStorage.getItem(HISTORY_KEY), []);
    setHistory(Array.isArray(saved) ? saved.slice(0, MAX_HISTORY) : []);
  }, []);

  const activeCategory = useMemo(
    () => categories.find((c) => c.id === activeCategoryId) ?? categories[0],
    [activeCategoryId]
  );

  const tools = activeCategory.tools;

  useEffect(() => {
    if (!tools.some((t) => t.id === activeToolId)) {
      setActiveToolId(tools[0].id);
    }
    // update default inputs when switching category (keeps UX predictable)
    setInputs(defaultInputsForCategory(activeCategoryId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategoryId]);

  const activeTool = useMemo(() => tools.find((t) => t.id === activeToolId) ?? tools[0], [tools, activeToolId]);

  const adjusted = useMemo(() => computeAdjusted(activeTool, activeCategoryId, inputs), [activeTool, activeCategoryId, inputs]);

  const systemBadge = useMemo(() => {
    if (running) return { text: "Simulation running", cls: "border-yellow-500/40 text-yellow-300" };
    if (focusMode) return { text: "Focus Mode", cls: "border-cyan-500/40 text-cyan-300" };
    return { text: "Education Mode", cls: "border-green-500/40 text-green-400" };
  }, [running, focusMode]);

  // adaptive animation: higher learningMode => slower
  useEffect(() => {
    // base style: punchy default, slows down with learningMode
    const slowFactor = Math.round((inputs.learningMode / 100) * 70); // 0..70
    const newSpeed = clamp(70 + slowFactor, 40, 160);
    setSpeedMs(newSpeed);
  }, [inputs.learningMode]);

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
    toast.success("Simulation history cleared");
  };

  const addHistory = (tool: SimTool) => {
    const item: RunHistoryItem = {
      toolId: tool.id,
      categoryId: activeCategoryId,
      title: tool.title,
      date: todayISO(),
    };
    const next = [item, ...history].slice(0, MAX_HISTORY);
    setHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const resetRunUI = () => {
    setRunning(false);
    setProgress(0);
    setStageIndex(0);
    setRunLog([]);
    if (runTimerRef.current) {
      window.clearInterval(runTimerRef.current);
      runTimerRef.current = null;
    }
  };

  const resetVisualUI = () => {
    // simplest reset: toggle off->on if needed; visual panel manages its own tick/events reset via keying on tool changes.
    setVisualRunning(false);
    // small UX delay to feel responsive
    window.setTimeout(() => setVisualRunning(true), 40);
  };

  const executeTool = () => {
    if (running) return;

    resetRunUI();
    setRunning(true);
    setVisualRunning(true);
    toast.message("Running educational simulation...");

    const totalStages = activeTool.stages.length;
    let p = 0;
    let idx = 0;

    setRunLog([
      `Started: ${activeTool.title}`,
      `Mode: Education-only simulation (no real attack actions)`,
      `Adjusted Risk: ${adjusted.risk} | Adjusted Impact: ${adjusted.impact}%`,
      `Outcome: ${adjusted.outcome}`,
      `Inputs: MFA=${inputs.mfaEnabled ? "ON" : "OFF"}, RateLimit=${inputs.rateLimit ? "ON" : "OFF"}, Monitoring=${inputs.monitoring ? "ON" : "OFF"}`,
      `---`,
      `Stage 1/${totalStages}: ${activeTool.stages[0].label} — ${activeTool.stages[0].detail}`,
    ]);

    runTimerRef.current = window.setInterval(() => {
      // faster base loop; learningMode slows via speedMs in visual only. Stage timer stays readable.
      p = clamp(p + 7, 0, 100);
      setProgress(p);

      const nextStage = Math.min(totalStages - 1, Math.floor((p / 100) * totalStages));
      if (nextStage !== idx) {
        idx = nextStage;
        setStageIndex(idx);
        setRunLog((prev) => [
          ...prev,
          `Stage ${idx + 1}/${totalStages}: ${activeTool.stages[idx].label} — ${activeTool.stages[idx].detail}`,
        ]);
      }

      if (p >= 100) {
        if (runTimerRef.current) {
          window.clearInterval(runTimerRef.current);
          runTimerRef.current = null;
        }

        setRunLog((prev) => [
          ...prev,
          `---`,
          `Completed: ${activeTool.title}`,
          `Result: Educational simulation only — demonstrated risk patterns and defenses.`,
          `Top Reasons:`,
          ...adjusted.rationale.map((x) => `- ${x}`),
        ]);

        setRunning(false);
        addHistory(activeTool);
        toast.success("Simulation complete");
      }
    }, 280);
  };

  const exportRun = () => {
    const content = [
      `PascoAI — Simulations Report`,
      `Date: ${new Date().toISOString()}`,
      ``,
      `Category: ${activeCategory.label}`,
      `Tool: ${activeTool.title}`,
      `Base Risk: ${activeTool.risk}`,
      `Base Impact: ${activeTool.impact}%`,
      `Base Difficulty: ${activeTool.difficulty}%`,
      ``,
      `Adjusted Risk: ${adjusted.risk}`,
      `Adjusted Impact: ${adjusted.impact}%`,
      `Outcome: ${adjusted.outcome}`,
      ``,
      `Inputs (safe):`,
      `- MFA: ${inputs.mfaEnabled ? "ON" : "OFF"}`,
      `- Rate limiting: ${inputs.rateLimit ? "ON" : "OFF"}`,
      `- Monitoring: ${inputs.monitoring ? "ON" : "OFF"}`,
      `- Password length (if applicable): ${inputs.passwordLength}`,
      `- Reuse detected (if applicable): ${inputs.reuseDetected ? "Yes" : "No"}`,
      `- User awareness (if applicable): ${inputs.userAwareness}%`,
      `- Domain similarity (if applicable): ${inputs.domainSimilarity}%`,
      `- Patched: ${inputs.patched ? "Yes" : "No"}`,
      `- Least privilege: ${inputs.leastPrivilege ? "Yes" : "No"}`,
      `- Public exposure: ${inputs.publicExposure ? "Yes" : "No"}`,
      ``,
      `Rationale:`,
      ...adjusted.rationale.map((x) => `- ${x}`),
      ``,
      `What is it:`,
      activeTool.whatIsIt,
      ``,
      `How it works:`,
      ...activeTool.howItWorks.map((x) => `- ${x}`),
      ``,
      `What can go wrong:`,
      ...activeTool.whatCanGoWrong.map((x) => `- ${x}`),
      ``,
      `How to be safe:`,
      ...activeTool.howToBeSafe.map((x) => `- ${x}`),
      ``,
      `Simulation Log:`,
      ...runLog.map((x) => x),
      ``,
    ].join("\n");

    downloadTextFile(`pascoai_sim_${activeTool.id}_${todayISO()}.txt`, content);
    toast.success("Report exported");
  };

  const enterFocusModeForTool = (toolId: ToolId) => {
    setActiveToolId(toolId);
    setFocusMode(true);
    // reset visuals for the newly focused tool
    resetRunUI();
    setVisualRunning(false);
    toast.message("Focus mode enabled");
  };

  const exitFocusMode = () => {
    setFocusMode(false);
    resetRunUI();
    setVisualRunning(false);
    toast.message("Back to tool library");
  };

  // small helper UI for toggles without importing extra switch component
  const ToggleRow = ({
    label,
    value,
    onChange,
    hint,
  }: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
    hint?: string;
  }) => (
    <label className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint ? <div className="text-xs text-muted-foreground mt-0.5">{hint}</div> : null}
      </div>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );

  const InputsPanel = () => {
    const cat = activeCategoryId;

    return (
      <Card variant="glass">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            Safe Controls
          </CardTitle>
          <CardDescription>These inputs change the simulation outcome (education-only).</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <ToggleRow
            label="MFA enabled"
            value={inputs.mfaEnabled}
            onChange={(v) => setInputs((p) => ({ ...p, mfaEnabled: v }))}
            hint="Phishing-resistant MFA is best (app/hardware key)."
          />
          <ToggleRow
            label="Rate limiting"
            value={inputs.rateLimit}
            onChange={(v) => setInputs((p) => ({ ...p, rateLimit: v }))}
            hint="Reduces feasibility of online automation."
          />
          <ToggleRow
            label="Monitoring / Alerts"
            value={inputs.monitoring}
            onChange={(v) => setInputs((p) => ({ ...p, monitoring: v }))}
            hint="Helps detect and respond faster."
          />

          {cat === "password" && (
            <>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Password length (concept)</span>
                  <span className="text-primary font-semibold">{inputs.passwordLength}</span>
                </div>
                <input
                  type="range"
                  min={6}
                  max={32}
                  value={inputs.passwordLength}
                  onChange={(e) => setInputs((p) => ({ ...p, passwordLength: Number(e.target.value) }))}
                  className="w-full mt-2"
                />
                <div className="text-xs text-muted-foreground mt-2">Longer = higher entropy (conceptually).</div>
              </div>

              <ToggleRow
                label="Password reuse present"
                value={inputs.reuseDetected}
                onChange={(v) => setInputs((p) => ({ ...p, reuseDetected: v }))}
                hint="Reuse turns one breach into many compromises."
              />
            </>
          )}

          {(cat === "phishing" || cat === "social") && (
            <>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">User awareness</span>
                  <span className="text-primary font-semibold">{inputs.userAwareness}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={inputs.userAwareness}
                  onChange={(e) => setInputs((p) => ({ ...p, userAwareness: Number(e.target.value) }))}
                  className="w-full mt-2"
                />
                <div className="text-xs text-muted-foreground mt-2">Higher awareness = higher detection & reporting.</div>
              </div>
            </>
          )}

          {cat === "phishing" && (
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Domain similarity</span>
                <span className="text-primary font-semibold">{inputs.domainSimilarity}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={inputs.domainSimilarity}
                onChange={(e) => setInputs((p) => ({ ...p, domainSimilarity: Number(e.target.value) }))}
                className="w-full mt-2"
              />
              <div className="text-xs text-muted-foreground mt-2">Higher similarity = more convincing lure (concept).</div>
            </div>
          )}

          {(cat === "network" || cat === "cloud") && (
            <>
              <ToggleRow
                label="Patched / Up-to-date"
                value={inputs.patched}
                onChange={(v) => setInputs((p) => ({ ...p, patched: v }))}
                hint="Reduces known-risk exposure."
              />
              <ToggleRow
                label="Least privilege"
                value={inputs.leastPrivilege}
                onChange={(v) => setInputs((p) => ({ ...p, leastPrivilege: v }))}
                hint="Limits blast radius if compromised."
              />
              <ToggleRow
                label="Public exposure"
                value={inputs.publicExposure}
                onChange={(v) => setInputs((p) => ({ ...p, publicExposure: v }))}
                hint="Public access increases attack surface/leak risk."
              />
            </>
          )}

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Learning mode</span>
              <span className="text-primary font-semibold">{inputs.learningMode}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={inputs.learningMode}
              onChange={(e) => setInputs((p) => ({ ...p, learningMode: Number(e.target.value) }))}
              className="w-full mt-2"
            />
            <div className="text-xs text-muted-foreground mt-2">
              Higher = slower visuals + more “training” feel. Lower = punchy demo feel.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          {focusMode ? (
            <Button variant="outline" onClick={exitFocusMode} className="gap-2 mt-1">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          ) : null}

          <div>
            <h1 className="text-3xl font-bold text-gradient-cyber">Simulations</h1>
            <p className="text-muted-foreground mt-1">
              Educational simulations only — learn how attacks work and how to defend (no real hacking).
            </p>
          </div>
        </div>

        <Badge variant="outline" className={`w-fit flex items-center gap-2 py-1.5 px-3 ${systemBadge.cls}`}>
          <Clock className="w-4 h-4 animate-pulse" />
          <span>{systemBadge.text}</span>
        </Badge>
      </div>

      {/* Category Tabs (hide when focus mode to reduce distraction) */}
      {!focusMode && (
        <Card variant="cyber">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Simulation Library
            </CardTitle>
            <CardDescription>Select a category, then choose a tool to run an educational simulation.</CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <Tabs value={activeCategoryId} onValueChange={(v) => setActiveCategoryId(v as CategoryId)}>
              <TabsList className="flex flex-wrap h-auto">
                {categories.map((c) => (
                  <TabsTrigger key={c.id} value={c.id} className="gap-2">
                    <c.icon className="w-4 h-4" />
                    <span>{c.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {categories.map((c) => (
                <TabsContent key={c.id} value={c.id} className="mt-4">
                  <div className="text-sm text-muted-foreground">{c.description}</div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* TOOL SELECTION (hidden in focus mode) */}
      {!focusMode && (
        <Card variant="cyber">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Tools in {activeCategory.label}
              </span>
              <Badge variant="outline">{activeCategory.tools.length} tools</Badge>
            </CardTitle>
            <CardDescription>Click a tool to enter focus mode and run the simulation.</CardDescription>
          </CardHeader>

          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tools.map((t) => {
              const active = t.id === activeToolId;
              return (
                <Card
                  key={t.id}
                  variant={active ? "glow" : "glass"}
                  className={`cursor-pointer group ${active ? "border-primary/50" : ""}`}
                  onClick={() => enterFocusModeForTool(t.id)}
                  title="Click to open"
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{t.title}</div>
                        <div className="text-sm text-muted-foreground">{t.short}</div>
                      </div>
                      <Badge variant="outline" className={riskBadgeClass(t.risk)}>
                        {t.risk}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">Education</Badge>
                      <Badge variant="outline">Simulation</Badge>
                      {t.tags.slice(0, 2).map((x) => (
                        <Badge key={x} variant="outline" className="opacity-80">
                          {x}
                        </Badge>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Impact</span>
                        <span>{t.impact}%</span>
                      </div>
                      <Progress value={t.impact} />

                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Complexity</span>
                        <span>{t.difficulty}%</span>
                      </div>
                      <Progress value={t.difficulty} />
                    </div>

                    <div className="text-xs text-muted-foreground">{active ? "Selected" : "Click to open"}</div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* FOCUS MODE: Split View (Visual + Explanation) */}
      {focusMode && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Visual (xl: two columns area) */}
          <div className="xl:col-span-2 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-muted-foreground">Selected Tool</div>
                <div className="text-xl font-semibold truncate">{activeTool.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{activeTool.short}</div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={riskBadgeClass(activeTool.risk)}>
                  Base {activeTool.risk}
                </Badge>
                <Badge variant="outline" className={riskBadgeClass(adjusted.risk)}>
                  Adjusted {adjusted.risk}
                </Badge>
                <Badge variant="outline">Impact {adjusted.impact}%</Badge>
              </div>
            </div>

            {/* Run controls */}
            <Card variant="cyber">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    Simulation Controls
                  </span>
                  <Badge variant="outline" className={riskBadgeClass(adjusted.risk)}>
                    {adjusted.outcome}
                  </Badge>
                </CardTitle>
                <CardDescription>Run stages + visuals. Visuals can play independently for learning.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={executeTool} disabled={running} className="w-full">
                    <Play className="w-4 h-4 mr-2" />
                    {running ? "Running..." : "Run Simulation"}
                  </Button>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" onClick={resetRunUI} disabled={running && progress < 100}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reset stages</TooltipContent>
                  </Tooltip>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Stage Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                  <div className="text-xs text-muted-foreground">
                    Stage {Math.min(stageIndex + 1, activeTool.stages.length)}/{activeTool.stages.length}:{" "}
                    <span className="text-primary">
                      {activeTool.stages[Math.min(stageIndex, activeTool.stages.length - 1)].label}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/30 p-3 border border-border/60">
                  <div className="text-xs text-muted-foreground mb-1">Adjusted rationale (explainable)</div>
                  <ul className="space-y-1">
                    {adjusted.rationale.map((x, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <Badge variant="outline" className="h-5 px-2">
                          {i + 1}
                        </Badge>
                        <span>{x}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Visual split panel */}
            <VisualSimulationPanel
              tool={activeTool}
              inputs={inputs}
              visualRunning={visualRunning}
              setVisualRunning={setVisualRunning}
              speedMs={speedMs}
              setSpeedMs={setSpeedMs}
              onResetVisual={resetVisualUI}
              outcome={adjusted.outcome}
              adjustedImpact={adjusted.impact}
              adjustedRisk={adjusted.risk}
            />
          </div>

          {/* Right: Explanation + Prevention + Inputs */}
          <div className="space-y-6">
            <InputsPanel />

            <Card variant="cyber">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  Explanation
                </CardTitle>
                <CardDescription>Learn what it is, how it works (conceptually), and how to stay safe.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid grid-cols-4">
                    <TabsTrigger value="overview" className="gap-2">
                      <Info className="w-4 h-4" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="how" className="gap-2">
                      <BookOpen className="w-4 h-4" />
                      How
                    </TabsTrigger>
                    <TabsTrigger value="safe" className="gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Safe
                    </TabsTrigger>
                    <TabsTrigger value="log" className="gap-2">
                      <Clock className="w-4 h-4" />
                      Log
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-3 space-y-3">
                    <div className="text-sm text-muted-foreground">{activeTool.whatIsIt}</div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="opacity-90">
                        Base Impact {activeTool.impact}%
                      </Badge>
                      <Badge variant="outline" className="opacity-90">
                        Adjusted Impact {adjusted.impact}%
                      </Badge>
                      <Badge variant="outline" className="opacity-90">
                        Complexity {activeTool.difficulty}%
                      </Badge>
                      <Badge variant="outline" className="opacity-90">
                        Education-Only
                      </Badge>
                    </div>

                    <div className="rounded-lg bg-muted/30 p-3 border border-border/60">
                      <div className="text-xs text-muted-foreground mb-2">What can go wrong</div>
                      <ul className="space-y-1">
                        {activeTool.whatCanGoWrong.slice(0, 3).map((x, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex gap-2">
                            <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
                            <span>{x}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </TabsContent>

                  <TabsContent value="how" className="mt-3 space-y-3">
                    <div className="rounded-lg bg-muted/30 p-3 border border-border/60">
                      <div className="text-xs text-muted-foreground mb-2">How it works (education only)</div>
                      <ol className="space-y-2">
                        {activeTool.howItWorks.map((x, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex gap-2">
                            <Badge variant="outline" className="h-5 px-2">
                              {i + 1}
                            </Badge>
                            <span>{x}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="rounded-lg bg-muted/30 p-3 border border-border/60">
                      <div className="text-xs text-muted-foreground mb-2">Simulation stages</div>
                      <ol className="space-y-2">
                        {activeTool.stages.map((s, i) => (
                          <li key={s.label} className="text-sm text-muted-foreground flex gap-2">
                            <Badge variant="outline" className="h-5 px-2">
                              {i + 1}
                            </Badge>
                            <span>
                              <span className="text-foreground">{s.label}:</span> {s.detail}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </TabsContent>

                  <TabsContent value="safe" className="mt-3 space-y-3">
                    <div className="rounded-lg bg-muted/30 p-3 border border-border/60">
                      <div className="text-xs text-muted-foreground mb-2">How to be safe (defensive controls)</div>
                      <ul className="space-y-2">
                        {activeTool.howToBeSafe.map((x, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success mt-0.5" />
                            <span>{x}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Note: This tool is a simulation for education. It does not perform real attacks or provide exploit steps.
                    </div>
                  </TabsContent>

                  <TabsContent value="log" className="mt-3 space-y-3">
                    <div className="rounded-lg bg-muted/30 p-3 border border-border/60">
                      <div className="text-xs text-muted-foreground mb-2">Execution log</div>
                      {runLog.length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          Click <span className="text-primary">Run Simulation</span> to generate a run log.
                        </div>
                      ) : (
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
{runLog.join("\n")}
                        </pre>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={exportRun} disabled={runLog.length === 0}>
                        <FileText className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setRunLog([]);
                          toast.message("Log cleared");
                        }}
                        disabled={runLog.length === 0}
                      >
                        Clear Log
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* History (still visible outside focus mode; clickable to enter focus mode) */}
      {!focusMode && (
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-secondary" />
              History
            </CardTitle>

            <Button variant="destructive" size="sm" onClick={clearHistory} disabled={history.length === 0}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear History
            </Button>
          </CardHeader>

          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No simulation runs yet. Pick a tool and run a simulation — it will appear here.
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((h, i) => (
                  <button
                    key={`${h.date}-${h.toolId}-${i}`}
                    onClick={() => {
                      setActiveCategoryId(h.categoryId);
                      setTimeout(() => {
                        setActiveToolId(h.toolId);
                        setFocusMode(true);
                        toast.message("Loaded from history (focus mode)");
                      }, 0);
                    }}
                    className="w-full text-left rounded-lg p-3 border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition"
                    title="Click to open"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{h.title}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            {categories.find((c) => c.id === h.categoryId)?.label ?? h.categoryId}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {h.toolId}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">{h.date}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
