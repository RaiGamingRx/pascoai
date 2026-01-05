import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Globe,
  MailCheck,
  Lock,
  Key,
  Search,
  Beaker,
  ArrowRight,
  Zap,
  CheckCircle,
} from "lucide-react";

/* === REAL TOOLS (MATCHES SIDEBAR 1:1) === */
const features = [
  {
    icon: Shield,
    title: "Security Scanner",
    description:
      "Authorized, non-intrusive security scanning for domains and IPs with explainable results and risk context.",
  },
  {
    icon: Globe,
    title: "Web Security",
    description:
      "Analyze headers, cookies, HTTPS configuration, and common web security fundamentals in real time.",
  },
  {
    icon: MailCheck,
    title: "Email Security",
    description:
      "Check email safety, phishing indicators, and header-level signals to identify malicious messages.",
  },
  {
    icon: Lock,
    title: "Crypto Lab",
    description:
      "Modern cryptography tools using real encryption standards for secure data protection and learning.",
  },
  {
    icon: Key,
    title: "Password Lab",
    description:
      "Evaluate password strength, estimate time-to-crack, generate secure passwords, and understand risks.",
  },
  {
    icon: Search,
    title: "Research Suite",
    description:
      "AI-powered cybersecurity research with structured analysis and multiple expert-style personas.",
  },
  {
    icon: Beaker,
    title: "Simulations",
    description:
      "Educational security simulations that explain how attacks work and how to defend against them.",
  },
];

/* === TRUST BADGES === */
const trustBadges = [
  "100% Real Working Tools",
  "No Fake Demos or Mock Data",
  "Privacy-First & Local Processing",
  "Built for Learning & Professionals",
];

export default function Index() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />

      <div className="relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-neon-cyan">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-gradient-cyber">PascoAI</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth")}>
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </header>

        {/* Hero */}
        <main className="container mx-auto px-4 py-12 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 py-1.5 px-4 animate-fade-in">
              <Zap className="w-4 h-4 mr-2 text-primary" />
              Powered by Raay
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in">
              <span className="text-gradient-cyber">Cybersecurity</span>
              <br />
              <span className="text-foreground">Intelligence Platform</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in">
              A professional cybersecurity platform offering real, working tools
              for security analysis, cryptography, password safety, and research.
              Designed for learners, practitioners, and serious experimentation.
            </p>

            {/* CTA */}
            <div className="flex items-center justify-center mb-8 animate-fade-in">
              <Button size="xl" onClick={() => navigate("/auth")}>
                <Shield className="w-5 h-5 mr-2" />
                Start Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
              {trustBadges.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle className="w-4 h-4 text-success" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={index}
                className="cyber-card p-6 hover-lift animate-fade-in"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </main>

        {/* Footer */}
        <footer className="py-8 text-center text-sm text-muted-foreground">
          <p>
            Powered by <span className="text-primary font-medium">Raay</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
