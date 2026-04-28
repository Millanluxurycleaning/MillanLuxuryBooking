import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { handleUnauthorizedError, getErrorMessage } from "@/lib/authUtils";
import { Package, Plus, Edit, Trash2, X, Loader2, ImageIcon, ExternalLink, Eye, EyeOff, DollarSign, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import type { FragranceProduct } from "@shared/types";
import { insertFragranceProductSchema } from "@shared/types";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { normalizeArrayData } from "@/lib/arrayUtils";
import { BlobBrowserModal } from "./BlobBrowserModal";
import type { BlobImage } from "@/types/blob";

type ProductFormData = z.infer<typeof insertFragranceProductSchema> & FieldValues;

const PRODUCT_CATEGORIES = [
  { value: "candle-3wick", label: "3-Wick Candle" },
  { value: "candle-mini", label: "Mini Candle" },
  { value: "candle-single", label: "Single Candle" },
  { value: "car-diffuser", label: "Car Diffuser" },
  { value: "room-spray", label: "Room Spray" },
  { value: "cleaner", label: "All-Purpose Cleaner" },
];

const FRAGRANCES = [
  "Bell",
  "Brazilian Paradise",
  "Gabrielle (Women) by Chanel",
  "Golden Hour",
  "Guilty (Men) by Gucci",
  "Mahogany Royal",
  "My Way",
  "Ocean Rain",
  "Piney Queen",
  "Sauvage (Men) by Dior",
  "Sweater Weather",
  "Under The Christmas Tree",
];

const getCategoryLabel = (value: string) =>
  PRODUCT_CATEGORIES.find((c) => c.value === value)?.label ?? value;

const STOCK_KEY = "mlc_fragrance_stock";

function loadStock(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STOCK_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStock(stock: Record<string, boolean>) {
  localStorage.setItem(STOCK_KEY, JSON.stringify(stock));
}

export function ProductsManagement() {
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [stockPanelOpen, setStockPanelOpen] = useState(false);
  // true = in stock (default), false = out of stock
  const [fragranceStock, setFragranceStock] = useState<Record<string, boolean>>(() => loadStock());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FragranceProduct | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [blobBrowserOpen, setBlobBrowserOpen] = useState(false);
  const [blobTargetForm, setBlobTargetForm] = useState<"add" | "edit">("add");
  const [uploading, setUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: productsPayload, isLoading, error } = useQuery<FragranceProduct[]>({
    queryKey: ["/api/products"],
    retry: false,
  });

  const { items: products = [], isValid: productsValid } = normalizeArrayData<FragranceProduct>(productsPayload);
  const normalizeCachedProducts = (value: unknown) => normalizeArrayData<FragranceProduct>(value).items;

  // counts per category for tab badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      counts[p.category] = (counts[p.category] ?? 0) + 1;
    });
    return counts;
  }, [products]);

  const filteredProducts = useMemo(
    () => (activeCategory === "all" ? products : products.filter((p) => p.category === activeCategory)),
    [products, activeCategory]
  );

  // when viewing "all", group by category
  const groupedProducts = useMemo(() => {
    if (activeCategory !== "all") return null;
    const groups: { category: string; label: string; items: FragranceProduct[] }[] = [];
    PRODUCT_CATEGORIES.forEach(({ value, label }) => {
      const items = products.filter((p) => p.category === value);
      if (items.length > 0) groups.push({ category: value, label, items });
    });
    // catch any unlisted categories
    const listed = new Set(PRODUCT_CATEGORIES.map((c) => c.value));
    const other = products.filter((p) => !listed.has(p.category));
    if (other.length > 0) groups.push({ category: "other", label: "Other", items: other });
    return groups;
  }, [products, activeCategory]);

  useEffect(() => {
    if (error) {
      if (handleUnauthorizedError(error, toast)) return;
      toast({ title: "Error", description: "Failed to load products", variant: "destructive" });
    }
  }, [error, toast]);

  useEffect(() => {
    if (!productsValid && !isLoading && !error) {
      console.warn("[Admin] Unexpected products payload shape.", productsPayload);
    }
  }, [productsPayload, productsValid, isLoading, error]);

  // ── forms ──────────────────────────────────────────────────────────────────

  const addForm = useForm<ProductFormData>({
    resolver: zodResolver(insertFragranceProductSchema),
    defaultValues: {
      name: "", description: "", category: "candle-3wick", fragrance: "",
      price: 0, displayPrice: true, isVisible: true, squareUrl: "", featured: false,
    },
  });

  const editForm = useForm<ProductFormData>({
    resolver: zodResolver(insertFragranceProductSchema),
    defaultValues: {
      name: "", description: "", category: "candle-3wick", fragrance: "",
      price: 0, displayPrice: true, isVisible: true, squareUrl: "", featured: false,
    },
  });

  // ── mutations ──────────────────────────────────────────────────────────────

  const addMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const res = await apiRequest("POST", "/api/products", data);
      const body = await res.json().catch(() => null);
      return (body?.data ?? body) as FragranceProduct | null;
    },
    onSuccess: (product) => {
      if (product) {
        queryClient.setQueryData<FragranceProduct[]>(["/api/products"], (prev = []) =>
          [...normalizeCachedProducts(prev), product].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Success", description: "Product created" });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (err) => {
      if (handleUnauthorizedError(err, toast)) return;
      const msg = getErrorMessage(err) || "Failed to create product";
      addForm.setError("root", { message: msg });
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ProductFormData> }) => {
      const res = await apiRequest("PATCH", `/api/products/${id}`, data);
      const body = await res.json().catch(() => null);
      return (body?.data ?? body) as FragranceProduct | null;
    },
    onSuccess: (product) => {
      if (product) {
        queryClient.setQueryData<FragranceProduct[]>(["/api/products"], (prev = []) =>
          normalizeCachedProducts(prev).map((item) => (item.id === product.id ? product : item))
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Success", description: "Product updated" });
      setEditingItem(null);
      editForm.reset();
    },
    onError: (err) => {
      if (handleUnauthorizedError(err, toast)) return;
      const msg = getErrorMessage(err) || "Failed to update product";
      editForm.setError("root", { message: msg });
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/products/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<FragranceProduct[]>(["/api/products"], (prev = []) =>
        normalizeCachedProducts(prev).filter((item) => item.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Success", description: "Product deleted" });
      setDeletingItemId(null);
    },
    onError: (err) => {
      if (handleUnauthorizedError(err, toast)) return;
      toast({ title: "Error", description: getErrorMessage(err) || "Failed to delete", variant: "destructive" });
    },
  });

  // quick visibility toggle without opening the edit dialog
  const toggleVisibility = (product: FragranceProduct) => {
    updateMutation.mutate({ id: product.id, data: { isVisible: !product.isVisible } });
  };

  // ── handlers ───────────────────────────────────────────────────────────────

  const handleEdit = (item: FragranceProduct) => {
    editForm.reset({
      name: item.name,
      description: item.description,
      category: item.category as any,
      fragrance: item.fragrance,
      price: Number(item.price),
      salePrice: item.salePrice ? Number(item.salePrice) : undefined,
      displayPrice: item.displayPrice,
      isVisible: item.isVisible,
      imageUrl: item.imageUrl || undefined,
      squareUrl: item.squareUrl,
      sku: item.sku || undefined,
      featured: item.featured,
    });
    setEditingItem(item);
  };

  const handleFileUpload = async (file: File, form: typeof addForm | typeof editForm) => {
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in. Please refresh and try again.");

      const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
      const pathname = `gallery/${Date.now()}.${ext}`;

      const tokenRes = await fetch("/api/blob/handle-upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "blob.generate-client-token",
          payload: { pathname, clientPayload: session.access_token, multipart: false },
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({})) as { error?: string };
        throw new Error(err?.error || `Token request failed (${tokenRes.status})`);
      }

      const { clientToken } = await tokenRes.json() as { clientToken: string };

      const params = new URLSearchParams({ pathname });
      const uploadRes = await fetch(`https://vercel.com/api/blob/?${params}`, {
        method: "PUT",
        headers: {
          authorization: `Bearer ${clientToken}`,
          "x-content-type": file.type || "application/octet-stream",
          "x-add-random-suffix": "0",
          "x-api-version": "11",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        const errBody = await uploadRes.json().catch(() => ({})) as { error?: string };
        throw new Error(errBody?.error || `Upload failed (${uploadRes.status})`);
      }

      const result = await uploadRes.json() as { url: string };
      form.setValue("imageUrl", result.url as any);
      toast({ title: "Success", description: "Image uploaded" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleBlobSelect = (image: BlobImage) => {
    const targetForm = blobTargetForm === "add" ? addForm : editForm;
    targetForm.setValue("imageUrl", image.url as any);
    setBlobBrowserOpen(false);
  };

  // pre-fill add form with a group's shared details so the user only picks fragrance
  const handleAddVariant = (template: FragranceProduct) => {
    addForm.reset({
      name: template.name,
      category: template.category as any,
      price: Number(template.price),
      salePrice: template.salePrice ? Number(template.salePrice) : undefined,
      description: template.description,
      imageUrl: template.imageUrl || undefined,
      squareUrl: template.squareUrl,
      displayPrice: template.displayPrice,
      isVisible: template.isVisible,
      featured: template.featured,
      fragrance: "",
    });
    setIsAddDialogOpen(true);
  };

  const toggleFragranceStock = (fragrance: string) => {
    setFragranceStock((prev) => {
      const current = prev[fragrance] !== false; // default true
      const next = { ...prev, [fragrance]: !current };
      saveStock(next);
      return next;
    });
  };

  const isInStock = (fragrance: string) => fragranceStock[fragrance] !== false;

  const handleSquareSync = async () => {
    setIsSyncing(true);
    try {
      const response = await apiRequest("POST", "/api/square/catalog/sync");
      const payload = await response.json().catch(() => null);
      const created = payload?.created ?? 0;
      const updated = payload?.updated ?? 0;
      toast({
        title: "Square sync complete",
        description: `${payload?.products ?? 0} products, ${payload?.services ?? 0} services (${created} created, ${updated} updated).`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    } catch (err) {
      toast({ title: "Sync failed", description: getErrorMessage(err) || "Failed to sync", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  // ── product form ────────────────────────────────────────────────────────────

  const ProductForm = ({ form, onSubmit, isEditing }: {
    form: typeof addForm | typeof editForm;
    onSubmit: (data: ProductFormData) => void;
    isEditing: boolean;
  }) => (

    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Bell 3-Wick Candle" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="fragrance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fragrance</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select fragrance" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FRAGRANCES.map((frag) => {
                    const inStock = isInStock(frag);
                    return (
                      <SelectItem key={frag} value={frag} className={inStock ? "" : "text-muted-foreground"}>
                        <span className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${inStock ? "bg-green-500" : "bg-red-500"}`} />
                          {frag}
                          {!inStock && <span className="text-xs text-red-500 font-medium">– Out of stock</span>}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Describe the product..." rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price ($)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" step="0.01" min="0"
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    placeholder="35.99" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="salePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sale Price ($ – Optional)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" step="0.01" min="0"
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="29.99" />
                </FormControl>
                <FormDescription>Leave empty if no sale</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="squareUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Square Product URL</FormLabel>
              <FormControl>
                <Input {...field} type="url" placeholder="https://millanluxurycleaning.square.site/product/..." />
              </FormControl>
              <FormDescription>Link to this product on Square</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <FormLabel>SKU (Optional)</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ""} placeholder="3WICK-BELL" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Image</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, form); }}
                      disabled={uploading}
                    />
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => { setBlobTargetForm(isEditing ? "edit" : "add"); setBlobBrowserOpen(true); }}>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Browse
                    </Button>
                  </div>
                  {uploading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                    </div>
                  )}
                  {field.value && (
                    <div className="flex items-center gap-3">
                      <div className="h-20 w-20 rounded border overflow-hidden bg-muted flex-shrink-0">
                        <img src={field.value} alt="Product" className="h-full w-full object-cover" />
                      </div>
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => form.setValue("imageUrl", undefined as any)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["displayPrice", "isVisible", "featured"] as const).map((name) => (
            <FormField key={name} control={form.control} name={name}
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      {name === "displayPrice" ? "Show Price" : name === "isVisible" ? "Visible" : "Featured"}
                    </FormLabel>
                    <FormDescription className="text-xs">
                      {name === "displayPrice" ? "Show price publicly" : name === "isVisible" ? "Show on site" : "Highlight product"}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          ))}
        </div>

        {form.formState.errors.root?.message && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}

        <DialogFooter>
          <Button type="submit" disabled={isEditing ? updateMutation.isPending : addMutation.isPending}>
            {(isEditing ? updateMutation.isPending : addMutation.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            {isEditing
              ? (updateMutation.isPending ? "Updating…" : "Update")
              : (addMutation.isPending ? "Creating…" : "Create")}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  // ── product group card (one card per unique product name) ──────────────────

  const ProductGroupCard = ({ variants }: { variants: FragranceProduct[] }) => {
    const first = variants[0];
    const allHidden = variants.every((p) => !p.isVisible);
    return (
      <Card className={`overflow-hidden transition-opacity ${allHidden ? "opacity-60" : ""}`}>
        {first.imageUrl ? (
          <div className="w-full aspect-square bg-muted overflow-hidden">
            <img src={first.imageUrl} alt={first.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full aspect-square bg-muted flex items-center justify-center">
            <Package className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}

        <CardContent className="p-3 space-y-2">
          {/* Name + price */}
          <div>
            <p className="font-semibold text-sm leading-tight">{first.name}</p>
            {first.displayPrice && (
              <div className="flex items-center gap-1.5 mt-1">
                <DollarSign className="h-3 w-3 text-primary flex-shrink-0" />
                {first.salePrice ? (
                  <>
                    <span className="line-through text-muted-foreground text-xs">${Number(first.price).toFixed(2)}</span>
                    <span className="font-bold text-sm text-primary">${Number(first.salePrice).toFixed(2)}</span>
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Sale</Badge>
                  </>
                ) : (
                  <span className="font-bold text-sm text-primary">${Number(first.price).toFixed(2)}</span>
                )}
              </div>
            )}
          </div>

          {/* Fragrance chips */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1.5">
              Fragrances ({variants.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {variants.map((p) => {
                const inStock = isInStock(p.fragrance);
                return (
                  <div
                    key={p.id}
                    className={`flex items-center gap-1 rounded-full border text-[11px] font-medium pl-2 pr-1 py-0.5 ${
                      p.isVisible
                        ? "bg-background border-border"
                        : "bg-muted border-muted text-muted-foreground"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${inStock ? "bg-green-500" : "bg-red-400"}`} />
                    <button
                      type="button"
                      className="hover:underline max-w-[90px] truncate"
                      title={`Edit ${p.fragrance}`}
                      onClick={() => handleEdit(p)}
                    >
                      {p.fragrance}
                    </button>
                    <button
                      type="button"
                      className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete this variant"
                      onClick={() => setDeletingItemId(p.id)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 pt-1">
            <Button
              variant="outline" size="sm" className="flex-1 h-7 text-xs"
              onClick={() => handleAddVariant(first)}
            >
              <Plus className="h-3 w-3 mr-1" /> Add Fragrance
            </Button>
            <Button
              variant={allHidden ? "secondary" : "outline"}
              size="sm" className="h-7 px-2"
              title={allHidden ? "Show all on site" : "Hide all from site"}
              onClick={() => variants.forEach((p) => toggleVisibility(p))}
              disabled={updateMutation.isPending}
            >
              {allHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
            {first.squareUrl && (
              <Button variant="outline" size="sm" className="h-7 px-2" asChild>
                <a href={first.squareUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  // group a flat list of products by name → one card per unique name
  const groupByName = (list: FragranceProduct[]) => {
    const map = new Map<string, FragranceProduct[]>();
    list.forEach((p) => {
      const key = p.name.trim().toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    });
    return Array.from(map.values());
  };

  // ── loading ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <Skeleton className="aspect-square w-full" />
            <CardContent className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // ── main render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={handleSquareSync} disabled={isSyncing}>
          {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {isSyncing ? "Syncing…" : "Sync Square"}
        </Button>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Product</DialogTitle>
              <DialogDescription>Create a new fragrance product.</DialogDescription>
            </DialogHeader>
            <ProductForm form={addForm} onSubmit={(d) => addMutation.mutate(d)} isEditing={false} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Fragrance stock panel */}
      <Card>
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
          onClick={() => setStockPanelOpen((o) => !o)}
        >
          <span className="flex items-center gap-2">
            Fragrance Stock
            <span className="text-xs font-normal text-muted-foreground">
              ({FRAGRANCES.filter((f) => !isInStock(f)).length} out of stock)
            </span>
          </span>
          {stockPanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {stockPanelOpen && (
          <CardContent className="pt-0 pb-4 px-4">
            <p className="text-xs text-muted-foreground mb-3">Click a fragrance to toggle its stock status.</p>
            <div className="flex flex-wrap gap-2">
              {FRAGRANCES.map((frag) => {
                const inStock = isInStock(frag);
                return (
                  <button
                    key={frag}
                    type="button"
                    onClick={() => toggleFragranceStock(frag)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      inStock
                        ? "bg-green-50 border-green-200 text-green-800 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                        : "bg-red-50 border-red-200 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${inStock ? "bg-green-500" : "bg-red-500"}`} />
                    {frag}
                    {!inStock && <span className="text-xs font-normal opacity-75">Out of stock</span>}
                  </button>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeCategory === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          }`}
        >
          All
          <span className="ml-1.5 text-xs opacity-70">{products.length}</span>
        </button>
        {PRODUCT_CATEGORIES.map(({ value, label }) => {
          const count = categoryCounts[value] ?? 0;
          if (count === 0) return null;
          return (
            <button
              key={value}
              onClick={() => setActiveCategory(value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeCategory === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {products.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              <Package className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p className="mb-4">No products yet.</p>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Your First Product
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grouped view (All tab) — category sections, each with name-grouped cards */}
      {groupedProducts && groupedProducts.map(({ category, label, items }) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-sm text-foreground">{label}</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {groupByName(items).length} product{groupByName(items).length !== 1 ? "s" : ""}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {groupByName(items).map((variants) => (
              <ProductGroupCard key={variants[0].id} variants={variants} />
            ))}
          </div>
        </div>
      ))}

      {/* Filtered single-category view — also name-grouped */}
      {!groupedProducts && filteredProducts.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {groupByName(filteredProducts).map((variants) => (
            <ProductGroupCard key={variants[0].id} variants={variants} />
          ))}
        </div>
      )}

      {!groupedProducts && filteredProducts.length === 0 && products.length > 0 && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No products in this category yet.
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update the product details.</DialogDescription>
          </DialogHeader>
          <ProductForm form={editForm} onSubmit={(d) => { if (editingItem) updateMutation.mutate({ id: editingItem.id, data: d }); }} isEditing={true} />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={deletingItemId !== null} onOpenChange={(open) => !open && setDeletingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deletingItemId) deleteMutation.mutate(deletingItemId); }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BlobBrowserModal
        open={blobBrowserOpen}
        onOpenChange={setBlobBrowserOpen}
        onSelect={handleBlobSelect}
        prefix="gallery"
      />
    </div>
  );
}
