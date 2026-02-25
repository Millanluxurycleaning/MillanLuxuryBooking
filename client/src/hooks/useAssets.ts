import { useQuery } from "@tanstack/react-query";
import type { Asset, SiteAsset } from "@shared/types";
import { parseJsonResponse, throwIfResNotOk } from "@/lib/queryClient";

export type SiteAssetMap = Record<string, Asset>;

type SiteAssetResponseRecord = (Asset & { key?: string }) | (SiteAsset & { key?: string });

function safeObj<T extends object>(value: unknown): T {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as T)
    : ({} as T);
}

function safeEntries(value: unknown) {
  try {
    return Object.entries(safeObj<Record<string, unknown>>(value));
  } catch {
    return [] as [string, unknown][];
  }
}

function normalizeAsset(asset: SiteAssetResponseRecord, keyFallback?: string): Asset | null {
  if (!asset?.url) return null;

  try {
    const inferredName = "name" in asset ? (asset as SiteAssetResponseRecord & { name?: string }).name : undefined;
    const filename = asset.filename || inferredName || asset.publicId?.split("/").pop() || new URL(asset.url).pathname.split("/").pop();
    const publicId = asset.publicId || new URL(asset.url).pathname;

    const rawId = (asset as any).id ?? (asset as any).key ?? keyFallback ?? filename ?? asset.url;
    return {
      id: typeof rawId === "number" ? rawId : Number(rawId) || 0,
      key: (asset as any).key ?? keyFallback ?? "",
      url: asset.url,
      publicId,
      filename: filename ?? "asset",
    };
  } catch {
    return null;
  }
}

export function useAssets() {
  return useQuery<SiteAssetMap>({
    queryKey: ["/api/assets"],
    queryFn: async () => {
      const res = await fetch("/api/assets", { credentials: "include" });
      await throwIfResNotOk(res);
      const payload = await parseJsonResponse(res, "/api/assets");
      const rawAssets = payload?.data !== undefined ? payload.data : payload;
      const assets = safeObj<Record<string, SiteAssetResponseRecord>>(rawAssets);

      if (Array.isArray(rawAssets)) {
        return (rawAssets as SiteAssetResponseRecord[]).reduce<SiteAssetMap>((acc, asset) => {
          if (asset?.key && asset?.url) {
            const normalized = normalizeAsset(asset);
            if (normalized) {
              acc[asset.key] = normalized;
            }
          }
          return acc;
        }, {});
      }

      const entries = safeEntries(assets) as [string, SiteAssetResponseRecord][];

      return entries.reduce<SiteAssetMap>((acc, [key, value]) => {
        const normalized = normalizeAsset(value, key);
        if (normalized) {
          acc[key] = normalized;
        }
        return acc;
      }, {});
    },
    initialData: {},
  });
}
