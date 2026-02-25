import type {
  User,
  ContactMessage,
  GalleryItem,
  ServiceItem,
  Testimonial,
  FaqItem,
  SiteAsset,
  Post,
  InsertContactMessage,
  InsertGalleryItem,
  InsertService,
  InsertTestimonial,
  InsertFaq,
  InsertPost,
  UpdateService,
  UpdateGalleryItem,
  UpdateTestimonial,
  UpdateFaq,
  UpdatePost,
  BlobMetadata,
} from "@shared/types";
import { assertPrisma, hasDatabaseUrl } from "./db/prismaClient.js";
import { Prisma } from "@prisma/client";

export type UpsertUser = Pick<User, "id" | "email" | "firstName" | "lastName" | "profileImageUrl"> & {
  isAdmin?: boolean;
};

export interface IStorage {
  getUser(id: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;

  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getContactMessages(): Promise<ContactMessage[]>;
  getContactMessage(id: number): Promise<ContactMessage | null>;

  createGalleryItem(item: InsertGalleryItem): Promise<GalleryItem>;
  getGalleryItems(): Promise<GalleryItem[]>;
  getGalleryItem(id: number): Promise<GalleryItem | null>;
  updateGalleryItem(id: number, item: UpdateGalleryItem): Promise<GalleryItem | null>;
  deleteGalleryItem(id: number): Promise<boolean>;

  createTestimonial(item: InsertTestimonial): Promise<Testimonial>;
  getTestimonials(): Promise<Testimonial[]>;
  getTestimonial(id: number): Promise<Testimonial | null>;
  updateTestimonial(id: number, item: UpdateTestimonial): Promise<Testimonial | null>;
  deleteTestimonial(id: number): Promise<boolean>;

  createFaq(item: InsertFaq): Promise<FaqItem>;
  getFaqs(): Promise<FaqItem[]>;
  getFaq(id: number): Promise<FaqItem | null>;
  updateFaq(id: number, item: UpdateFaq): Promise<FaqItem | null>;
  deleteFaq(id: number): Promise<boolean>;

  createService(item: InsertService): Promise<ServiceItem>;
  getServices(): Promise<ServiceItem[]>;
  getService(id: number): Promise<ServiceItem | null>;
  updateService(id: number, item: UpdateService): Promise<ServiceItem | null>;
  deleteService(id: number): Promise<boolean>;

  upsertSiteAsset(asset: Partial<SiteAsset> & { key: string; url: string }): Promise<SiteAsset>;
  getSiteAssets(): Promise<SiteAsset[]>;
  getSiteAssetByKey(key: string): Promise<SiteAsset | null>;
  getSiteAssetByUrl(url: string): Promise<SiteAsset | null>;

  createPost(post: InsertPost): Promise<Post>;
  getPublishedPosts(): Promise<Post[]>;
  getPublishedPostBySlug(slug: string): Promise<Post | null>;
  getAllPosts(): Promise<Post[]>;
  updatePost(id: number, updates: UpdatePost): Promise<Post | null>;
  deletePost(id: number): Promise<boolean>;

}

function normalizeMetadata(metadata?: BlobMetadata | null): Prisma.JsonValue | undefined {
  if (!metadata) return undefined;
  return {
    url: metadata.url,
    pathname: metadata.pathname,
    contentType: metadata.contentType ?? null,
    filename: metadata.filename ?? null,
    size: metadata.size ?? null,
  };
}

class PrismaStorage implements IStorage {
  private db = assertPrisma();

  async getUser(id: string) {
    return this.db.user.findUnique({ where: { id } });
  }

  async getAllUsers() {
    return this.db.user.findMany();
  }

  async upsertUser(userData: UpsertUser) {
    return this.db.user.upsert({
      where: { id: userData.id },
      create: {
        id: userData.id,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        isAdmin: userData.isAdmin ?? false,
      },
      update: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        isAdmin: userData.isAdmin ?? false,
      },
    });
  }

  async createContactMessage(messageData: InsertContactMessage) {
    return this.db.contactMessage.create({ data: messageData });
  }

  async getContactMessages() {
    return this.db.contactMessage.findMany({ orderBy: { timestamp: "desc" } });
  }

  async getContactMessage(id: number) {
    return this.db.contactMessage.findUnique({ where: { id } });
  }

  async createGalleryItem(itemData: InsertGalleryItem): Promise<GalleryItem> {
    const maxOrder = await this.db.galleryItem.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;
    return this.db.galleryItem.create({ data: { ...itemData, order: nextOrder } }) as unknown as Promise<GalleryItem>;
  }

  async getGalleryItems(): Promise<GalleryItem[]> {
    return this.db.galleryItem.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] }) as unknown as Promise<GalleryItem[]>;
  }

  async getGalleryItem(id: number): Promise<GalleryItem | null> {
    return this.db.galleryItem.findUnique({ where: { id } }) as unknown as Promise<GalleryItem | null>;
  }

  async updateGalleryItem(id: number, itemData: UpdateGalleryItem): Promise<GalleryItem | null> {
    const existing = await this.getGalleryItem(id);
    if (!existing) return null;
    return this.db.galleryItem.update({ where: { id }, data: itemData }) as unknown as Promise<GalleryItem | null>;
  }

  async deleteGalleryItem(id: number) {
    const existing = await this.getGalleryItem(id);
    if (!existing) return false;
    await this.db.galleryItem.delete({ where: { id } });
    return true;
  }

  async createTestimonial(itemData: InsertTestimonial): Promise<Testimonial> {
    const maxOrder = await this.db.testimonial.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;
    return this.db.testimonial.create({
      data: {
        author: itemData.author ?? itemData.name ?? "",
        content: itemData.content ?? (itemData as any).review ?? "",
        rating: itemData.rating ?? 5,
        source: (itemData as any).source,
        sourceUrl: (itemData as any).sourceUrl,
        name: (itemData as any).name,
        review: (itemData as any).content ?? (itemData as any).review,
        order: nextOrder,
      },
    }) as unknown as Promise<Testimonial>;
  }

  async getTestimonials(): Promise<Testimonial[]> {
    return this.db.testimonial.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] }) as unknown as Promise<Testimonial[]>;
  }

  async getTestimonial(id: number): Promise<Testimonial | null> {
    return this.db.testimonial.findUnique({ where: { id } }) as unknown as Promise<Testimonial | null>;
  }

  async updateTestimonial(id: number, itemData: UpdateTestimonial): Promise<Testimonial | null> {
    const existing = await this.getTestimonial(id);
    if (!existing) return null;
    return this.db.testimonial.update({ where: { id }, data: itemData }) as unknown as Promise<Testimonial | null>;
  }

  async deleteTestimonial(id: number) {
    const existing = await this.getTestimonial(id);
    if (!existing) return false;
    await this.db.testimonial.delete({ where: { id } });
    return true;
  }

  async createFaq(itemData: InsertFaq) {
    const maxOrder = await this.db.faqItem.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;
    return this.db.faqItem.create({ data: { ...itemData, order: itemData.order ?? nextOrder } });
  }

  async getFaqs() {
    return this.db.faqItem.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] });
  }

  async getFaq(id: number) {
    return this.db.faqItem.findUnique({ where: { id } });
  }

  async updateFaq(id: number, itemData: UpdateFaq) {
    const existing = await this.getFaq(id);
    if (!existing) return null;
    return this.db.faqItem.update({ where: { id }, data: itemData });
  }

  async deleteFaq(id: number) {
    const existing = await this.getFaq(id);
    if (!existing) return false;
    await this.db.faqItem.delete({ where: { id } });
    return true;
  }

  async createService(itemData: InsertService): Promise<ServiceItem> {
    const maxOrder = await this.db.serviceItem.aggregate({ _max: { order: true } });
    const nextOrder = (maxOrder._max.order ?? -1) + 1;
    return this.db.serviceItem.create({
      data: {
        ...itemData,
        title: (itemData as any).title ?? (itemData as any).name ?? "",
        name: (itemData as any).name ?? (itemData as any).title ?? "",
        order: nextOrder,
      },
    }) as unknown as Promise<ServiceItem>;
  }

  async getServices(): Promise<ServiceItem[]> {
    return this.db.serviceItem.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }] }) as unknown as Promise<ServiceItem[]>;
  }

  async getService(id: number): Promise<ServiceItem | null> {
    return this.db.serviceItem.findUnique({ where: { id } }) as unknown as Promise<ServiceItem | null>;
  }

  async updateService(id: number, itemData: UpdateService): Promise<ServiceItem | null> {
    const existing = await this.getService(id);
    if (!existing) return null;
    return this.db.serviceItem.update({ where: { id }, data: itemData }) as unknown as Promise<ServiceItem | null>;
  }

  async deleteService(id: number) {
    const existing = await this.getService(id);
    if (!existing) return false;
    await this.db.serviceItem.delete({ where: { id } });
    return true;
  }

  async upsertSiteAsset(assetData: Partial<SiteAsset> & { key: string; url: string }) {
    return this.db.siteAsset.upsert({
      where: { key: assetData.key },
      create: {
        key: assetData.key,
        url: assetData.url,
        name: assetData.name ?? assetData.filename ?? assetData.key,
        filename: assetData.filename,
        publicId: assetData.publicId,
        description: assetData.description,
      },
      update: {
        url: assetData.url,
        name: assetData.name ?? assetData.filename ?? assetData.key,
        filename: assetData.filename,
        publicId: assetData.publicId,
        description: assetData.description,
      },
    });
  }

  async getSiteAssets() {
    return this.db.siteAsset.findMany({ orderBy: { key: "asc" } });
  }

  async getSiteAssetByKey(key: string) {
    return this.db.siteAsset.findUnique({ where: { key } });
  }

  async getSiteAssetByUrl(url: string) {
    return this.db.siteAsset.findFirst({ where: { url } });
  }

  async createPost(postData: InsertPost) {
    return this.db.post.create({ data: postData });
  }

  async getPublishedPosts() {
    return this.db.post.findMany({ where: { published: true }, orderBy: { createdAt: "desc" } });
  }

  async getPublishedPostBySlug(slug: string) {
    return this.db.post.findFirst({ where: { slug, published: true } });
  }

  async getAllPosts() {
    return this.db.post.findMany({ orderBy: { createdAt: "desc" } });
  }

  async updatePost(id: number, updates: UpdatePost) {
    const existing = await this.db.post.findUnique({ where: { id } });
    if (!existing) return null;
    return this.db.post.update({ where: { id }, data: { ...updates, updatedAt: new Date() } });
  }

  async deletePost(id: number) {
    const existing = await this.db.post.findUnique({ where: { id } });
    if (!existing) return false;
    await this.db.post.delete({ where: { id } });
    return true;
  }

}

class InMemoryStorage implements IStorage {
  private users: User[] = [];
  private contacts: ContactMessage[] = [];
  private gallery: GalleryItem[] = [];
  private testimonials: Testimonial[] = [];
  private faqs: FaqItem[] = [];
  private services: ServiceItem[] = [];
  private assets: SiteAsset[] = [];
  private posts: Post[] = [];
  async getUser(id: string) {
    return this.users.find((u) => u.id === id) ?? null;
  }
  async getAllUsers() { return this.users; }
  async upsertUser(userData: UpsertUser) {
    const existing = await this.getUser(userData.id);
    if (existing) {
      Object.assign(existing, userData);
      return existing;
    }
    const created: User = {
      id: userData.id,
      email: userData.email ?? null,
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      profileImageUrl: userData.profileImageUrl ?? null,
      isAdmin: userData.isAdmin ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.push(created);
    return created;
  }

  async createContactMessage(messageData: InsertContactMessage) {
    const message: ContactMessage = { id: this.contacts.length + 1, timestamp: new Date(), ...messageData };
    this.contacts.unshift(message);
    return message;
  }
  async getContactMessages() { return this.contacts; }
  async getContactMessage(id: number) { return this.contacts.find((m) => m.id === id) ?? null; }

  async createGalleryItem(itemData: InsertGalleryItem) {
    const item: GalleryItem = { id: this.gallery.length + 1, createdAt: new Date(), order: this.gallery.length, ...itemData } as GalleryItem;
    this.gallery.push(item);
    return item;
  }
  async getGalleryItems() { return this.gallery.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)); }
  async getGalleryItem(id: number) { return this.gallery.find((g) => g.id === id) ?? null; }
  async updateGalleryItem(id: number, item: UpdateGalleryItem) {
    const existing = await this.getGalleryItem(id);
    if (!existing) return null;
    Object.assign(existing, item);
    return existing;
  }
  async deleteGalleryItem(id: number) {
    const before = this.gallery.length;
    this.gallery = this.gallery.filter((g) => g.id !== id);
    return this.gallery.length < before;
  }

  async createTestimonial(item: InsertTestimonial) {
    const testimonial: Testimonial = {
      id: this.testimonials.length + 1,
      author: (item as any).author ?? (item as any).name ?? "",
      content: (item as any).content ?? (item as any).review ?? "",
      rating: item.rating ?? 5,
      createdAt: new Date(),
      source: (item as any).source,
      sourceUrl: (item as any).sourceUrl,
      order: this.testimonials.length,
    };
    this.testimonials.push(testimonial);
    return testimonial;
  }
  async getTestimonials() { return this.testimonials; }
  async getTestimonial(id: number) { return this.testimonials.find((t) => t.id === id) ?? null; }
  async updateTestimonial(id: number, item: UpdateTestimonial) {
    const existing = await this.getTestimonial(id);
    if (!existing) return null;
    Object.assign(existing, item);
    return existing;
  }
  async deleteTestimonial(id: number) {
    const before = this.testimonials.length;
    this.testimonials = this.testimonials.filter((t) => t.id !== id);
    return this.testimonials.length < before;
  }

  async createFaq(item: InsertFaq) {
    const faq: FaqItem = { id: this.faqs.length + 1, createdAt: new Date(), order: item.order ?? this.faqs.length, ...item };
    this.faqs.push(faq);
    return faq;
  }
  async getFaqs() { return this.faqs; }
  async getFaq(id: number) { return this.faqs.find((f) => f.id === id) ?? null; }
  async updateFaq(id: number, item: UpdateFaq) {
    const existing = await this.getFaq(id);
    if (!existing) return null;
    Object.assign(existing, item);
    return existing;
  }
  async deleteFaq(id: number) {
    const before = this.faqs.length;
    this.faqs = this.faqs.filter((f) => f.id !== id);
    return this.faqs.length < before;
  }

  async createService(item: InsertService) {
    const service: ServiceItem = {
      id: this.services.length + 1,
      createdAt: new Date(),
      order: this.services.length,
      title: (item as any).title ?? (item as any).name ?? "",
      description: item.description,
      iconUrl: item.iconUrl,
      imageUrl: item.imageUrl,
      features: (item as any).features ?? [],
    };
    this.services.push(service);
    return service;
  }
  async getServices() { return this.services; }
  async getService(id: number) { return this.services.find((s) => s.id === id) ?? null; }
  async updateService(id: number, item: UpdateService) {
    const existing = await this.getService(id);
    if (!existing) return null;
    Object.assign(existing, item);
    return existing;
  }
  async deleteService(id: number) {
    const before = this.services.length;
    this.services = this.services.filter((s) => s.id !== id);
    return this.services.length < before;
  }

  async upsertSiteAsset(asset: Partial<SiteAsset> & { key: string; url: string }) {
    const existing = this.assets.find((a) => a.key === asset.key);
    if (existing) {
      Object.assign(existing, asset, { updatedAt: new Date() });
      return existing;
    }
    const created: SiteAsset = {
      id: this.assets.length + 1,
      key: asset.key,
      url: asset.url,
      name: asset.name,
      filename: asset.filename,
      publicId: asset.publicId,
      description: asset.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.assets.push(created);
    return created;
  }
  async getSiteAssets() { return this.assets; }
  async getSiteAssetByKey(key: string) { return this.assets.find((a) => a.key === key) ?? null; }
  async getSiteAssetByUrl(url: string) { return this.assets.find((a) => a.url === url) ?? null; }

  async createPost(post: InsertPost) {
    const created: Post = { ...post, id: this.posts.length + 1, createdAt: new Date(), updatedAt: new Date(), published: post.published ?? false } as Post;
    this.posts.push(created);
    return created;
  }
  async getPublishedPosts() { return this.posts.filter((p) => p.published); }
  async getPublishedPostBySlug(slug: string) { return this.posts.find((p) => p.slug === slug && p.published) ?? null; }
  async getAllPosts() { return this.posts; }
  async updatePost(id: number, updates: UpdatePost) {
    const existing = await this.getPostById(id);
    if (!existing) return null;
    Object.assign(existing, updates, { updatedAt: new Date() });
    return existing;
  }
  private async getPostById(id: number) { return this.posts.find((p) => p.id === id) ?? null; }
  async deletePost(id: number) {
    const before = this.posts.length;
    this.posts = this.posts.filter((p) => p.id !== id);
    return this.posts.length < before;
  }

}

export const storage: IStorage = hasDatabaseUrl ? new PrismaStorage() : new InMemoryStorage();
