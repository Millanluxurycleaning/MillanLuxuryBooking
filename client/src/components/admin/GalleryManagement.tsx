import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { handleUnauthorizedError, getErrorMessage } from "@/lib/authUtils";
import { ImageIcon, Plus, Edit, Trash2, Loader2 } from "lucide-react";
import type { GalleryItem, InsertGalleryItem } from "@shared/types";
import { insertGalleryItemSchema } from "@shared/types";
import { apiRequest, parseJsonResponse, queryClient, throwIfResNotOk } from "@/lib/queryClient";
import { normalizeArrayData } from "@/lib/arrayUtils";
import { BlobBrowserModal, type BlobBrowserModalProps } from "./BlobBrowserModal";
import type { BlobImage } from "@/types/blob";

type GalleryFormData = InsertGalleryItem;
const placeholderImage = "https://placehold.co/600x600?text=Image+coming+soon";

const normalizeCategoryKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const formatCategoryLabel = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "Uncategorized";
  if (/[-_]/.test(trimmed)) {
    return trimmed
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return trimmed;
};

export function GalleryManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [blobBrowserOpen, setBlobBrowserOpen] = useState(false);
  const [blobTargetField, setBlobTargetField] = useState<"imageUrl" | "beforeImageUrl" | "afterImageUrl">("imageUrl");
  const [blobPrefix, setBlobPrefix] = useState<BlobBrowserModalProps["prefix"]>("gallery");

  const fieldPrefixMap: Record<typeof blobTargetField, BlobBrowserModalProps["prefix"]> = {
    imageUrl: "gallery",
    beforeImageUrl: "before",
    afterImageUrl: "after",
  };

  const { data: galleryPayload, isLoading, error } = useQuery<GalleryItem[]>({
    queryKey: ["/api/gallery"],
    retry: false,
  });

  const { items, isValid } = normalizeArrayData<GalleryItem>(galleryPayload);
  const normalizeCachedItems = (value: unknown) => normalizeArrayData<GalleryItem>(value).items;
  const categoryOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number; raw: string }>();
    items.forEach((item) => {
      const raw = item.category?.trim();
      if (!raw) return;
      const key = normalizeCategoryKey(raw);
      if (!key) return;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, { label: formatCategoryLabel(raw), count: 1, raw });
      }
    });
    return Array.from(map.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  useEffect(() => {
    if (error) {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load gallery items",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (!isValid && !isLoading && !error) {
      // eslint-disable-next-line no-console
      console.warn("[Admin] Unexpected gallery payload shape.", galleryPayload);
    }
  }, [galleryPayload, isValid, isLoading, error]);

  const addForm = useForm<GalleryFormData>({
    resolver: zodResolver(insertGalleryItemSchema),
    defaultValues: {
      title: "",
      category: "all",
    },
  });

  const editForm = useForm<GalleryFormData>({
    resolver: zodResolver(insertGalleryItemSchema),
  });

  const addMutation = useMutation({
    mutationFn: async (data: GalleryFormData) => {
      const res = await apiRequest("POST", "/api/gallery", data);
      const body = await res.json().catch(() => null);
      return (body?.data ?? body) as GalleryItem | null;
    },
    onSuccess: (createdItem) => {
      if (createdItem) {
        queryClient.setQueryData<GalleryItem[]>(["/api/gallery"], (prev = []) => {
          const normalizedPrev = normalizeCachedItems(prev);
          const next = [...normalizedPrev, createdItem];
          return next.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({
        title: "Success",
        description: "Gallery item created successfully",
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      const message = getErrorMessage(error) || "Failed to create gallery item";
      addForm.setError("root", { message });
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<GalleryFormData> }) => {
      const res = await apiRequest("PATCH", `/api/gallery/${id}`, data);
      const body = await res.json().catch(() => null);
      return (body?.data ?? body) as GalleryItem | null;
    },
    onSuccess: (updatedItem) => {
      if (updatedItem) {
        queryClient.setQueryData<GalleryItem[]>(["/api/gallery"], (prev = []) =>
          normalizeCachedItems(prev).map((item) => (item.id === updatedItem.id ? updatedItem : item))
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({
        title: "Success",
        description: "Gallery item updated successfully",
      });
      setEditingItem(null);
      editForm.reset();
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      const message = getErrorMessage(error) || "Failed to update gallery item";
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
      await apiRequest("DELETE", `/api/gallery/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<GalleryItem[]>(["/api/gallery"], (prev = []) =>
        normalizeCachedItems(prev).filter((item) => item.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/gallery"] });
      toast({
        title: "Success",
        description: "Gallery item deleted successfully",
      });
      setDeletingItemId(null);
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      toast({
        title: "Error",
        description: getErrorMessage(error) || "Failed to delete gallery item",
        variant: "destructive",
      });
      setDeletingItemId(null);
    },
  });

  const onAddSubmit = (data: GalleryFormData) => {
    const cleanedCategory = data.category?.trim();
    if (!cleanedCategory) {
      addForm.setError("category", { message: "Category is required" });
      return;
    }
    const cleanedData: GalleryFormData = {
      ...data,
      category: cleanedCategory,
      imageUrl: data.imageUrl || undefined,
      beforeImageUrl: data.beforeImageUrl || undefined,
      afterImageUrl: data.afterImageUrl || undefined,
      order: data.order ?? undefined,
    };
    addMutation.mutate(cleanedData);
  };

  const onEditSubmit = (data: GalleryFormData) => {
    if (editingItem) {
      const cleanedCategory = data.category?.trim();
      if (!cleanedCategory) {
        editForm.setError("category", { message: "Category is required" });
        return;
      }
      const cleanedData: Partial<GalleryFormData> = {
        ...data,
        category: cleanedCategory,
        imageUrl: data.imageUrl || undefined,
        beforeImageUrl: data.beforeImageUrl || undefined,
        afterImageUrl: data.afterImageUrl || undefined,
        order: data.order ?? undefined,
      };
      updateMutation.mutate({ id: editingItem.id, data: cleanedData });
    }
  };

  const handleEdit = (item: GalleryItem) => {
    setEditingItem(item);
    editForm.reset({
      title: item.title,
      ...(item.imageUrl && { imageUrl: item.imageUrl }),
      ...(item.imagePublicId && { imagePublicId: item.imagePublicId }),
      ...(item.imageFilename && { imageFilename: item.imageFilename }),
      ...(item.beforeImageUrl && { beforeImageUrl: item.beforeImageUrl }),
      ...(item.beforeImagePublicId && { beforeImagePublicId: item.beforeImagePublicId }),
      ...(item.beforeImageFilename && { beforeImageFilename: item.beforeImageFilename }),
      ...(item.afterImageUrl && { afterImageUrl: item.afterImageUrl }),
      ...(item.afterImagePublicId && { afterImagePublicId: item.afterImagePublicId }),
      ...(item.afterImageFilename && { afterImageFilename: item.afterImageFilename }),
      category: item.category,
      ...(item.order !== null && item.order !== undefined && { order: item.order }),
    });
  };

  const handleDeleteConfirm = () => {
    if (deletingItemId !== null) {
      deleteMutation.mutate(deletingItemId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-48 w-full mb-3" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const metaMap: Record<typeof blobTargetField, { publicId: keyof GalleryFormData; filename: keyof GalleryFormData }> = {
    imageUrl: { publicId: "imagePublicId", filename: "imageFilename" },
    beforeImageUrl: { publicId: "beforeImagePublicId", filename: "beforeImageFilename" },
    afterImageUrl: { publicId: "afterImagePublicId", filename: "afterImageFilename" },
  };

  const setImageFieldFromBlob = (image: BlobImage, fieldName: typeof blobTargetField) => {
    const filename = image.pathname.split("/").pop();
    const mapping = metaMap[fieldName];

    addForm.setValue(fieldName, image.url);
    editForm.setValue(fieldName, image.url);

    if (mapping) {
      addForm.setValue(mapping.publicId, image.pathname as GalleryFormData[keyof GalleryFormData]);
      editForm.setValue(mapping.publicId, image.pathname as GalleryFormData[keyof GalleryFormData]);

      if (filename) {
        addForm.setValue(mapping.filename, filename as GalleryFormData[keyof GalleryFormData]);
        editForm.setValue(mapping.filename, filename as GalleryFormData[keyof GalleryFormData]);
      }
    }
  };

  const GalleryForm = ({ form, onSubmit, isPending }: { 
    form: ReturnType<typeof useForm<GalleryFormData>>; 
    onSubmit: (data: GalleryFormData) => void;
    isPending: boolean;
  }) => {
    const rootError = form.formState.errors.root?.message;
    const [uploading, setUploading] = useState(false);
    const [photoType, setPhotoType] = useState<'single' | 'before-after'>(() => {
      const values = form.getValues();
      return (values.beforeImageUrl || values.afterImageUrl) ? 'before-after' : 'single';
    });

    const handlePhotoTypeChange = (type: 'single' | 'before-after') => {
      setPhotoType(type);
      if (type === 'single') {
        form.setValue('beforeImageUrl', undefined);
        form.setValue('afterImageUrl', undefined);
        form.setValue('beforeImagePublicId', undefined);
        form.setValue('afterImagePublicId', undefined);
        form.setValue('beforeImageFilename', undefined);
        form.setValue('afterImageFilename', undefined);
      } else {
        form.setValue('imageUrl', undefined);
        form.setValue('imagePublicId', undefined);
        form.setValue('imageFilename', undefined);
      }
    };

    const handleFileUpload = async (file: File, fieldName: 'imageUrl' | 'beforeImageUrl' | 'afterImageUrl') => {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);

        const prefix = fieldPrefixMap[fieldName];
        const response = await fetch(`/api/blob/upload?prefix=${prefix}`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        await throwIfResNotOk(response);
        const payload = await parseJsonResponse(response, `/api/blob/upload?prefix=${prefix}`);

        const data = (payload?.data ?? payload) as Partial<BlobImage> & { url?: string; pathname?: string };

        if (!data?.url || !data.pathname) {
          throw new Error('Upload failed');
        }

        form.setValue(fieldName, data.url);

        const mapping = metaMap[fieldName];
        const filename = data.pathname.split('/').pop() || file.name;

        if (mapping) {
          form.setValue(mapping.publicId as keyof GalleryFormData, data.pathname);
          form.setValue(mapping.filename as keyof GalleryFormData, filename);
        }

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
    
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. Kitchen Deep Clean" data-testid="input-title" />
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
              <Select onValueChange={field.onChange} value={field.value ?? ""} data-testid="input-category">
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">All (show in every filter)</SelectItem>
                  <SelectItem value="basic-cleaning">Basic Cleaning</SelectItem>
                  <SelectItem value="deep-cleaning">Deep Cleaning</SelectItem>
                  <SelectItem value="move-in-out">Move In / Move Out</SelectItem>
                  <SelectItem value="bedroom">Bedroom</SelectItem>
                  <SelectItem value="living-room">Living Room</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="kitchen">Kitchen</SelectItem>
                  <SelectItem value="bathroom">Bathroom</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Order</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={field.value ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "") {
                      field.onChange(undefined);
                      return;
                    }
                    const parsed = Number(value);
                    field.onChange(Number.isNaN(parsed) ? undefined : parsed);
                  }}
                  placeholder="Leave blank to auto-order"
                  data-testid="input-order"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">Photo Type</p>

          {/* Toggle */}
          <div className="flex rounded-md border overflow-hidden mb-5">
            <button
              type="button"
              onClick={() => handlePhotoTypeChange('single')}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${photoType === 'single' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            >
              Single Photo
            </button>
            <button
              type="button"
              onClick={() => handlePhotoTypeChange('before-after')}
              className={`flex-1 py-2 text-sm font-medium transition-colors border-l ${photoType === 'before-after' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            >
              Before &amp; After
            </button>
          </div>

          {photoType === 'single' ? (
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'imageUrl');
                        }}
                        disabled={uploading}
                        data-testid="input-imageUrl-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBlobTargetField("imageUrl");
                          setBlobPrefix(fieldPrefixMap.imageUrl);
                          setBlobBrowserOpen(true);
                        }}
                      >
                        Choose Existing
                      </Button>
                      {field.value && (
                        <div className="relative h-48 w-full rounded border overflow-hidden bg-muted">
                          <img src={field.value} alt="Preview" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <div className="space-y-5">
              <FormField
                control={form.control}
                name="beforeImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold tracking-wide">BEFORE</span>
                      Before Photo
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'beforeImageUrl');
                          }}
                          disabled={uploading}
                          data-testid="input-beforeImageUrl-file"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBlobTargetField("beforeImageUrl");
                            setBlobPrefix(fieldPrefixMap.beforeImageUrl);
                            setBlobBrowserOpen(true);
                          }}
                        >
                          Choose Existing
                        </Button>
                        {field.value && (
                          <div className="relative h-48 w-full rounded border overflow-hidden bg-muted">
                            <img src={field.value} alt="Before preview" className="h-full w-full object-cover" />
                            <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded font-bold">BEFORE</span>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="afterImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold tracking-wide">AFTER</span>
                      After Photo
                    </FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(file, 'afterImageUrl');
                          }}
                          disabled={uploading}
                          data-testid="input-afterImageUrl-file"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBlobTargetField("afterImageUrl");
                            setBlobPrefix(fieldPrefixMap.afterImageUrl);
                            setBlobBrowserOpen(true);
                          }}
                        >
                          Choose Existing
                        </Button>
                        {field.value && (
                          <div className="relative h-48 w-full rounded border overflow-hidden bg-muted">
                            <img src={field.value} alt="After preview" className="h-full w-full object-cover" />
                            <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded font-bold">AFTER</span>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {rootError && (
            <p className="text-sm text-destructive mt-2" data-testid="error-root">
              {rootError}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending || uploading} data-testid="button-submit">
            {(isPending || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {uploading ? "Uploading..." : isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
        </form>
      </Form>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-gallery">
              <Plus className="mr-2 h-4 w-4" />
              Add Gallery Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Gallery Item</DialogTitle>
              <DialogDescription>
                Add a new photo to the gallery. Provide either a single image or before/after images.
              </DialogDescription>
            </DialogHeader>
            <GalleryForm form={addForm} onSubmit={onAddSubmit} isPending={addMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              <ImageIcon className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p className="mb-4">No gallery items yet.</p>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Item
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} data-testid={`card-gallery-${item.id}`} className="group relative">
              <CardContent className="p-4">
                {item.beforeImageUrl && item.afterImageUrl ? (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="relative aspect-square rounded overflow-hidden bg-muted">
                      <img
                        src={item.beforeImageUrl || placeholderImage}
                        alt={`${item.title} - Before`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">BEFORE</span>
                    </div>
                    <div className="relative aspect-square rounded overflow-hidden bg-muted">
                      <img
                        src={item.afterImageUrl || placeholderImage}
                        alt={`${item.title} - After`}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">AFTER</span>
                    </div>
                  </div>
                ) : item.imageUrl ? (
                  <div className="aspect-square rounded overflow-hidden bg-muted mb-3">
                    <img
                      src={item.imageUrl || placeholderImage}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : null}
                
                <h3 className="font-medium mb-2" data-testid={`text-title-${item.id}`}>
                  {item.title}
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {formatCategoryLabel(item.category)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Order: {item.order}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(item)}
                    data-testid={`button-edit-${item.id}`}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setDeletingItemId(item.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${item.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Gallery Item</DialogTitle>
            <DialogDescription>
              Update the gallery item details.
            </DialogDescription>
          </DialogHeader>
          <GalleryForm form={editForm} onSubmit={onEditSubmit} isPending={updateMutation.isPending} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingItemId !== null} onOpenChange={(open) => !open && setDeletingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gallery Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this gallery item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending} data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BlobBrowserModal
        open={blobBrowserOpen}
        prefix={blobPrefix}
        onClose={() => setBlobBrowserOpen(false)}
        onSelect={(image) => {
          setImageFieldFromBlob(image, blobTargetField);
        }}
      />
    </div>
  );
}
