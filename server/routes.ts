import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { Express, Request, RequestHandler, Response } from "express";
import { createServer, type Server } from "http";
import { assertPrisma, hasDatabaseUrl } from "./db/prismaClient.js";
import {
  insertContactMessageSchema,
  insertGalleryItemSchema,
  insertTestimonialSchema,
  insertServiceSchema,
  insertSiteAssetSchema,
  insertPostSchema,
  insertFaqSchema,
  updateGalleryItemSchema,
  updateServiceSchema,
  updateTestimonialSchema,
  updateSiteAssetSchema,
  updatePostSchema,
  updateFaqSchema,
  insertFragranceProductSchema,
  updateFragranceProductSchema,
  createCartItemSchema,
  updateCartItemSchema,
  createBookingSchema,
  createAnnouncementSchema,
  updateAnnouncementSchema,
} from "../shared/types.js";
import { z, ZodError } from "zod";
import multer from "multer";
import type { Asset, SiteAsset } from "../shared/types.js";
import type { EnvConfig } from "./env.js";
import { list as listBlobFiles, upload as uploadBlobFile, remove as removeBlob } from "./blobService.js";
import { getUserFromRequest, isUserAdmin } from "./supabase.js";
import { getGoogleAuthUrl, exchangeCodeForTokens, fetchGoogleReviews } from "./google.js";
import { saveTokens, getValidToken } from "./tokenService.js";
import {
  buildSquareAuthUrl,
  disconnectSquare,
  exchangeSquareCode,
  getSquareConfigSummary,
} from "./services/squareAuth.js";
import { importSquareCatalog } from "./services/catalogSync.js";
import { createSquareClient } from "./services/square.js";
import { resolveSquareAccessToken, resolveSquareLocationId } from "./services/squareAccess.js";
import { Country, Currency, FulfillmentState, FulfillmentType, type Availability } from "square";
import { registerAffiliateRoutes, readAffiliateCookie } from "./routes/affiliate.js";
import { sendContactNotificationEmail, sendBookingNotificationEmail, sendBookingConfirmationEmail, sendOrderNotificationEmail, sendOrderConfirmationEmail, sendQuoteRequestEmail } from "./services/email.js";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
let lastCatalogSyncAt = 0; // Debounce for catalog webhook sync (epoch ms)
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);
const MIME_EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD_BYTES } });

const blobPrefixMap = {
  branding: "branding",
  gallery: "gallery",
  before: "gallery/before",
  after: "gallery/after",
  testimonials: "testimonials",
} as const;

type BlobPrefix = keyof typeof blobPrefixMap;

const CONTACT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const CONTACT_RATE_LIMIT_MAX = 5;
const contactRateLimit = new Map<string, { count: number; resetAt: number }>();
const PUBLIC_WRITE_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const PUBLIC_WRITE_RATE_LIMIT_MAX = 30;
const publicWriteRateLimit = new Map<string, { count: number; resetAt: number }>();
const CART_SESSION_HEADER = "x-cart-session";
const CART_TTL_DAYS = 30;

const createCartSessionId = () => randomBytes(16).toString("hex");

const getClientIp = (req: Request) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.ip || "unknown";
};

const checkRateLimit = (
  req: Request,
  store: Map<string, { count: number; resetAt: number }>,
  windowMs: number,
  maxRequests: number,
) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now >= entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return { limited: false, retryAfterSeconds: 0 };
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { limited: true, retryAfterSeconds };
  }

  return { limited: false, retryAfterSeconds: 0 };
};

const checkContactRateLimit = (req: Request) =>
  checkRateLimit(req, contactRateLimit, CONTACT_RATE_LIMIT_WINDOW_MS, CONTACT_RATE_LIMIT_MAX);

const checkPublicWriteRateLimit = (req: Request) =>
  checkRateLimit(req, publicWriteRateLimit, PUBLIC_WRITE_RATE_LIMIT_WINDOW_MS, PUBLIC_WRITE_RATE_LIMIT_MAX);

const ensureSquareEnabled = (res: Response) => {
  if (process.env.SQUARE_ENABLED !== "true") {
    res.status(403).json({ message: "Square is not enabled" });
    return false;
  }
  return true;
};

const ensureSquareSyncEnabled = (res: Response) => {
  if (process.env.SQUARE_SYNC_ENABLED !== "true") {
    res.status(403).json({ message: "Square sync is not enabled" });
    return false;
  }
  return ensureSquareEnabled(res);
};

const getCronSecret = () => process.env.CRON_SECRET?.trim() || null;

const extractCronAuth = (req: Request) => {
  const headerValue = req.headers["authorization"] ?? req.headers["x-cron-secret"];
  const raw =
    typeof headerValue === "string"
      ? headerValue
      : Array.isArray(headerValue)
        ? headerValue[0]
        : null;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase().startsWith("bearer ") ? trimmed.slice(7).trim() : trimmed;
};

const ensureCronAuthorized = (req: Request, res: Response) => {
  const secret = getCronSecret();
  if (!secret) {
    if (!process.env.VERCEL) {
      res.status(500).json({ message: "CRON_SECRET not configured" });
      return false;
    }
    return true;
  }
  const provided = extractCronAuth(req);
  if (!provided) {
    res.status(401).json({ message: "Cron authorization required" });
    return false;
  }
  const secretBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);
  if (secretBuffer.length !== providedBuffer.length) {
    res.status(403).json({ message: "Invalid cron authorization" });
    return false;
  }
  if (!timingSafeEqual(secretBuffer, providedBuffer)) {
    res.status(403).json({ message: "Invalid cron authorization" });
    return false;
  }
  return true;
};

const getSquareWebhookSignatureKey = () => {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key) {
    throw new Error("SQUARE_WEBHOOK_SIGNATURE_KEY not configured");
  }
  return key;
};

const resolveSquareWebhookUrl = (req: Request) => {
  const configured = process.env.SQUARE_WEBHOOK_URL?.trim();
  if (configured) {
    return configured;
  }
  const forwardedProto = req.headers["x-forwarded-proto"];
  const forwardedHost = req.headers["x-forwarded-host"];
  const protocol = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || req.protocol;
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host;
  if (!host) {
    throw new Error("Unable to resolve Square webhook URL");
  }
  return `${protocol}://${host}${req.originalUrl}`;
};

const getSquareSignatureHeader = (req: Request) => {
  const signature = req.headers["x-square-hmacsha256-signature"];
  if (Array.isArray(signature)) {
    return signature[0];
  }
  return signature || null;
};

const isValidSquareWebhookSignature = (req: Request) => {
  const signature = getSquareSignatureHeader(req);
  if (!signature) {
    console.error("[WebhookSig] FAIL: No x-square-hmacsha256-signature header");
    return false;
  }
  const rawBodyValue = (req as Request & { rawBody?: unknown }).rawBody;
  if (!rawBodyValue) {
    console.error("[WebhookSig] FAIL: No rawBody on request");
    return false;
  }
  const rawBody = Buffer.isBuffer(rawBodyValue) ? rawBodyValue.toString("utf8") : String(rawBodyValue);
  const webhookUrl = resolveSquareWebhookUrl(req);
  const key = getSquareWebhookSignatureKey();
  const payload = `${webhookUrl}${rawBody}`;
  const expected = createHmac("sha256", key).update(payload).digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  // Debug logging for webhook signature issues
  console.log(`[WebhookSig] URL used: ${webhookUrl}`);
  console.log(`[WebhookSig] Key (first 6): ${key.slice(0, 6)}...`);
  console.log(`[WebhookSig] Signature received: ${signature.slice(0, 12)}...`);
  console.log(`[WebhookSig] Signature expected: ${expected.slice(0, 12)}...`);
  console.log(`[WebhookSig] RawBody length: ${rawBody.length}`);

  if (expectedBuffer.length !== signatureBuffer.length) {
    console.error(`[WebhookSig] FAIL: Length mismatch (expected=${expectedBuffer.length}, got=${signatureBuffer.length})`);
    return false;
  }
  const valid = timingSafeEqual(expectedBuffer, signatureBuffer);
  if (!valid) {
    console.error("[WebhookSig] FAIL: HMAC mismatch");
  }
  return valid;
};

// Map Square booking statuses to our local status values
const mapSquareBookingStatus = (squareStatus: string): string => {
  switch (squareStatus) {
    case "ACCEPTED":
    case "CONFIRMED":
      return "confirmed";
    case "CANCELLED_BY_SELLER":
    case "CANCELLED_BY_CUSTOMER":
    case "DECLINED":
      return "cancelled";
    case "COMPLETED":
      return "completed";
    case "NO_SHOW":
      return "no_show";
    case "PENDING":
    default:
      return "pending";
  }
};

const sanitizeFilenameBase = (filename: string) => {
  const base = filename.split(/[/\\]/).pop() ?? "upload";
  const asciiOnly = base.replace(/[^\x20-\x7E]+/g, "");
  const rawName = asciiOnly.split(".").slice(0, -1).join(".") || asciiOnly;
  const cleanedName = rawName
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (cleanedName || "upload").slice(0, 60);
};

const createSafeFilename = (filename: string, mimeType?: string | null) => {
  const baseName = sanitizeFilenameBase(filename);
  const extension = mimeType ? MIME_EXTENSION_MAP[mimeType.toLowerCase()] : "";
  const suffix = randomBytes(6).toString("hex");
  return extension ? `${baseName}-${suffix}.${extension}` : `${baseName}-${suffix}`;
};

const normalizeUploadFile = (file: Express.Multer.File) => {
  file.originalname = createSafeFilename(file.originalname, file.mimetype);
  return file;
};

const isAllowedImageType = (mimeType?: string | null) => {
  if (!mimeType) return false;
  return ALLOWED_IMAGE_TYPES.has(mimeType.toLowerCase());
};

const getBlobPath = (value?: string | null) => {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (!parsed.hostname.includes("vercel-storage")) return null;
    return parsed.pathname;
  } catch {
    return value.startsWith("/") ? value : null;
  }
};

const buildAssetPayload = (asset: SiteAsset): Asset & { key: string; path: string; description: string | null } => {
  const path = getBlobPath(asset.publicId || asset.url) || "";
  const filename = asset.filename || asset.name || path.split("/").pop() || "asset";

  return {
    key: asset.key,
    url: asset.url,
    id: asset.id,
    path,
    publicId: asset.publicId || path,
    filename,
    description: asset.description ?? null,
  };
};

type AuthedUser = { userId: string; email: string };
type AuthedRequest = Request & { user?: AuthedUser | null };

const createRequireAuthMiddleware = (supabaseEnabled: boolean): RequestHandler => {
  return async (req, res, next) => {
    if (!supabaseEnabled) {
      res.status(401).json({ message: "Unauthorized - Authentication not configured" });
      return;
    }

    const user = await getUserFromRequest(req);

    if (!user) {
      res.status(401).json({ message: "Unauthorized - Please sign in" });
      return;
    }

    (req as AuthedRequest).user = user;
    next();
  };
};

const createRequireAdminMiddleware = (prisma: PrismaClient, supabaseEnabled: boolean): RequestHandler => {
  return async (req, res, next) => {
    if (!supabaseEnabled) {
      res.status(401).json({ message: "Unauthorized - Authentication not configured" });
      return;
    }

    const user = await getUserFromRequest(req);

    if (!user) {
      res.status(401).json({ message: "Unauthorized - Please sign in" });
      return;
    }

    const isAdmin = await isUserAdmin(user.userId, prisma, user.email);

    if (!isAdmin) {
      res.status(403).json({ message: "Forbidden - Admin access required" });
      return;
    }

    (req as AuthedRequest).user = user;
    next();
  };
};

export async function registerRoutes(app: Express, env: EnvConfig): Promise<Server> {
  if (!env.supabaseEnabled) {
    console.warn("[WARN] Supabase is not configured. Authentication will not work until SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.");
  }

  if (!hasDatabaseUrl) {
    console.warn(
      "[WARN] DATABASE_URL is not configured. All API routes will respond with 503 until a database connection string is provided.",
    );

    app.use("/api", (_req, res) => {
      res.status(503).json({
        message: "Database connection is not configured. Set DATABASE_URL to enable API routes.",
      });
    });

    return createServer(app);
  }

  const prisma = assertPrisma();

  const requireAdmin = createRequireAdminMiddleware(prisma, env.supabaseEnabled);
  const requireAuthMiddleware = createRequireAuthMiddleware(env.supabaseEnabled);

  // Register affiliate/partner routes (vanity redirects, applications, admin, portal)
  registerAffiliateRoutes(app, prisma, env.supabaseEnabled, {
    requireAdmin,
    requireAuth: requireAuthMiddleware,
  });

  const resolveCartSessionId = (req: Request) => {
    const headerValue = req.headers[CART_SESSION_HEADER] ?? req.headers[CART_SESSION_HEADER.toLowerCase()];
    if (Array.isArray(headerValue)) {
      return headerValue[0];
    }
    if (typeof headerValue === "string" && headerValue.trim()) {
      return headerValue.trim();
    }
    const queryValue = req.query.sessionId;
    if (typeof queryValue === "string" && queryValue.trim()) {
      return queryValue.trim();
    }
    return null;
  };

  const resolveOptionalAuthUser = async (req: Request) => {
    if (!env.supabaseEnabled) {
      return null;
    }
    return getUserFromRequest(req);
  };

  const touchCartExpiry = () => new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000);

  const buildCartResponse = async (cart: { id: string; sessionId: string | null; userId: string | null; createdAt: Date; updatedAt: Date; expiresAt: Date; items: { id: number; productId: number; quantity: number; price: unknown; createdAt: Date; }[] }) => {
    const productIds = cart.items.map((item) => item.productId);
    const products = productIds.length
      ? await prisma.fragranceProduct.findMany({ where: { id: { in: productIds } } })
      : [];
    const productMap = new Map(products.map((product) => [product.id, product]));

    const items = cart.items.map((item) => {
      const product = productMap.get(item.productId) ?? null;
      const price = Number(item.price);
      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        price,
        createdAt: item.createdAt,
        product,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      id: cart.id,
      sessionId: cart.sessionId,
      userId: cart.userId,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      expiresAt: cart.expiresAt,
      items,
      totals: {
        subtotal: Number(subtotal.toFixed(2)),
        itemCount,
      },
    };
  };

  // Auth routes - Get current user (with auto-provisioning from Supabase Auth)
  app.get('/api/auth/user', requireAuthMiddleware, async (req: any, res) => {
    try {
      const authRequest = req as AuthedRequest;
      const authUser = authRequest.user;

      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Try to get existing user from database
      let user = await prisma.user.findUnique({ where: { id: authUser.userId } });

      // If user doesn't exist in DB, try to reconcile by email
      if (!user && authUser.email) {
        const existingByEmail = await prisma.user.findUnique({ where: { email: authUser.email } });
        if (existingByEmail) {
          if (existingByEmail.id !== authUser.userId) {
            try {
              user = await prisma.user.update({
                where: { id: existingByEmail.id },
                data: { id: authUser.userId, email: authUser.email },
              });
            } catch (error) {
              console.warn(
                "[WARN] Failed to align user id with auth user id. Falling back to email match.",
                error,
              );
              user = existingByEmail;
            }
          } else {
            user = existingByEmail;
          }
        }
      }

      // If user doesn't exist in DB, create them (first-time login)
      if (!user) {
        // Extract name parts from email if not provided
        const emailPrefix = authUser.email.split("@")[0];
        const nameParts = emailPrefix.split(/[._-]/);
        const firstName = nameParts[0] || "User";
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

        // Create user record from Supabase auth data
        user = await prisma.user.create({
          data: {
            id: authUser.userId,
            email: authUser.email,
            firstName: firstName,
            lastName: lastName,
            profileImageUrl: null,
            isAdmin: false,
          },
        });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching/creating user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // File upload endpoint for Vercel Blob - Protected with Supabase admin auth
  app.post("/api/upload", requireAdmin, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      if (!env.blobEnabled) {
        res.status(400).json({
          error:
            "Vercel Blob storage not configured. Set BLOB_READ_WRITE_TOKEN environment variable or deploy to Vercel to enable file uploads.",
        });
        return;
      }

      const normalizedFile = normalizeUploadFile(req.file);

      if (!isAllowedImageType(normalizedFile.mimetype)) {
        res.status(400).json({ error: "Only image uploads are allowed" });
        return;
      }

      const blob = await uploadBlobFile("gallery", normalizedFile);

      res.json({
        success: true,
        data: {
          url: blob.url,
          publicId: blob.pathname,
          path: blob.pathname,
          filename: normalizedFile.originalname,
        }
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Contact form submission endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const rateLimit = checkContactRateLimit(req);
      if (rateLimit.limited) {
        res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
        res.status(429).json({
          success: false,
          message: "Too many requests. Please try again later.",
        });
        return;
      }

      const validatedData = insertContactMessageSchema.parse(req.body);
      const message = await prisma.contactMessage.create({ data: validatedData });

      // Send email notification (fire-and-forget, don't block the response)
      sendContactNotificationEmail(validatedData).catch((err) =>
        console.error("[Email] Contact notification error:", err)
      );

      res.status(201).json({
        success: true,
        message: "Contact form submitted successfully",
        data: message
      });
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        res.status(400).json({
          success: false,
          message: "Invalid form data",
          errors: error
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to submit contact form"
        });
      }
    }
  });

  // Free quote request
  app.post("/api/quote-request", async (req, res) => {
    try {
      const { name, email, phone, address, city, serviceType, bedrooms, bathrooms, notes } = req.body;
      if (!name || !email || !serviceType) {
        res.status(400).json({ success: false, message: "Name, email, and service type are required." });
        return;
      }
      sendQuoteRequestEmail({ name, email, phone, address, city, serviceType, bedrooms, bathrooms, notes }).catch(
        (err) => console.error("[Email] Quote request error:", err)
      );
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("[Quote] Error:", error);
      res.status(500).json({ success: false, message: "Failed to send quote request." });
    }
  });

  // Welcome popup: generate a one-time 10% discount code for a new email
  app.post("/api/subscribe", async (req, res) => {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: "Invalid email" });
      return;
    }
    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    try {
      // If this email already has a code, return it (idempotent)
      const existing = await prisma.discountCode.findFirst({
        where: { email: normalizedEmail },
        orderBy: { createdAt: "desc" },
      });

      if (existing) {
        if (existing.usedAt) {
          res.json({ alreadyUsed: true });
        } else {
          res.json({ code: existing.code, discountPct: existing.discountPct });
        }
        return;
      }

      // Generate a unique code: MLC-XXXXXXXX
      const suffix = randomBytes(4).toString("hex").toUpperCase();
      const code = `MLC-${suffix}`;

      await prisma.discountCode.create({
        data: { code, email: normalizedEmail, discountPct: 10 },
      });

      res.json({ code, discountPct: 10 });
    } catch (err) {
      console.error("[subscribe] error:", err);
      res.status(500).json({ message: "Failed to generate code" });
    }
  });

  // Validate a discount code at checkout
  app.post("/api/discount/validate", async (req, res) => {
    const schema = z.object({ code: z.string().min(1), email: z.string().email().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ valid: false, message: "Invalid request" });
      return;
    }
    const { code, email } = parsed.data;

    try {
      // Static review reward code — always valid, not stored in DB
      if (code.toUpperCase() === "REVIEW5") {
        res.json({ valid: true, discountPct: 5, code: "REVIEW5" });
        return;
      }

      const discount = await prisma.discountCode.findUnique({ where: { code: code.toUpperCase() } });

      if (!discount) {
        res.json({ valid: false, message: "Code not found" });
        return;
      }
      if (discount.usedAt) {
        res.json({ valid: false, message: "Code has already been used" });
        return;
      }
      // Optional: enforce email match if provided
      if (email && discount.email !== email.toLowerCase().trim()) {
        res.json({ valid: false, message: "Code not valid for this email" });
        return;
      }

      res.json({ valid: true, discountPct: discount.discountPct, code: discount.code });
    } catch (err) {
      console.error("[discount/validate] error:", err);
      res.status(500).json({ valid: false, message: "Server error" });
    }
  });

  app.get("/api/blob/list", requireAdmin, async (req, res) => {
    if (!env.blobEnabled) {
      res.status(503).json({ error: "Blob storage is not configured." });
      return;
    }

    const parsed = z
      .object({ prefix: z.enum(Object.keys(blobPrefixMap) as [BlobPrefix, ...BlobPrefix[]]).default("gallery") })
      .safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid blob prefix" });
      return;
    }

    try {
      const prefix = blobPrefixMap[parsed.data.prefix];
      const images = await listBlobFiles(prefix);
      res.json({ images });
    } catch (error) {
      console.error("Failed to list blobs", error);
      res.status(500).json({ error: "Failed to load blob files" });
    }
  });

  app.post("/api/blob/upload", requireAdmin, upload.single("file"), async (req, res) => {
    if (!env.blobEnabled) {
      res.status(503).json({ error: "Blob storage is not configured." });
      return;
    }

    const parsed = z
      .object({ prefix: z.enum(Object.keys(blobPrefixMap) as [BlobPrefix, ...BlobPrefix[]]).default("gallery") })
      .safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid blob prefix" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    const normalizedFile = normalizeUploadFile(req.file);

    if (!isAllowedImageType(normalizedFile.mimetype)) {
      res.status(400).json({ error: "Only image uploads are allowed" });
      return;
    }

    try {
      const prefix = blobPrefixMap[parsed.data.prefix];
      const image = await uploadBlobFile(prefix, normalizedFile);
      res.json({ url: image.url, pathname: image.pathname, size: image.size });
    } catch (error) {
      console.error("Blob upload failed", error);
      res.status(500).json({ error: "Failed to upload blob" });
    }
  });

  app.get("/api/blob", requireAdmin, async (req, res) => {
    if (!env.blobEnabled) {
      res.status(503).json({ error: "Blob storage is not configured." });
      return;
    }

    const parsed = z
      .object({
        prefix: z.string().trim().optional(),
      })
      .safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid blob query parameters" });
      return;
    }

    try {
      const prefix = parsed.data.prefix ?? "static/";
      const files = await listBlobFiles(prefix);

      res.json({ data: files });
    } catch (error) {
      console.error("Failed to list blobs", error);
      res.status(500).json({ error: "Failed to load blob files" });
    }
  });

  app.delete("/api/blob", requireAdmin, async (req, res) => {
    if (!env.blobEnabled) {
      res.status(503).json({ error: "Blob storage is not configured." });
      return;
    }

    const parsed = z
      .object({ url: z.string().url().min(1) })
      .safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "A valid blob URL is required" });
      return;
    }

    const { url } = parsed.data;
    if (!url.includes(".public.blob.vercel-storage.com")) {
      res.status(400).json({ error: "Blob URL must point to Vercel Blob storage" });
      return;
    }

    try {
      const linkedAsset = await prisma.siteAsset.findFirst({ where: { url } });
      if (linkedAsset) {
        res.status(400).json({
          error: `This image is currently used as ${linkedAsset.key}. Please change the asset first.`,
        });
        return;
      }

      await removeBlob(url);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete blob", error);
      res.status(500).json({ error: "Failed to delete blob" });
    }
  });

  // Site assets endpoints (Vercel Blob backed)
  app.get("/api/assets", async (_req, res) => {
    try {
      const assets = await prisma.siteAsset.findMany({ orderBy: { key: "asc" } });
      const map = assets.reduce<Record<string, ReturnType<typeof buildAssetPayload>>>((acc, asset) => {
        acc[asset.key] = buildAssetPayload(asset);
        return acc;
      }, {});

      res.json({ data: map });
    } catch (error) {
      console.error("Failed to load site assets", error);
      res.status(500).json({ error: "Failed to load site assets" });
    }
  });

  app.post("/api/assets", requireAdmin, upload.single('file'), async (req, res) => {
    try {
      const payload = z
        .object({
          key: z.string().min(1),
          description: z.string().optional(),
          name: z.string().optional(),
          filename: z.string().optional(),
          publicId: z.string().optional(),
          url: z.string().url().optional(),
        })
        .superRefine((val, ctx) => {
          if (!req.file && !val.url) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide a file or an existing URL" });
          }
        })
        .parse(req.body);

      if (req.file && !env.blobEnabled) {
        res.status(400).json({
          error:
            "Vercel Blob storage not configured. Set BLOB_READ_WRITE_TOKEN environment variable or deploy to Vercel to enable file uploads.",
        });
        return;
      }

      const normalizedFile = req.file ? normalizeUploadFile(req.file) : null;

      if (normalizedFile && !isAllowedImageType(normalizedFile.mimetype)) {
        res.status(400).json({ error: "Only image uploads are allowed" });
        return;
      }

      const blob = normalizedFile ? await uploadBlobFile("branding", normalizedFile) : null;

      const url = blob?.url ?? payload.url;
      if (!url) {
        res.status(400).json({ error: "Unable to resolve upload URL" });
        return;
      }

      const publicId = blob?.pathname ?? payload.publicId ?? getBlobPath(url);
      const filename = payload.filename ?? payload.name ?? normalizedFile?.originalname ?? payload.key;

      const asset = await prisma.siteAsset.upsert({
        where: { key: payload.key },
        update: {
          url,
          name: payload.name ?? filename,
          filename,
          publicId: publicId ?? undefined,
          description: payload.description,
        },
        create: {
          key: payload.key,
          url,
          name: payload.name ?? filename,
          filename,
          publicId: publicId ?? undefined,
          description: payload.description,
        },
      });

      res.status(201).json({
        success: true,
        message: "Asset saved successfully",
        data: buildAssetPayload(asset),
      });
    } catch (error) {
      console.error("Asset upload error:", error);
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid asset payload", errors: error.issues });
        return;
      }
      res.status(500).json({ error: "Failed to save asset" });
    }
  });

  app.put("/api/assets/:key", requireAdmin, async (req, res) => {
    try {
      const key = req.params.key;
      const updates = updateSiteAssetSchema.parse(req.body);
      const existing = await prisma.siteAsset.findUnique({ where: { key } });

      if (!existing && !updates.url) {
        res.status(400).json({ error: "Provide a URL to create a new asset" });
        return;
      }

      const asset = await prisma.siteAsset.upsert({
        where: { key },
        update: {
          url: updates.url ?? existing?.url ?? "",
          name: updates.name ?? existing?.name ?? key,
          filename: updates.filename ?? existing?.filename ?? existing?.name ?? key,
          publicId: updates.publicId ?? existing?.publicId ?? getBlobPath(updates.url ?? existing?.url ?? "") ?? undefined,
          description: updates.description ?? existing?.description ?? null,
        },
        create: {
          key,
          url: updates.url ?? existing?.url ?? "",
          name: updates.name ?? existing?.name ?? key,
          filename: updates.filename ?? existing?.filename ?? existing?.name ?? key,
          publicId: updates.publicId ?? existing?.publicId ?? getBlobPath(updates.url ?? existing?.url ?? "") ?? undefined,
          description: updates.description ?? existing?.description ?? null,
        },
      });

      res.json({ success: true, data: buildAssetPayload(asset), message: "Asset updated" });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid asset payload", errors: error.issues });
        return;
      }
      console.error("Asset update error:", error);
      res.status(500).json({ error: "Failed to update asset" });
    }
  });

  app.get("/api/contact", requireAdmin, async (req, res) => {
    try {
      const messages = await prisma.contactMessage.findMany({ orderBy: { timestamp: "desc" } });
      res.json(messages);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve contact messages"
      });
    }
  });

  app.get("/api/contact/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }
      
      const message = await prisma.contactMessage.findUnique({ where: { id } });
      if (!message) {
        res.status(404).json({
          success: false,
          message: "Contact message not found"
        });
        return;
      }
      res.json({
        success: true,
        data: message
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve contact message"
      });
    }
  });

  // Gallery endpoints
  app.get("/api/gallery", async (req, res) => {
    try {
      const items = await prisma.galleryItem.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] });
      res.json(items);
    } catch (error) {
      console.error('[API] Error in GET /api/gallery:', error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve gallery items",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.get("/api/gallery/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }
      
      const item = await prisma.galleryItem.findUnique({ where: { id } });
      if (!item) {
        res.status(404).json({
          success: false,
          message: "Gallery item not found"
        });
        return;
      }
      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve gallery item"
      });
    }
  });

  app.post("/api/gallery", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertGalleryItemSchema.parse(req.body);
      const maxOrder = await prisma.galleryItem.aggregate({ _max: { order: true } });
      const nextOrder = (maxOrder._max.order ?? -1) + 1;
      const item = await prisma.galleryItem.create({ data: { ...validatedData, order: nextOrder } });
      
      res.status(201).json({
        success: true,
        message: "Gallery item created successfully",
        data: item
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid gallery data",
          errors: { issues: error.issues }
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to create gallery item"
        });
      }
    }
  });

  app.patch("/api/gallery/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }
      
      // Preprocess: strip empty strings to undefined. Guard against missing/invalid bodies
      const incomingBody = req.body;
      const entries =
        incomingBody && typeof incomingBody === "object"
          ? Object.entries(incomingBody)
          : [];

      const preprocessedBody: any = {};
      for (const [key, value] of entries) {
        if (typeof value === "string" && value.trim() === "") {
          continue;
        }
        preprocessedBody[key] = value;
      }

      const validatedData = updateGalleryItemSchema.parse(preprocessedBody);
      const existing = await prisma.galleryItem.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: "Gallery item not found"
        });
        return;
      }

      const item = await prisma.galleryItem.update({ where: { id }, data: validatedData });
      
      res.json({
        success: true,
        message: "Gallery item updated successfully",
        data: item
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid gallery data",
          errors: { issues: error.issues }
        });
      } else if (error instanceof Error) {
        if (
          error.message.includes("Gallery item must have") ||
          error.message.includes("Order must be")
        ) {
          res.status(400).json({
            success: false,
            message: error.message
          });
        } else {
          res.status(500).json({
            success: false,
            message: "Failed to update gallery item"
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to update gallery item"
        });
      }
    }
  });

  app.delete("/api/gallery/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }
      
      const existing = await prisma.galleryItem.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: "Gallery item not found"
        });
        return;
      }

      await prisma.galleryItem.delete({ where: { id } });

      const blobTargets = [
        getBlobPath(existing.imagePublicId || existing.imageUrl),
        getBlobPath(existing.beforeImagePublicId || existing.beforeImageUrl),
        getBlobPath(existing.afterImagePublicId || existing.afterImageUrl),
      ].filter((path): path is string => Boolean(path));

      if (blobTargets.length > 0) {
        if (!env.blobEnabled) {
          console.warn("BLOB_READ_WRITE_TOKEN missing - skipped blob deletion for gallery item", id);
        } else {
          await removeBlob(blobTargets);
        }
      }

      res.json({
        success: true,
        message: "Gallery item deleted successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete gallery item"
      });
    }
  });

  // Testimonials endpoints
  app.get("/api/testimonials", async (req, res) => {
    try {
      const items = await prisma.testimonial.findMany({
        where: { isApproved: true },
        orderBy: [{ order: "asc" }, { id: "asc" }]
      });
      res.json(items);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve testimonials"
      });
    }
  });

    app.post("/api/testimonials", requireAdmin, async (req, res) => {
      try {
        const validatedData = insertTestimonialSchema.parse(req.body);
        const maxOrder = await prisma.testimonial.aggregate({ _max: { order: true } });
        const nextOrder = (maxOrder._max.order ?? -1) + 1;
        const item = await prisma.testimonial.create({
          data: {
            author: validatedData.author ?? validatedData.name ?? "",
            content: validatedData.content ?? (validatedData as any).review ?? "",
            rating: validatedData.rating ?? 5,
            source: (validatedData as any).source,
            sourceUrl: (validatedData as any).sourceUrl,
            name: (validatedData as any).name,
            review: (validatedData as any).content ?? (validatedData as any).review,
            order: nextOrder,
          },
        });

        res.status(201).json({
          success: true,
          message: "Testimonial created successfully",
          data: item
        });
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({
            success: false,
            message: "Invalid testimonial data",
            errors: error.issues
          });
        } else {
          console.error("Failed to create testimonial", error);
          res.status(500).json({
            success: false,
            message: "Failed to create testimonial"
          });
        }
      }
    });

    app.patch("/api/testimonials/:id", requireAdmin, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          res.status(400).json({
            success: false,
            message: "Invalid ID"
          });
          return;
        }

        const updates = updateTestimonialSchema.parse(req.body);
        const existing = await prisma.testimonial.findUnique({ where: { id } });

        if (!existing) {
          res.status(404).json({
            success: false,
            message: "Testimonial not found"
          });
          return;
        }

        const item = await prisma.testimonial.update({ where: { id }, data: updates });

        res.json({
          success: true,
          message: "Testimonial updated successfully",
          data: item
        });
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({ success: false, message: "Invalid testimonial data", errors: error.issues });
          return;
        }
        console.error("Failed to update testimonial", error);
        res.status(500).json({
          success: false,
          message: "Failed to update testimonial"
        });
      }
    });

  app.delete("/api/testimonials/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }

      const existing = await prisma.testimonial.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: "Testimonial not found"
        });
        return;
      }

      await prisma.testimonial.delete({ where: { id } });

      res.json({
        success: true,
        message: "Testimonial deleted successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete testimonial"
      });
    }
  });

  // Google OAuth endpoints
  app.get('/api/auth/google', requireAdmin, (req, res) => {
    try {
      const authUrl = getGoogleAuthUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error('OAuth URL error:', error);
      res.status(500).json({ error: 'Failed to generate OAuth URL' });
    }
  });

  app.get('/api/auth/google/callback', async (req, res) => {
    try {
      const rateLimit = checkPublicWriteRateLimit(req);
      if (rateLimit.limited) {
        res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
        res.status(429).send("<html><body><h1>Too many requests</h1><p>Please try again later.</p></body></html>");
        return;
      }

      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        res.status(400).send('<html><body><h1>Error: Missing authorization code</h1></body></html>');
        return;
      }

      const { accessToken, refreshToken, expiresAt } = await exchangeCodeForTokens(code);
      await saveTokens('google', accessToken, refreshToken, expiresAt);

      res.send(`
        <html>
          <body>
            <h1>Google Account Connected!</h1>
            <p>You can now close this window and return to the admin dashboard.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 2000);
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).send('<html><body><h1>OAuth Error</h1><p>Failed to connect Google account.</p></body></html>');
    }
  });

  // Import reviews from Google
  app.post('/api/reviews/import/google', requireAdmin, async (req, res) => {
    try {
      const accessToken = await getValidToken('google');
      const { reviews } = await fetchGoogleReviews(accessToken);

      const imported = await prisma.testimonial.createMany({
        data: reviews.map((r: any) => ({
          author: r.author,
          content: r.content,
          rating: r.rating,
          source: 'google',
          sourceUrl: r.sourceUrl,
          externalId: r.externalId,
          isApproved: false,
          importedAt: new Date(),
        })),
        skipDuplicates: true,
      });

      res.json({
        success: true,
        imported: imported.count,
        message: `Imported ${imported.count} reviews. Awaiting approval.`,
      });
    } catch (error: any) {
      console.error('Import error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to import reviews',
      });
    }
  });

  // Approval workflow endpoints
  app.patch('/api/testimonials/:id/approve', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await prisma.testimonial.update({
        where: { id },
        data: { isApproved: true },
      });
      res.json({ success: true, data: updated });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to approve testimonial' });
    }
  });

  app.delete('/api/testimonials/:id/reject', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await prisma.testimonial.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: 'Failed to reject testimonial' });
    }
  });

  // Get pending reviews (admin only)
  app.get('/api/testimonials/pending', requireAdmin, async (req, res) => {
    try {
      const pending = await prisma.testimonial.findMany({
        where: { isApproved: false },
        orderBy: { importedAt: 'desc' },
      });
      res.json(pending);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch pending testimonials' });
    }
  });

  // Check Google connection status
  app.get('/api/auth/google/status', requireAdmin, async (req, res) => {
    try {
      const token = await prisma.oAuthToken.findUnique({
        where: { service: 'google' },
      });
      res.json({ connected: Boolean(token) });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  // Square OAuth endpoints
  app.get("/api/square/config", requireAdmin, async (_req, res) => {
    if (!ensureSquareEnabled(res)) {
      return;
    }
    try {
      const summary = await getSquareConfigSummary();
      res.json({ enabled: true, ...summary });
    } catch (_error) {
      res.status(500).json({ enabled: true, connected: false, message: "Failed to load Square config" });
    }
  });

  app.post("/api/square/connect", requireAdmin, (_req, res) => {
    if (!ensureSquareEnabled(res)) {
      return;
    }
    try {
      const { url } = buildSquareAuthUrl();
      res.json({ url });
    } catch (_error) {
      res.status(500).json({ message: "Failed to start Square OAuth" });
    }
  });

  app.get("/api/square/callback", async (req, res) => {
    if (process.env.SQUARE_ENABLED !== "true") {
      res.status(403).send("<html><body><h1>Square is not enabled.</h1></body></html>");
      return;
    }

    const rateLimit = checkPublicWriteRateLimit(req);
    if (rateLimit.limited) {
      res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
      res.status(429).send("<html><body><h1>Too many requests</h1><p>Please try again later.</p></body></html>");
      return;
    }

    const { code, state } = req.query;
    if (!code || typeof code !== "string" || !state || typeof state !== "string") {
      res.status(400).send("<html><body><h1>Error: Missing authorization code.</h1></body></html>");
      return;
    }

    try {
      await exchangeSquareCode(code, state);
      res.send(`
        <html>
          <body>
            <h1>Square Account Connected!</h1>
            <p>You can now close this window and return to the admin dashboard.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 2000);
            </script>
          </body>
        </html>
      `);
    } catch (_error) {
      res.status(400).send("<html><body><h1>OAuth Error</h1><p>Failed to connect Square account.</p></body></html>");
    }
  });

  app.post("/api/square/disconnect", requireAdmin, async (_req, res) => {
    if (!ensureSquareEnabled(res)) {
      return;
    }
    try {
      await disconnectSquare();
      res.json({ success: true });
    } catch (_error) {
      res.status(500).json({ success: false, message: "Failed to disconnect Square" });
    }
  });

  app.post("/api/square/catalog/import", requireAdmin, async (_req, res) => {
    if (!ensureSquareSyncEnabled(res)) {
      return;
    }
    try {
      const result = await importSquareCatalog();
      res.json({ success: true, ...result });
    } catch (_error) {
      res.status(500).json({ success: false, message: "Failed to import Square catalog" });
    }
  });

  app.post("/api/square/catalog/sync", requireAdmin, async (_req, res) => {
    if (!ensureSquareSyncEnabled(res)) {
      return;
    }
    try {
      const result = await importSquareCatalog();
      res.json({ success: true, ...result });
    } catch (_error) {
      res.status(500).json({ success: false, message: "Failed to sync Square catalog" });
    }
  });

  app.post("/api/cron/square-sync", async (req, res) => {
    if (!ensureCronAuthorized(req, res)) {
      return;
    }
    if (!ensureSquareSyncEnabled(res)) {
      return;
    }
    try {
      const result = await importSquareCatalog();
      res.json({ success: true, ...result });
    } catch (_error) {
      res.status(500).json({ success: false, message: "Failed to sync Square catalog" });
    }
  });

  // Register Square webhooks programmatically (admin-only, one-time setup)
  app.post("/api/square/webhooks/register", async (req, res) => {
    const authUser = await getUserFromRequest(req);
    if (!authUser || !(await isUserAdmin(authUser.userId, prisma))) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    try {
      const client = createSquareClient();
      const notificationUrl = "https://millanluxurycleaning.com/api/webhooks/square";

      // Check for existing subscriptions first
      const existingSubs: { id?: string; notificationUrl?: string | null }[] = [];
      try {
        const subsPage = await client.webhooks.subscriptions.list();
        if (subsPage.data) {
          for (const sub of subsPage.data) {
            existingSubs.push(sub);
          }
        }
      } catch {
        // No existing subscriptions or API error — continue
      }
      const alreadyRegistered = existingSubs.find((s) => s.notificationUrl === notificationUrl);

      if (alreadyRegistered) {
        // Update existing subscription with all event types
        const updated = await client.webhooks.subscriptions.update({
          subscriptionId: alreadyRegistered.id!,
          subscription: {
            name: "Millan Luxury Auto-Sync",
            enabled: true,
            eventTypes: [
              "catalog.version.updated",
              "inventory.count.updated",
              "payment.completed",
              "refund.created",
              "refund.updated",
              "booking.created",
              "booking.updated",
            ],
          },
        });
        res.json({
          success: true,
          action: "updated",
          subscriptionId: updated.subscription?.id,
          signatureKey: updated.subscription?.signatureKey ?? "Check Square Dashboard",
        });
      } else {
        // Create new subscription
        const created = await client.webhooks.subscriptions.create({
          idempotencyKey: randomBytes(16).toString("hex"),
          subscription: {
            name: "Millan Luxury Auto-Sync",
            notificationUrl,
            enabled: true,
            eventTypes: [
              "catalog.version.updated",
              "inventory.count.updated",
              "payment.completed",
              "refund.created",
              "refund.updated",
              "booking.created",
              "booking.updated",
            ],
            apiVersion: "2025-01-23",
          },
        });
        res.json({
          success: true,
          action: "created",
          subscriptionId: created.subscription?.id,
          signatureKey: created.subscription?.signatureKey,
          message: "Add the signatureKey as SQUARE_WEBHOOK_SIGNATURE_KEY in Vercel env vars",
        });
      }
    } catch (error) {
      console.error("[API] Webhook registration error:", error);
      const msg = error instanceof Error ? error.message : "Failed to register webhooks";
      res.status(500).json({ success: false, message: msg });
    }
  });

  // List all Square webhook subscriptions (admin-only, for debugging)
  app.get("/api/square/webhooks/list", async (req, res) => {
    const authUser = await getUserFromRequest(req);
    if (!authUser || !(await isUserAdmin(authUser.userId, prisma))) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    try {
      const client = createSquareClient();
      const subs: { id?: string; name?: string; notificationUrl?: string | null; enabled?: boolean; eventTypes?: string[]; signatureKey?: string | null }[] = [];
      const subsPage = await client.webhooks.subscriptions.list();
      if (subsPage.data) {
        for (const sub of subsPage.data) {
          subs.push({
            id: sub.id,
            name: sub.name ?? undefined,
            notificationUrl: sub.notificationUrl ?? undefined,
            enabled: sub.enabled ?? undefined,
            eventTypes: sub.eventTypes ?? undefined,
            signatureKey: sub.signatureKey ?? undefined,
          });
        }
      }
      res.json({ success: true, subscriptions: subs });
    } catch (error) {
      console.error("[API] Webhook list error:", error);
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Failed to list webhooks" });
    }
  });

  // Delete a Square webhook subscription by ID (admin-only)
  app.delete("/api/square/webhooks/:subscriptionId", async (req, res) => {
    const authUser = await getUserFromRequest(req);
    if (!authUser || !(await isUserAdmin(authUser.userId, prisma))) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    try {
      const client = createSquareClient();
      await client.webhooks.subscriptions.delete({ subscriptionId: req.params.subscriptionId });
      res.json({ success: true, deleted: req.params.subscriptionId });
    } catch (error) {
      console.error("[API] Webhook delete error:", error);
      res.status(500).json({ success: false, message: error instanceof Error ? error.message : "Failed to delete webhook" });
    }
  });

  // Public test endpoint to verify Square API connection
  app.get("/api/square/test", async (_req, res) => {
    if (process.env.SQUARE_ENABLED !== "true") {
      res.json({ enabled: false, message: "Square is not enabled" });
      return;
    }
    try {
      const client = createSquareClient();
      // SDK v43 - catalog.list returns { response, data }
      const result = await client.catalog.list({});
      const items = (result.data || []).filter((obj) => obj.type === "ITEM");
      const catalogItems = items.slice(0, 5).map((obj) => ({
        id: obj.id,
        name: obj.itemData?.name,
      }));
      res.json({
        enabled: true,
        connected: true,
        environment: process.env.SQUARE_ENVIRONMENT || "sandbox",
        catalogItemCount: items.length,
        sampleItems: catalogItems
      });
    } catch (error) {
      res.json({
        enabled: true,
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/webhooks/square", async (req, res) => {
    if (process.env.SQUARE_ENABLED !== "true") {
      res.status(503).json({ message: "Square is not enabled" });
      return;
    }

    const rateLimit = checkPublicWriteRateLimit(req);
    if (rateLimit.limited) {
      res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
      res.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    try {
      if (!isValidSquareWebhookSignature(req)) {
        res.status(401).json({ message: "Invalid Square webhook signature" });
        return;
      }
    } catch (error) {
      console.error("Square webhook signature validation failed", error);
      res.status(500).json({ message: "Failed to validate webhook signature" });
      return;
    }

    const eventType = (req.body?.type ?? req.body?.event_type ?? "unknown") as string;
    const eventId = (req.body?.event_id ?? req.body?.id ?? null) as string | null;
    const eventData = req.body?.data?.object;

    console.log(`[SquareWebhook] type=${eventType} id=${eventId ?? "unknown"}`);

    try {
      switch (eventType) {
        case "payment.completed": {
          const payment = eventData?.payment;
          if (payment?.order_id || payment?.orderId) {
            const orderId = payment.order_id || payment.orderId;
            // Idempotency: only upgrade pending → approved, never downgrade
            await prisma.affiliateConversion.updateMany({
              where: {
                squareOrderId: orderId,
                status: "pending",
              },
              data: {
                status: "approved",
                approvedAt: new Date(),
              },
            });
          }
          break;
        }

        case "refund.created":
        case "refund.updated": {
          const refund = eventData?.refund;
          if (refund && (refund.order_id || refund.orderId)) {
            const orderId = refund.order_id || refund.orderId;
            const refundStatus = refund.status ?? "";
            if (refundStatus === "COMPLETED" || refundStatus === "APPROVED") {
              await prisma.affiliateConversion.updateMany({
                where: {
                  squareOrderId: orderId,
                  status: { not: "refunded" },
                },
                data: {
                  status: "refunded",
                },
              });
              await prisma.order.updateMany({
                where: { squareOrderId: orderId },
                data: { status: "refunded" },
              });
            }
          }
          break;
        }

        case "catalog.version.updated": {
          // Debounce: skip if synced within last 60 seconds
          const now = Date.now();
          if (now - lastCatalogSyncAt < 60_000) {
            console.log("[Webhook] Catalog sync debounced (last sync <60s ago)");
            break;
          }
          lastCatalogSyncAt = now;
          console.log("[Webhook] Catalog updated, triggering auto-sync");
          importSquareCatalog().catch((err) =>
            console.error("[Webhook] Catalog sync error:", err)
          );
          break;
        }

        case "inventory.count.updated": {
          const counts = req.body?.data?.object?.inventory_counts ??
            req.body?.data?.object?.inventoryCounts ?? [];
          if (Array.isArray(counts) && counts.length > 0) {
            let updated = 0;
            for (const count of counts) {
              const variationId = count.catalog_object_id ?? count.catalogObjectId;
              const quantity = parseInt(count.quantity ?? "0", 10);
              if (variationId) {
                const result = await prisma.fragranceProduct.updateMany({
                  where: { squareVariationId: variationId },
                  data: { inventoryCount: quantity },
                });
                updated += result.count;
              }
            }
            console.log(`[Webhook] Inventory updated for ${updated} products`);
          }
          break;
        }

        case "booking.created": {
          const bookingData = eventData?.booking;
          if (bookingData?.id) {
            // Check if we already have this booking (created via our site)
            const existing = await prisma.booking.findFirst({
              where: { squareBookingId: bookingData.id },
            });
            if (!existing) {
              // Booking was created externally (e.g., Square Dashboard)
              console.log(`[Webhook] External booking created: ${bookingData.id}`);

              // Try to look up customer email from Square
              let customerEmail = "";
              let customerName = "Square Booking";
              const custId = bookingData.customer_id ?? bookingData.customerId;
              if (custId && process.env.SQUARE_ENABLED === "true") {
                try {
                  const client = createSquareClient();
                  const custResp = await client.customers.get({ customerId: custId });
                  customerEmail = custResp.customer?.emailAddress ?? "";
                  const first = custResp.customer?.givenName ?? "";
                  const last = custResp.customer?.familyName ?? "";
                  customerName = [first, last].filter(Boolean).join(" ") || "Square Booking";
                } catch (custErr) {
                  console.warn("[Webhook] Could not look up customer:", custErr);
                }
              }

              // Map Square status to local status values
              const rawStatus = (bookingData.status ?? "pending").toUpperCase();
              const mappedStatus = mapSquareBookingStatus(rawStatus);

              try {
                await prisma.booking.create({
                  data: {
                    squareBookingId: bookingData.id,
                    customerId: custId ?? null,
                    customerEmail,
                    customerName,
                    serviceAddress: "",
                    serviceCity: "",
                    serviceState: "",
                    serviceZip: "",
                    serviceId: 0,
                    teamMemberId: bookingData.appointment_segments?.[0]?.team_member_id ?? null,
                    startAt: new Date(bookingData.start_at ?? bookingData.startAt ?? new Date()),
                    endAt: new Date(bookingData.start_at ?? bookingData.startAt ?? new Date()),
                    status: mappedStatus,
                    notes: bookingData.customer_note ?? bookingData.customerNote ?? null,
                  },
                });
              } catch (createErr) {
                console.error("[Webhook] Failed to create external booking record:", createErr);
              }
            } else {
              console.log(`[Webhook] Booking ${bookingData.id} already exists locally`);
            }
          }
          break;
        }

        case "booking.updated": {
          const updatedBooking = eventData?.booking;
          if (updatedBooking?.id) {
            const rawStatus = updatedBooking.status ?? updatedBooking.booking_status;
            if (rawStatus) {
              const mappedStatus = mapSquareBookingStatus(rawStatus.toUpperCase());
              const result = await prisma.booking.updateMany({
                where: { squareBookingId: updatedBooking.id },
                data: { status: mappedStatus },
              });
              console.log(`[Webhook] Booking ${updatedBooking.id} status ${rawStatus} → ${mappedStatus} (${result.count} updated)`);
            }
          }
          break;
        }
      }
    } catch (webhookError) {
      console.error("[SquareWebhook] Processing error:", webhookError);
      // Still return 200 to avoid Square retries
    }

    res.status(200).json({ received: true });
  });

  // Cart endpoints
  app.get("/api/cart", async (req, res) => {
    try {
      const sessionId = resolveCartSessionId(req);
      const authUser = await resolveOptionalAuthUser(req);
      const now = new Date();

      let cart =
        (authUser
          ? await prisma.cart.findFirst({
              where: { userId: authUser.userId },
              include: { items: true },
            })
          : null) ??
        (sessionId
          ? await prisma.cart.findFirst({
              where: { sessionId },
              include: { items: true },
            })
          : null);

      if (cart && cart.expiresAt < now) {
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        await prisma.cart.delete({ where: { id: cart.id } });
        cart = null;
      }

      if (!cart) {
        const newSessionId = sessionId ?? createCartSessionId();
        cart = await prisma.cart.create({
          data: {
            sessionId: newSessionId,
            userId: authUser?.userId ?? null,
            expiresAt: touchCartExpiry(),
          },
          include: { items: true },
        });
      } else if (authUser && !cart.userId) {
        cart = await prisma.cart.update({
          where: { id: cart.id },
          data: { userId: authUser.userId, expiresAt: touchCartExpiry() },
          include: { items: true },
        });
      }

      if (cart.sessionId) {
        res.setHeader("X-Cart-Session", cart.sessionId);
      }

      res.json(await buildCartResponse(cart));
    } catch (error) {
      console.error("[API] Error in GET /api/cart:", error);
      res.status(500).json({ message: "Failed to load cart" });
    }
  });

  app.post("/api/cart/items", async (req, res) => {
    const rateLimit = checkPublicWriteRateLimit(req);
    if (rateLimit.limited) {
      res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
      res.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    try {
      const payload = createCartItemSchema.parse(req.body);
      const sessionId = resolveCartSessionId(req) ?? createCartSessionId();
      const authUser = await resolveOptionalAuthUser(req);
      const now = new Date();

      let cart =
        (authUser
          ? await prisma.cart.findFirst({
              where: { userId: authUser.userId },
              include: { items: true },
            })
          : null) ??
        (sessionId
          ? await prisma.cart.findFirst({
              where: { sessionId },
              include: { items: true },
            })
          : null);

      if (cart && cart.expiresAt < now) {
        await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
        await prisma.cart.delete({ where: { id: cart.id } });
        cart = null;
      }

      if (!cart) {
        cart = await prisma.cart.create({
          data: {
            sessionId,
            userId: authUser?.userId ?? null,
            expiresAt: touchCartExpiry(),
          },
          include: { items: true },
        });
      }

      const product = await prisma.fragranceProduct.findFirst({
        where: {
          id: payload.productId,
          isVisible: true,
          squareCatalogId: { not: null },
        },
      });

      if (!product) {
        res.status(404).json({ message: "Product not found" });
        return;
      }

      const unitPrice = Number(product.salePrice ?? product.price);
      const existing = await prisma.cartItem.findFirst({
        where: { cartId: cart.id, productId: product.id },
      });

      if (existing) {
        await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + payload.quantity, price: unitPrice },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            quantity: payload.quantity,
            price: unitPrice,
          },
        });
      }

      await prisma.cart.update({
        where: { id: cart.id },
        data: { updatedAt: new Date(), expiresAt: touchCartExpiry() },
      });

      const refreshed = await prisma.cart.findUnique({
        where: { id: cart.id },
        include: { items: true },
      });

      if (!refreshed) {
        res.status(500).json({ message: "Cart no longer available" });
        return;
      }

      res.setHeader("X-Cart-Session", cart.sessionId ?? sessionId);
      res.json(await buildCartResponse(refreshed));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid cart item", errors: error.issues });
        return;
      }
      console.error("[API] Error in POST /api/cart/items:", error);
      res.status(500).json({ message: "Failed to add item to cart" });
    }
  });

  app.patch("/api/cart/items/:id", async (req, res) => {
    const rateLimit = checkPublicWriteRateLimit(req);
    if (rateLimit.limited) {
      res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
      res.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    try {
      const itemId = Number(req.params.id);
      if (!Number.isFinite(itemId)) {
        res.status(400).json({ message: "Invalid cart item id" });
        return;
      }

      const payload = updateCartItemSchema.parse(req.body);
      const sessionId = resolveCartSessionId(req);
      const authUser = await resolveOptionalAuthUser(req);

      const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
      if (!item) {
        res.status(404).json({ message: "Cart item not found" });
        return;
      }

      const cart = await prisma.cart.findUnique({
        where: { id: item.cartId },
        include: { items: true },
      });

      if (!cart) {
        res.status(404).json({ message: "Cart not found" });
        return;
      }

      const hasAccess =
        (authUser && cart.userId === authUser.userId) ||
        (sessionId && cart.sessionId === sessionId);

      if (!hasAccess) {
        res.status(403).json({ message: "Cart access denied" });
        return;
      }

      await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity: payload.quantity },
      });
      await prisma.cart.update({
        where: { id: cart.id },
        data: { updatedAt: new Date(), expiresAt: touchCartExpiry() },
      });

      const refreshed = await prisma.cart.findUnique({
        where: { id: cart.id },
        include: { items: true },
      });

      if (!refreshed) {
        res.status(500).json({ message: "Cart no longer available" });
        return;
      }

      res.json(await buildCartResponse(refreshed));
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid cart update", errors: error.issues });
        return;
      }
      console.error("[API] Error in PATCH /api/cart/items:", error);
      res.status(500).json({ message: "Failed to update cart item" });
    }
  });

  app.delete("/api/cart/items/:id", async (req, res) => {
    const rateLimit = checkPublicWriteRateLimit(req);
    if (rateLimit.limited) {
      res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
      res.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    try {
      const itemId = Number(req.params.id);
      if (!Number.isFinite(itemId)) {
        res.status(400).json({ message: "Invalid cart item id" });
        return;
      }

      const sessionId = resolveCartSessionId(req);
      const authUser = await resolveOptionalAuthUser(req);

      const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
      if (!item) {
        res.status(404).json({ message: "Cart item not found" });
        return;
      }

      const cart = await prisma.cart.findUnique({
        where: { id: item.cartId },
        include: { items: true },
      });

      if (!cart) {
        res.status(404).json({ message: "Cart not found" });
        return;
      }

      const hasAccess =
        (authUser && cart.userId === authUser.userId) ||
        (sessionId && cart.sessionId === sessionId);

      if (!hasAccess) {
        res.status(403).json({ message: "Cart access denied" });
        return;
      }

      await prisma.cartItem.delete({ where: { id: itemId } });
      await prisma.cart.update({
        where: { id: cart.id },
        data: { updatedAt: new Date(), expiresAt: touchCartExpiry() },
      });

      const refreshed = await prisma.cart.findUnique({
        where: { id: cart.id },
        include: { items: true },
      });

      if (!refreshed) {
        res.status(500).json({ message: "Cart no longer available" });
        return;
      }

      res.json(await buildCartResponse(refreshed));
    } catch (error) {
      console.error("[API] Error in DELETE /api/cart/items:", error);
      res.status(500).json({ message: "Failed to remove cart item" });
    }
  });

  app.delete("/api/cart", async (req, res) => {
    const rateLimit = checkPublicWriteRateLimit(req);
    if (rateLimit.limited) {
      res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
      res.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    try {
      const sessionId = resolveCartSessionId(req);
      const authUser = await resolveOptionalAuthUser(req);

      const cart =
        (authUser
          ? await prisma.cart.findFirst({
              where: { userId: authUser.userId },
              include: { items: true },
            })
          : null) ??
        (sessionId
          ? await prisma.cart.findFirst({
              where: { sessionId },
              include: { items: true },
            })
          : null);

      if (!cart) {
        res.status(404).json({ message: "Cart not found" });
        return;
      }

      const hasAccess =
        (authUser && cart.userId === authUser.userId) ||
        (sessionId && cart.sessionId === sessionId);

      if (!hasAccess) {
        res.status(403).json({ message: "Cart access denied" });
        return;
      }

      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cart.update({
        where: { id: cart.id },
        data: { updatedAt: new Date(), expiresAt: touchCartExpiry() },
      });

      const refreshed = await prisma.cart.findUnique({
        where: { id: cart.id },
        include: { items: true },
      });

      if (!refreshed) {
        res.status(500).json({ message: "Cart no longer available" });
        return;
      }

      res.json(await buildCartResponse(refreshed));
    } catch (error) {
      console.error("[API] Error in DELETE /api/cart:", error);
      res.status(500).json({ message: "Failed to clear cart" });
    }
  });

  // Checkout and payments
  app.post("/api/checkout/payment", async (req, res) => {
    if (!ensureSquareEnabled(res)) {
      return;
    }

    const rateLimit = checkPublicWriteRateLimit(req);
    if (rateLimit.limited) {
      res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
      res.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    const addressSchema = z.object({
      addressLine1: z.string().optional(),
      addressLine2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    });

    const checkoutSchema = z.object({
      cartId: z.string().min(1),
      sourceId: z.string().min(1),
      verificationToken: z.string().min(1).optional(),
      buyerName: z.string().optional(),
      buyerEmail: z.string().email().optional(),
      buyerPhone: z.string().optional(),
      shippingAddress: addressSchema.optional(),
      billingAddress: addressSchema.optional(),
      // Service delivery (products delivered with a booking)
      bookingId: z.number().int().positive().optional(),
      fulfillmentType: z.enum(["shipment", "pickup", "service_delivery"]).optional(),
      bookingDate: z.string().optional(),
      discountCode: z.string().optional(),
    });

    try {
      const payload = checkoutSchema.parse(req.body);
      const sessionId = resolveCartSessionId(req);
      const authUser = await resolveOptionalAuthUser(req);

      const cart = await prisma.cart.findUnique({
        where: { id: payload.cartId },
        include: { items: true },
      });

      if (!cart) {
        res.status(404).json({ message: "Cart not found" });
        return;
      }

      const hasAccess =
        (authUser && cart.userId === authUser.userId) ||
        (sessionId && cart.sessionId === sessionId);

      if (!hasAccess) {
        res.status(403).json({ message: "Cart access denied" });
        return;
      }

      if (!cart.items.length) {
        res.status(400).json({ message: "Cart is empty" });
        return;
      }

      // Read affiliate attribution cookie (HMAC-signed, first-touch)
      const affiliateAttribution = await readAffiliateCookie(req, prisma);
      const affiliateId = affiliateAttribution?.affiliateId ?? null;

      const productIds = cart.items.map((item) => item.productId);
      const products = await prisma.fragranceProduct.findMany({
        where: { id: { in: productIds } },
      });
      const productMap = new Map(products.map((product) => [product.id, product]));

      const lineItems = cart.items.map((item) => {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error("Product not found for cart item");
        }
        const price = Number(item.price);
        const amount = BigInt(Math.round(price * 100));
        // Include fragrance info in the name if not "Signature"
        const displayName = product.fragrance && product.fragrance !== "Signature"
          ? `${product.name} (${product.fragrance})`
          : product.name;
        return {
          name: displayName,
          quantity: String(item.quantity),
          basePriceMoney: {
            amount,
            currency: Currency.Usd,
          },
          catalogObjectId: product.squareVariationId ?? undefined,
        };
      });

      const isServiceDelivery = payload.fulfillmentType === "service_delivery";
      const isPickupOrder = payload.fulfillmentType === "pickup";
      const FLAT_SHIPPING_CENTS = (isServiceDelivery || isPickupOrder) ? 0 : 999; // $0 for service/pickup, $9.99 for shipment
      const subtotal = cart.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
      const shipping = FLAT_SHIPPING_CENTS / 100;

      // Validate and apply discount code
      let discountRecord: { id: number; code: string; discountPct: number } | null = null;
      let discountAmount = 0;
      if (payload.discountCode) {
        const upperCode = payload.discountCode.toUpperCase();
        if (upperCode === "REVIEW5") {
          // Static review reward — no DB record, always 5% off
          discountAmount = Math.round((subtotal * 5) / 100 * 100) / 100;
        } else {
          const dc = await prisma.discountCode.findUnique({ where: { code: upperCode } });
          if (dc && !dc.usedAt) {
            discountRecord = dc;
            discountAmount = Math.round((subtotal * dc.discountPct) / 100 * 100) / 100;
          }
        }
      }

      const total = Math.max(0, subtotal + shipping - discountAmount);
      const totalAmount = BigInt(Math.round(total * 100));

      const accessToken = await resolveSquareAccessToken();
      const locationId =
        process.env.SQUARE_LOCATION_ID ||
        process.env.SQUARE_LOCATION_ID_FRAGRANCE ||
        (await resolveSquareLocationId(accessToken));
      const client = createSquareClient(accessToken);
      const orderIdempotencyKey = randomBytes(16).toString("hex");
      const paymentIdempotencyKey = randomBytes(16).toString("hex");

      // Build fulfillment so the order shows as an active ticket in Square
      const shipAddr = payload.shippingAddress;
      const fulfillmentAddress = shipAddr?.addressLine1
        ? {
            addressLine1: shipAddr.addressLine1,
            addressLine2: shipAddr.addressLine2 || undefined,
            locality: shipAddr.city || undefined,
            administrativeDistrictLevel1: shipAddr.state || undefined,
            postalCode: shipAddr.postalCode || undefined,
            country: Country.Us,
          }
        : undefined;

      // Build line items: include shipping only for standard shipment
      const orderLineItems = [
        ...lineItems,
        ...((isServiceDelivery || isPickupOrder || FLAT_SHIPPING_CENTS === 0)
          ? []
          : [
              {
                name: "Shipping",
                quantity: "1",
                basePriceMoney: {
                  amount: BigInt(FLAT_SHIPPING_CENTS),
                  currency: Currency.Usd,
                },
              },
            ]),
      ];

      // Apply discount as a negative line item if a valid code was provided
      const orderDiscounts = discountRecord
        ? [
            {
              name: `Welcome Discount (${discountRecord.discountPct}% off)`,
              percentage: String(discountRecord.discountPct),
              scope: "ORDER" as const,
            },
          ]
        : undefined;

      const storePickupAddress = {
        addressLine1: "811 N 3rd St",
        locality: "Phoenix",
        administrativeDistrictLevel1: "AZ",
        postalCode: "85004",
        country: Country.Us,
      };

      // Build fulfillment based on delivery type
      const fulfillment = isServiceDelivery
        ? {
            type: FulfillmentType.Pickup,
            state: FulfillmentState.Proposed,
            pickupDetails: {
              recipient: {
                displayName: payload.buyerName || "Customer",
                emailAddress: payload.buyerEmail || undefined,
                phoneNumber: payload.buyerPhone || undefined,
              },
              note: `Deliver with booking #${payload.bookingId}${payload.bookingDate ? ` on ${payload.bookingDate}` : ""}`,
            },
          }
        : isPickupOrder
        ? {
            type: FulfillmentType.Pickup,
            state: FulfillmentState.Proposed,
            pickupDetails: {
              recipient: {
                displayName: payload.buyerName || "Customer",
                emailAddress: payload.buyerEmail || undefined,
                phoneNumber: payload.buyerPhone || undefined,
                address: storePickupAddress,
              },
              note: "Store pickup — Millan Luxury Cleaning · 811 N 3rd St, Phoenix, AZ 85004",
            },
          }
        : {
            type: FulfillmentType.Shipment,
            state: FulfillmentState.Proposed,
            shipmentDetails: {
              recipient: {
                displayName: payload.buyerName || "Customer",
                emailAddress: payload.buyerEmail || undefined,
                phoneNumber: payload.buyerPhone || undefined,
                address: fulfillmentAddress,
              },
            },
          };

      const orderMetadata: Record<string, string> = {};
      if (affiliateId) orderMetadata.affiliate_id = String(affiliateId);
      if (payload.bookingId) orderMetadata.booking_id = String(payload.bookingId);

      const orderResponse = await client.orders.create({
        idempotencyKey: orderIdempotencyKey,
        order: {
          locationId,
          state: "OPEN",
          referenceId: payload.buyerEmail || undefined,
          source: { name: "Millan Luxury Website" },
          lineItems: orderLineItems,
          ...(orderDiscounts ? { discounts: orderDiscounts } : {}),
          fulfillments: [fulfillment],
          ...(Object.keys(orderMetadata).length > 0 ? { metadata: orderMetadata } : {}),
        },
      });

      const squareOrder = orderResponse.order;
      if (!squareOrder?.id) {
        res.status(500).json({ message: "Failed to create Square order" });
        return;
      }

      // Use Square's calculated total to avoid rounding mismatches
      const squareTotal = squareOrder.totalMoney?.amount ?? totalAmount;

      const paymentResponse = await client.payments.create({
        idempotencyKey: paymentIdempotencyKey,
        sourceId: payload.sourceId,
        verificationToken: payload.verificationToken,
        amountMoney: { amount: squareTotal, currency: Currency.Usd },
        orderId: squareOrder.id,
        locationId,
        buyerEmailAddress: payload.buyerEmail ?? authUser?.email ?? undefined,
      });

      const payment = paymentResponse.payment;
      if (!payment?.id) {
        res.status(500).json({ message: "Payment failed" });
        return;
      }

      // Fetch the latest order version after payment (Square increments version on payment)
      // then advance fulfillment PROPOSED → RESERVED so the order stays OPEN/Active
      // in Square Dashboard and customers can track it.
      const fulfillmentUid = squareOrder.fulfillments?.[0]?.uid;
      if (fulfillmentUid) {
        try {
          const latestOrder = await client.orders.get({ orderId: squareOrder.id! });
          const latestVersion = latestOrder.order?.version ?? squareOrder.version;
          await client.orders.update({
            orderId: squareOrder.id!,
            order: {
              locationId,
              version: latestVersion,
              fulfillments: [
                {
                  uid: fulfillmentUid,
                  state: FulfillmentState.Reserved,
                },
              ],
            },
          });
        } catch (fulfillErr) {
          console.error("[Checkout] Failed to advance fulfillment to RESERVED:", fulfillErr);
          // Non-fatal — order and payment are still valid
        }
      }

      const email = payload.buyerEmail ?? authUser?.email ?? "";

      const shippingAddressJson = payload.shippingAddress
        ? (payload.shippingAddress as Prisma.InputJsonValue)
        : Prisma.DbNull;
      const billingAddressJson = payload.billingAddress
        ? (payload.billingAddress as Prisma.InputJsonValue)
        : Prisma.DbNull;

      // Mark discount code as used (non-fatal if it fails)
      if (discountRecord) {
        try {
          await prisma.discountCode.update({
            where: { id: discountRecord.id },
            data: { usedAt: new Date() },
          });
        } catch (dcErr) {
          console.error("[Checkout] Failed to mark discount code as used:", dcErr);
        }
      }

      const orderRecord = await prisma.order.create({
        data: {
          squareOrderId: squareOrder.id,
          userId: authUser?.userId ?? null,
          email,
          status: payment.status === "COMPLETED" ? "paid" : "pending",
          total: Number(total.toFixed(2)),
          subtotal: Number(subtotal.toFixed(2)),
          tax: 0,
          shipping: Number(shipping.toFixed(2)),
          paymentId: payment.id,
          affiliateId,
          bookingId: payload.bookingId ?? null,
          fulfillmentType: isServiceDelivery ? "service_delivery" : isPickupOrder ? "pickup" : "shipment",
          shippingAddress: shippingAddressJson,
          billingAddress: billingAddressJson,
          items: {
            create: cart.items.map((item) => {
              const product = productMap.get(item.productId);
              const displayName = product?.fragrance && product.fragrance !== "Signature"
                ? `${product.name} (${product.fragrance})`
                : product?.name ?? "Item";
              return {
                productId: item.productId,
                name: displayName,
                quantity: item.quantity,
                price: Number(item.price),
                sku: product?.sku ?? null,
              };
            }),
          },
        },
      });

      // Create affiliate conversion if attributed
      if (affiliateId && affiliateAttribution) {
        try {
          const commissionRate = Number(affiliateAttribution.affiliate.commissionRate);
          const grossAmount = Number(total.toFixed(2));
          const netAmount = Number(subtotal.toFixed(2));
          const commissionAmount = Number((netAmount * commissionRate).toFixed(2));

          await prisma.affiliateConversion.create({
            data: {
              affiliateId,
              orderId: orderRecord.id,
              squareOrderId: squareOrder.id,
              grossAmount,
              netAmount,
              commissionAmount,
              source: "native_checkout",
              status: payment.status === "COMPLETED" ? "approved" : "pending",
              approvedAt: payment.status === "COMPLETED" ? new Date() : null,
            },
          });
        } catch (conversionError) {
          // Log but don't fail the payment
          console.error("[Affiliate] Failed to create conversion:", conversionError);
        }
      }

      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      await prisma.cart.update({
        where: { id: cart.id },
        data: { updatedAt: new Date(), expiresAt: touchCartExpiry() },
      });

      // Send order emails — await with retry, but don't block order success
      const orderItems = cart.items.map((item) => {
        const product = productMap.get(item.productId);
        const displayName = product?.fragrance && product.fragrance !== "Signature"
          ? `${product.name} (${product.fragrance})`
          : product?.name ?? "Item";
        return { name: displayName, quantity: item.quantity, price: Number(item.price) };
      });

      const orderEmailResults = await Promise.allSettled([
        sendOrderNotificationEmail({
          orderId: orderRecord.id,
          customerName: payload.buyerName || "Customer",
          customerEmail: email,
          customerPhone: payload.buyerPhone,
          total,
          shipping,
          shippingAddress: payload.shippingAddress,
          items: orderItems,
        }),
        sendOrderConfirmationEmail({
          orderId: orderRecord.id,
          customerName: payload.buyerName || "Customer",
          customerEmail: email,
          subtotal,
          shipping,
          tax: 0,
          total,
          items: orderItems,
          shippingAddress: payload.shippingAddress,
        }),
      ]);
      for (const result of orderEmailResults) {
        if (result.status === "rejected") {
          console.error("[CRITICAL] Order email failed after retries:", result.reason);
        }
      }

      res.json({
        success: true,
        orderId: orderRecord.id,
        squareOrderId: squareOrder.id,
        paymentId: payment.id,
        status: payment.status,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid checkout payload", errors: error.issues });
        return;
      }
      console.error("[API] Error in POST /api/checkout/payment:", error);
      const squareErrors =
        typeof error === "object" && error && "errors" in error
          ? (error as { errors?: { code?: string; detail?: string }[] }).errors
          : undefined;
      const squareMessage = Array.isArray(squareErrors)
        ? squareErrors
            .map((squareError) => squareError?.detail || squareError?.code)
            .filter(Boolean)
            .join("; ")
        : "";
      res.status(500).json({
        message: squareMessage ? `Failed to process payment: ${squareMessage}` : "Failed to process payment",
      });
    }
  });

  // Booking endpoints
  app.get("/api/bookings/availability", async (req, res) => {
    if (!ensureSquareEnabled(res)) {
      return;
    }

    try {
      const querySchema = z.object({
        serviceId: z.coerce.number().int().positive(),
        startAt: z.string().datetime(),
        endAt: z.string().datetime().optional(),
        variationId: z.string().optional(), // override when a specific size tier is selected
      });

      const parsed = querySchema.parse(req.query);
      const serviceId = parsed.serviceId;
      const startAt = parsed.startAt;
      const endAt = parsed.endAt ?? new Date(new Date(startAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const requestedVariationId = parsed.variationId ?? null;

      const service = await prisma.serviceItem.findUnique({ where: { id: serviceId } });

      if (!service?.squareServiceId) {
        res.status(404).json({ message: "Service not found" });
        return;
      }

      const accessToken = await resolveSquareAccessToken();
      const locationId = await resolveSquareLocationId(accessToken);
      const client = createSquareClient(accessToken);

      const catalogResponse = await client.catalog.batchGet({
        objectIds: [service.squareServiceId],
        includeRelatedObjects: true,
      });

      const catalogItem = catalogResponse.objects?.[0];
      if (!catalogItem || catalogItem.type !== "ITEM" || !catalogItem.itemData?.variations?.length) {
        res.status(500).json({ message: "Service variation not available" });
        return;
      }

      // Use the requested variation (for size-based tiers) or fall back to the first one
      const allVariations = catalogItem.itemData.variations;
      const variation = requestedVariationId
        ? (allVariations.find((v) => v.id === requestedVariationId) ?? allVariations[0])
        : allVariations[0];

      const serviceVariationId = variation?.id;
      const serviceVariationVersion = variation?.version ?? catalogItem.version ?? null;

      if (!serviceVariationId || !serviceVariationVersion) {
        res.status(500).json({ message: "Service variation not available" });
        return;
      }

      const availabilityResponse = await client.bookings.searchAvailability({
        query: {
          filter: {
            startAtRange: {
              startAt,
              endAt,
            },
            locationId,
            segmentFilters: [
              {
                serviceVariationId,
              },
            ],
          },
        },
      });

      const availabilities = availabilityResponse.availabilities ?? [];
      const sanitized = availabilities.map((availability: Availability) => ({
        startAt: availability.startAt ?? null,
        locationId: availability.locationId ?? locationId,
        appointmentSegments:
          availability.appointmentSegments?.map((segment) => ({
            teamMemberId: segment.teamMemberId,
            serviceVariationId: segment.serviceVariationId ?? serviceVariationId,
            serviceVariationVersion: segment.serviceVariationVersion
              ? String(segment.serviceVariationVersion)
              : String(serviceVariationVersion),
            durationMinutes: Number(segment.durationMinutes ?? service.duration),
          })) ?? [],
      }));

      res.json({
        serviceId,
        serviceVariationId,
        serviceVariationVersion: String(serviceVariationVersion),
        availabilities: sanitized,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid availability request", errors: error.issues });
        return;
      }
      console.error("[API] Error in GET /api/bookings/availability:", error);
      res.status(500).json({ message: "Failed to load availability" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    if (!ensureSquareEnabled(res)) {
      return;
    }

    const rateLimit = checkPublicWriteRateLimit(req);
    if (rateLimit.limited) {
      res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
      res.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    try {
      const bookingSchema = createBookingSchema.extend({
        teamMemberId: z.string().min(1),
        serviceVariationId: z.string().min(1),
        serviceVariationVersion: z.string().regex(/^\d+$/, "Service variation version must be numeric"),
      });

      const payload = bookingSchema.parse(req.body);
      let serviceVariationVersion: bigint;
      try {
        serviceVariationVersion = BigInt(payload.serviceVariationVersion);
      } catch (parseError) {
        res.status(400).json({ message: "Invalid service variation version" });
        return;
      }
      const service = await prisma.serviceItem.findUnique({ where: { id: payload.serviceId } });

      if (!service?.squareServiceId) {
        res.status(404).json({ message: "Service not found" });
        return;
      }

      const accessToken = await resolveSquareAccessToken();
      const locationId = await resolveSquareLocationId(accessToken);
      const client = createSquareClient(accessToken);

      const [firstName, ...rest] = payload.customerName.trim().split(" ");
      const lastName = rest.join(" ").trim() || undefined;

      // Format phone number to E.164 format for Square API
      let formattedPhone: string | undefined;
      if (payload.customerPhone) {
        const digitsOnly = payload.customerPhone.replace(/\D/g, "");
        if (digitsOnly.length === 10) {
          formattedPhone = `+1${digitsOnly}`;
        } else if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
          formattedPhone = `+${digitsOnly}`;
        } else if (digitsOnly.length > 10) {
          formattedPhone = `+${digitsOnly}`;
        }
      }

      const customerResponse = await client.customers.create({
        givenName: firstName || payload.customerName,
        familyName: lastName || undefined,
        emailAddress: payload.customerEmail,
        phoneNumber: formattedPhone,
        address: {
          addressLine1: payload.serviceAddress,
          locality: payload.serviceCity,
          administrativeDistrictLevel1: payload.serviceState,
          postalCode: payload.serviceZip,
          country: "US",
        },
      });

      const customerId = customerResponse.customer?.id ?? null;

      // Save card on file for cancellation protection (no charge)
      let squareCardId: string | null = null;
      if (payload.sourceId && customerId) {
        try {
          const cardResponse = await client.cards.create({
            idempotencyKey: randomBytes(16).toString("hex"),
            sourceId: payload.sourceId,
            card: {
              customerId,
              cardholderName: payload.customerName,
            },
          });
          squareCardId = cardResponse.card?.id ?? null;
          console.log(`[Booking] Card on file saved: ${squareCardId}`);
        } catch (cardError) {
          console.error("[Booking] Failed to save card on file:", cardError);
          res.status(400).json({ message: "Failed to save card. Please check your card details and try again." });
          return;
        }
      }

      const bookingResponse = await client.bookings.create({
        booking: {
          locationId,
          startAt: payload.startAt,
          customerId: customerId ?? undefined,
          customerNote: payload.notes ?? undefined,
          appointmentSegments: [
            {
              teamMemberId: payload.teamMemberId,
              serviceVariationId: payload.serviceVariationId,
              serviceVariationVersion,
            },
          ],
        },
      });

      const booking = bookingResponse.booking;
      if (!booking?.id) {
        res.status(500).json({ message: "Failed to create booking" });
        return;
      }

      const startAtDate = new Date(payload.startAt);
      const durationMinutes = service.duration ?? 60;
      const endAtDate = new Date(startAtDate.getTime() + durationMinutes * 60 * 1000);

      const record = await prisma.booking.create({
        data: {
          squareBookingId: booking.id,
          customerId,
          customerEmail: payload.customerEmail,
          customerName: payload.customerName,
          customerPhone: payload.customerPhone ?? null,
          serviceAddress: payload.serviceAddress,
          serviceCity: payload.serviceCity,
          serviceState: payload.serviceState,
          serviceZip: payload.serviceZip,
          serviceId: payload.serviceId,
          teamMemberId: payload.teamMemberId,
          startAt: startAtDate,
          endAt: endAtDate,
          status: booking.status ?? "pending",
          notes: payload.notes ?? null,
          frequency: payload.frequency ?? null,
          squareCardId,
        },
      });

      // Send emails — await with retry, but don't block booking success
      const emailResults = await Promise.allSettled([
        sendBookingNotificationEmail({
          customerName: payload.customerName,
          customerEmail: payload.customerEmail,
          customerPhone: payload.customerPhone,
          serviceName: service.title,
          startAt: payload.startAt,
          notes: payload.notes,
          cardOnFile: !!squareCardId,
          serviceAddress: payload.serviceAddress,
          serviceCity: payload.serviceCity,
          serviceState: payload.serviceState,
          serviceZip: payload.serviceZip,
          totalPrice: payload.totalPrice,
          frequency: payload.frequency,
        }),
        sendBookingConfirmationEmail({
          bookingId: record.id,
          customerName: payload.customerName,
          customerEmail: payload.customerEmail,
          serviceName: service.title,
          startAt: payload.startAt,
          cardOnFile: !!squareCardId,
          serviceAddress: payload.serviceAddress,
          serviceCity: payload.serviceCity,
          serviceState: payload.serviceState,
          serviceZip: payload.serviceZip,
          totalPrice: payload.totalPrice,
          frequency: payload.frequency,
        }),
      ]);
      for (const result of emailResults) {
        if (result.status === "rejected") {
          console.error("[CRITICAL] Booking email failed after retries:", result.reason);
        }
      }

      res.status(201).json({
        success: true,
        bookingId: record.id,
        squareBookingId: booking.id,
        status: booking.status,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Invalid booking payload", errors: error.issues });
        return;
      }
      console.error("[API] Error in POST /api/bookings:", error);
      const squareErrors =
        typeof error === "object" && error && "errors" in error
          ? (error as { errors?: { code?: string; detail?: string }[] }).errors
          : undefined;
      const squareMessage = Array.isArray(squareErrors)
        ? squareErrors
            .map((squareError) => squareError?.detail || squareError?.code)
            .filter(Boolean)
            .join("; ")
        : "";
      res.status(500).json({
        message: squareMessage ? `Failed to create booking: ${squareMessage}` : "Failed to create booking",
      });
    }
  });

  // FAQs endpoints
  app.get("/api/faqs", async (_req, res) => {
    try {
      const items = await prisma.faqItem.findMany({
        where: { isVisible: true },
        orderBy: [{ order: "asc" }, { id: "asc" }]
      });
      res.json(items);
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to retrieve FAQs" });
    }
  });

  app.post("/api/faqs", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertFaqSchema.parse(req.body);
      const maxOrder = await prisma.faqItem.aggregate({ _max: { order: true } });
      const nextOrder = (maxOrder._max.order ?? -1) + 1;
      const item = await prisma.faqItem.create({ data: { ...validatedData, order: validatedData.order ?? nextOrder } });

      res.status(201).json({ success: true, message: "FAQ created successfully", data: item });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid FAQ data", errors: error.issues });
        return;
      }
      console.error("Failed to create FAQ", error);
      res.status(500).json({ success: false, message: "Failed to create FAQ" });
    }
  });

  app.patch("/api/faqs/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid ID" });
        return;
      }

      const updates = updateFaqSchema.parse(req.body);
      const existing = await prisma.faqItem.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({ success: false, message: "FAQ not found" });
        return;
      }

      const item = await prisma.faqItem.update({ where: { id }, data: updates });

      res.json({ success: true, message: "FAQ updated successfully", data: item });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid FAQ data", errors: error.issues });
        return;
      }
      if (error instanceof Error && error.message.includes("Order")) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }
      console.error("Failed to update FAQ", error);
      res.status(500).json({ success: false, message: "Failed to update FAQ" });
    }
  });

  app.delete("/api/faqs/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid ID" });
        return;
      }

      const existing = await prisma.faqItem.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({ success: false, message: "FAQ not found" });
        return;
      }

      await prisma.faqItem.delete({ where: { id } });

      res.json({ success: true, message: "FAQ deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to delete FAQ" });
    }
  });

  // Services endpoints
  app.get("/api/services", async (req, res) => {
    try {
      const items = await prisma.serviceItem.findMany({
        where: { isVisible: true },
        orderBy: [{ order: "asc" }, { id: "asc" }]
      });
      res.json(items);
    } catch (error) {
      console.error('[API] Error in GET /api/services:', error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve services",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

    app.post("/api/services", requireAdmin, async (req, res) => {
      try {
        const validatedData = insertServiceSchema.parse(req.body);
        const maxOrder = await prisma.serviceItem.aggregate({ _max: { order: true } });
        const nextOrder = (maxOrder._max.order ?? -1) + 1;
        const item = await prisma.serviceItem.create({
          data: {
            ...validatedData,
            title: (validatedData as any).title ?? (validatedData as any).name ?? "",
            name: (validatedData as any).name ?? (validatedData as any).title ?? "",
            order: nextOrder,
          },
        });

        res.status(201).json({
          success: true,
          message: "Service created successfully",
          data: item
        });
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({
            success: false,
            message: "Invalid service data",
            errors: error.issues
          });
        } else {
          console.error("Failed to create service", error);
          res.status(500).json({
            success: false,
            message: "Failed to create service"
          });
        }
      }
    });

    app.patch("/api/services/:id", requireAdmin, async (req, res) => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          res.status(400).json({
            success: false,
            message: "Invalid ID"
          });
          return;
        }

        const updates = updateServiceSchema.parse(req.body);
        const existing = await prisma.serviceItem.findUnique({ where: { id } });

        if (!existing) {
          res.status(404).json({
            success: false,
            message: "Service not found"
          });
          return;
        }

        const item = await prisma.serviceItem.update({ where: { id }, data: updates });

        res.json({
          success: true,
          message: "Service updated successfully",
          data: item
        });
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({ success: false, message: "Invalid service data", errors: error.issues });
          return;
        }
        console.error("Failed to update service", error);
        res.status(500).json({
          success: false,
          message: "Failed to update service"
        });
      }
    });

  app.delete("/api/services/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }
      
      const existing = await prisma.serviceItem.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: "Service not found"
        });
        return;
      }

      await prisma.serviceItem.delete({ where: { id } });
      
      res.json({
        success: true,
        message: "Service deleted successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete service"
      });
    }
  });

  // Blog posts endpoints
  app.get("/api/posts", async (_req, res) => {
    try {
      const posts = await prisma.post.findMany({ where: { published: true }, orderBy: { createdAt: "desc" } });
      res.json(posts);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve posts",
      });
    }
  });

  app.get("/api/posts/admin", requireAdmin, async (_req, res) => {
    try {
      const posts = await prisma.post.findMany({ orderBy: { createdAt: "desc" } });
      res.json(posts);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to retrieve posts",
      });
    }
  });

  app.post("/api/posts", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertPostSchema.parse(req.body);
      const post = await prisma.post.create({ data: validatedData });

      res.status(201).json({
        success: true,
        message: "Post created successfully",
        data: post,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid post data", errors: error.issues });
        return;
      }
      console.error("Failed to create post", error);
      res.status(500).json({
        success: false,
        message: "Failed to create post",
      });
    }
  });

  app.patch("/api/posts/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid ID" });
        return;
      }

      const updates = updatePostSchema.parse(req.body);
      const existing = await prisma.post.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({ success: false, message: "Post not found" });
        return;
      }

      const post = await prisma.post.update({ where: { id }, data: { ...updates, updatedAt: new Date() } });

      res.json({
        success: true,
        message: "Post updated successfully",
        data: post,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid post data", errors: error.issues });
        return;
      }
      console.error("Failed to update post", error);
      res.status(500).json({ success: false, message: "Failed to update post" });
    }
  });

  app.delete("/api/posts/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid ID" });
        return;
      }

      const existing = await prisma.post.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({ success: false, message: "Post not found" });
        return;
      }

      await prisma.post.delete({ where: { id } });

      res.json({ success: true, message: "Post deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to delete post" });
    }
  });

  app.get("/api/posts/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const post = await prisma.post.findFirst({ where: { slug, published: true } });

      if (!post) {
        res.status(404).json({ success: false, message: "Post not found" });
        return;
      }

      res.json(post);
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to retrieve post" });
    }
  });

  // Fragrance Products endpoints
  app.get("/api/products", async (_req, res) => {
    try {
      const items = await prisma.fragranceProduct.findMany({
        where: { isVisible: true },
        orderBy: [{ order: "asc" }, { id: "asc" }]
      });
      res.json(items);
    } catch (error) {
      console.error('[API] Error in GET /api/products:', error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve products",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/products", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertFragranceProductSchema.parse(req.body);
      const maxOrder = await prisma.fragranceProduct.aggregate({ _max: { order: true } });
      const nextOrder = (maxOrder._max.order ?? -1) + 1;
      const item = await prisma.fragranceProduct.create({
        data: {
          ...validatedData,
          order: validatedData.order ?? nextOrder,
        },
      });

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: item
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid product data",
          errors: error.issues
        });
      } else {
        console.error("Failed to create product", error);
        res.status(500).json({
          success: false,
          message: "Failed to create product"
        });
      }
    }
  });

  app.patch("/api/products/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }

      const updates = updateFragranceProductSchema.parse(req.body);
      const existing = await prisma.fragranceProduct.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: "Product not found"
        });
        return;
      }

      const item = await prisma.fragranceProduct.update({ where: { id }, data: updates });

      res.json({
        success: true,
        message: "Product updated successfully",
        data: item
      });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, message: "Invalid product data", errors: error.issues });
        return;
      }
      console.error("Failed to update product", error);
      res.status(500).json({
        success: false,
        message: "Failed to update product"
      });
    }
  });

  app.delete("/api/products/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid ID"
        });
        return;
      }

      const existing = await prisma.fragranceProduct.findUnique({ where: { id } });

      if (!existing) {
        res.status(404).json({
          success: false,
          message: "Product not found"
        });
        return;
      }

      await prisma.fragranceProduct.delete({ where: { id } });

      res.json({
        success: true,
        message: "Product deleted successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to delete product"
      });
    }
  });

  // Announcements — public: get active announcement
  app.get("/api/announcements/active", async (_req, res) => {
    try {
      const now = new Date();
      const item = await prisma.announcement.findFirst({
        where: {
          isActive: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        },
        orderBy: { createdAt: "desc" },
      });
      res.json(item ?? null);
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to retrieve announcement" });
    }
  });

  // Announcements — admin: list all
  app.get("/api/announcements", requireAdmin, async (_req, res) => {
    try {
      const items = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
      res.json(items);
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to retrieve announcements" });
    }
  });

  // Announcements — admin: create
  app.post("/api/announcements", requireAdmin, async (req, res) => {
    try {
      const data = createAnnouncementSchema.parse(req.body);
      const item = await prisma.announcement.create({ data });
      res.status(201).json({ success: true, data: item });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, errors: error.issues });
        return;
      }
      res.status(500).json({ success: false, message: "Failed to create announcement" });
    }
  });

  // Announcements — admin: update
  app.patch("/api/announcements/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid ID" });
        return;
      }
      const updates = updateAnnouncementSchema.parse(req.body);
      const existing = await prisma.announcement.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ success: false, message: "Announcement not found" });
        return;
      }
      const item = await prisma.announcement.update({ where: { id }, data: updates });
      res.json({ success: true, data: item });
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, errors: error.issues });
        return;
      }
      res.status(500).json({ success: false, message: "Failed to update announcement" });
    }
  });

  // Announcements — admin: delete
  app.delete("/api/announcements/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: "Invalid ID" });
        return;
      }
      const existing = await prisma.announcement.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ success: false, message: "Announcement not found" });
        return;
      }
      await prisma.announcement.delete({ where: { id } });
      res.json({ success: true, message: "Announcement deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to delete announcement" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
