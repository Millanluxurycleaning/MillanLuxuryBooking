import { useEffect, useState } from "react";
import { X, Crown, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CLAIMED_KEY = "mlc_discount_claimed";

export function WelcomePopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const count = parseInt(localStorage.getItem("mlc_popup_count") ?? "0", 10);
    if (count >= 2) return;
    const timer = setTimeout(() => {
      localStorage.setItem("mlc_popup_count", String(count + 1));
      setVisible(true);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => setVisible(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.alreadyUsed) {
        setError("This email has already claimed a discount.");
        return;
      }
      if (data.code) {
        setCode(data.code);
        localStorage.setItem(CLAIMED_KEY, data.code);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome offer"
    >
      {/* Backdrop — stronger blur for liquid glass feel */}
      <div
        className="absolute inset-0"
        onClick={dismiss}
        style={{
          backdropFilter: "blur(12px) saturate(120%)",
          WebkitBackdropFilter: "blur(12px) saturate(120%)",
          background: "rgba(0, 0, 0, 0.45)",
        }}
      />

      {/* Modal — liquid glass */}
      <div
        className="relative z-10 w-full max-w-md rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        style={{
          background: "rgba(18, 48, 32, 0.42)",
          backdropFilter: "blur(40px) saturate(180%) brightness(1.08)",
          WebkitBackdropFilter: "blur(40px) saturate(180%) brightness(1.08)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          boxShadow: `
            0 0 0 0.5px rgba(255,255,255,0.08) inset,
            0 2px 0 rgba(255,255,255,0.13) inset,
            0 -1px 0 rgba(0,0,0,0.25) inset,
            0 24px 64px rgba(0,0,0,0.55),
            0 0 80px rgba(30,90,55,0.25)
          `,
        }}
      >
        {/* Top specular highlight — simulates glass reflection */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }}
        />
        {/* Subtle inner green tint layer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "linear-gradient(145deg, rgba(45,100,65,0.18) 0%, rgba(20,55,35,0.08) 60%, rgba(45,90,60,0.14) 100%)" }}
        />

        <div className="relative p-8 text-center">

          {/* Close */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-all"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(8px)",
            }}
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>

          {/* Crown icon */}
          <div
            className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.13)",
              boxShadow: "0 2px 0 rgba(255,255,255,0.1) inset, 0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            <Crown className="w-8 h-8 text-amber-300" />
          </div>

          {code ? (
            /* ── Code revealed state ── */
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-semibold text-white">
                Your discount is ready! 👑
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                Use this code at checkout to claim your recurring service discount. Valid for one use only.
              </p>

              {/* Code display */}
              <div
                className="rounded-2xl px-5 py-4 flex items-center justify-between gap-3"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  boxShadow: "0 1px 0 rgba(255,255,255,0.1) inset",
                }}
              >
                <span className="text-xl font-mono font-bold tracking-widest text-amber-300">
                  {code}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-medium transition-colors"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              <Button
                onClick={dismiss}
                className="w-full h-12 rounded-xl font-semibold text-[#1a3a2a] border-0"
                style={{ background: "linear-gradient(90deg, #d4af37, #f0d060)" }}
              >
                Start Booking
              </Button>
            </div>
          ) : (
            /* ── Email capture state ── */
            <>
              <h2 className="text-3xl font-serif font-semibold text-white mb-2">
                Welcome to Millan Luxury Cleaning
              </h2>
              <p className="text-sm mb-5 leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                Sign up for recurring service and save on your first cleaning.
              </p>

              {/* Tiered offer tiles — liquid glass cards */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { pct: "15% off", label: "Weekly" },
                  { pct: "15% off", label: "Biweekly" },
                  { pct: "10% off", label: "Monthly" },
                ].map(({ pct, label }) => (
                  <div
                    key={label}
                    className="rounded-2xl px-3 py-4"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(212,175,55,0.3)",
                      boxShadow: "0 1px 0 rgba(255,255,255,0.1) inset, 0 4px 16px rgba(0,0,0,0.15)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <p className="text-xl font-bold text-amber-300 mb-1">{pct}</p>
                    <p className="text-[9px] uppercase tracking-widest font-medium leading-tight" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-[11px] mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
                Applied to your first cleaning when you set up a recurring plan.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 h-12 rounded-xl text-white text-sm placeholder:text-white/35 focus-visible:ring-amber-400 border-0"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.13)",
                      boxShadow: "0 1px 0 rgba(255,255,255,0.08) inset",
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-12 px-6 rounded-xl font-semibold tracking-wide text-sm border-0 shadow-none text-[#1a3a2a]"
                    style={{ background: "linear-gradient(90deg, #d4af37, #f0d060)" }}
                  >
                    {loading ? "..." : "UNLOCK"}
                  </Button>
                </div>
                {error && <p className="text-xs text-red-300">{error}</p>}
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                  No spam. Unsubscribe anytime.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
