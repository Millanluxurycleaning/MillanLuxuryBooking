import type { CatalogObject } from "square";
import { assertPrisma } from "../db/prismaClient.js";
import { createSquareClient, getSquareEnvironmentName } from "./square.js";
import { resolveSquareAccessToken } from "./squareAccess.js";

type CatalogSyncResult = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  services: number;
  products: number;
};

type MappedItem = {
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  squareCatalogId: string;
  squareItemId: string;
  squareVariationId: string;
  sku: string | null;
  category: string;
  fragrance: string;
  isService: boolean;
};

const PRODUCT_KEYWORDS = ["candle", "diffuser", "spray", "cleaner"];
const SERVICE_KEYWORDS = [
  "cleaning",
  "move-in",
  "move-out",
  "laundry",
  "comforter",
  "bed sheet",
  "add-on",
  "deep clean",
  "basic",
  "service",
  "maintenance",
];

const SERVICE_PRODUCT_TYPES = new Set([
  "APPOINTMENTS_SERVICE",
  "LEGACY_SQUARE_ONLINE_SERVICE",
  "LEGACY_SQUARE_ONLINE_MEMBERSHIP",
]);

const requireSquareSyncEnabled = () => {
  if (process.env.SQUARE_SYNC_ENABLED !== "true") {
    throw new Error("Square sync not enabled");
  }
  if (process.env.SQUARE_ENABLED !== "true") {
    throw new Error("Square not enabled");
  }
};

const buildImageMap = (objects: CatalogObject[]) => {
  const map = new Map<string, string>();
  for (const obj of objects) {
    if (obj.type !== "IMAGE" || !obj.imageData?.url) {
      continue;
    }
    map.set(obj.id, obj.imageData.url);
  }
  return map;
};

const isServiceItem = (item: CatalogObject, name: string): boolean => {
  const productType = item.itemData?.productType;
  if (productType && SERVICE_PRODUCT_TYPES.has(productType)) {
    return true;
  }
  const lowerName = name.toLowerCase();
  if (PRODUCT_KEYWORDS.some((keyword) => lowerName.includes(keyword))) {
    return false;
  }
  return SERVICE_KEYWORDS.some((keyword) => lowerName.includes(keyword));
};

const categorizeProduct = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("3 wick") || lowerName.includes("3-wick")) return "candle-3wick";
  if (lowerName.includes("mini")) return "candle-mini";
  if (lowerName.includes("single")) return "candle-single";
  if (lowerName.includes("diffuser") || lowerName.includes("car")) return "car-diffuser";
  if (lowerName.includes("spray") || lowerName.includes("room")) return "room-spray";
  if (lowerName.includes("cleaner") || lowerName.includes("multipurpose")) return "cleaner";
  return "other";
};

type VariationData = {
  priceMoney?: { amount?: bigint | number };
  name?: string | null;
  sku?: string | null;
};

const getVariationData = (variation: CatalogObject): VariationData | undefined =>
  (variation as CatalogObject & { itemVariationData?: VariationData }).itemVariationData;

const getVariationPrice = (variation: CatalogObject): number | null => {
  const data = getVariationData(variation);
  if (!data?.priceMoney?.amount) {
    return null;
  }
  const amount = data.priceMoney.amount;
  return (typeof amount === "bigint" ? Number(amount) : amount) / 100;
};

// Maps a Square catalog item to one or more MappedItems (one per variation for products)
const mapCatalogItems = (item: CatalogObject, images: Map<string, string>): MappedItem[] => {
  if (item.type !== "ITEM" || !item.itemData?.variations?.length) {
    return [];
  }

  const name = item.itemData.name?.trim();
  if (!name) {
    return [];
  }
  const itemId = item.id;
  if (!itemId) {
    return [];
  }

  const imageId = item.itemData.imageIds?.[0];
  const imageUrl = imageId ? images.get(imageId) ?? null : null;
  const category = categorizeProduct(name);
  const description = item.itemData.description?.trim() ?? null;

  // Services: only create one record (use first priced variation)
  if (isServiceItem(item, name)) {
    const firstPriced = item.itemData.variations.find((v) => getVariationPrice(v) !== null);
    if (!firstPriced) {
      return [];
    }
    const price = getVariationPrice(firstPriced) ?? 0;
    return [
      {
        name,
        description,
        price,
        imageUrl,
        squareCatalogId: itemId,
        squareItemId: itemId,
        squareVariationId: firstPriced.id ?? itemId,
        sku: getVariationData(firstPriced)?.sku ?? null,
        category,
        fragrance: "Signature",
        isService: true,
      },
    ];
  }

  // Products: create one record per variation (fragrance)
  return item.itemData.variations
    .map((variation) => {
      const price = getVariationPrice(variation);
      if (price === null) {
        return null;
      }
      const variationName = getVariationData(variation)?.name?.trim();
      // Use variation name as fragrance, or "Signature" if not specified
      const fragrance = variationName && variationName.length > 0 ? variationName : "Signature";
      return {
        name,
        description,
        price,
        imageUrl,
        squareCatalogId: itemId,
        squareItemId: itemId,
        squareVariationId: variation.id ?? itemId,
        sku: getVariationData(variation)?.sku ?? null,
        category,
        fragrance,
        isService: false,
      };
    })
    .filter((value): value is MappedItem => Boolean(value));
};

export const importSquareCatalog = async (): Promise<CatalogSyncResult> => {
  requireSquareSyncEnabled();
  const accessToken = await resolveSquareAccessToken();
  const client = createSquareClient(accessToken);

  // Fetch all catalog items with pagination
  const allItems: CatalogObject[] = [];
  let cursor: string | undefined;

  do {
    const result = await client.catalog.list({ cursor });
    if (result.data?.length) {
      for (const obj of result.data) {
        if (obj.type === "ITEM") {
          allItems.push(obj);
        }
      }
    }
    cursor = result.response?.cursor;
  } while (cursor);

  // Fetch images separately (catalog.list doesn't return IMAGE type by default)
  const allImages: CatalogObject[] = [];
  cursor = undefined;

  do {
    const result = await client.catalog.list({ cursor, types: ["IMAGE"] });
    if (result.data?.length) {
      for (const obj of result.data) {
        allImages.push(obj);
      }
    }
    cursor = result.response?.cursor;
  } while (cursor);

  console.log(`[SquareCatalog] Fetched ${allItems.length} items and ${allImages.length} images`);

  const images = buildImageMap(allImages);
  const prisma = assertPrisma();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let services = 0;
  let products = 0;

  for (const item of allItems) {
    const mappedItems = mapCatalogItems(item, images);
    if (!mappedItems.length) {
      skipped += 1;
      continue;
    }

    try {
      // Check if it's a service (first item determines type)
      if (mappedItems[0]?.isService) {
        const mapped = mappedItems[0];

        // Remove any FragranceProduct with this catalog ID
        await prisma.fragranceProduct.deleteMany({
          where: { squareCatalogId: mapped.squareCatalogId },
        });

        // Upsert as ServiceItem
        const existing = await prisma.serviceItem.findFirst({
          where: { squareServiceId: mapped.squareCatalogId },
        });

        if (existing) {
          await prisma.serviceItem.update({
            where: { id: existing.id },
            data: {
              title: mapped.name,
              description: mapped.description || `Professional ${mapped.name} service`,
              price: mapped.price,
              imageUrl: mapped.imageUrl,
              isVisible: true,
              displayPrice: true,
            },
          });
          updated += 1;
        } else {
          await prisma.serviceItem.create({
            data: {
              title: mapped.name,
              description: mapped.description || `Professional ${mapped.name} service`,
              price: mapped.price,
              imageUrl: mapped.imageUrl,
              squareServiceId: mapped.squareCatalogId,
              isVisible: true,
              displayPrice: true,
            },
          });
          created += 1;
        }
        services += 1;
      } else {
        // Products: handle each variation separately
        const itemId = mappedItems[0].squareItemId;
        const variationIds = mappedItems.map((m) => m.squareVariationId);

        // Remove any ServiceItem with this catalog ID
        await prisma.serviceItem.deleteMany({
          where: { squareServiceId: itemId },
        });

        // Remove old variations that no longer exist
        await prisma.fragranceProduct.deleteMany({
          where: {
            squareItemId: itemId,
            squareVariationId: { notIn: variationIds },
          },
        });

        // Upsert each variation
        for (const mapped of mappedItems) {
          const existing = await prisma.fragranceProduct.findFirst({
            where: { squareVariationId: mapped.squareVariationId },
          });

          if (existing) {
            await prisma.fragranceProduct.update({
              where: { id: existing.id },
              data: {
                name: mapped.name,
                description: mapped.description || `Luxury ${mapped.name}`,
                category: mapped.category,
                fragrance: mapped.fragrance,
                price: mapped.price,
                imageUrl: mapped.imageUrl,
                squareCatalogId: mapped.squareCatalogId,
                squareItemId: mapped.squareItemId,
                squareVariationId: mapped.squareVariationId,
                sku: mapped.sku,
                isVisible: true,
                displayPrice: true,
              },
            });
            updated += 1;
          } else {
            await prisma.fragranceProduct.create({
              data: {
                name: mapped.name,
                description: mapped.description || `Luxury ${mapped.name}`,
                category: mapped.category,
                fragrance: mapped.fragrance,
                price: mapped.price,
                imageUrl: mapped.imageUrl,
                squareUrl: `https://millanluxurycleaning.square.site/`,
                squareCatalogId: mapped.squareCatalogId,
                squareItemId: mapped.squareItemId,
                squareVariationId: mapped.squareVariationId,
                sku: mapped.sku,
                isVisible: true,
                displayPrice: true,
              },
            });
            created += 1;
          }
          products += 1;
        }
      }
    } catch (error) {
      console.error(`[SquareCatalog] Error processing ${mappedItems[0]?.name ?? "item"}:`, error);
      errors += 1;
    }
  }

  console.log(
    `[SquareCatalog] env=${getSquareEnvironmentName()} total=${allItems.length} created=${created} updated=${updated} skipped=${skipped} errors=${errors} (services=${services}, products=${products})`
  );

  return {
    total: allItems.length,
    created,
    updated,
    skipped,
    errors,
    services,
    products,
  };
};
