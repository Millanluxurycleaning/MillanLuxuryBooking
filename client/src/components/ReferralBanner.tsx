import { useState } from "react";
import { Copy, Check, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

const REFERRAL_LINK = "https://millanluxurycleaning.com";

export function ReferralBanner() {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(REFERRAL_LINK).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div
      className="rounded-2xl overflow-hidden my-10"
      style={{ background: "linear-gradient(135deg, #1a3a2a 0%, #2d5a3d 50%, #1e4030 100%)" }}
    >
      <div className="px-6 py-8 md:px-10 md:py-10 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 border border-white/20">
            <Gift className="w-6 h-6 text-yellow-300" />
          </div>
        </div>

        <h2 className="text-2xl md:text-3xl font-serif font-semibold text-white mb-2">
          Give $20, Get $20
        </h2>
        <p className="text-white/70 max-w-md mx-auto mb-6 text-sm md:text-base">
          Share Millan Luxury Cleaning with a friend. When they book their first service, you both get <strong className="text-yellow-300">$20 off</strong> your next cleaning.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-sm mx-auto">
          <div className="flex-1 rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-white text-sm font-medium truncate w-full text-center">
            {REFERRAL_LINK}
          </div>
          <Button
            onClick={handleCopy}
            size="sm"
            className="shrink-0 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold gap-1.5"
          >
            {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Link</>}
          </Button>
        </div>

        <p className="text-white/40 text-xs mt-4">
          Share via text, WhatsApp, or social media. Discount applied automatically on their first booking.
        </p>
      </div>
    </div>
  );
}
