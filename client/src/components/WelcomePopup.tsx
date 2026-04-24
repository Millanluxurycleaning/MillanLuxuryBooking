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
    }, 5000);
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={dismiss} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <div className="p-8 text-center" style={{ background: "linear-gradient(135deg, #1a3a2a 0%, #2d5a3d 50%, #1e4030 100%)" }}>

          {/* Close */}
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>

          {/* Crown icon */}
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
            <Crown className="w-8 h-8 text-amber-300" />
          </div>

          {code ? (
            /* ── Code revealed state ── */
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-semibold text-white">
                Your discount is ready! 👑
              </h2>
              <p className="text-sm text-white/70 leading-relaxed">
                Use this code at checkout for <strong className="text-white">10% off your first booking</strong>. Valid for one use only.
              </p>

              {/* Code display */}
              <div className="rounded-2xl bg-white/10 border border-white/20 px-5 py-4 flex items-center justify-between gap-3">
                <span className="text-xl font-mono font-bold tracking-widest text-amber-300">
                  {code}
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-medium text-white/60 hover:text-white transition-colors"
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
              <p className="text-sm text-white/70 mb-6 leading-relaxed">
                Join our list and unlock an exclusive offer when you book.
              </p>

              {/* Discount tile */}
              <div className="rounded-2xl bg-white/10 border border-white/20 px-6 py-5 mb-6">
                <p className="text-5xl font-bold text-amber-300 mb-1">10%</p>
                <p className="text-[11px] uppercase tracking-widest text-white/60 font-medium">
                  Off your first booking
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 h-12 rounded-xl bg-white/10 border-white/20 text-white text-sm placeholder:text-white/40 focus-visible:ring-amber-400"
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
                <p className="text-xs text-white/40">
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
