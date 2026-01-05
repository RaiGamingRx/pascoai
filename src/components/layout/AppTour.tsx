import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

type FocusMode = "full" | "exact" | "viewport";

export function AppTour() {
  const { isDemo } = useAuth();
  const [step, setStep] = useState(0);
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const startedRef = useRef(false);

  /* detect mobile */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* PC: auto start */
  useEffect(() => {
    if (isMobile) return;

    const skipped = localStorage.getItem("pasco_tour_skipped");
    if ((isDemo || !skipped) && !startedRef.current) {
      startedRef.current = true;
      setStep(0);
      setOpen(true);
    }
  }, [isDemo, isMobile]);

  /* MOBILE: auto start but guide hamburger first */
  useEffect(() => {
    if (!isMobile) return;

    const skipped = localStorage.getItem("pasco_tour_skipped");
    if ((isDemo || !skipped) && !startedRef.current) {
      startedRef.current = true;
      setStep(0); // hamburger step
      setOpen(true);
    }
  }, [isMobile, isDemo]);

  /* steps */
  const STEPS = isMobile
    ? [
        {
          key: "hamburger",
          selector: "[data-tour='hamburger']",
          title: "Open Menu",
          text: "Tap here to open the navigation menu.",
          focus: "exact" as FocusMode,
          waitForEvent: "tour:menu-opened",
        },
        {
          key: "sidebar",
          selector: "[data-tour='sidebar']",
          title: "Navigation",
          text: "Use the menu to access all security tools.",
          focus: "full" as FocusMode,
        },
        {
          key: "topbar",
          selector: "[data-tour='topbar']",
          title: "Top Bar",
          text: "Profile, demo mode, and quick actions live here.",
          focus: "exact" as FocusMode,
        },
        {
          key: "dashboard",
          selector: "[data-tour='dashboard']",
          title: "Dashboard",
          text: "Your security overview and recent activity.",
          focus: "viewport" as FocusMode,
        },
      ]
    : [
        {
          key: "sidebar",
          selector: "[data-tour='sidebar']",
          title: "Navigation",
          text: "Use the sidebar to access all security tools.",
          focus: "full" as FocusMode,
        },
        {
          key: "topbar",
          selector: "[data-tour='topbar']",
          title: "Quick Access",
          text: "Profile, demo mode, and quick actions live here.",
          focus: "exact" as FocusMode,
        },
        {
          key: "dashboard",
          selector: "[data-tour='dashboard']",
          title: "Dashboard",
          text: "Your security overview and recent activity.",
          focus: "viewport" as FocusMode,
        },
      ];

  const current = STEPS[step];

  /* wait for hamburger click */
  useEffect(() => {
    if (!current?.waitForEvent) return;

    const handler = () => {
      setTimeout(() => setStep((s) => s + 1), 250);
    };

    window.addEventListener(current.waitForEvent, handler);
    return () =>
      window.removeEventListener(current.waitForEvent, handler);
  }, [current]);

  if (!open || !current) return null;

  const el = document.querySelector(current.selector) as HTMLElement | null;
  if (!el) return null;

  const r = el.getBoundingClientRect();

  let top = r.top;
  let height = r.height;

  if (current.focus === "full") {
    top = 0;
    height = window.innerHeight;
  }

  if (current.focus === "viewport") {
    const topbar =
      document.querySelector("[data-tour='topbar']")?.getBoundingClientRect()
        .height || 56;
    top = topbar + 12;
    height = window.innerHeight - topbar - 24;
  }

  const bottom = top + height;

  const tooltipWidth = isMobile ? window.innerWidth - 24 : 320;

  const finish = () => {
    localStorage.setItem("pasco_tour_skipped", "true");
    setOpen(false);
  };

  return (
    <>
      {/* dim */}
      <div className="fixed inset-x-0 top-0 bg-black/70 z-[1000]" style={{ height: top }} />
      <div className="fixed inset-x-0 bg-black/70 z-[1000]" style={{ top: bottom, bottom: 0 }} />
      <div className="fixed left-0 bg-black/70 z-[1000]" style={{ top, width: r.left, height }} />
      <div className="fixed right-0 bg-black/70 z-[1000]" style={{ top, left: r.right, height }} />

      {/* outline */}
      <div
        className="fixed z-[1001] pointer-events-none rounded-lg"
        style={{
          top: top - 4,
          left: r.left - 4,
          width: r.width + 8,
          height: height + 8,
          outline: "2px solid rgba(34,211,238,0.95)",
        }}
      />

      {/* tooltip */}
      <div
        className="fixed z-[1002] bg-card border border-border rounded-xl p-4 shadow-xl"
        style={{
          top: Math.min(bottom + 16, window.innerHeight - 220),
          left: isMobile ? 12 : Math.min(r.left, window.innerWidth - tooltipWidth - 12),
          width: tooltipWidth,
        }}
      >
        <h3 className="font-semibold">{current.title}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {current.text}
        </p>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={finish}
            className="text-sm font-semibold text-red-500 hover:underline"
          >
            Skip tour
          </button>

          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}

            {!current.waitForEvent && (
              <Button
                onClick={() =>
                  step === STEPS.length - 1
                    ? finish()
                    : setStep(step + 1)
                }
              >
                {step === STEPS.length - 1 ? "Finish" : "Next"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
