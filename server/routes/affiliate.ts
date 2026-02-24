import { createHmac, timingSafeEqual } from "crypto";
import type { Express, Request, RequestHandler, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { z, ZodError } from "zod";
import { createPartnerApplicationSchema } from "../../shared/types.js";
import { getUserFromRequest, isUserAdmin } from "../supabase.js";
import {
  sendPartnerApprovalEmail,
  sendPartnerDisabledEmail,
  sendPayoutNotificationEmail,
} from "../services/email.js";

// ============================================
// Constants
// ============================================

export const AFFILIATE_COOKIE_NAME = "mlb_ref";
const AFFILIATE_COOKIE_DEFAULT_DAYS = 30;

// ============================================
// HMAC Cookie Signing
// ============================================

function getSigningKey(): string {
  return process.env.ENCRYPTION_KEY || "dev-signing-key-not-for-production";
}

function signCookiePayload(payload: { aid: number; ts: number }): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", getSigningKey())
    .update(data)
    .digest("base64url");
  return `${data}.${signature}`;
}

function verifyCookiePayload(
  cookie: string,
): { aid: number; ts: number } | null {
  const parts = cookie.split(".");
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  const expected = createHmac("sha256", getSigningKey())
    .update(data)
    .digest("base64url");

  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, signatureBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (
      typeof payload.aid === "number" &&
      typeof payload.ts === "number"
    ) {
      return payload as { aid: number; ts: number };
    }
    return null;
  } catch {
    return null;
  }
}

// ============================================
// Slug Generation
// ============================================

async function generateAffiliateSlug(
  brandName: string,
  prisma: PrismaClient,
): Promise<string> {
  const base = brandName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);

  let slug = base || "partner";
  let suffix = 0;
  while (await prisma.affiliate.findUnique({ where: { slug } })) {
    suffix++;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

// ============================================
// Types
// ============================================

type AuthedUser = { userId: string; email: string };

// ============================================
// Rate Limiting (separate store from main routes)
// ============================================

const PARTNER_APP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const PARTNER_APP_RATE_LIMIT_MAX = 5;
const partnerAppRateLimit = new Map<
  string,
  { count: number; resetAt: number }
>();

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.ip || "unknown";
}

function checkPartnerAppRateLimit(req: Request) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = partnerAppRateLimit.get(ip);

  if (!entry || now >= entry.resetAt) {
    partnerAppRateLimit.set(ip, {
      count: 1,
      resetAt: now + PARTNER_APP_RATE_LIMIT_WINDOW_MS,
    });
    return { limited: false, retryAfterSeconds: 0 };
  }

  entry.count += 1;
  if (entry.count > PARTNER_APP_RATE_LIMIT_MAX) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((entry.resetAt - now) / 1000),
    );
    return { limited: true, retryAfterSeconds };
  }

  return { limited: false, retryAfterSeconds: 0 };
}

// ============================================
// Export: cookie read helper (used by checkout in routes.ts)
// ============================================

export async function readAffiliateCookie(
  req: Request,
  prisma: PrismaClient,
): Promise<{
  affiliateId: number;
  affiliate: { id: number; commissionRate: unknown; attributionWindowDays: number };
} | null> {
  try {
    const cookie = req.cookies?.[AFFILIATE_COOKIE_NAME];
    if (!cookie || typeof cookie !== "string") return null;

    const payload = verifyCookiePayload(cookie);
    if (!payload) return null;

    // Check attribution window from cookie timestamp
    const affiliate = await prisma.affiliate.findUnique({
      where: { id: payload.aid, status: "active" },
      select: { id: true, commissionRate: true, attributionWindowDays: true },
    });
    if (!affiliate) return null;

    const windowMs =
      affiliate.attributionWindowDays * 24 * 60 * 60 * 1000;
    if (Date.now() - payload.ts > windowMs) return null;

    return { affiliateId: affiliate.id, affiliate };
  } catch {
    return null;
  }
}

// ============================================
// Main Registration
// ============================================

export function registerAffiliateRoutes(
  app: Express,
  prisma: PrismaClient,
  supabaseEnabled: boolean,
  helpers: {
    requireAdmin: RequestHandler;
    requireAuth: RequestHandler;
  },
) {
  // ============================================
  // Affiliate Middleware
  // ============================================

  const requireAffiliate: RequestHandler = async (req, res, next) => {
    if (!supabaseEnabled) {
      res
        .status(401)
        .json({ message: "Unauthorized - Authentication not configured" });
      return;
    }
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ message: "Unauthorized - Please sign in" });
      return;
    }
    const affiliate = await prisma.affiliate.findUnique({
      where: { userId: user.userId },
    });
    if (!affiliate || affiliate.status !== "active") {
      res
        .status(403)
        .json({ message: "Forbidden - Active partner account required" });
      return;
    }
    (req as any).user = user;
    (req as any).affiliate = affiliate;
    next();
  };

  // ============================================
  // Vanity Redirect Routes
  // ============================================

  const handleVanityRedirect = async (req: Request, res: Response) => {
    const { slug } = req.params;
    try {
      // True first-touch: if valid cookie already exists, don't overwrite
      const existingCookie = req.cookies?.[AFFILIATE_COOKIE_NAME];
      if (existingCookie && typeof existingCookie === "string") {
        const existingPayload = verifyCookiePayload(existingCookie);
        if (existingPayload) {
          // Cookie valid — redirect without overwriting
          res.redirect(302, "/");
          return;
        }
      }

      const affiliate = await prisma.affiliate.findUnique({
        where: { slug, status: "active" },
        select: { id: true, attributionWindowDays: true },
      });

      if (!affiliate) {
        res.redirect(302, "/");
        return;
      }

      const cookieValue = signCookiePayload({
        aid: affiliate.id,
        ts: Date.now(),
      });

      const maxAgeDays =
        affiliate.attributionWindowDays || AFFILIATE_COOKIE_DEFAULT_DAYS;

      res.cookie(AFFILIATE_COOKIE_NAME, cookieValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.redirect(302, "/");
    } catch (error) {
      console.error("[Affiliate] Vanity redirect error:", error);
      res.redirect(302, "/");
    }
  };

  app.get("/with/:slug", handleVanityRedirect);
  app.get("/p/:slug", handleVanityRedirect);

  // ============================================
  // Public: Partner Application
  // ============================================

  app.post("/api/partner-applications", async (req, res) => {
    const rateLimit = checkPartnerAppRateLimit(req);
    if (rateLimit.limited) {
      res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
      res
        .status(429)
        .json({ message: "Too many requests. Please try again later." });
      return;
    }

    try {
      const data = createPartnerApplicationSchema.parse(req.body);

      // Check for duplicate pending application
      const existing = await prisma.affiliateApplication.findFirst({
        where: { contactEmail: data.contactEmail, status: "pending" },
      });
      if (existing) {
        res.status(409).json({
          message:
            "An application with this email is already under review.",
        });
        return;
      }

      const application = await prisma.affiliateApplication.create({
        data: {
          partnerType: data.partnerType,
          brandName: data.brandName,
          contactName: data.contactName,
          contactEmail: data.contactEmail,
          website: data.website || null,
          instagram: data.instagram || null,
          tiktok: data.tiktok || null,
          youtube: data.youtube || null,
          otherSocial: data.otherSocial || null,
          audienceSize: data.audienceSize || null,
          audienceDescription: data.audienceDescription || null,
          whyPartner: data.whyPartner,
          experience: data.experience || null,
          portfolioUrl: data.portfolioUrl || null,
          companySize: data.companySize || null,
          serviceArea: data.serviceArea || null,
          yearsInBusiness: data.yearsInBusiness || null,
        },
      });

      res.status(201).json({ success: true, id: application.id });
    } catch (error) {
      if (error instanceof ZodError) {
        res
          .status(400)
          .json({ message: "Invalid application data", errors: error.issues });
        return;
      }
      console.error(
        "[API] Error in POST /api/partner-applications:",
        error,
      );
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  // ============================================
  // Admin: Application Management
  // ============================================

  app.get(
    "/api/admin/partner-applications",
    helpers.requireAdmin,
    async (req, res) => {
      try {
        const status = req.query.status as string | undefined;
        const where = status ? { status } : {};
        const applications = await prisma.affiliateApplication.findMany({
          where,
          orderBy: { createdAt: "desc" },
        });
        res.json(applications);
      } catch (error) {
        console.error(
          "[API] Error in GET /api/admin/partner-applications:",
          error,
        );
        res.status(500).json({ message: "Failed to fetch applications" });
      }
    },
  );

  app.patch(
    "/api/admin/partner-applications/:id/approve",
    helpers.requireAdmin,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          res.status(400).json({ message: "Invalid application ID" });
          return;
        }

        const commissionRate = req.body.commissionRate ?? 0.1; // Default 10%

        const application = await prisma.affiliateApplication.findUnique({
          where: { id },
        });
        if (!application) {
          res.status(404).json({ message: "Application not found" });
          return;
        }
        if (application.status !== "pending") {
          res.status(400).json({
            message: `Application already ${application.status}`,
          });
          return;
        }

        // Check if contactEmail is already an affiliate
        const existingAffiliate = await prisma.affiliate.findUnique({
          where: { contactEmail: application.contactEmail },
        });
        if (existingAffiliate) {
          res.status(409).json({
            message: "An affiliate with this email already exists",
          });
          return;
        }

        const adminUser = (req as any).user as AuthedUser;
        const slug = await generateAffiliateSlug(
          application.brandName,
          prisma,
        );

        // Update application
        await prisma.affiliateApplication.update({
          where: { id },
          data: {
            status: "approved",
            reviewedAt: new Date(),
            reviewedBy: adminUser.userId,
          },
        });

        // Create affiliate record (userId null until partner signs in)
        const affiliate = await prisma.affiliate.create({
          data: {
            contactEmail: application.contactEmail,
            brandName: application.brandName,
            slug,
            commissionRate,
            applicationId: id,
          },
        });

        // Send approval email (non-blocking)
        sendPartnerApprovalEmail({
          to: application.contactEmail,
          brandName: application.brandName,
          slug,
        }).catch((err) =>
          console.error("[Email] Approval email error:", err),
        );

        res.json({ success: true, affiliate });
      } catch (error) {
        console.error(
          "[API] Error in PATCH /api/admin/partner-applications/:id/approve:",
          error,
        );
        res.status(500).json({ message: "Failed to approve application" });
      }
    },
  );

  app.patch(
    "/api/admin/partner-applications/:id/reject",
    helpers.requireAdmin,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          res.status(400).json({ message: "Invalid application ID" });
          return;
        }

        const application = await prisma.affiliateApplication.findUnique({
          where: { id },
        });
        if (!application) {
          res.status(404).json({ message: "Application not found" });
          return;
        }
        if (application.status !== "pending") {
          res.status(400).json({
            message: `Application already ${application.status}`,
          });
          return;
        }

        const adminUser = (req as any).user as AuthedUser;

        await prisma.affiliateApplication.update({
          where: { id },
          data: {
            status: "rejected",
            reviewedAt: new Date(),
            reviewedBy: adminUser.userId,
          },
        });

        res.json({ success: true });
      } catch (error) {
        console.error(
          "[API] Error in PATCH /api/admin/partner-applications/:id/reject:",
          error,
        );
        res.status(500).json({ message: "Failed to reject application" });
      }
    },
  );

  // ============================================
  // Admin: Affiliate Management
  // ============================================

  app.get(
    "/api/admin/affiliates",
    helpers.requireAdmin,
    async (req, res) => {
      try {
        const affiliates = await prisma.affiliate.findMany({
          include: {
            conversions: {
              select: {
                grossAmount: true,
                commissionAmount: true,
                status: true,
              },
            },
            payouts: {
              select: { amount: true, status: true },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        const result = affiliates.map((a) => {
          const approved = a.conversions.filter(
            (c) => c.status === "approved",
          );
          const totalRevenue = approved.reduce(
            (sum, c) => sum + Number(c.grossAmount),
            0,
          );
          const totalCommission = approved.reduce(
            (sum, c) => sum + Number(c.commissionAmount),
            0,
          );
          const totalPaid = a.payouts
            .filter((p) => p.status === "paid")
            .reduce((sum, p) => sum + Number(p.amount), 0);

          return {
            id: a.id,
            userId: a.userId,
            contactEmail: a.contactEmail,
            brandName: a.brandName,
            slug: a.slug,
            commissionRate: Number(a.commissionRate),
            attributionWindowDays: a.attributionWindowDays,
            status: a.status,
            createdAt: a.createdAt,
            totalConversions: approved.length,
            pendingConversions: a.conversions.filter(
              (c) => c.status === "pending",
            ).length,
            totalRevenue: Number(totalRevenue.toFixed(2)),
            totalCommission: Number(totalCommission.toFixed(2)),
            totalPaid: Number(totalPaid.toFixed(2)),
            outstandingBalance: Number(
              (totalCommission - totalPaid).toFixed(2),
            ),
          };
        });

        res.json(result);
      } catch (error) {
        console.error(
          "[API] Error in GET /api/admin/affiliates:",
          error,
        );
        res.status(500).json({ message: "Failed to fetch affiliates" });
      }
    },
  );

  app.patch(
    "/api/admin/affiliates/:id",
    helpers.requireAdmin,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          res.status(400).json({ message: "Invalid affiliate ID" });
          return;
        }

        const updateSchema = z.object({
          commissionRate: z.number().min(0).max(1).optional(),
          attributionWindowDays: z.number().int().min(1).max(365).optional(),
          status: z.enum(["active", "disabled"]).optional(),
        });

        const data = updateSchema.parse(req.body);

        const affiliate = await prisma.affiliate.findUnique({
          where: { id },
        });
        if (!affiliate) {
          res.status(404).json({ message: "Affiliate not found" });
          return;
        }

        const updated = await prisma.affiliate.update({
          where: { id },
          data,
        });

        // Send disabled email if status changed to disabled
        if (data.status === "disabled" && affiliate.status === "active") {
          sendPartnerDisabledEmail({
            to: affiliate.contactEmail,
            brandName: affiliate.brandName,
          }).catch((err) =>
            console.error("[Email] Disabled email error:", err),
          );
        }

        res.json(updated);
      } catch (error) {
        if (error instanceof ZodError) {
          res
            .status(400)
            .json({ message: "Invalid update data", errors: error.issues });
          return;
        }
        console.error(
          "[API] Error in PATCH /api/admin/affiliates/:id:",
          error,
        );
        res.status(500).json({ message: "Failed to update affiliate" });
      }
    },
  );

  app.get(
    "/api/admin/affiliates/:id/conversions",
    helpers.requireAdmin,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          res.status(400).json({ message: "Invalid affiliate ID" });
          return;
        }

        const conversions = await prisma.affiliateConversion.findMany({
          where: { affiliateId: id },
          orderBy: { createdAt: "desc" },
        });

        res.json(
          conversions.map((c) => ({
            ...c,
            grossAmount: Number(c.grossAmount),
            netAmount: Number(c.netAmount),
            commissionAmount: Number(c.commissionAmount),
          })),
        );
      } catch (error) {
        console.error(
          "[API] Error in GET /api/admin/affiliates/:id/conversions:",
          error,
        );
        res.status(500).json({ message: "Failed to fetch conversions" });
      }
    },
  );

  app.post(
    "/api/admin/affiliates/:id/payouts",
    helpers.requireAdmin,
    async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
          res.status(400).json({ message: "Invalid affiliate ID" });
          return;
        }

        const payoutSchema = z.object({
          amount: z.number().positive(),
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          notes: z.string().optional(),
        });

        const data = payoutSchema.parse(req.body);

        const affiliate = await prisma.affiliate.findUnique({
          where: { id },
        });
        if (!affiliate) {
          res.status(404).json({ message: "Affiliate not found" });
          return;
        }

        const payout = await prisma.affiliatePayout.create({
          data: {
            affiliateId: id,
            amount: data.amount,
            periodStart: new Date(data.periodStart),
            periodEnd: new Date(data.periodEnd),
            notes: data.notes || null,
          },
        });

        // Send payout notification (non-blocking)
        sendPayoutNotificationEmail({
          to: affiliate.contactEmail,
          brandName: affiliate.brandName,
          amount: data.amount,
          periodStart: new Date(data.periodStart).toLocaleDateString(),
          periodEnd: new Date(data.periodEnd).toLocaleDateString(),
        }).catch((err) =>
          console.error("[Email] Payout email error:", err),
        );

        res.status(201).json(payout);
      } catch (error) {
        if (error instanceof ZodError) {
          res
            .status(400)
            .json({ message: "Invalid payout data", errors: error.issues });
          return;
        }
        console.error(
          "[API] Error in POST /api/admin/affiliates/:id/payouts:",
          error,
        );
        res.status(500).json({ message: "Failed to create payout" });
      }
    },
  );

  app.patch(
    "/api/admin/affiliates/:payoutId/payouts/mark-paid",
    helpers.requireAdmin,
    async (req, res) => {
      try {
        const payoutId = parseInt(req.params.payoutId, 10);
        if (isNaN(payoutId)) {
          res.status(400).json({ message: "Invalid payout ID" });
          return;
        }

        const payout = await prisma.affiliatePayout.update({
          where: { id: payoutId },
          data: { status: "paid", paidAt: new Date() },
        });

        res.json(payout);
      } catch (error) {
        console.error(
          "[API] Error marking payout as paid:",
          error,
        );
        res.status(500).json({ message: "Failed to mark payout as paid" });
      }
    },
  );

  // ============================================
  // Partner: Auto-Linking on First Login
  // ============================================

  app.post(
    "/api/partner/link",
    helpers.requireAuth,
    async (req, res) => {
      try {
        const user = (req as any).user as AuthedUser;

        // Check if already linked
        const existing = await prisma.affiliate.findUnique({
          where: { userId: user.userId },
        });
        if (existing) {
          res.json(existing);
          return;
        }

        // Try to auto-link by email
        const affiliate = await prisma.affiliate.findUnique({
          where: { contactEmail: user.email },
        });

        if (!affiliate) {
          res.status(404).json({
            message: "No approved partner account found for this email",
          });
          return;
        }

        if (affiliate.userId && affiliate.userId !== user.userId) {
          res.status(409).json({
            message: "This partner account is already linked to another user",
          });
          return;
        }

        if (affiliate.status !== "active") {
          res.status(403).json({
            message: "Partner account is not active",
          });
          return;
        }

        // Link the user
        const updated = await prisma.affiliate.update({
          where: { id: affiliate.id },
          data: { userId: user.userId },
        });

        res.json(updated);
      } catch (error) {
        console.error("[API] Error in POST /api/partner/link:", error);
        res.status(500).json({ message: "Failed to link partner account" });
      }
    },
  );

  // ============================================
  // Partner: Self-Service Dashboard Endpoints
  // ============================================

  app.get("/api/partner/profile", requireAffiliate, async (req, res) => {
    try {
      const affiliate = (req as any).affiliate;
      const siteUrl = process.env.SITE_URL || "";

      res.json({
        id: affiliate.id,
        brandName: affiliate.brandName,
        slug: affiliate.slug,
        commissionRate: Number(affiliate.commissionRate),
        attributionWindowDays: affiliate.attributionWindowDays,
        status: affiliate.status,
        vanityUrl: `${siteUrl}/with/${affiliate.slug}`,
        createdAt: affiliate.createdAt,
      });
    } catch (error) {
      console.error("[API] Error in GET /api/partner/profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.get("/api/partner/stats", requireAffiliate, async (req, res) => {
    try {
      const affiliate = (req as any).affiliate;

      const [conversions, payouts] = await Promise.all([
        prisma.affiliateConversion.findMany({
          where: { affiliateId: affiliate.id },
        }),
        prisma.affiliatePayout.findMany({
          where: { affiliateId: affiliate.id },
        }),
      ]);

      const approved = conversions.filter((c) => c.status === "approved");
      const totalRevenue = approved.reduce(
        (sum, c) => sum + Number(c.grossAmount),
        0,
      );
      const totalCommission = approved.reduce(
        (sum, c) => sum + Number(c.commissionAmount),
        0,
      );
      const totalPaid = payouts
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      res.json({
        totalConversions: approved.length,
        pendingConversions: conversions.filter(
          (c) => c.status === "pending",
        ).length,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalCommission: Number(totalCommission.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        outstandingBalance: Number(
          (totalCommission - totalPaid).toFixed(2),
        ),
      });
    } catch (error) {
      console.error("[API] Error in GET /api/partner/stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get(
    "/api/partner/conversions",
    requireAffiliate,
    async (req, res) => {
      try {
        const affiliate = (req as any).affiliate;

        const conversions = await prisma.affiliateConversion.findMany({
          where: { affiliateId: affiliate.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            grossAmount: true,
            commissionAmount: true,
            status: true,
            source: true,
            attributedAt: true,
            createdAt: true,
            // Deliberately exclude: orderId, squareOrderId (internal/PII)
          },
        });

        res.json(
          conversions.map((c) => ({
            ...c,
            grossAmount: Number(c.grossAmount),
            commissionAmount: Number(c.commissionAmount),
          })),
        );
      } catch (error) {
        console.error(
          "[API] Error in GET /api/partner/conversions:",
          error,
        );
        res.status(500).json({ message: "Failed to fetch conversions" });
      }
    },
  );

  app.get(
    "/api/partner/payouts",
    requireAffiliate,
    async (req, res) => {
      try {
        const affiliate = (req as any).affiliate;

        const payouts = await prisma.affiliatePayout.findMany({
          where: { affiliateId: affiliate.id },
          orderBy: { createdAt: "desc" },
        });

        res.json(
          payouts.map((p) => ({
            ...p,
            amount: Number(p.amount),
          })),
        );
      } catch (error) {
        console.error(
          "[API] Error in GET /api/partner/payouts:",
          error,
        );
        res.status(500).json({ message: "Failed to fetch payouts" });
      }
    },
  );
}
