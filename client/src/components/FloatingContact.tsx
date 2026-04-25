import { useState } from "react";
import { Phone, MessageCircle, Mail, X, ChevronUp } from "lucide-react";

export function FloatingContact() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
          {/* Call */}
          <a
            href="tel:6025967393"
            className="flex items-center gap-3 bg-card border border-border rounded-2xl shadow-lg px-4 py-3 text-sm font-medium text-foreground hover:border-primary/50 hover:shadow-xl transition-all group"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Phone className="w-4 h-4" />
            </span>
            <div className="leading-none">
              <p className="text-xs text-muted-foreground mb-0.5">Call us</p>
              <p className="font-semibold">(602) 596-7393</p>
            </div>
          </a>

          {/* Text / SMS */}
          <a
            href="sms:6025967393"
            className="flex items-center gap-3 bg-card border border-border rounded-2xl shadow-lg px-4 py-3 text-sm font-medium text-foreground hover:border-primary/50 hover:shadow-xl transition-all group"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <MessageCircle className="w-4 h-4" />
            </span>
            <div className="leading-none">
              <p className="text-xs text-muted-foreground mb-0.5">Text us</p>
              <p className="font-semibold">(602) 596-7393</p>
            </div>
          </a>

          {/* Email */}
          <a
            href="mailto:info@millanluxurycleaning.com"
            className="flex items-center gap-3 bg-card border border-border rounded-2xl shadow-lg px-4 py-3 text-sm font-medium text-foreground hover:border-primary/50 hover:shadow-xl transition-all group"
          >
            <span className="flex items-center justify-center w-9 h-9 rounded-full bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <Mail className="w-4 h-4" />
            </span>
            <div className="leading-none">
              <p className="text-xs text-muted-foreground mb-0.5">Email us</p>
              <p className="font-semibold">info@millanluxurycleaning.com</p>
            </div>
          </a>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close contact menu" : "Open contact menu"}
        className="flex items-center justify-center w-14 h-14 rounded-full shadow-2xl text-white transition-all hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(135deg, #1a3a2a, #2d5a3d)" }}
      >
        {open ? <X className="w-6 h-6" /> : <ChevronUp className="w-6 h-6" />}
      </button>

      {/* Pulse ring when closed */}
      {!open && (
        <span className="absolute bottom-0 right-0 w-14 h-14 rounded-full animate-ping opacity-20 pointer-events-none"
          style={{ background: "#2d5a3d" }}
        />
      )}
    </div>
  );
}
