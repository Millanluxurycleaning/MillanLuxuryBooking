import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuoteModalProps {
  open: boolean;
  onClose: () => void;
}

export function QuoteModal({ open, onClose }: QuoteModalProps) {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    serviceType: "",
    bedrooms: "",
    bathrooms: "",
    notes: "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.serviceType) return;
    setLoading(true);
    try {
      const res = await fetch("/api/quote-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
    } catch {
      toast({ title: "Something went wrong", description: "Please call us at (602) 596-7393", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    onClose();
    setTimeout(() => setSubmitted(false), 300);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {submitted ? (
          <div className="py-10 text-center space-y-4">
            <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif">Quote Request Received!</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Thank you, <strong>{form.name.split(" ")[0]}</strong>! We'll review your details and send a personalized quote to <strong>{form.email}</strong> within a few hours.
            </p>
            <p className="text-sm text-muted-foreground">
              Need it sooner? Call or text us at{" "}
              <a href="tel:6025967393" className="text-primary font-medium hover:underline">
                (602) 596-7393
              </a>
            </p>
            <Button onClick={handleClose} className="mt-2">Close</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif">Get a Free Quote</DialogTitle>
              <p className="text-sm text-muted-foreground pt-1">
                Tell us about your space and we'll send a custom price within a few hours — no commitment needed.
              </p>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="q-name">Your Name *</Label>
                  <Input id="q-name" value={form.name} onChange={set("name")} placeholder="Maria Garcia" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="q-phone">Phone</Label>
                  <Input id="q-phone" value={form.phone} onChange={set("phone")} placeholder="(602) 555-0100" type="tel" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="q-email">Email *</Label>
                <Input id="q-email" value={form.email} onChange={set("email")} placeholder="you@email.com" type="email" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="q-address">Street Address</Label>
                  <Input id="q-address" value={form.address} onChange={set("address")} placeholder="123 Main St" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="q-city">City</Label>
                  <Input id="q-city" value={form.city} onChange={set("city")} placeholder="Phoenix" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Service Type *</Label>
                <Select
                  value={form.serviceType}
                  onValueChange={(v) => setForm((f) => ({ ...f, serviceType: v }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Cleaning</SelectItem>
                    <SelectItem value="deep">Deep Cleaning</SelectItem>
                    <SelectItem value="move-in-out">Move-In / Move-Out</SelectItem>
                    <SelectItem value="recurring-weekly">Recurring — Weekly</SelectItem>
                    <SelectItem value="recurring-biweekly">Recurring — Bi-Weekly</SelectItem>
                    <SelectItem value="recurring-monthly">Recurring — Monthly</SelectItem>
                    <SelectItem value="other">Other / Not Sure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Bedrooms</Label>
                  <Select value={form.bedrooms} onValueChange={(v) => setForm((f) => ({ ...f, bedrooms: v }))}>
                    <SelectTrigger><SelectValue placeholder="# Beds" /></SelectTrigger>
                    <SelectContent>
                      {["Studio", "1", "2", "3", "4", "5+"].map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Bathrooms</Label>
                  <Select value={form.bathrooms} onValueChange={(v) => setForm((f) => ({ ...f, bathrooms: v }))}>
                    <SelectTrigger><SelectValue placeholder="# Baths" /></SelectTrigger>
                    <SelectContent>
                      {["1", "1.5", "2", "2.5", "3", "3+"].map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="q-notes">Anything else we should know?</Label>
                <Textarea
                  id="q-notes"
                  value={form.notes}
                  onChange={set("notes")}
                  placeholder="Pets, special requests, access instructions..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : "Send My Quote Request"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                No spam. We'll only contact you about your quote.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
