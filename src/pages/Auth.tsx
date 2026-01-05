"use client";

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const { login, signup, resetPassword, demoLogin } = useAuth();

  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "login") {
      const res = await login(email, password);
      if (res.error) {
        toast({ variant: "destructive", title: res.error });
      } else {
        toast({
          title: "Signed in successfully",
          duration: 1000,
        });
        navigate(from, { replace: true });        
      }
    }

    if (mode === "signup") {
      const res = await signup(email, password);
      if (res.error) {
        toast({ variant: "destructive", title: res.error });
      } else {
        toast({
          title: "Account created",
          duration: 1000,
        });
        navigate(from, { replace: true });        
      }
    }

    if (mode === "reset") {
      const res = await resetPassword(email);
      if (res.error) {
        toast({ variant: "destructive", title: res.error });
      } else {
        toast({
          title: "Password reset link sent",
          duration: 1000,
        });
        setMode("login");        
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg">
            <Shield className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-2xl font-semibold text-center">
            {mode === "login"
              ? "Welcome Back"
              : mode === "signup"
              ? "Create Account"
              : "Reset Password"}
          </h1>
          <p className="text-sm text-muted-foreground text-center">
            {mode === "login" &&
              "Sign in to access your cybersecurity dashboard"}
            {mode === "signup" && "Create a new PascoAI account"}
            {mode === "reset" &&
              "Enter your email to receive a reset link"}
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="agent@pascoai.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            {mode !== "reset" && (
              <div className="space-y-1">
                <Label>Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Submit */}
            <Button type="submit" className="w-full" disabled={loading}>
              {mode === "login" && "Sign In"}
              {mode === "signup" && "Create Account"}
              {mode === "reset" && "Send Reset Link"}
            </Button>

            {/* ✅ DEMO BUTTON (HACKATHON) */}
            {mode === "login" && (
              <Button
              type="button"
              className="
                w-full
                bg-[hsl(var(--accent))]
                text-[hsl(var(--accent-foreground))]
                neon-border-green
                pulse-glow
                hover:scale-[1.02]
                transition-all
              "
              onClick={async () => {
                await demoLogin();
                toast({
                  title: "Demo mode enabled",
                  duration: 1000,
                });
                navigate("/dashboard");
              }}
            >
              Demo for Hackathon
            </Button>            
            )}
          </form>

          {/* Footer links */}
          <div className="mt-4 text-center text-sm">
            {mode === "login" && (
              <>
                <button
                  onClick={() => setMode("reset")}
                  className="text-primary hover:underline"
                >
                  Forgot your password?
                </button>
                <p className="mt-2 text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="text-primary hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              </>
            )}

            {mode === "signup" && (
              <p className="text-muted-foreground">
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-primary hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}

            {mode === "reset" && (
              <button
                onClick={() => setMode("login")}
                className="text-primary hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
