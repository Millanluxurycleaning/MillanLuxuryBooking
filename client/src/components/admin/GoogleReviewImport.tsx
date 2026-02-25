import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, CheckCircle2, AlertCircle } from 'lucide-react';

export function GoogleReviewImport() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check connection status
  const { data: status } = useQuery<{ connected: boolean }>({
    queryKey: ['/api/auth/google/status'],
    enabled: open,
  });

  // Connect to Google
  const connectGoogle = () => {
    fetch('/api/auth/google', {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        // Open OAuth popup
        const popup = window.open(
          data.authUrl,
          'Google OAuth',
          'width=500,height=600'
        );

        // Poll for completion
        const interval = setInterval(() => {
          if (popup?.closed) {
            clearInterval(interval);
            queryClient.invalidateQueries({ queryKey: ['/api/auth/google/status'] });
            toast({
              title: 'Connected!',
              description: 'Google account connected successfully.',
            });
          }
        }, 500);
      })
      .catch(() => {
        toast({
          title: 'Error',
          description: 'Failed to connect to Google.',
          variant: 'destructive',
        });
      });
  };

  // Import reviews
  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/reviews/import/google', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Import failed');
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Reviews Imported',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/testimonials/pending'] });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Import from Google
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Google Reviews</DialogTitle>
          <DialogDescription>
            Connect your Google Business Profile to import reviews.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {status?.connected ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm">Google account connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm">Not connected</span>
              </>
            )}
          </div>

          {/* Actions */}
          {!status?.connected ? (
            <Button onClick={connectGoogle} className="w-full">
              Connect Google Account
            </Button>
          ) : (
            <Button
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
              className="w-full"
            >
              {importMutation.isPending ? 'Importing...' : 'Import Reviews'}
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            Imported reviews will appear in "Pending Approval" and won't be
            visible on the site until you approve them.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
