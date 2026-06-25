import { useEffect, useState } from "react";
import { X, Crown, Copy, Check, ArrowRight, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CLAIMED_KEY = "mlc_discount_claimed";

const PLANS = [
  { key: "weekly",   label: "Weekly",   pct: "20%", badge: "Millan Royalty", benefit: "Free 3-Wick Candle + Quarterly VIP Clean" },
  { key: "biweekly", label: "Biweekly", pct: "15%", badge: "Crown Club",     benefit: "Free Mini Candle + Monthly add-on" },
  { key: "monthly",  label: "Monthly",  pct: "10%", badge: "Millan Member",  benefit: "Priority scheduling + Quarterly add-on" },
] as const;

type PlanKey = typeof PLANS[number]["key"];
type Step = "plan" | "choice" | "book-info" | "book-confirm" | "email" | "code";

const glass = {
  base: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(212,175,55,0.25)",
    boxShadow: "0 1px 0 rgba(255,255,255,0.1) inset, 0 4px 16px rgba(0,0,0,0.15)",
  } as React.CSSProperties,
  selected: {
    background: "rgba(212,175,55,0.18)",
    border: "1px solid rgba(212,175,55,0.75)",
    boxShadow: "0 1px 0 rgba(255,220,100,0.2) inset, 0 4px 20px rgba(212,175,55,0.2)",
  } as React.CSSProperties,
  input: {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.13)",
    boxShadow: "0 1px 0 rgba(255,255,255,0.08) inset",
  } as React.CSSProperties,
};

export function WelcomePopup() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<Step>("plan");
  const [selectedPlan, setSelectedPlan] = useState<PlanKey | null>(null);

  // Book-now info
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [bookEmail, setBookEmail] = useState("");
  const [address, setAddress] = useState("");
  const [bookLoading, setBookLoading] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  // Email-code path
  const [email, setEmail]     = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [code, setCode]       = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    if (localStorage.getItem(CLAIMED_KEY)) return;
    if (localStorage.getItem("mlc_popup_seen")) return;
    const timer = setTimeout(() => {
      localStorage.setItem("mlc_popup_seen", "1");
      setVisible(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => setVisible(false);
  const plan = PLANS.find((p) => p.key === selectedPlan);
  const planPct = plan?.pct ?? "";

  // ── Book-now submit: register lead + code, then go to scheduling ──
  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !bookEmail || !address) return;
    setBookLoading(true);
    setBookError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: bookEmail, plan: selectedPlan, name, phone, address }),
      });
      const data = await res.json();
      if (data.code) localStorage.setItem(CLAIMED_KEY, data.code);
      setStep("book-confirm");
    } catch {
      setBookError("Something went wrong. Please try again.");
    } finally {
      setBookLoading(false);
    }
  };

  // ── Email-code submit ──
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setEmailLoading(true);
    setEmailError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, plan: selectedPlan }),
      });
      const data = await res.json();
      if (data.alreadyUsed) { setEmailError("This email has already claimed a discount."); return; }
      if (data.code) { setCode(data.code); localStorage.setItem(CLAIMED_KEY, data.code); setStep("code"); }
    } catch {
      setEmailError("Something went wrong. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const goToBooking = () => {
    dismiss();
    const params = new URLSearchParams({
      plan: selectedPlan ?? "",
      name, phone, email: bookEmail, address,
    });
    window.location.href = `/book?${params.toString()}`;
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Welcome offer">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        onClick={dismiss}
        style={{ backdropFilter: "blur(12px) saturate(120%)", WebkitBackdropFilter: "blur(12px) saturate(120%)", background: "rgba(0,0,0,0.45)" }}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        style={{
          background: "rgba(18,48,32,0.42)",
          backdropFilter: "blur(40px) saturate(180%) brightness(1.08)",
          WebkitBackdropFilter: "blur(40px) saturate(180%) brightness(1.08)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 0 0 0.5px rgba(255,255,255,0.08) inset, 0 2px 0 rgba(255,255,255,0.13) inset, 0 -1px 0 rgba(0,0,0,0.25) inset, 0 24px 64px rgba(0,0,0,0.55), 0 0 80px rgba(30,90,55,0.25)",
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)" }} />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(145deg, rgba(45,100,65,0.18) 0%, rgba(20,55,35,0.08) 60%, rgba(45,90,60,0.14) 100%)" }} />

        <div className="relative p-7 text-center">

          {/* Close */}
          <button onClick={dismiss} className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-all" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }} aria-label="Close">
            <X className="w-4 h-4 text-white/70" />
          </button>

          {/* Crown — first step only */}
          {step === "plan" && (
            <div className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)" }}>
              <Crown className="w-7 h-7 text-amber-300" />
            </div>
          )}

          {/* ── STEP 1: Plan selection ── */}
          {step === "plan" && (
            <>
              <h2 className="text-2xl font-serif font-semibold text-white mb-1">Welcome to Millan Luxury Cleaning</h2>
              <p className="text-sm mb-5 leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                Choose your recurring plan and start saving today.
              </p>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {PLANS.map(({ key, label, pct }) => {
                  const sel = selectedPlan === key;
                  return (
                    <button key={key} type="button" onClick={() => setSelectedPlan(key)} className="rounded-2xl px-2 py-3 text-center transition-all duration-200 flex flex-col items-center gap-1" style={sel ? glass.selected : glass.base}>
                      <p className={`text-2xl font-bold leading-none ${sel ? "text-amber-200" : "text-amber-300"}`}>{pct}<span className="text-base align-super">*</span></p>
                      <p className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: sel ? "rgba(255,220,120,0.9)" : "rgba(255,255,255,0.55)" }}>{label}</p>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.28)" }}>* Off your first cleaning when signing up for a recurring plan</p>

              <p className="text-[11px] mb-5 transition-opacity" style={{ color: selectedPlan ? "rgba(255,255,255,0.3)" : "rgba(255,200,80,0.65)" }}>
                {selectedPlan ? "Great choice! How do you want to claim it?" : "↑ Select a plan to continue"}
              </p>

              <Button
                disabled={!selectedPlan}
                onClick={() => setStep("choice")}
                className="w-full h-12 rounded-xl font-semibold text-[#1a3a2a] border-0 disabled:opacity-35"
                style={{ background: "linear-gradient(90deg, #d4af37, #f0d060)" }}
              >
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}

          {/* ── STEP 2: Save now or later ── */}
          {step === "choice" && (
            <>
              <h2 className="text-2xl font-serif font-semibold text-white mb-1">
                {planPct} on your first {plan?.label.toLowerCase()} cleaning
              </h2>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                How would you like to claim your discount?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => setStep("book-info")}
                  className="w-full rounded-2xl px-5 py-4 text-left transition-all duration-200 group"
                  style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.5)", boxShadow: "0 1px 0 rgba(255,220,100,0.15) inset" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-amber-200 text-base">💰 Book now &amp; save</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>Tell us about your home — we'll lock in your discount and schedule your first visit.</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-amber-300 flex-shrink-0 ml-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>

                <button
                  onClick={() => setStep("email")}
                  className="w-full rounded-2xl px-5 py-4 text-left transition-all duration-200 group"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white/80 text-base">📩 Save code for later</p>
                      <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Enter your email and we'll send you a coupon to use when you're ready.</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/30 flex-shrink-0 ml-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              </div>

              <button onClick={() => setStep("plan")} className="mt-4 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>← Back</button>
            </>
          )}

          {/* ── STEP 3a: Book-now — collect info ── */}
          {step === "book-info" && (
            <>
              <h2 className="text-xl font-serif font-semibold text-white mb-1">Tell us about your home</h2>
              <p className="text-xs mb-5" style={{ color: "rgba(255,255,255,0.5)" }}>
                We'll lock in your <span className="text-amber-300 font-semibold">{planPct}</span> {plan?.label.toLowerCase()} discount and get you scheduled.
              </p>

              <form onSubmit={handleBookSubmit} className="space-y-2.5 text-left">
                {[
                  { label: "Full Name", value: name, set: setName, type: "text", placeholder: "Jane Smith" },
                  { label: "Phone Number", value: phone, set: setPhone, type: "tel", placeholder: "(602) 000-0000" },
                  { label: "Email Address", value: bookEmail, set: setBookEmail, type: "email", placeholder: "jane@email.com" },
                  { label: "Service Address", value: address, set: setAddress, type: "text", placeholder: "123 Main St, Phoenix, AZ" },
                ].map(({ label, value, set, type, placeholder }) => (
                  <div key={label}>
                    <label className="block text-[10px] uppercase tracking-widest mb-1 font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</label>
                    <Input
                      type={type}
                      placeholder={placeholder}
                      value={value}
                      onChange={(e) => set(e.target.value)}
                      required
                      className="w-full h-11 rounded-xl text-white text-sm placeholder:text-white/30 focus-visible:ring-amber-400 border-0"
                      style={glass.input}
                    />
                  </div>
                ))}

                {bookError && <p className="text-xs text-red-300">{bookError}</p>}

                <Button
                  type="submit"
                  disabled={bookLoading}
                  className="w-full h-12 rounded-xl font-semibold text-[#1a3a2a] border-0 mt-1"
                  style={{ background: "linear-gradient(90deg, #d4af37, #f0d060)" }}
                >
                  {bookLoading ? "Saving..." : "Continue to Scheduling →"}
                </Button>
              </form>

              <button onClick={() => setStep("choice")} className="mt-3 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>← Back</button>
            </>
          )}

          {/* ── STEP 4a: Book-now — confirm + go to scheduling ── */}
          {step === "book-confirm" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-semibold text-white">You're locked in!</h2>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                Your <span className="text-amber-300 font-semibold">{planPct}</span> discount is saved. Now let's schedule your first <span className="text-white font-medium">{plan?.label.toLowerCase()}</span> cleaning.
              </p>
              <div className="rounded-2xl px-4 py-3 text-left" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p className="text-xs font-medium text-white/50 uppercase tracking-widest mb-1">Your info</p>
                <p className="text-sm text-white/80">{name}</p>
                <p className="text-xs text-white/50">{address}</p>
              </div>
              <Button
                onClick={goToBooking}
                className="w-full h-12 rounded-xl font-semibold text-[#1a3a2a] border-0"
                style={{ background: "linear-gradient(90deg, #d4af37, #f0d060)" }}
              >
                Schedule My First Cleaning →
              </Button>
            </div>
          )}

          {/* ── STEP 3b: Email capture (save for later) ── */}
          {step === "email" && (
            <>
              <h2 className="text-xl font-serif font-semibold text-white mb-1">Save your discount</h2>
              <p className="text-sm mb-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                We'll send your <span className="text-amber-300 font-semibold">{planPct}</span> {plan?.label.toLowerCase()} discount code to your inbox.
              </p>

              <form onSubmit={handleEmailSubmit} className="space-y-3 mt-5">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="flex-1 h-12 rounded-xl text-white text-sm placeholder:text-white/35 focus-visible:ring-amber-400 border-0"
                    style={glass.input}
                  />
                  <Button
                    type="submit"
                    disabled={emailLoading}
                    className="h-12 px-5 rounded-xl font-semibold text-sm border-0 shadow-none text-[#1a3a2a]"
                    style={{ background: "linear-gradient(90deg, #d4af37, #f0d060)" }}
                  >
                    {emailLoading ? "..." : "Send"}
                  </Button>
                </div>
                {emailError && <p className="text-xs text-red-300">{emailError}</p>}
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>No spam. Unsubscribe anytime.</p>
              </form>

              <button onClick={() => setStep("choice")} className="mt-4 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>← Back</button>
            </>
          )}

          {/* ── STEP 4b: Code revealed ── */}
          {step === "code" && (
            <div className="space-y-4">
              <h2 className="text-2xl font-serif font-semibold text-white">Your code is on its way! 👑</h2>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                We emailed your <span className="text-amber-300 font-semibold">{planPct}</span> {plan?.label.toLowerCase()} discount. You can also copy it below.
              </p>
              {code && (
                <div className="rounded-2xl px-5 py-4 flex items-center justify-between gap-3" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)" }}>
                  <span className="text-xl font-mono font-bold tracking-widest text-amber-300">{code}</span>
                  <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs font-medium transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
              <Button onClick={dismiss} className="w-full h-12 rounded-xl font-semibold text-[#1a3a2a] border-0" style={{ background: "linear-gradient(90deg, #d4af37, #f0d060)" }}>
                Start Booking
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
