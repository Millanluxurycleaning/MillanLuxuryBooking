import { z } from "zod";

export interface BlobMetadata {
  url: string;
  pathname: string;
  contentType?: string | null;
  filename?: string | null;
  size?: number | null;
}

export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  isAdmin: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  service: string;
  message: string;
  timestamp: string | Date;
}

export interface GalleryItem {
  id: number;
  title: string;
  category: string;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  imageFilename?: string | null;
  imageMetadata?: BlobMetadata | null;
  beforeImageUrl?: string | null;
  beforeImagePublicId?: string | null;
  beforeImageFilename?: string | null;
  beforeImageMetadata?: BlobMetadata | null;
  afterImageUrl?: string | null;
  afterImagePublicId?: string | null;
  afterImageFilename?: string | null;
  afterImageMetadata?: BlobMetadata | null;
  order?: number | null;
  createdAt: string | Date;
}

export interface ServicePricingTier {
  name: string;
  price: number;
  description?: string;
}

export interface ServiceItem {
  id: number;
  title: string;
  name?: string;
  description: string;
  iconUrl?: string | null;
  imageUrl?: string | null;
  iconMetadata?: BlobMetadata | null;
  imageMetadata?: BlobMetadata | null;
  features?: string[];
  order?: number | null;
  createdAt: string | Date;
  price?: number | null;
  displayPrice?: boolean;
  isVisible?: boolean;
  squareServiceId?: string | null;
  squareTeamMemberIds?: string[];
  duration?: number | null;
  // Deposit configuration
  depositAmount?: number | null;
  depositPercent?: number | null;
  requiresDeposit?: boolean;
  // Pricing tiers for different sizes
  pricingTiers?: ServicePricingTier[] | null;
}

export interface Testimonial {
  id: number;
  author: string;
  name?: string;
  rating: number;
  content: string;
  review?: string;
  createdAt: string | Date;
  source?: string | null;
  sourceUrl?: string | null;
  order?: number | null;

  // Google OAuth integration
  externalId?: string | null;
  isApproved?: boolean;
  importedAt?: string | Date | null;
}

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
  order?: number | null;
  createdAt: string | Date;
  isVisible?: boolean;
}

export interface SiteAsset {
  id: number;
  key: string;
  url: string;
  name?: string | null;
  filename?: string | null;
  publicId?: string | null;
  description?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Asset extends SiteAsset {
  path?: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  published: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface FragranceProduct {
  id: number;
  name: string;
  description: string;
  category: string;
  fragrance: string;
  price: number;
  salePrice: number | null;
  displayPrice: boolean;
  isVisible: boolean;
  imageUrl: string | null;
  squareUrl: string;
  squareCatalogId?: string | null;
  squareItemId?: string | null;
  squareVariationId?: string | null;
  sku: string | null;
  inventoryCount?: number;
  lowStockThreshold?: number;
  trackInventory?: boolean;
  featured: boolean;
  order: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

const urlSchema = z.string().trim().url({ message: "Must be a valid URL" });
const optionalUrl = urlSchema.or(z.literal(""));

const optionalize = <T extends z.ZodRawShape>(shape: T) =>
  z.object(
    Object.fromEntries(
      Object.entries(shape).map(([key, schema]) => [key, (schema as z.ZodTypeAny).optional()]),
    ) as { [K in keyof T]: z.ZodOptional<T[K]> },
  );

export const createContactMessageSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  service: z.string().min(1, "Please select a service"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});
export type CreateContactMessage = z.infer<typeof createContactMessageSchema>;

export const createGalleryItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.string().trim().min(1, "Category is required"),
  imageUrl: optionalUrl.optional(),
  imagePublicId: z.string().optional(),
  imageFilename: z.string().optional(),
  beforeImageUrl: optionalUrl.optional(),
  beforeImagePublicId: z.string().optional(),
  beforeImageFilename: z.string().optional(),
  afterImageUrl: optionalUrl.optional(),
  afterImagePublicId: z.string().optional(),
  afterImageFilename: z.string().optional(),
  order: z.number().int().min(0).optional(),
}).superRefine((data, ctx) => {
  const hasPrimary = Boolean(data.imageUrl);
  const hasBeforeAfter = Boolean(data.beforeImageUrl && data.afterImageUrl);
  if (!hasPrimary && !hasBeforeAfter) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide a main image or both before/after images",
      path: ["imageUrl"],
    });
  }
});
export type CreateGalleryItem = z.infer<typeof createGalleryItemSchema>;
export const updateGalleryItemSchema = optionalize(
  (createGalleryItemSchema as any)._def.schema.shape,
);
export type UpdateGalleryItem = z.infer<typeof updateGalleryItemSchema>;

export const createServiceSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  name: z.string().min(1, "Title is required").optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  iconUrl: optionalUrl.optional(),
  imageUrl: optionalUrl.optional(),
  features: z.array(z.string().min(1)).optional(),
  price: z.number().positive("Price must be positive").optional(),
  displayPrice: z.boolean().optional(),
  isVisible: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (!data.title && !data.name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide a title or name" });
  }
});
export type CreateService = z.infer<typeof createServiceSchema>;
const serviceShape =
  (createServiceSchema as any)?._def?.schema?.shape ??
  (createServiceSchema as any)?.shape ??
  {};
export const updateServiceSchema = optionalize(serviceShape);
export type UpdateService = z.infer<typeof updateServiceSchema>;

export const createTestimonialSchema = z.object({
  author: z.string().min(1, "Author is required").optional(),
  name: z.string().min(1).optional(),
  content: z.string().min(10, "Content must be at least 10 characters").optional(),
  review: z.string().min(10).optional(),
  rating: z.number().min(1).max(5),
  source: z.string().optional(),
  sourceUrl: optionalUrl.optional(),
}).superRefine((data, ctx) => {
  if (!data.author && !data.name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Author is required" });
  }
  if (!data.content && !data.review) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Content is required" });
  }
});
export type CreateTestimonial = z.infer<typeof createTestimonialSchema>;
const testimonialShape =
  (createTestimonialSchema as any)?._def?.schema?.shape ??
  (createTestimonialSchema as any)?.shape ??
  {};
export const updateTestimonialSchema = optionalize(testimonialShape);
export type UpdateTestimonial = z.infer<typeof updateTestimonialSchema>;

export const createFaqSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  order: z.number().min(0).optional(),
  isVisible: z.boolean().optional(),
});
export type CreateFaq = z.infer<typeof createFaqSchema>;
export const updateFaqSchema = optionalize(createFaqSchema.shape);
export type UpdateFaq = z.infer<typeof updateFaqSchema>;

export const insertSiteAssetSchema = z.object({
  key: z.string().min(1),
  url: urlSchema,
  name: z.string().optional(),
  filename: z.string().optional(),
  publicId: z.string().optional(),
  description: z.string().optional(),
});
export const updateSiteAssetSchema = optionalize(insertSiteAssetSchema.shape);

export const testimonialSourceSchema = z.enum(["manual", "google", "thumbtack", "yelp"]);

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const createPostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1).regex(slugRegex, "Slug must be URL-safe"),
  excerpt: z.string().min(1, "Excerpt is required"),
  body: z.string().min(1, "Body is required"),
  published: z.boolean().optional().default(false),
});
export type CreatePost = z.infer<typeof createPostSchema>;
export const updatePostSchema = optionalize(createPostSchema.shape);
export type UpdatePost = z.infer<typeof updatePostSchema>;

// Legacy aliases for existing imports
export type InsertContactMessage = CreateContactMessage;
export const insertContactMessageSchema = createContactMessageSchema;

export type InsertGalleryItem = CreateGalleryItem;
export const insertGalleryItemSchema = createGalleryItemSchema;
export const updateGalleryItemLegacySchema = updateGalleryItemSchema;

export type Service = ServiceItem;
export type InsertService = CreateService;
export const insertServiceSchema = createServiceSchema;

export type InsertTestimonial = CreateTestimonial;
export const insertTestimonialSchema = createTestimonialSchema;

export type InsertFaq = CreateFaq;
export const insertFaqSchema = createFaqSchema;

export type InsertPost = CreatePost;
export const insertPostSchema = createPostSchema;

// Product management
export const productCategorySchema = z.enum([
  "candle-3wick",
  "candle-mini",
  "candle-single",
  "car-diffuser",
  "room-spray",
  "cleaner"
]);
export type ProductCategory = z.infer<typeof productCategorySchema>;

export const createFragranceProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: productCategorySchema,
  fragrance: z.string().min(1, "Fragrance name is required"),
  price: z.number().positive("Price must be positive"),
  salePrice: z.number().positive("Sale price must be positive").optional(),
  displayPrice: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  imageUrl: optionalUrl.optional(),
  squareUrl: z.string().url("Must be a valid Square URL"),
  sku: z.string().optional(),
  featured: z.boolean().optional(),
  order: z.number().int().optional(),
});
export type CreateFragranceProduct = z.infer<typeof createFragranceProductSchema>;
export const updateFragranceProductSchema = optionalize(createFragranceProductSchema.shape);
export type UpdateFragranceProduct = z.infer<typeof updateFragranceProductSchema>;

export type InsertFragranceProduct = CreateFragranceProduct;
export const insertFragranceProductSchema = createFragranceProductSchema;

// ============================================
// E-Commerce & Booking Types (Square Integration)
// ============================================

export interface Cart {
  id: string;
  sessionId: string | null;
  userId: string | null;
  items: CartItem[];
  createdAt: string | Date;
  updatedAt: string | Date;
  expiresAt: string | Date;
}

export interface CartItem {
  id: number;
  cartId: string;
  productId: number;
  quantity: number;
  price: number;
  createdAt: string | Date;
}

export interface Order {
  id: number;
  squareOrderId: string;
  userId: string | null;
  email: string;
  status: "pending" | "paid" | "fulfilled" | "cancelled" | "refunded";
  total: number;
  subtotal: number;
  tax: number | null;
  items: OrderItem[];
  shippingAddress: Record<string, unknown> | null;
  billingAddress: Record<string, unknown> | null;
  paymentId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  name: string;
  quantity: number;
  price: number;
  sku: string | null;
}

export interface Booking {
  id: number;
  squareBookingId: string;
  customerId: string | null;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  serviceId: number;
  teamMemberId: string | null;
  startAt: string | Date;
  endAt: string | Date;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  notes: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface SquareConfig {
  id: number;
  accessToken: string;
  refreshToken: string | null;
  merchantId: string;
  locationId: string;
  applicationId: string;
  environment: "sandbox" | "production";
  webhookSignature: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface InventorySync {
  id: number;
  locationId: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  startedAt: string | Date | null;
  completedAt: string | Date | null;
  errorMessage: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface OAuthToken {
  id: number;
  service: string;
  provider: string;
  merchantId: string | null;
  locationId: string | null;
  accessToken: string;
  refreshToken: string | null;
  payload: Record<string, unknown> | null;
  expiresAt: string | Date;
  createdAt: string | Date;
}

// Legacy alias for FAQ imports
export type Faq = FaqItem;

// ============================================
// Zod Schemas for E-Commerce
// ============================================

export const createCartItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
});
export type CreateCartItem = z.infer<typeof createCartItemSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
});
export type UpdateCartItem = z.infer<typeof updateCartItemSchema>;

export const createBookingSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  customerPhone: z.string().optional(),
  serviceId: z.number().int().positive(),
  startAt: z.string().datetime(),
  notes: z.string().optional(),
});
export type CreateBooking = z.infer<typeof createBookingSchema>;

export const orderStatusSchema = z.enum(["pending", "paid", "fulfilled", "cancelled", "refunded"]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const bookingStatusSchema = z.enum(["pending", "confirmed", "cancelled", "completed"]);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
