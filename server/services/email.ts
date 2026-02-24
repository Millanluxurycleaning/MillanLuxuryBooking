import { Resend } from "resend";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// --- Resend (partner emails) ---

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resendClient = new Resend(apiKey);
  return resendClient;
}

function getFromEmail(): string {
  return process.env.EMAIL_FROM || "Millan Luxury <noreply@millanluxury.com>";
}

function getSiteUrl(): string {
  return process.env.SITE_URL || "";
}

// --- Google SMTP (notifications) ---

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
      subject: `New Contact: ${params.name} — ${params.service}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <h1 style="font-size: 24px; color: #b8860b; margin-bottom: 24px;">New Contact Form Submission</h1>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888; width: 120px;">Name</td>
              <td style="padding: 12px 0; font-size: 16px; font-weight: bold;">${params.name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888;">Email</td>
              <td style="padding: 12px 0; font-size: 16px;">
                <a href="mailto:${params.email}" style="color: #b8860b;">${params.email}</a>
              </td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888;">Service</td>
              <td style="padding: 12px 0; font-size: 16px;">${params.service}</td>
            </tr>
          </table>
          <div style="background: #f9f9f6; border-left: 4px solid #b8860b; padding: 16px 20px; margin-bottom: 24px;">
            <p style="font-size: 14px; color: #888; margin: 0 0 8px 0;">Message</p>
            <p style="font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${params.message}</p>
          </div>
          <a href="mailto:${params.email}" style="display: inline-block; padding: 12px 24px; background: #b8860b; color: #fff; text-decoration: none; border-radius: 6px; font-size: 16px;">
            Reply to ${params.name}
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
}): Promise<boolean> {
  const transport = getSmtpTransport();
  const notifyTo = getNotificationEmail();

  if (!transport || !notifyTo) {
    console.warn("[Email] SMTP not configured, skipping booking notification");
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

  try {
    await transport.sendMail({
      from: `"Millan Luxury Website" <${process.env.SMTP_USER}>`,
      to: notifyTo,
      replyTo: params.customerEmail,
      subject: `New Booking: ${params.customerName} — ${params.serviceName}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <h1 style="font-size: 24px; color: #b8860b; margin-bottom: 24px;">New Booking</h1>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888; width: 120px;">Customer</td>
              <td style="padding: 12px 0; font-size: 16px; font-weight: bold;">${params.customerName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888;">Email</td>
              <td style="padding: 12px 0; font-size: 16px;">
                <a href="mailto:${params.customerEmail}" style="color: #b8860b;">${params.customerEmail}</a>
              </td>
            </tr>
            ${params.customerPhone ? `
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888;">Phone</td>
              <td style="padding: 12px 0; font-size: 16px;">
                <a href="tel:${params.customerPhone}" style="color: #b8860b;">${params.customerPhone}</a>
              </td>
            </tr>` : ""}
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888;">Service</td>
              <td style="padding: 12px 0; font-size: 16px;">${params.serviceName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e5e5;">
              <td style="padding: 12px 0; font-size: 14px; color: #888;">Date</td>
              <td style="padding: 12px 0; font-size: 16px; font-weight: bold;">${formatted}</td>
            </tr>
          </table>
          ${params.notes ? `
          <div style="background: #f9f9f6; border-left: 4px solid #b8860b; padding: 16px 20px; margin-bottom: 24px;">
            <p style="font-size: 14px; color: #888; margin: 0 0 8px 0;">Customer Notes</p>
            <p style="font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${params.notes}</p>
          </div>` : ""}
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="font-size: 12px; color: #888;">
            This booking was created at millanluxurycleaning.com
          </p>
        </div>
      `,
    });
    console.log(`[Email] Booking notification sent to ${notifyTo}`);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send booking notification:", error);
    return false;
  }
}

// --- Order notification ---

export async function sendOrderNotificationEmail(params: {
  orderId: number;
  customerEmail: string;
  total: number;
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
        <td style="padding: 10px 0; font-size: 14px;">${item.name}</td>
        <td style="padding: 10px 0; font-size: 14px; text-align: center;">x${item.quantity}</td>
        <td style="padding: 10px 0; font-size: 14px; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>`
    )
    .join("");

  try {
    await transport.sendMail({
      from: `"Millan Luxury Website" <${process.env.SMTP_USER}>`,
      to: notifyTo,
      replyTo: params.customerEmail,
      subject: `New Order #${params.orderId} — $${params.total.toFixed(2)}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <h1 style="font-size: 24px; color: #b8860b; margin-bottom: 24px;">New Order #${params.orderId}</h1>
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 8px;">
            Customer: <a href="mailto:${params.customerEmail}" style="color: #b8860b;">${params.customerEmail}</a>
          </p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
            <tr style="border-bottom: 2px solid #1a1a1a;">
              <th style="padding: 8px 0; font-size: 12px; text-transform: uppercase; text-align: left;">Item</th>
              <th style="padding: 8px 0; font-size: 12px; text-transform: uppercase; text-align: center;">Qty</th>
              <th style="padding: 8px 0; font-size: 12px; text-transform: uppercase; text-align: right;">Price</th>
            </tr>
            ${itemRows}
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

// --- Partner emails (Resend) ---

export async function sendPartnerApprovalEmail(params: {
  to: string;
  brandName: string;
  slug: string;
}): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[Email] Resend not configured, skipping partner approval email");
    return false;
  }

  const siteUrl = getSiteUrl();
  const loginUrl = `${siteUrl}/partner/login`;
  const vanityUrl = `${siteUrl}/with/${params.slug}`;

  try {
    await resend.emails.send({
      from: getFromEmail(),
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
            Sign in to your partner dashboard to view your performance, track commissions, and access your unique link.
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
    console.error("[Email] Failed to send partner approval email:", error);
    return false;
  }
}

export async function sendPartnerDisabledEmail(params: {
  to: string;
  brandName: string;
}): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) {
    console.warn("[Email] Resend not configured, skipping partner disabled email");
    return false;
  }

  try {
    await resend.emails.send({
      from: getFromEmail(),
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
    console.error("[Email] Failed to send partner disabled email:", error);
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
  const resend = getResendClient();
  if (!resend) {
    console.warn("[Email] Resend not configured, skipping payout notification email");
    return false;
  }

  try {
    await resend.emails.send({
      from: getFromEmail(),
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
    console.error("[Email] Failed to send payout notification email:", error);
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
  const resend = getResendClient();
  if (!resend) {
    console.warn("[Email] Resend not configured, skipping monthly statement email");
    return false;
  }

  try {
    await resend.emails.send({
      from: getFromEmail(),
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
    console.error("[Email] Failed to send monthly statement email:", error);
    return false;
  }
}
