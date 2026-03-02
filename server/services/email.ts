import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/** HTML-escape user-supplied strings to prevent XSS in email templates */
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

// --- Google SMTP (all emails) ---

let smtpTransport: Transporter | null = null;

function getSmtpTransport(): Transporter | null {
  if (smtpTransport) return smtpTransport;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return null;

  smtpTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: { user, pass },
  });
  return smtpTransport;
}

function getNotificationEmail(): string {
  return process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER || "";
}

// --- Retry wrapper for reliable email delivery ---

async function sendWithRetry(
  transport: Transporter,
  mailOptions: object,
  maxRetries = 2,
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await transport.sendMail(mailOptions);
      return;
    } catch (err) {
      console.error(`[Email] Attempt ${attempt}/${maxRetries} failed:`, err);
      if (attempt === maxRetries) throw err;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

// --- Contact form notification ---

export async function sendContactNotificationEmail(params: {
  name: string;
  email: string;
  service: string;
  message: string;
}): Promise<boolean> {
  const transport = getSmtpTransport();
  const notifyTo = getNotificationEmail();

  if (!transport || !notifyTo) {
    console.warn("[Email] SMTP not configured, skipping contact notification");
    return false;
  }

  try {
    await transport.sendMail({
      from: `"Millan Luxury Website" <${process.env.SMTP_USER}>`,
      to: notifyTo,
      replyTo: params.email,
      subject: `New Contact: ${esc(params.name)} — ${esc(params.service)}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <h1 style="font-size: 24px; color: #b8860b; margin-bottom: 24px;">New Contact Form Submission</h1>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888; width: 120px;">Name</td>
              <td style="padding: 12px 0; font-size: 16px; font-weight: bold;">${esc(params.name)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888;">Email</td>
              <td style="padding: 12px 0; font-size: 16px;">
                <a href="mailto:${esc(params.email)}" style="color: #b8860b;">${esc(params.email)}</a>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888;">Service</td>
              <td style="padding: 12px 0; font-size: 16px;">${esc(params.service)}</td>
            </tr>
          </table>
          <div style="background: #f9f9f6; border-left: 4px solid #b8860b; padding: 16px 20px; margin-bottom: 24px;">
            <p style="font-size: 14px; color: #888; margin: 0 0 8px 0;">Message</p>
            <p style="font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${esc(params.message)}</p>
          </div>
          <a href="mailto:${esc(params.email)}" style="display: inline-block; padding: 12px 24px; background: #b8860b; color: #fff; text-decoration: none; border-radius: 6px; font-size: 16px;">
            Reply to ${esc(params.name)}
          </a>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="font-size: 12px; color: #888;">
            This message was sent from the contact form at millanluxurycleaning.com
          </p>
        </div>
      `,
    });
    console.log(`[Email] Contact notification sent to ${notifyTo}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send contact notification:", error);
    return false;
  }
}

// --- Booking notification ---

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
}): Promise<boolean> {
  const transport = getSmtpTransport();

  if (!transport) {
    console.warn("[Email] SMTP not configured, skipping booking notification");
    return false;
  }

  const recipients = "ivan@millanluxurycleaning.com";

  const date = new Date(params.startAt);
  const formatted = date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Phoenix",
  });

  const cardRow = params.cardOnFile
    ? `<tr style="border-bottom: 1px solid #e5e5e5;">
        <td style="padding: 12px 0; font-size: 14px; color: #888;">Card</td>
        <td style="padding: 12px 0; font-size: 16px; color: #16a34a; font-weight: bold;">On file for cancellation protection</td>
      </tr>`
    : `<tr style="border-bottom: 1px solid #e5e5e5;">
        <td style="padding: 12px 0; font-size: 14px; color: #888;">Card</td>
        <td style="padding: 12px 0; font-size: 16px; color: #dc2626;">Not provided</td>
      </tr>`;

  const addressRow = params.serviceAddress
    ? `<tr style="border-bottom: 1px solid #e5e5e5;">
        <td style="padding: 12px 0; font-size: 14px; color: #888;">Location</td>
        <td style="padding: 12px 0; font-size: 16px; font-weight: bold; color: #b8860b;">${esc(params.serviceAddress)}, ${esc(params.serviceCity)}, ${esc(params.serviceState)} ${esc(params.serviceZip)}</td>
      </tr>`
    : "";

  try {
    await sendWithRetry(transport, {
      from: `"Millan Luxury Website" <${process.env.SMTP_USER}>`,
      to: recipients,
      replyTo: params.customerEmail,
      subject: `New Booking: ${esc(params.customerName)} — ${esc(params.serviceName)}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <h1 style="font-size: 24px; color: #b8860b; margin-bottom: 24px;">New Booking</h1>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888; width: 120px;">Customer</td>
              <td style="padding: 12px 0; font-size: 16px; font-weight: bold;">${esc(params.customerName)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888;">Email</td>
              <td style="padding: 12px 0; font-size: 16px;">
                <a href="mailto:${esc(params.customerEmail)}" style="color: #b8860b;">${esc(params.customerEmail)}</a>
              </td>
            </tr>
            ${params.customerPhone ? `
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888;">Phone</td>
              <td style="padding: 12px 0; font-size: 16px;">
                <a href="tel:${esc(params.customerPhone)}" style="color: #b8860b;">${esc(params.customerPhone)}</a>
              </td>
            </tr>` : ""}
            ${addressRow}
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888;">Service</td>
              <td style="padding: 12px 0; font-size: 16px;">${esc(params.serviceName)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888;">Date</td>
              <td style="padding: 12px 0; font-size: 16px; font-weight: bold;">${formatted}</td>
            </tr>
            ${cardRow}
          </table>
          ${params.notes ? `
          <div style="background: #f9f9f6; border-left: 4px solid #b8860b; padding: 16px 20px; margin-bottom: 24px;">
            <p style="font-size: 14px; color: #888; margin: 0 0 8px 0;">Customer Notes</p>
            <p style="font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${esc(params.notes)}</p>
          </div>` : ""}
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="font-size: 12px; color: #888;">
            This booking was created at millanluxurycleaning.com
          </p>
        </div>
      `,
    });
    console.log(`[Email] Booking notification sent to ${recipients}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send booking notification:", error);
    return false;
  }
}

// --- Customer booking confirmation ---

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
}): Promise<boolean> {
  const transport = getSmtpTransport();

  if (!transport || !params.customerEmail) {
    console.warn("[Email] SMTP not configured or no customer email, skipping booking confirmation");
    return false;
  }

  const date = new Date(params.startAt);
  const formatted = date.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Phoenix",
  });

  const firstName = esc(params.customerName.split(" ")[0]);

  const addressRow = params.serviceAddress
    ? `<tr style="border-bottom: 1px solid #e5e5e5;">
        <td style="padding: 12px 0; font-size: 14px; color: #888;">Location</td>
        <td style="padding: 12px 0; font-size: 16px; font-weight: bold;">${esc(params.serviceAddress)}, ${esc(params.serviceCity)}, ${esc(params.serviceState)} ${esc(params.serviceZip)}</td>
      </tr>`
    : "";

  try {
    await sendWithRetry(transport, {
      from: `"Millan Luxury" <${process.env.SMTP_USER}>`,
      to: params.customerEmail,
      subject: `Booking Confirmed — ${esc(params.serviceName)}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 28px; color: #b8860b; margin: 0 0 8px;">You're All Set, ${firstName}!</h1>
            <p style="font-size: 16px; color: #666; margin: 0;">Your booking has been confirmed.</p>
          </div>

          <div style="background: #f9f9f6; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="font-size: 14px; color: #888; margin: 0 0 4px;">Booking Reference</p>
            <p style="font-size: 20px; font-weight: bold; color: #b8860b; margin: 0;">#${params.bookingId}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888; width: 100px;">Service</td>
              <td style="padding: 12px 0; font-size: 16px; font-weight: bold;">${esc(params.serviceName)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888;">Date &amp; Time</td>
              <td style="padding: 12px 0; font-size: 16px; font-weight: bold;">${formatted}</td>
            </tr>
            ${addressRow}
          </table>

          ${params.cardOnFile ? `
          <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px 20px; margin-bottom: 24px;">
            <p style="font-size: 15px; line-height: 1.6; margin: 0; color: #166534;">
              Your card is securely on file but <strong>has not been charged</strong>. It is held in accordance with our cancellation policy.
            </p>
          </div>` : ""}

          <div style="background: #f9f9f6; border-left: 4px solid #b8860b; padding: 16px 20px; margin-bottom: 24px;">
            <p style="font-size: 14px; color: #888; margin: 0 0 8px;">Cancellation Policy</p>
            <p style="font-size: 15px; line-height: 1.6; margin: 0;">
              Cancellations within <strong>24 hours</strong> of your scheduled service will incur a <strong>25% fee</strong> of the total service cost.
              Cancellations within <strong>a few hours</strong> of service or no-shows will incur a <strong>50% fee</strong>.
            </p>
          </div>

          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            We look forward to seeing you! If you have any questions, feel free to contact us at
            <a href="tel:6025967393" style="color: #b8860b;">(602) 596-7393</a>.
          </p>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://millanluxurycleaning.com" style="display: inline-block; padding: 12px 32px; background: #b8860b; color: #fff; text-decoration: none; border-radius: 6px; font-size: 16px;">
              Visit Millan Luxury
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="font-size: 12px; color: #888; text-align: center; line-height: 1.5;">
            Millan Luxury Cleaning<br/>
            <a href="https://millanluxurycleaning.com" style="color: #b8860b;">millanluxurycleaning.com</a>
          </p>
        </div>
      `,
    });
    console.log(`[Email] Booking confirmation sent to ${params.customerEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send booking confirmation:", error);
    return false;
  }
}

// --- Customer order confirmation ---

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
  const transport = getSmtpTransport();

  if (!transport || !params.customerEmail) {
    console.warn("[Email] SMTP not configured or no customer email, skipping confirmation");
    return false;
  }

  const itemRows = params.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #e5e5e5;">
        <td style="padding: 10px 0; font-size: 14px;">${esc(item.name)}</td>
        <td style="padding: 10px 0; font-size: 14px; text-align: center;">x${item.quantity}</td>
        <td style="padding: 10px 0; font-size: 14px; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const shipAddr = params.shippingAddress;
  const hasShipping = !params.isPickup && shipAddr?.addressLine1;
  const fulfillmentMessage = hasShipping
    ? "We'll send you a notification when your order has been shipped."
    : "We'll notify you when your order is ready for pick-up.";

  const shipAddrBlock = hasShipping
    ? `
      <div style="margin-bottom: 24px;">
        <p style="font-size: 14px; color: #888; margin: 0 0 4px;">Shipping to</p>
        <p style="font-size: 15px; margin: 0;">${esc(shipAddr!.addressLine1)}</p>
        <p style="font-size: 15px; margin: 0;">${esc(shipAddr!.city)}, ${esc(shipAddr!.state)} ${esc(shipAddr!.postalCode)}</p>
      </div>`
    : "";

  try {
    await sendWithRetry(transport, {
      from: `"Millan Luxury" <${process.env.SMTP_USER}>`,
      to: params.customerEmail,
      subject: `Order Confirmed — #${params.orderId}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 28px; color: #b8860b; margin: 0 0 8px;">Thank You, ${esc(params.customerName.split(" ")[0])}!</h1>
            <p style="font-size: 16px; color: #666; margin: 0;">Your order has been received and is being prepared.</p>
          </div>

          <div style="background: #f9f9f6; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <p style="font-size: 14px; color: #888; margin: 0 0 4px;">Order Number</p>
            <p style="font-size: 20px; font-weight: bold; color: #b8860b; margin: 0;">#${params.orderId}</p>
          </div>

          ${shipAddrBlock}

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr style="border-bottom: 2px solid #1a1a1a;">
              <th style="padding: 8px 0; font-size: 12px; text-transform: uppercase; text-align: left;">Item</th>
              <th style="padding: 8px 0; font-size: 12px; text-transform: uppercase; text-align: center;">Qty</th>
              <th style="padding: 8px 0; font-size: 12px; text-transform: uppercase; text-align: right;">Price</th>
            </tr>
            ${itemRows}
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #666;">Subtotal</td>
              <td style="padding: 6px 0; font-size: 14px; text-align: right;">$${params.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #666;">Shipping</td>
              <td style="padding: 6px 0; font-size: 14px; text-align: right;">$${params.shipping.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-size: 14px; color: #666;">Tax</td>
              <td style="padding: 6px 0; font-size: 14px; text-align: right;">$${params.tax.toFixed(2)}</td>
            </tr>
            <tr style="border-top: 2px solid #1a1a1a;">
              <td style="padding: 12px 0; font-size: 18px; font-weight: bold;">Total</td>
              <td style="padding: 12px 0; font-size: 18px; font-weight: bold; text-align: right;">$${params.total.toFixed(2)}</td>
            </tr>
          </table>

          <div style="background: #f9f9f6; border-left: 4px solid #b8860b; padding: 16px 20px; margin-bottom: 24px;">
            <p style="font-size: 15px; line-height: 1.6; margin: 0;">
              ${fulfillmentMessage}
            </p>
          </div>

          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            We truly appreciate your business. If you have any questions about your order, feel free to reply to this email or contact us at <a href="tel:6025967393" style="color: #b8860b;">(602) 596-7393</a>.
          </p>

          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://millanluxurycleaning.com" style="display: inline-block; padding: 12px 32px; background: #b8860b; color: #fff; text-decoration: none; border-radius: 6px; font-size: 16px;">
              Visit Millan Luxury
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="font-size: 12px; color: #888; text-align: center; line-height: 1.5;">
            Millan Luxury Cleaning &bull; 811 N 3rd St, Phoenix, AZ 85004<br/>
            <a href="https://millanluxurycleaning.com" style="color: #b8860b;">millanluxurycleaning.com</a>
          </p>
        </div>
      `,
    });
    console.log(`[Email] Order confirmation sent to ${params.customerEmail}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send order confirmation:", error);
    return false;
  }
}

// --- Order notification ---

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
  const transport = getSmtpTransport();
  const notifyTo = getNotificationEmail();

  if (!transport || !notifyTo) {
    console.warn("[Email] SMTP not configured, skipping order notification");
    return false;
  }

  const itemRows = params.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #e5e5e5;">
        <td style="padding: 10px 0; font-size: 14px;">${esc(item.name)}</td>
        <td style="padding: 10px 0; font-size: 14px; text-align: center;">x${item.quantity}</td>
        <td style="padding: 10px 0; font-size: 14px; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const shipAddrHtml = params.shippingAddress?.addressLine1
    ? `<p style="font-size: 14px; margin: 4px 0 0;">${esc(params.shippingAddress.addressLine1)}, ${esc(params.shippingAddress.city)} ${esc(params.shippingAddress.state)} ${esc(params.shippingAddress.postalCode)}</p>`
    : "";

  try {
    await sendWithRetry(transport, {
      from: `"Millan Luxury Website" <${process.env.SMTP_USER}>`,
      to: notifyTo,
      replyTo: params.customerEmail,
      subject: `New Order #${params.orderId} — $${params.total.toFixed(2)}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <h1 style="font-size: 24px; color: #b8860b; margin-bottom: 24px;">New Order #${params.orderId}</h1>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888; width: 120px;">Customer</td>
              <td style="padding: 12px 0; font-size: 16px; font-weight: bold;">${esc(params.customerName) || "—"}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888;">Email</td>
              <td style="padding: 12px 0; font-size: 16px;">
                <a href="mailto:${esc(params.customerEmail)}" style="color: #b8860b;">${esc(params.customerEmail)}</a>
              </td>
            </tr>
            ${params.customerPhone ? `
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888;">Phone</td>
              <td style="padding: 12px 0; font-size: 16px;">
                <a href="tel:${esc(params.customerPhone)}" style="color: #b8860b;">${esc(params.customerPhone)}</a>
              </td>
            </tr>` : ""}
            ${shipAddrHtml ? `
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888;">Ship To</td>
              <td style="padding: 12px 0; font-size: 14px;">${shipAddrHtml}</td>
            </tr>` : ""}
          </table>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr style="border-bottom: 2px solid #1a1a1a;">
              <th style="padding: 8px 0; font-size: 12px; text-transform: uppercase; text-align: left;">Item</th>
              <th style="padding: 8px 0; font-size: 12px; text-transform: uppercase; text-align: center;">Qty</th>
              <th style="padding: 8px 0; font-size: 12px; text-transform: uppercase; text-align: right;">Price</th>
            </tr>
            ${itemRows}
            ${params.shipping ? `
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 10px 0; font-size: 14px;" colspan="2">Shipping</td>
              <td style="padding: 10px 0; font-size: 14px; text-align: right;">$${params.shipping.toFixed(2)}</td>
            </tr>` : ""}
          </table>
          <p style="font-size: 20px; font-weight: bold; text-align: right; margin-bottom: 24px;">
            Total: $${params.total.toFixed(2)}
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="font-size: 12px; color: #888;">
            This order was placed at millanluxurycleaning.com
          </p>
        </div>
      `,
    });
    console.log(`[Email] Order notification sent to ${notifyTo}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send order notification:", error);
    return false;
  }
}

// --- Partner emails (Google SMTP) ---

export async function sendPartnerApprovalEmail(params: {
  to: string;
  brandName: string;
  slug: string;
}): Promise<boolean> {
  const transport = getSmtpTransport();
  if (!transport) {
    console.error("[CRITICAL] SMTP not configured, cannot send partner approval email");
    return false;
  }

  const siteUrl = getSiteUrl();
  const loginUrl = `${siteUrl}/partner/login`;
  const vanityUrl = `${siteUrl}/with/${params.slug}`;
  const fromEmail = getNotificationEmail();

  try {
    await sendWithRetry(transport, {
      from: `"Millan Luxury Cleaning" <${fromEmail}>`,
      to: params.to,
      subject: "Welcome to the Millan Luxury Partner Program",
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <h1 style="font-size: 24px; color: #b8860b; margin-bottom: 24px;">Welcome, ${params.brandName}</h1>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            Your application to the Millan Luxury Partner Program has been approved. We're excited to collaborate with you.
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            <strong>Your partner link:</strong><br/>
            <a href="${vanityUrl}" style="color: #b8860b;">${vanityUrl}</a>
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Share this link with your audience. When someone books through your link, you earn a commission on every completed booking.
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Sign in to your partner dashboard to view your performance, track commissions, and access your unique link anytime.
          </p>
          <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background: #b8860b; color: #fff; text-decoration: none; border-radius: 6px; font-size: 16px;">
            Sign In to Dashboard
          </a>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="font-size: 12px; color: #888; line-height: 1.5;">
            You received this email because your partner application was approved. If you did not apply, please disregard this message.
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("[CRITICAL] Failed to send partner approval email after retries:", error);
    return false;
  }
}

export async function sendPartnerDisabledEmail(params: {
  to: string;
  brandName: string;
}): Promise<boolean> {
  const transport = getSmtpTransport();
  if (!transport) {
    console.error("[CRITICAL] SMTP not configured, cannot send partner disabled email");
    return false;
  }

  const fromEmail = getNotificationEmail();

  try {
    await sendWithRetry(transport, {
      from: `"Millan Luxury Cleaning" <${fromEmail}>`,
      to: params.to,
      subject: "Millan Luxury Partner Account Update",
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <h1 style="font-size: 24px; color: #1a1a1a; margin-bottom: 24px;">Account Update</h1>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            Dear ${params.brandName},
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            Your partner account with Millan Luxury has been deactivated. If you believe this is an error or would like more information, please reach out to us.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="font-size: 12px; color: #888; line-height: 1.5;">
            You received this email because your partner account status changed. If you did not apply, please disregard this message.
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("[CRITICAL] Failed to send partner disabled email after retries:", error);
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
  const transport = getSmtpTransport();
  if (!transport) {
    console.error("[CRITICAL] SMTP not configured, cannot send payout notification email");
    return false;
  }

  const fromEmail = getNotificationEmail();

  try {
    await sendWithRetry(transport, {
      from: `"Millan Luxury Cleaning" <${fromEmail}>`,
      to: params.to,
      subject: "Millan Luxury Partner Payout Notification",
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <h1 style="font-size: 24px; color: #b8860b; margin-bottom: 24px;">Payout Notification</h1>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            Dear ${params.brandName},
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            A payout of <strong>$${params.amount.toFixed(2)}</strong> has been processed for the period ${params.periodStart} to ${params.periodEnd}.
          </p>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
            Sign in to your partner dashboard for full details.
          </p>
          <a href="${getSiteUrl()}/partner/dashboard" style="display: inline-block; padding: 12px 24px; background: #b8860b; color: #fff; text-decoration: none; border-radius: 6px; font-size: 16px;">
            View Dashboard
          </a>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="font-size: 12px; color: #888; line-height: 1.5;">
            You received this email because you are a Millan Luxury partner. If you did not apply, please disregard this message.
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("[CRITICAL] Failed to send payout notification email after retries:", error);
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
  const transport = getSmtpTransport();
  if (!transport) {
    console.error("[CRITICAL] SMTP not configured, cannot send monthly statement email");
    return false;
  }

  const fromEmail = getNotificationEmail();

  try {
    await sendWithRetry(transport, {
      from: `"Millan Luxury Cleaning" <${fromEmail}>`,
      to: params.to,
      subject: `Millan Luxury Partner Statement - ${params.month}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <h1 style="font-size: 24px; color: #b8860b; margin-bottom: 24px;">Monthly Statement - ${params.month}</h1>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Dear ${params.brandName}, here is your partner summary for ${params.month}:
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 16px;">Conversions</td>
              <td style="padding: 12px 0; font-size: 16px; text-align: right; font-weight: bold;">${params.conversions}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 16px;">Attributed Revenue</td>
              <td style="padding: 12px 0; font-size: 16px; text-align: right; font-weight: bold;">$${params.totalRevenue.toFixed(2)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 16px;">Commission Earned</td>
              <td style="padding: 12px 0; font-size: 16px; text-align: right; font-weight: bold;">$${params.totalCommission.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; font-size: 16px;">Outstanding Balance</td>
              <td style="padding: 12px 0; font-size: 16px; text-align: right; font-weight: bold; color: #b8860b;">$${params.outstandingBalance.toFixed(2)}</td>
            </tr>
          </table>
          <a href="${getSiteUrl()}/partner/dashboard" style="display: inline-block; padding: 12px 24px; background: #b8860b; color: #fff; text-decoration: none; border-radius: 6px; font-size: 16px;">
            View Full Dashboard
          </a>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="font-size: 12px; color: #888; line-height: 1.5;">
            You received this email because you are a Millan Luxury partner. If you did not apply, please disregard this message.
          </p>
        </div>
      `,
    });
    return true;
  } catch (error) {
    console.error("[CRITICAL] Failed to send monthly statement email after retries:", error);
    return false;
  }
}
