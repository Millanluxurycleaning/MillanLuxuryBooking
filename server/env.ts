import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().optional(),
  SUPABASE_URL: z.string().trim().optional(),
  SUPABASE_ANON_KEY: z.string().trim().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().optional(),
  /**
   * Vercel dashboard currently exposes the blob token as `Blob_Evans_READ_WRITE_TOKEN`.
   * Keep supporting the previous `BLOB_READ_WRITE_TOKEN` name to avoid breaking local dev.
   */
  BLOB_READ_WRITE_TOKEN: z.string().trim().optional(),
  Blob_Evans_READ_WRITE_TOKEN: z.string().trim().optional(),
  DATABASE_URL: z.string().trim().optional(),
  DIRECT_URL: z.string().trim().optional(),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().trim().optional(),
  GOOGLE_CLIENT_SECRET: z.string().trim().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  // Encryption key for OAuth tokens (REQUIRED for OAuth)
  ENCRYPTION_KEY: z.string().min(32).optional(),

  // Resend email
  RESEND_API_KEY: z.string().trim().optional(),
  EMAIL_FROM: z.string().trim().optional(),
  SITE_URL: z.string().trim().optional(),

  // Google SMTP (Gmail / Google Workspace)
  SMTP_HOST: z.string().trim().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().trim().optional(),
  SMTP_PASS: z.string().trim().optional(),
  NOTIFICATION_EMAIL: z.string().trim().optional(),
});

export type EnvConfig = ReturnType<typeof loadEnv>;

export function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new Error(`Environment validation failed: ${parsed.error.message}`);
  }

  const env = parsed.data;

  const requireInProduction = (value: string | undefined, name: string) => {
    if (env.NODE_ENV === "production" && !value) {
      throw new Error(`${name} is required in production.`);
    }
  };

  const rawBlobToken = env.BLOB_READ_WRITE_TOKEN ?? env.Blob_Evans_READ_WRITE_TOKEN;

  const databaseUrl = env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn("[WARN] DATABASE_URL is not set. Database-backed API routes will be disabled until it is configured.");
  }

  const supabaseConfigured = Boolean(env.SUPABASE_URL && (env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY));

  if (!supabaseConfigured) {
    console.warn("[WARN] Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) to enable authentication.");
  }

  if (env.NODE_ENV === "production" && !rawBlobToken) {
    console.warn("[WARN] Blob storage token is missing. Upload endpoints will be unavailable.");
  }
  const blobToken = rawBlobToken ?? "";
  const blobEnabled = Boolean(rawBlobToken);

  const port = Number.parseInt(env.PORT || "5000", 10);

  const googleOAuthEnabled = Boolean(
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET &&
    env.ENCRYPTION_KEY
  );

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && !env.ENCRYPTION_KEY) {
    console.warn("[WARN] Google OAuth credentials provided but ENCRYPTION_KEY is missing. OAuth will be disabled.");
  }

  const resendEnabled = Boolean(env.RESEND_API_KEY);
  const smtpEnabled = Boolean(env.SMTP_USER && env.SMTP_PASS);

  return {
    nodeEnv: env.NODE_ENV,
    port,
    supabaseEnabled: supabaseConfigured,
    blobEnabled,
    googleOAuthEnabled,
    resendEnabled,
    smtpEnabled,
    supabase: {
      url: env.SUPABASE_URL,
      anonKey: env.SUPABASE_ANON_KEY,
      serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    },
    blob: {
      token: blobToken,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectUri: env.GOOGLE_REDIRECT_URI,
    },
    encryptionKey: env.ENCRYPTION_KEY,
    databaseUrl,
    resend: {
      apiKey: env.RESEND_API_KEY,
      from: env.EMAIL_FROM || "Millan Luxury <noreply@millanluxury.com>",
    },
    smtp: {
      host: env.SMTP_HOST || "smtp.gmail.com",
      port: Number(env.SMTP_PORT || "587"),
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    notificationEmail: env.NOTIFICATION_EMAIL || env.SMTP_USER || "",
    siteUrl: env.SITE_URL || "",
  } as const;
}
