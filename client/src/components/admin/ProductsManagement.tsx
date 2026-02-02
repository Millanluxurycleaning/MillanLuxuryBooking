import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Package, Plus, Edit, Trash2, X, Loader2, ImageIcon, ExternalLink, Eye, EyeOff, DollarSign, RefreshCw } from "lucide-react";
import type { FragranceProduct } from "@shared/types";
import { insertFragranceProductSchema } from "@shared/types";
import { z } from "zod";
import { apiRequest, queryClient, throwIfResNotOk, parseJsonResponse } from "@/lib/queryClient";
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

export function ProductsManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FragranceProduct | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [blobBrowserOpen, setBlobBrowserOpen] = useState(false);
  const [blobTargetForm, setBlobTargetForm] = useState<'add' | 'edit'>('add');
  const [uploading, setUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { data: productsPayload, isLoading, error } = useQuery<FragranceProduct[]>({
    queryKey: ["/api/products"],
    retry: false,
  });

  const { items: products = [], isValid: productsValid } = normalizeArrayData<FragranceProduct>(productsPayload);

  const normalizeCachedProducts = (value: unknown) => normalizeArrayData<FragranceProduct>(value).items;

  useEffect(() => {
    if (error) {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (!productsValid && !isLoading && !error) {
      console.warn("[Admin] Unexpected products payload shape.", productsPayload);
    }
  }, [productsPayload, productsValid, isLoading, error]);

  const addForm = useForm<ProductFormData>({
    resolver: zodResolver(insertFragranceProductSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "candle-3wick",
      fragrance: "",
      price: 0,
      displayPrice: true,
      isVisible: true,
      squareUrl: "",
      featured: false,
    },
  });

  const editForm = useForm<ProductFormData>({
    resolver: zodResolver(insertFragranceProductSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "candle-3wick",
      fragrance: "",
      price: 0,
      displayPrice: true,
      isVisible: true,
      squareUrl: "",
      featured: false,
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const res = await apiRequest("POST", "/api/products", data);
      const body = await res.json().catch(() => null);
      return (body?.data ?? body) as FragranceProduct | null;
    },
    onSuccess: (product) => {
      if (product) {
        queryClient.setQueryData<FragranceProduct[]>(["/api/products"], (prev = []) => {
          const normalizedPrev = normalizeCachedProducts(prev);
          const next = [...normalizedPrev, product];
          return next.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Product created successfully",
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      const message = getErrorMessage(error) || "Failed to create product";
      addForm.setError("root", { message });
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
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
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      setEditingItem(null);
      editForm.reset();
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      const message = getErrorMessage(error) || "Failed to update product";
      editForm.setError("root", { message });
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
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
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
      setDeletingItemId(null);
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      const message = getErrorMessage(error) || "Failed to delete product";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

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
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/blob/upload?prefix=gallery', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      await throwIfResNotOk(response);
      const payload = await parseJsonResponse(response, '/api/blob/upload?prefix=gallery');

      const data = (payload?.data ?? payload) as Partial<BlobImage> & { url?: string };

      if (!data?.url) {
        throw new Error('Upload failed');
      }

      form.setValue('imageUrl', data.url as any);

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBlobSelect = (image: BlobImage) => {
    const targetForm = blobTargetForm === 'add' ? addForm : editForm;
    targetForm.setValue('imageUrl', image.url as any);
    setBlobBrowserOpen(false);
  };

  const onAddSubmit = (data: ProductFormData) => {
    addMutation.mutate(data);
  };

  const onEditSubmit = (data: ProductFormData) => {
    if (!editingItem) return;
    updateMutation.mutate({ id: editingItem.id, data });
  };

  const handleDeleteConfirm = () => {
    if (deletingItemId) {
      deleteMutation.mutate(deletingItemId);
    }
  };

  const handleSquareSync = async () => {
    setIsSyncing(true);
    try {
      const response = await apiRequest("POST", "/api/square/catalog/sync");
      const payload = await response.json().catch(() => null);
      const created = payload?.created ?? 0;
      const updated = payload?.updated ?? 0;
      const services = payload?.services ?? 0;
      const products = payload?.products ?? 0;
      toast({
        title: "Square sync complete",
        description: `Updated ${products} products and ${services} services (created ${created}, updated ${updated}).`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    } catch (error) {
      const message = getErrorMessage(error) || "Failed to sync Square catalog";
      toast({
        title: "Sync failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

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
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
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
                  <SelectTrigger>
                    <SelectValue placeholder="Select fragrance" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FRAGRANCES.map((frag) => (
                    <SelectItem key={frag} value={frag}>
                      {frag}
                    </SelectItem>
                  ))}
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
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    min="0"
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    placeholder="35.99"
                  />
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
                <FormLabel>Sale Price ($ - Optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    step="0.01"
                    min="0"
                    value={field.value || ""}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="29.99"
                  />
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
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, form);
                      }}
                      disabled={uploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBlobTargetForm(isEditing ? 'edit' : 'add');
                        setBlobBrowserOpen(true);
                      }}
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Browse
                    </Button>
                  </div>
                  {field.value && (
                    <div className="flex items-center gap-3">
                      <div className="h-20 w-20 rounded border overflow-hidden bg-muted">
                        <img src={field.value} alt="Product" className="h-full w-full object-cover" />
                      </div>
                      <div className="text-xs text-muted-foreground break-all flex-1">
                        {field.value}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => form.setValue('imageUrl', undefined as any)}
                      >
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
          <FormField
            control={form.control}
            name="displayPrice"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Show Price</FormLabel>
                  <FormDescription>
                    Display price on public site
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="isVisible"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Visible</FormLabel>
                  <FormDescription>
                    Show on public site
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="featured"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Featured</FormLabel>
                  <FormDescription>
                    Highlight this product
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
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
              ? updateMutation.isPending ? "Updating..." : "Update"
              : addMutation.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-2/3 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleSquareSync} disabled={isSyncing}>
          {isSyncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {isSyncing ? "Syncing Square..." : "Sync Square Catalog"}
        </Button>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Product</DialogTitle>
              <DialogDescription>
                Create a new fragrance product.
              </DialogDescription>
            </DialogHeader>
            <ProductForm form={addForm} onSubmit={onAddSubmit} isEditing={false} />
          </DialogContent>
        </Dialog>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              <Package className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p className="mb-4">No products yet.</p>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Product
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="hover-elevate">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-base">{product.name}</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {PRODUCT_CATEGORIES.find(c => c.value === product.category)?.label}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    {!product.isVisible && (
                      <Badge variant="secondary" className="text-xs">
                        <EyeOff className="h-3 w-3 mr-1" />
                        Hidden
                      </Badge>
                    )}
                    {product.featured && (
                      <Badge className="text-xs">
                        Featured
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {product.imageUrl && (
                  <div className="w-full h-48 rounded overflow-hidden bg-muted">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Fragrance:</span>
                    <span className="text-muted-foreground">{product.fragrance}</span>
                  </div>
                  {product.displayPrice && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      {product.salePrice ? (
                        <div className="flex items-center gap-2">
                          <span className="line-through text-muted-foreground text-sm">
                            ${Number(product.price).toFixed(2)}
                          </span>
                          <span className="text-lg font-bold text-primary">
                            ${Number(product.salePrice).toFixed(2)}
                          </span>
                          <Badge variant="destructive" className="text-xs">Sale</Badge>
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-primary">
                          ${Number(product.price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                  {!product.displayPrice && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      Price hidden from public
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingItemId(product.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={product.squareUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product details.
            </DialogDescription>
          </DialogHeader>
          <ProductForm form={editForm} onSubmit={onEditSubmit} isEditing={true} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingItemId !== null} onOpenChange={(open) => !open && setDeletingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
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
