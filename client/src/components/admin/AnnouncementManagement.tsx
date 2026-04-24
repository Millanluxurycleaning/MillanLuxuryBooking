import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { handleUnauthorizedError, getErrorMessage } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Announcement } from "@shared/types";
import { createAnnouncementSchema } from "@shared/types";
import { Plus, Edit, Trash2, Loader2, Megaphone } from "lucide-react";
import { z } from "zod";

type AnnouncementFormData = z.infer<typeof createAnnouncementSchema>;

const typeBadge: Record<string, string> = {
  info: "bg-blue-100 text-blue-800",
  warning: "bg-amber-100 text-amber-800",
  success: "bg-emerald-100 text-emerald-800",
};

function AnnouncementFormFields({ form }: { form: ReturnType<typeof useForm<AnnouncementFormData>> }) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="message"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Message</FormLabel>
            <FormControl>
              <Textarea rows={3} placeholder="e.g. We will be closed April 28 for the holiday." {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="info">Info (blue)</SelectItem>
                <SelectItem value="warning">Warning (amber)</SelectItem>
                <SelectItem value="success">Success (green)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Active</FormLabel>
              <FormDescription>Show this notice on the website</FormDescription>
            </div>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="startsAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Start date (optional)</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  {...field}
                  value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="endsAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>End date (optional)</FormLabel>
              <FormControl>
                <Input
                  type="datetime-local"
                  {...field}
                  value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""}
                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {form.formState.errors.root && (
        <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
      )}
    </div>
  );
}

export function AnnouncementManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
    retry: false,
  });

  const defaultValues: AnnouncementFormData = {
    message: "",
    type: "info",
    isActive: true,
    startsAt: null,
    endsAt: null,
  };

  const addForm = useForm<AnnouncementFormData>({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues,
  });

  const editForm = useForm<AnnouncementFormData>({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues,
  });

  const addMutation = useMutation({
    mutationFn: async (data: AnnouncementFormData) => {
      const res = await apiRequest("POST", "/api/announcements", data);
      const body = await res.json().catch(() => null);
      return (body?.data ?? body) as Announcement;
    },
    onSuccess: (item) => {
      if (item) {
        queryClient.setQueryData<Announcement[]>(["/api/announcements"], (prev = []) => [item, ...prev]);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/active"] });
      toast({ title: "Notice created" });
      setIsAddDialogOpen(false);
      addForm.reset(defaultValues);
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) return;
      const message = getErrorMessage(error) || "Failed to create notice";
      addForm.setError("root", { message });
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<AnnouncementFormData> }) => {
      const res = await apiRequest("PATCH", `/api/announcements/${id}`, data);
      const body = await res.json().catch(() => null);
      return (body?.data ?? body) as Announcement;
    },
    onSuccess: (item) => {
      if (item) {
        queryClient.setQueryData<Announcement[]>(["/api/announcements"], (prev = []) =>
          prev.map((a) => (a.id === item.id ? item : a))
        );
      }
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/active"] });
      toast({ title: "Notice updated" });
      setEditingItem(null);
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) return;
      const message = getErrorMessage(error) || "Failed to update notice";
      editForm.setError("root", { message });
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/announcements/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Announcement[]>(["/api/announcements"], (prev = []) =>
        prev.filter((a) => a.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements/active"] });
      toast({ title: "Notice deleted" });
      setDeletingItemId(null);
    },
    onError: (error) => {
      if (handleUnauthorizedError(error, toast)) return;
      toast({ title: "Error", description: "Failed to delete notice", variant: "destructive" });
    },
  });

  const handleEdit = (item: Announcement) => {
    editForm.reset({
      message: item.message,
      type: item.type as "info" | "warning" | "success",
      isActive: item.isActive,
      startsAt: item.startsAt ? new Date(item.startsAt).toISOString() : null,
      endsAt: item.endsAt ? new Date(item.endsAt).toISOString() : null,
    });
    setEditingItem(item);
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-xl font-semibold">Site Notices</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Post notices or monthly messages visible to all customers at the top of the site
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Notice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Site Notice</DialogTitle>
              <DialogDescription>This message will appear as a banner at the top of the site.</DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form onSubmit={addForm.handleSubmit((data) => addMutation.mutate(data))} className="space-y-6">
                <AnnouncementFormFields form={addForm} />
                <DialogFooter>
                  <Button type="submit" disabled={addMutation.isPending}>
                    {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Notice
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading notices...</p>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">No notices yet.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeBadge[item.type] ?? typeBadge.info}`}>
                      {item.type}
                    </span>
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardTitle className="text-base leading-snug">{item.message}</CardTitle>
                  {(item.startsAt || item.endsAt) && (
                    <CardDescription>
                      {item.startsAt && `From ${formatDate(item.startsAt)}`}
                      {item.startsAt && item.endsAt && " · "}
                      {item.endsAt && `Until ${formatDate(item.endsAt)}`}
                    </CardDescription>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="icon" onClick={() => handleEdit(item)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => setDeletingItemId(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notice</DialogTitle>
            <DialogDescription>Update the message shown to customers.</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit((data) => editingItem && updateMutation.mutate({ id: editingItem.id, data }))}
              className="space-y-6"
            >
              <AnnouncementFormFields form={editForm} />
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deletingItemId !== null} onOpenChange={(open) => !open && setDeletingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notice</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the notice. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingItemId !== null && deleteMutation.mutate(deletingItemId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
