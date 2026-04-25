import { Resend } from "resend";

function esc(str: string | undefined | null): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSiteUrl(): string {
  return process.env.SITE_URL || "https://millanluxurycleaning.com";
}

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

function getFromAddress(display: string): string {
  const domain = process.env.EMAIL_FROM_DOMAIN || "millanluxurycleaning.com";
  return `${display} <noreply@${domain}>`;
}

function getNotificationEmail(): string {
  return process.env.NOTIFICATION_EMAIL || "info@millanluxurycleaning.com";
}

async function sendWithRetry(
  resend: Resend,
  payload: Parameters<Resend["emails"]["send"]>[0],
  maxRetries = 2,
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { error } = await resend.emails.send(payload);
      if (error) throw new Error(error.message);
      return;
    } catch (err) {
      console.error(`[Email] Attempt ${attempt}/${maxRetries} failed:`, err);
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

// ─── Shared layout wrapper ───────────────────────────────────────────────────

function luxuryLayout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a3a2a 0%,#2d5a3d 60%,#1e4030 100%);border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#d4af37;font-family:Georgia,serif;">Millan Luxury Cleaning</p>
            <h1 style="margin:0;font-size:26px;font-weight:700;color:#ffffff;font-family:Georgia,serif;line-height:1.3;">✦ Crowning Every Space in Sparkle ✦</h1>
            <div style="margin:20px auto 0;width:60px;height:2px;background:linear-gradient(90deg,transparent,#d4af37,transparent);"></div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#1a1a1a;padding:40px;border-left:1px solid #2a2a2a;border-right:1px solid #2a2a2a;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#111;border-radius:0 0 16px 16px;border:1px solid #2a2a2a;border-top:none;padding:28px 40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:13px;color:#888;">
              <a href="tel:6025967393" style="color:#d4af37;text-decoration:none;">(602) 596-7393</a>
              &nbsp;·&nbsp;
              <a href="mailto:info@millanluxurycleaning.com" style="color:#d4af37;text-decoration:none;">info@millanluxurycleaning.com</a>
            </p>
            <p style="margin:0 0 8px;font-size:13px;color:#888;">
              <a href="https://instagram.com/millan_luxury_cleaning" style="color:#d4af37;text-decoration:none;">@millan_luxury_cleaning</a>
            </p>
            <p style="margin:16px 0 0;font-size:12px;color:#555;">
              811 N 3rd St, Phoenix, AZ 85004 &nbsp;·&nbsp;
              <a href="${getSiteUrl()}" style="color:#555;text-decoration:none;">millanluxurycleaning.com</a>
            </p>
            <p style="margin:16px 0 0;font-size:13px;color:#777;font-style:italic;">— The Millan Luxury Cleaning Team 🖤</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:12px 0;border-bottom:1px solid #2a2a2a;font-size:13px;color:#888;width:140px;vertical-align:top;">${label}</td>
    <td style="padding:12px 0;border-bottom:1px solid #2a2a2a;font-size:15px;color:#e8e8e8;vertical-align:top;">${value}</td>
  </tr>`;
}

function sectionHeader(title: string): string {
  return `<p style="margin:0 0 16px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#d4af37;">${title}</p>`;
}

// ─── Contact form notification ────────────────────────────────────────────────

export async function sendContactNotificationEmail(params: {
  name: string;
  email: string;
  service: string;
  message: string;
}): Promise<boolean> {
  const resend = getResend();
  const notifyTo = getNotificationEmail();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured, skipping contact notification");
    return false;
  }

  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#ffffff;">New Contact Message</h2>
    <p style="margin:0 0 32px;font-size:14px;color:#888;">Someone reached out via the website contact form.</p>

    <div style="margin-bottom:32px;">
      ${sectionHeader("Contact Details")}
      <table width="100%" cellpadding="0" cellspacing="0">
        ${detailRow("Name", esc(params.name))}
        ${detailRow("Email", `<a href="mailto:${esc(params.email)}" style="color:#d4af37;">${esc(params.email)}</a>`)}
        ${detailRow("Service", esc(params.service))}
      </table>
    </div>

    <div style="background:#222;border-left:3px solid #d4af37;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:32px;">
      ${sectionHeader("Message")}
      <p style="margin:0;font-size:15px;color:#ccc;line-height:1.7;white-space:pre-wrap;">${esc(params.message)}</p>
    </div>

    <a href="mailto:${esc(params.email)}" style="display:inline-block;padding:13px 28px;background:linear-gradient(90deg,#d4af37,#f0d060);color:#111;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:1px;">
      REPLY TO ${esc(params.name.toUpperCase())}
    </a>
  `;

  try {
    await sendWithRetry(resend, {
      from: getFromAddress("Millan Luxury Cleaning"),
      to: [notifyTo],
      replyTo: params.email,
      subject: `New Contact: ${esc(params.name)} — ${esc(params.service)}`,
      html: luxuryLayout(body),
    });
    console.log(`[Email] Contact notification sent to ${notifyTo}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send contact notification:", error);
    return false;
  }
}

// ─── Booking notification (to admin) ─────────────────────────────────────────

export async function sendBookingNotificationEmail(params: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceName: string;
  startAt: string;
  notes?: string;
  cardOnFile?: boolean;
  serviceAddress?: string;
  serviceCity?: string;
  serviceState?: string;
  serviceZip?: string;
  totalPrice?: number;
  frequency?: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured, skipping booking notification");
    return false;
  }

  const recipients = "info@millanluxurycleaning.com";
  const date = new Date(params.startAt);
  const formatted = date.toLocaleString("en-US", {
    weekday: "long", month: "long", day: "numeric",
    year: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "America/Phoenix",
  });

  const addressStr = params.serviceAddress
    ? `${esc(params.serviceAddress)}, ${esc(params.serviceCity)}, ${esc(params.serviceState)} ${esc(params.serviceZip)}`
    : "Not provided";

  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#ffffff;">New Booking ✦</h2>
    <p style="margin:0 0 32px;font-size:14px;color:#888;">A new booking was just submitted on your website.</p>

    <div style="margin-bottom:32px;">
      ${sectionHeader("Customer")}
      <table width="100%" cellpadding="0" cellspacing="0">
        ${detailRow("Name", `<strong style="color:#fff;">${esc(params.customerName)}</strong>`)}
        ${detailRow("Email", `<a href="mailto:${esc(params.customerEmail)}" style="color:#d4af37;">${esc(params.customerEmail)}</a>`)}
        ${params.customerPhone ? detailRow("Phone", `<a href="tel:${esc(params.customerPhone)}" style="color:#d4af37;">${esc(params.customerPhone)}</a>`) : ""}
      </table>
    </div>

    <div style="margin-bottom:32px;">
      ${sectionHeader("Booking Details")}
      <table width="100%" cellpadding="0" cellspacing="0">
        ${detailRow("Service", esc(params.serviceName))}
        ${params.frequency ? detailRow("Frequency", esc(params.frequency === "one-time" ? "One-Time" : params.frequency === "bi-weekly" ? "Bi-Weekly" : params.frequency.charAt(0).toUpperCase() + params.frequency.slice(1))) : ""}
        ${detailRow("Date & Time", `<strong style="color:#d4af37;">${formatted}</strong>`)}
        ${detailRow("Location", addressStr)}
        ${params.totalPrice != null ? detailRow("1st Visit", `<strong style="color:#d4af37;">$${params.totalPrice.toFixed(2)}</strong>`) : ""}
        ${(() => {
          const discounts: Record<string, number> = { weekly: 20, "bi-weekly": 15, monthly: 10 };
          const pct = params.frequency ? discounts[params.frequency] : 0;
          return pct && params.totalPrice != null
            ? detailRow("Recurring", `<span style="color:#4ade80;">$${(params.totalPrice * (1 - pct / 100)).toFixed(2)} (${pct}% off)</span>`)
            : "";
        })()}
        ${detailRow("Card", params.cardOnFile
          ? `<span style="color:#4ade80;">✓ On file</span>`
          : `<span style="color:#f87171;">✗ Not provided</span>`)}
      </table>
    </div>

    ${params.notes ? `
    <div style="background:#222;border-left:3px solid #d4af37;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:32px;">
      ${sectionHeader("Customer Notes")}
      <p style="margin:0;font-size:15px;color:#ccc;line-height:1.7;white-space:pre-wrap;">${esc(params.notes)}</p>
    </div>` : ""}
  `;

  try {
    await sendWithRetry(resend, {
      from: getFromAddress("Millan Luxury Cleaning"),
      to: [recipients],
      replyTo: params.customerEmail,
      subject: `New Booking: ${esc(params.customerName)} — ${esc(params.serviceName)}`,
      html: luxuryLayout(body),
    });
    console.log(`[Email] Booking notification sent to ${recipients}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send booking notification:", error);
    return false;
  }
}

// ─── Customer booking confirmation ────────────────────────────────────────────

export async function sendBookingConfirmationEmail(params: {
  bookingId: number;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  startAt: string;
  cardOnFile?: boolean;
  serviceAddress?: string;
  serviceCity?: string;
  serviceState?: string;
  serviceZip?: string;
  totalPrice?: number;
  frequency?: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend || !params.customerEmail) {
    console.warn("[Email] RESEND_API_KEY not configured or no customer email, skipping booking confirmation");
    return false;
  }

  const date = new Date(params.startAt);
  const formatted = date.toLocaleString("en-US", {
    weekday: "long", month: "long", day: "numeric",
    year: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: "America/Phoenix",
  });

  const firstName = esc(params.customerName.split(" ")[0]);
  const addressStr = params.serviceAddress
    ? `${esc(params.serviceAddress)}, ${esc(params.serviceCity)}, ${esc(params.serviceState)} ${esc(params.serviceZip)}`
    : "";

  const body = `
    <h2 style="margin:0 0 8px;font-size:26px;color:#ffffff;">Thank you for booking with<br/>Millan Luxury Cleaning! ✨</h2>
    <p style="margin:0 0 32px;font-size:15px;color:#aaa;line-height:1.6;">
      We've received your request and will be in touch shortly to confirm your appointment.
    </p>

    <div style="background:#222;border-radius:10px;padding:8px 24px 4px;margin-bottom:32px;border:1px solid #333;">
      <p style="margin:12px 0 4px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#d4af37;">Booking Reference</p>
      <p style="margin:0 0 12px;font-size:28px;font-weight:700;color:#d4af37;">#${params.bookingId}</p>
    </div>

    <div style="margin-bottom:32px;">
      ${sectionHeader("Booking Details")}
      <table width="100%" cellpadding="0" cellspacing="0">
        ${detailRow("Service", `<strong style="color:#fff;">${esc(params.serviceName)}</strong>`)}
        ${params.frequency ? detailRow("Frequency", esc(params.frequency === "one-time" ? "One-Time" : params.frequency === "bi-weekly" ? "Bi-Weekly" : params.frequency.charAt(0).toUpperCase() + params.frequency.slice(1))) : ""}
        ${detailRow("Date & Time", `<strong style="color:#d4af37;">${formatted}</strong>`)}
        ${addressStr ? detailRow("Address", addressStr) : ""}
        ${params.totalPrice != null ? detailRow("1st Visit Total", `<strong style="color:#d4af37;font-size:17px;">$${params.totalPrice.toFixed(2)}</strong>`) : ""}
        ${(() => {
          const discounts: Record<string, number> = { weekly: 20, "bi-weekly": 15, monthly: 10 };
          const pct = params.frequency ? discounts[params.frequency] : 0;
          return pct && params.totalPrice != null
            ? detailRow("Recurring Rate", `<span style="color:#4ade80;">$${(params.totalPrice * (1 - pct / 100)).toFixed(2)} (${pct}% off from 2nd visit)</span>`)
            : "";
        })()}
      </table>
    </div>

    ${params.cardOnFile ? `
    <div style="background:#1a2e1a;border:1px solid #2d5a3d;border-radius:8px;padding:16px 20px;margin-bottom:32px;">
      <p style="margin:0;font-size:14px;color:#86efac;line-height:1.6;">
        ✓ Your card is securely on file but <strong>has not been charged</strong>. It is held in accordance with our cancellation policy.
      </p>
    </div>` : ""}

    <div style="background:#222;border-left:3px solid #d4af37;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:32px;">
      ${sectionHeader("Cancellation Policy")}
      <p style="margin:0;font-size:14px;color:#aaa;line-height:1.7;">
        Cancellations within <strong style="color:#e8e8e8;">24 hours</strong> incur a <strong style="color:#e8e8e8;">25% fee</strong>.
        No-shows or same-day cancellations incur a <strong style="color:#e8e8e8;">50% fee</strong>.
      </p>
    </div>

    <div style="text-align:center;margin-bottom:8px;">
      <a href="${getSiteUrl()}" style="display:inline-block;padding:14px 36px;background:linear-gradient(90deg,#d4af37,#f0d060);color:#111;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:1px;">
        VISIT MILLAN LUXURY
      </a>
    </div>
  `;

  try {
    await sendWithRetry(resend, {
      from: getFromAddress("Millan Luxury Cleaning"),
      to: [params.customerEmail],
      subject: `Booking Confirmed — ${esc(params.serviceName)}`,
      html: luxuryLayout(body),
    });
    console.log(`[Email] Booking confirmation sent to ${params.customerEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send booking confirmation:", error);
    return false;
  }
}

// ─── Customer order confirmation ──────────────────────────────────────────────

export async function sendOrderConfirmationEmail(params: {
  orderId: number;
  customerName: string;
  customerEmail: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  items: { name: string; quantity: number; price: number }[];
  shippingAddress?: { addressLine1?: string; city?: string; state?: string; postalCode?: string };
  isPickup?: boolean;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend || !params.customerEmail) {
    console.warn("[Email] RESEND_API_KEY not configured or no customer email, skipping order confirmation");
    return false;
  }

  const firstName = esc(params.customerName.split(" ")[0]);
  const itemRows = params.items.map((item) =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;color:#ccc;">${esc(item.name)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;color:#888;text-align:center;">×${item.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;color:#e8e8e8;text-align:right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>`
  ).join("");

  const shipAddr = params.shippingAddress;
  const hasShipping = !params.isPickup && shipAddr?.addressLine1;
  const fulfillmentNote = hasShipping
    ? "We'll notify you when your order has shipped."
    : "We'll notify you when your order is ready for pick-up at <strong style='color:#e8e8e8;'>811 N 3rd St, Phoenix, AZ 85004</strong>.";

  const body = `
    <h2 style="margin:0 0 8px;font-size:24px;color:#ffffff;">Thank You, ${firstName}! ✨</h2>
    <p style="margin:0 0 32px;font-size:15px;color:#aaa;">Your order has been received and is being prepared.</p>

    <div style="background:#222;border-radius:10px;padding:8px 24px 4px;margin-bottom:32px;border:1px solid #333;">
      <p style="margin:12px 0 4px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#d4af37;">Order Number</p>
      <p style="margin:0 0 12px;font-size:28px;font-weight:700;color:#d4af37;">#${params.orderId}</p>
    </div>

    ${hasShipping ? `
    <div style="margin-bottom:24px;">
      ${sectionHeader("Shipping To")}
      <p style="margin:0;font-size:15px;color:#ccc;">${esc(shipAddr!.addressLine1)}<br/>${esc(shipAddr!.city)}, ${esc(shipAddr!.state)} ${esc(shipAddr!.postalCode)}</p>
    </div>` : ""}

    <div style="margin-bottom:32px;">
      ${sectionHeader("Order Summary")}
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <th style="padding:8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#666;text-align:left;border-bottom:1px solid #333;">Item</th>
          <th style="padding:8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#666;text-align:center;border-bottom:1px solid #333;">Qty</th>
          <th style="padding:8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#666;text-align:right;border-bottom:1px solid #333;">Price</th>
        </tr>
        ${itemRows}
        <tr>
          <td colspan="2" style="padding:10px 0;font-size:14px;color:#888;">Shipping</td>
          <td style="padding:10px 0;font-size:14px;color:#e8e8e8;text-align:right;">$${params.shipping.toFixed(2)}</td>
        </tr>
        <tr style="border-top:1px solid #d4af37;">
          <td colspan="2" style="padding:14px 0;font-size:17px;font-weight:700;color:#fff;">Total</td>
          <td style="padding:14px 0;font-size:17px;font-weight:700;color:#d4af37;text-align:right;">$${params.total.toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div style="background:#222;border-left:3px solid #d4af37;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:32px;">
      <p style="margin:0;font-size:14px;color:#aaa;line-height:1.7;">${fulfillmentNote}</p>
    </div>

    <div style="text-align:center;">
      <a href="${getSiteUrl()}" style="display:inline-block;padding:14px 36px;background:linear-gradient(90deg,#d4af37,#f0d060);color:#111;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:1px;">
        VISIT MILLAN LUXURY
      </a>
    </div>
  `;

  try {
    await sendWithRetry(resend, {
      from: getFromAddress("Millan Luxury Cleaning"),
      to: [params.customerEmail],
      subject: `Order Confirmed — #${params.orderId}`,
      html: luxuryLayout(body),
    });
    console.log(`[Email] Order confirmation sent to ${params.customerEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send order confirmation:", error);
    return false;
  }
}

// ─── Order notification (to admin) ───────────────────────────────────────────

export async function sendOrderNotificationEmail(params: {
  orderId: number;
  customerName?: string;
  customerEmail: string;
  customerPhone?: string;
  total: number;
  shipping?: number;
  shippingAddress?: { addressLine1?: string; city?: string; state?: string; postalCode?: string };
  items: { name: string; quantity: number; price: number }[];
}): Promise<boolean> {
  const resend = getResend();
  const notifyTo = getNotificationEmail();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured, skipping order notification");
    return false;
  }

  const itemRows = params.items.map((item) =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;color:#ccc;">${esc(item.name)}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;color:#888;text-align:center;">×${item.quantity}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;font-size:14px;color:#e8e8e8;text-align:right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>`
  ).join("");

  const shipAddr = params.shippingAddress;

  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#ffffff;">New Order #${params.orderId} ✦</h2>
    <p style="margin:0 0 32px;font-size:14px;color:#888;">A new order was just placed on your website.</p>

    <div style="margin-bottom:32px;">
      ${sectionHeader("Customer")}
      <table width="100%" cellpadding="0" cellspacing="0">
        ${detailRow("Name", `<strong style="color:#fff;">${esc(params.customerName) || "—"}</strong>`)}
        ${detailRow("Email", `<a href="mailto:${esc(params.customerEmail)}" style="color:#d4af37;">${esc(params.customerEmail)}</a>`)}
        ${params.customerPhone ? detailRow("Phone", `<a href="tel:${esc(params.customerPhone)}" style="color:#d4af37;">${esc(params.customerPhone)}</a>`) : ""}
        ${shipAddr?.addressLine1 ? detailRow("Ship To", `${esc(shipAddr.addressLine1)}, ${esc(shipAddr.city)} ${esc(shipAddr.state)} ${esc(shipAddr.postalCode)}`) : ""}
      </table>
    </div>

    <div style="margin-bottom:32px;">
      ${sectionHeader("Items")}
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <th style="padding:8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#666;text-align:left;border-bottom:1px solid #333;">Item</th>
          <th style="padding:8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#666;text-align:center;border-bottom:1px solid #333;">Qty</th>
          <th style="padding:8px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#666;text-align:right;border-bottom:1px solid #333;">Price</th>
        </tr>
        ${itemRows}
        ${params.shipping ? `
        <tr>
          <td colspan="2" style="padding:10px 0;font-size:14px;color:#888;">Shipping</td>
          <td style="padding:10px 0;font-size:14px;color:#e8e8e8;text-align:right;">$${params.shipping.toFixed(2)}</td>
        </tr>` : ""}
        <tr style="border-top:1px solid #d4af37;">
          <td colspan="2" style="padding:14px 0;font-size:17px;font-weight:700;color:#fff;">Total</td>
          <td style="padding:14px 0;font-size:17px;font-weight:700;color:#d4af37;text-align:right;">$${params.total.toFixed(2)}</td>
        </tr>
      </table>
    </div>
  `;

  try {
    await sendWithRetry(resend, {
      from: getFromAddress("Millan Luxury Cleaning"),
      to: [notifyTo],
      replyTo: params.customerEmail,
      subject: `New Order #${params.orderId} — $${params.total.toFixed(2)}`,
      html: luxuryLayout(body),
    });
    console.log(`[Email] Order notification sent to ${notifyTo}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send order notification:", error);
    return false;
  }
}

// ─── Partner emails ───────────────────────────────────────────────────────────

export async function sendPartnerApprovalEmail(params: {
  to: string;
  brandName: string;
  slug: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const vanityUrl = `${getSiteUrl()}/with/${params.slug}`;
  const loginUrl = `${getSiteUrl()}/partner/login`;

  const body = `
    <h2 style="margin:0 0 8px;font-size:24px;color:#ffffff;">Welcome, ${esc(params.brandName)}! ✦</h2>
    <p style="margin:0 0 32px;font-size:15px;color:#aaa;line-height:1.6;">
      Your application to the Millan Luxury Partner Program has been approved. We're thrilled to have you.
    </p>

    <div style="background:#222;border-left:3px solid #d4af37;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:32px;">
      ${sectionHeader("Your Partner Link")}
      <a href="${vanityUrl}" style="font-size:15px;color:#d4af37;word-break:break-all;">${vanityUrl}</a>
      <p style="margin:12px 0 0;font-size:14px;color:#888;line-height:1.6;">
        Share this link with your audience. You earn a commission on every booking made through it.
      </p>
    </div>

    <div style="text-align:center;">
      <a href="${loginUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(90deg,#d4af37,#f0d060);color:#111;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:1px;">
        SIGN IN TO DASHBOARD
      </a>
    </div>
  `;

  try {
    await sendWithRetry(resend, {
      from: getFromAddress("Millan Luxury Cleaning"),
      to: [params.to],
      subject: "Welcome to the Millan Luxury Partner Program",
      html: luxuryLayout(body),
    });
    return true;
  } catch (error) {
    console.error("[CRITICAL] Failed to send partner approval email:", error);
    return false;
  }
}

export async function sendPartnerDisabledEmail(params: {
  to: string;
  brandName: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const body = `
    <h2 style="margin:0 0 8px;font-size:24px;color:#ffffff;">Account Update</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#aaa;line-height:1.6;">Dear ${esc(params.brandName)},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#aaa;line-height:1.6;">
      Your partner account with Millan Luxury has been deactivated. If you believe this is an error or would like more information, please reach out to us at
      <a href="mailto:info@millanluxurycleaning.com" style="color:#d4af37;">info@millanluxurycleaning.com</a>.
    </p>
  `;

  try {
    await sendWithRetry(resend, {
      from: getFromAddress("Millan Luxury Cleaning"),
      to: [params.to],
      subject: "Millan Luxury Partner Account Update",
      html: luxuryLayout(body),
    });
    return true;
  } catch (error) {
    console.error("[CRITICAL] Failed to send partner disabled email:", error);
    return false;
  }
}

export async function sendPayoutNotificationEmail(params: {
  to: string;
  brandName: string;
  amount: number;
  periodStart: string;
  periodEnd: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const body = `
    <h2 style="margin:0 0 8px;font-size:24px;color:#ffffff;">Payout Notification ✦</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#aaa;">Dear ${esc(params.brandName)},</p>

    <div style="background:#222;border-radius:10px;padding:24px;margin-bottom:32px;border:1px solid #333;text-align:center;">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#d4af37;">Amount Processed</p>
      <p style="margin:0;font-size:36px;font-weight:700;color:#d4af37;">$${params.amount.toFixed(2)}</p>
      <p style="margin:8px 0 0;font-size:13px;color:#888;">${params.periodStart} — ${params.periodEnd}</p>
    </div>

    <div style="text-align:center;">
      <a href="${getSiteUrl()}/partner/dashboard" style="display:inline-block;padding:14px 36px;background:linear-gradient(90deg,#d4af37,#f0d060);color:#111;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:1px;">
        VIEW DASHBOARD
      </a>
    </div>
  `;

  try {
    await sendWithRetry(resend, {
      from: getFromAddress("Millan Luxury Cleaning"),
      to: [params.to],
      subject: "Millan Luxury Partner Payout Notification",
      html: luxuryLayout(body),
    });
    return true;
  } catch (error) {
    console.error("[CRITICAL] Failed to send payout notification email:", error);
    return false;
  }
}

export async function sendMonthlyStatementEmail(params: {
  to: string;
  brandName: string;
  month: string;
  totalRevenue: number;
  totalCommission: number;
  conversions: number;
  outstandingBalance: number;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;

  const body = `
    <h2 style="margin:0 0 8px;font-size:24px;color:#ffffff;">Monthly Statement</h2>
    <p style="margin:0 0 32px;font-size:15px;color:#aaa;">
      Dear ${esc(params.brandName)}, here is your partner summary for <strong style="color:#d4af37;">${esc(params.month)}</strong>:
    </p>

    <div style="margin-bottom:32px;">
      ${sectionHeader("Performance")}
      <table width="100%" cellpadding="0" cellspacing="0">
        ${detailRow("Conversions", `<strong style="color:#fff;">${params.conversions}</strong>`)}
        ${detailRow("Attributed Revenue", `<strong style="color:#fff;">$${params.totalRevenue.toFixed(2)}</strong>`)}
        ${detailRow("Commission Earned", `<strong style="color:#4ade80;">$${params.totalCommission.toFixed(2)}</strong>`)}
        ${detailRow("Outstanding Balance", `<strong style="color:#d4af37;">$${params.outstandingBalance.toFixed(2)}</strong>`)}
      </table>
    </div>

    <div style="text-align:center;">
      <a href="${getSiteUrl()}/partner/dashboard" style="display:inline-block;padding:14px 36px;background:linear-gradient(90deg,#d4af37,#f0d060);color:#111;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:1px;">
        VIEW FULL DASHBOARD
      </a>
    </div>
  `;

  try {
    await sendWithRetry(resend, {
      from: getFromAddress("Millan Luxury Cleaning"),
      to: [params.to],
      subject: `Millan Luxury Partner Statement — ${params.month}`,
      html: luxuryLayout(body),
    });
    return true;
  } catch (error) {
    console.error("[CRITICAL] Failed to send monthly statement email:", error);
    return false;
  }
}

// ─── Quote request (lead) ─────────────────────────────────────────────────────

export async function sendQuoteRequestEmail(params: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  serviceType: string;
  bedrooms?: string;
  bathrooms?: string;
  notes?: string;
}): Promise<boolean> {
  const resend = getResend();
  const notifyTo = getNotificationEmail();
  if (!resend) {
    console.warn("[Quote Email] RESEND_API_KEY not set — skipping");
    return false;
  }
  console.log(`[Quote Email] Sending to admin: ${notifyTo}, client: ${params.email}`);

  const serviceLabels: Record<string, string> = {
    standard: "Standard Cleaning",
    deep: "Deep Cleaning",
    "move-in-out": "Move-In / Move-Out",
    "recurring-weekly": "Recurring — Weekly",
    "recurring-biweekly": "Recurring — Bi-Weekly",
    "recurring-monthly": "Recurring — Monthly",
    other: "Other / Not Sure",
  };
  const serviceLabel = serviceLabels[params.serviceType] ?? esc(params.serviceType);
  const location = [params.address, params.city].filter(Boolean).join(", ");

  const adminBody = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#ffffff;">New Quote Request</h2>
    <p style="margin:0 0 32px;font-size:14px;color:#888;">A potential client requested a free quote from the website.</p>

    <div style="margin-bottom:32px;">
      ${sectionHeader("Contact Details")}
      <table width="100%" cellpadding="0" cellspacing="0">
        ${detailRow("Name", esc(params.name))}
        ${detailRow("Email", `<a href="mailto:${esc(params.email)}" style="color:#d4af37;">${esc(params.email)}</a>`)}
        ${params.phone ? detailRow("Phone", `<a href="tel:${esc(params.phone.replace(/\D/g, ""))}" style="color:#d4af37;">${esc(params.phone)}</a>`) : ""}
        ${location ? detailRow("Location", esc(location)) : ""}
      </table>
    </div>

    <div style="margin-bottom:32px;">
      ${sectionHeader("Service Details")}
      <table width="100%" cellpadding="0" cellspacing="0">
        ${detailRow("Service Type", serviceLabel)}
        ${params.bedrooms ? detailRow("Bedrooms", esc(params.bedrooms)) : ""}
        ${params.bathrooms ? detailRow("Bathrooms", esc(params.bathrooms)) : ""}
      </table>
    </div>

    ${params.notes ? `
    <div style="background:#222;border-left:3px solid #d4af37;border-radius:0 8px 8px 0;padding:20px 24px;margin-bottom:32px;">
      ${sectionHeader("Additional Notes")}
      <p style="margin:0;font-size:15px;color:#ccc;line-height:1.7;white-space:pre-wrap;">${esc(params.notes)}</p>
    </div>` : ""}

    <a href="mailto:${esc(params.email)}" style="display:inline-block;padding:13px 28px;background:linear-gradient(90deg,#d4af37,#f0d060);color:#111;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:1px;">
      REPLY WITH QUOTE
    </a>
  `;

  const clientBody = `
    <h2 style="margin:0 0 4px;font-size:22px;color:#ffffff;">We received your quote request!</h2>
    <p style="margin:0 0 32px;font-size:14px;color:#888;">Here's a summary of what you submitted.</p>

    <div style="margin-bottom:32px;">
      ${sectionHeader("Your Request")}
      <table width="100%" cellpadding="0" cellspacing="0">
        ${detailRow("Service", serviceLabel)}
        ${location ? detailRow("Location", esc(location)) : ""}
        ${params.bedrooms ? detailRow("Bedrooms", esc(params.bedrooms)) : ""}
        ${params.bathrooms ? detailRow("Bathrooms", esc(params.bathrooms)) : ""}
      </table>
    </div>

    <div style="background:#222;border-radius:8px;padding:20px 24px;margin-bottom:32px;text-align:center;">
      <p style="margin:0 0 8px;font-size:16px;color:#fff;">We'll send your personalized quote within a few hours.</p>
      <p style="margin:0;font-size:14px;color:#888;">Need it sooner? Call or text us:</p>
      <a href="tel:6025967393" style="display:inline-block;margin-top:12px;font-size:20px;color:#d4af37;text-decoration:none;font-weight:700;">(602) 596-7393</a>
    </div>

    <p style="font-size:13px;color:#666;text-align:center;">Ready to skip the quote and book directly?</p>
    <div style="text-align:center;margin-top:12px;">
      <a href="${getSiteUrl()}/book" style="display:inline-block;padding:13px 28px;background:linear-gradient(90deg,#d4af37,#f0d060);color:#111;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:1px;">
        BOOK ONLINE NOW
      </a>
    </div>
  `;

  try {
    await Promise.all([
      sendWithRetry(resend, {
        from: getFromAddress("Millan Luxury Cleaning"),
        to: [notifyTo],
        replyTo: params.email,
        subject: `Quote Request: ${esc(params.name)} — ${serviceLabel}`,
        html: luxuryLayout(adminBody),
      }),
      sendWithRetry(resend, {
        from: getFromAddress("Millan Luxury Cleaning"),
        to: [params.email],
        subject: "Your quote request — Millan Luxury Cleaning",
        html: luxuryLayout(clientBody),
      }),
    ]);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send quote request emails:", error);
    return false;
  }
}
