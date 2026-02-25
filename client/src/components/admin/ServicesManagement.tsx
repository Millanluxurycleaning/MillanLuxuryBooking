import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { handleUnauthorizedError, getErrorMessage } from "@/lib/authUtils";
import { Briefcase, Plus, Edit, Trash2, X, Loader2, ImageIcon } from "lucide-react";
import type { Service } from "@shared/types";
import { insertServiceSchema } from "@shared/types";
import { z } from "zod";
import { apiRequest, queryClient, throwIfResNotOk, parseJsonResponse } from "@/lib/queryClient";
import { normalizeArrayData } from "@/lib/arrayUtils";
import { BlobBrowserModal } from "./BlobBrowserModal";
import type { BlobImage } from "@/types/blob";

type ServiceFormData = z.infer<typeof insertServiceSchema> & FieldValues;

export function ServicesManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Service | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);
  const [blobBrowserOpen, setBlobBrowserOpen] = useState(false);
  const [blobTargetForm, setBlobTargetForm] = useState<'add' | 'edit'>('add');
  const [uploading, setUploading] = useState(false);

  const { data: servicesPayload, isLoading, error } = useQuery<Service[]>({
    queryKey: ["/api/services"],
    retry: false,
  });

  const { items: services = [], isValid: servicesValid } = normalizeArrayData<Service>(servicesPayload);

  const normalizeCachedServices = (value: unknown) => normalizeArrayData<Service>(value).items;

  useEffect(() => {
    if (error) {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load services",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    if (!servicesValid && !isLoading && !error) {
      // eslint-disable-next-line no-console
      console.warn("[Admin] Unexpected services payload shape.", servicesPayload);
    }
  }, [servicesPayload, servicesValid, isLoading, error]);

  const addForm = useForm<ServiceFormData>({
    resolver: zodResolver(insertServiceSchema),
    defaultValues: {
      name: "",
      description: "",
      features: [""],
      displayPrice: false,
      isVisible: true,
    },
  });

  const editForm = useForm<ServiceFormData>({
    resolver: zodResolver(insertServiceSchema),
    defaultValues: {
      name: "",
      description: "",
      features: [""],
      displayPrice: false,
      isVisible: true,
    },
  });

  const addFieldArray = useFieldArray<ServiceFormData>({
    control: addForm.control,
    name: "features",
  });

  const editFieldArray = useFieldArray<ServiceFormData>({
    control: editForm.control,
    name: "features",
  });

  const addMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      const res = await apiRequest("POST", "/api/services", data);
      const body = await res.json().catch(() => null);
      return (body?.data ?? body) as Service | null;
    },
    onSuccess: (service) => {
      if (service) {
        queryClient.setQueryData<Service[]>(["/api/services"], (prev = []) => {
          const normalizedPrev = normalizeCachedServices(prev);
          const next = [...normalizedPrev, service];
          return next.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Success",
        description: "Service created successfully",
      });
      setIsAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      const message = getErrorMessage(error) || "Failed to create service";
      addForm.setError("root", { message });
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ServiceFormData> }) => {
      const res = await apiRequest("PATCH", `/api/services/${id}`, data);
      const body = await res.json().catch(() => null);
      return (body?.data ?? body) as Service | null;
    },
    onSuccess: (service) => {
      if (service) {
        queryClient.setQueryData<Service[]>(["/api/services"], (prev = []) =>
          normalizeCachedServices(prev).map((item) => (item.id === service.id ? service : item))
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Success",
        description: "Service updated successfully",
      });
      setEditingItem(null);
      editForm.reset();
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      const message = getErrorMessage(error) || "Failed to update service";
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
      await apiRequest("DELETE", `/api/services/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Service[]>(["/api/services"], (prev = []) =>
        normalizeCachedServices(prev).filter((item) => item.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
      setDeletingItemId(null);
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) {
        return;
      }
      const message = getErrorMessage(error) || "Failed to delete service";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = (item: Service) => {
    editForm.reset({
      name: item.name,
      description: item.description,
      features: (item.features && item.features.length > 0) ? item.features : [""],
      imageUrl: item.imageUrl || undefined,
      price: item.price ? Number(item.price) : undefined,
      displayPrice: item.displayPrice ?? false,
      isVisible: item.isVisible ?? true,
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

  const onAddSubmit = (data: ServiceFormData) => {
    const filtered = {
      ...data,
      features: (data.features ?? []).filter(f => f.trim()),
    };
    addMutation.mutate(filtered);
  };

  const onEditSubmit = (data: ServiceFormData) => {
    if (!editingItem) return;
    const filtered = {
      ...data,
      features: (data.features ?? []).filter(f => f.trim()),
    };
    updateMutation.mutate({ id: editingItem.id, data: filtered });
  };

  const handleDeleteConfirm = () => {
    if (deletingItemId) {
      deleteMutation.mutate(deletingItemId);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-2/3 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-service">
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Service</DialogTitle>
              <DialogDescription>
                Add a new service offering.
              </DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Deep Cleaning" data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Describe the service..." data-testid="textarea-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addForm.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Image (Optional)</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, addForm);
                              }}
                              disabled={uploading}
                              data-testid="input-imageUrl-file"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setBlobTargetForm('add');
                                setBlobBrowserOpen(true);
                              }}
                            >
                              <ImageIcon className="mr-2 h-4 w-4" />
                              Browse
                            </Button>
                          </div>
                          {field.value && (
                            <div className="flex items-center gap-3">
                              <div className="h-16 w-16 rounded border overflow-hidden bg-muted">
                                <img src={field.value} alt="Service" className="h-full w-full object-cover" />
                              </div>
                              <div className="text-xs text-muted-foreground break-all flex-1">
                                {field.value}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => addForm.setValue('imageUrl', undefined as any)}
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

                <div>
                  <FormLabel className="mb-2 block">Features</FormLabel>
                  <div className="space-y-2">
                    {addFieldArray.fields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <FormField
                          control={addForm.control}
                          name={`features.${index}`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder={`Feature ${index + 1}`}
                                  data-testid={`input-feature-${index}`}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => addFieldArray.remove(index)}
                          data-testid={`button-remove-feature-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addFieldArray.append("")}
                    className="mt-2"
                    data-testid="button-add-feature"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Feature
                  </Button>
                </div>

                <FormField
                  control={addForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($ - Optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder="299.00"
                        />
                      </FormControl>
                      <FormDescription>Optional pricing for this service</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={addForm.control}
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
                    control={addForm.control}
                    name="isVisible"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Visible on Site</FormLabel>
                          <FormDescription>
                            Hide service without deleting
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

                {addForm.formState.errors.root?.message && (
                  <p className="text-sm text-destructive">{addForm.formState.errors.root.message}</p>
                )}

                <DialogFooter>
                  <Button type="submit" disabled={addMutation.isPending} data-testid="button-submit">
                    {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {addMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-8">
              <Briefcase className="mx-auto h-12 w-12 mb-3 opacity-50" />
              <p className="mb-4">No services yet.</p>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Service
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {services.map((service) => (
            <Card key={service.id} data-testid={`card-service-${service.id}`} className="hover-elevate">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg" data-testid={`text-name-${service.id}`}>
                      {service.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {service.description}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(service)}
                      data-testid={`button-edit-${service.id}`}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeletingItemId(service.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${service.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1">
                  {Array.isArray(service.features) && service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-0.5">✓</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>
              Update the service details.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="textarea-edit-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Image (Optional)</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileUpload(file, editForm);
                            }}
                            disabled={uploading}
                            data-testid="input-edit-imageUrl-file"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setBlobTargetForm('edit');
                              setBlobBrowserOpen(true);
                            }}
                          >
                            <ImageIcon className="mr-2 h-4 w-4" />
                            Browse
                          </Button>
                        </div>
                        {field.value && (
                          <div className="flex items-center gap-3">
                            <div className="h-16 w-16 rounded border overflow-hidden bg-muted">
                              <img src={field.value} alt="Service" className="h-full w-full object-cover" />
                            </div>
                            <div className="text-xs text-muted-foreground break-all flex-1">
                              {field.value}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => editForm.setValue('imageUrl', undefined as any)}
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

              <div>
                <FormLabel className="mb-2 block">Features</FormLabel>
                <div className="space-y-2">
                  {editFieldArray.fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <FormField
                        control={editForm.control}
                        name={`features.${index}`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={`Feature ${index + 1}`}
                                data-testid={`input-edit-feature-${index}`}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => editFieldArray.remove(index)}
                        data-testid={`button-remove-edit-feature-${index}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => editFieldArray.append("")}
                  className="mt-2"
                  data-testid="button-add-edit-feature"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Feature
                </Button>
              </div>

              <FormField
                control={editForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($ - Optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="299.00"
                      />
                    </FormControl>
                    <FormDescription>Optional pricing for this service</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
                  name="isVisible"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Visible on Site</FormLabel>
                        <FormDescription>
                          Hide service without deleting
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

              {editForm.formState.errors.root?.message && (
                <p className="text-sm text-destructive">{editForm.formState.errors.root.message}</p>
              )}

              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update">
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {updateMutation.isPending ? "Updating..." : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingItemId !== null} onOpenChange={(open) => !open && setDeletingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this service? This action cannot be undone.
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
        onOpenChange={setBlobBrowserOpen}
        onSelect={handleBlobSelect}
        prefix="gallery"
      />
    </div>
  );
}
