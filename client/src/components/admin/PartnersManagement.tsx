import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Check, X, ExternalLink, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { handleUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, parseJsonResponse } from "@/lib/queryClient";
import { useEffect, useState } from "react";
import type { AffiliateApplication } from "@shared/types";

interface AffiliateWithStats {
  id: number;
  userId: string | null;
  contactEmail: string;
  brandName: string;
  slug: string;
  commissionRate: number;
  attributionWindowDays: number;
  status: string;
  createdAt: string;
  totalConversions: number;
  pendingConversions: number;
  totalRevenue: number;
  totalCommission: number;
  totalPaid: number;
  outstandingBalance: number;
}

export function PartnersManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Applications
  const { data: applications = [], isLoading: appsLoading, error: appsError } = useQuery<AffiliateApplication[]>({
    queryKey: ["/api/admin/partner-applications"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/partner-applications");
      return parseJsonResponse<AffiliateApplication[]>(res);
    },
    retry: false,
  });

  // Affiliates
  const { data: affiliates = [], isLoading: affiliatesLoading, error: affiliatesError } = useQuery<AffiliateWithStats[]>({
    queryKey: ["/api/admin/affiliates"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/affiliates");
      return parseJsonResponse<AffiliateWithStats[]>(res);
    },
    retry: false,
  });

  useEffect(() => {
    const err = appsError || affiliatesError;
    if (err) {
      if (handleUnauthorizedError(err, toast)) return;
      toast({ title: "Error", description: "Failed to load partner data", variant: "destructive" });
    }
  }, [appsError, affiliatesError, toast]);

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, commissionRate }: { id: number; commissionRate: number }) => {
      return apiRequest("PATCH", `/api/admin/partner-applications/${id}/approve`, { commissionRate });
    },
    onSuccess: () => {
      toast({ title: "Approved", description: "Partner application approved and account created." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partner-applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to approve", variant: "destructive" });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("PATCH", `/api/admin/partner-applications/${id}/reject`);
    },
    onSuccess: () => {
      toast({ title: "Rejected", description: "Application rejected." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/partner-applications"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to reject", variant: "destructive" });
    },
  });

  // Update affiliate mutation
  const updateAffiliateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      return apiRequest("PATCH", `/api/admin/affiliates/${id}`, data);
    },
    onSuccess: () => {
      toast({ title: "Updated", description: "Partner updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    },
  });

  const pendingApps = applications.filter((a) => a.status === "pending");
  const reviewedApps = applications.filter((a) => a.status !== "pending");

  const statusColor = (status: string) => {
    switch (status) {
      case "approved": case "active": case "paid": return "default" as const;
      case "pending": return "secondary" as const;
      case "rejected": case "disabled": case "refunded": return "destructive" as const;
      default: return "outline" as const;
    }
  };

  if (appsLoading && affiliatesLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Tabs defaultValue="applications" className="w-full">
      <TabsList className="grid w-full grid-cols-3 max-w-md">
        <TabsTrigger value="applications">
          Applications {pendingApps.length > 0 && <Badge variant="secondary" className="ml-2">{pendingApps.length}</Badge>}
        </TabsTrigger>
        <TabsTrigger value="partners">Partners</TabsTrigger>
        <TabsTrigger value="payouts">Payouts</TabsTrigger>
      </TabsList>

      {/* Applications Tab */}
      <TabsContent value="applications" className="mt-6">
        {pendingApps.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Pending Applications ({pendingApps.length})</h3>
            <div className="space-y-4">
              {pendingApps.map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onApprove={(commissionRate) => approveMutation.mutate({ id: app.id, commissionRate })}
                  onReject={() => rejectMutation.mutate(app.id)}
                  isApproving={approveMutation.isPending}
                  isRejecting={rejectMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}

        {reviewedApps.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-4">Reviewed ({reviewedApps.length})</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewedApps.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.brandName}</TableCell>
                    <TableCell>
                      <Badge variant={app.partnerType === "cleaning_partner" ? "outline" : "secondary"}>
                        {app.partnerType === "cleaning_partner" ? "Cleaning" : "Brand"}
                      </Badge>
                    </TableCell>
                    <TableCell>{app.contactEmail}</TableCell>
                    <TableCell><Badge variant={statusColor(app.status)}>{app.status}</Badge></TableCell>
                    <TableCell>{new Date(app.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {applications.length === 0 && (
          <p className="text-muted-foreground text-center py-12">No partner applications yet.</p>
        )}
      </TabsContent>

      {/* Partners Tab */}
      <TabsContent value="partners" className="mt-6">
        {affiliates.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No active partners yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Conversions</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {affiliates.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.brandName}</TableCell>
                  <TableCell className="font-mono text-sm">/with/{a.slug}</TableCell>
                  <TableCell>{(a.commissionRate * 100).toFixed(0)}%</TableCell>
                  <TableCell>{a.totalConversions}</TableCell>
                  <TableCell>${a.totalRevenue.toFixed(2)}</TableCell>
                  <TableCell>${a.totalCommission.toFixed(2)}</TableCell>
                  <TableCell className="font-medium">${a.outstandingBalance.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={statusColor(a.status)}>{a.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const newStatus = a.status === "active" ? "disabled" : "active";
                        updateAffiliateMutation.mutate({ id: a.id, data: { status: newStatus } });
                      }}
                    >
                      {a.status === "active" ? "Disable" : "Enable"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TabsContent>

      {/* Payouts Tab */}
      <TabsContent value="payouts" className="mt-6">
        <PayoutsSection affiliates={affiliates} />
      </TabsContent>
    </Tabs>
  );
}

// ============================================
// Application Card Sub-Component
// ============================================

function ApplicationCard({
  application,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  application: AffiliateApplication;
  onApprove: (commissionRate: number) => void;
  onReject: () => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const isCleaning = application.partnerType === "cleaning_partner";
  const [commissionRate, setCommissionRate] = useState(isCleaning ? "15" : "10");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{application.brandName}</CardTitle>
            <CardDescription>
              {application.contactName} &middot; {application.contactEmail}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={application.partnerType === "cleaning_partner" ? "outline" : "default"}>
              {application.partnerType === "cleaning_partner" ? "Cleaning Partner" : "Brand Affiliate"}
            </Badge>
            <Badge variant="secondary">pending</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {application.website && (
            <div>
              <span className="text-muted-foreground">Website: </span>
              <a href={application.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                {application.website} <ExternalLink className="inline w-3 h-3" />
              </a>
            </div>
          )}
          {application.instagram && (
            <div><span className="text-muted-foreground">Instagram: </span>{application.instagram}</div>
          )}
          {application.tiktok && (
            <div><span className="text-muted-foreground">TikTok: </span>{application.tiktok}</div>
          )}
          {application.youtube && (
            <div><span className="text-muted-foreground">YouTube: </span>{application.youtube}</div>
          )}
          {application.audienceSize && (
            <div><span className="text-muted-foreground">Audience: </span>{application.audienceSize}</div>
          )}
          {application.companySize && (
            <div><span className="text-muted-foreground">Team Size: </span>{application.companySize}</div>
          )}
          {application.serviceArea && (
            <div><span className="text-muted-foreground">Service Area: </span>{application.serviceArea}</div>
          )}
          {application.yearsInBusiness && (
            <div><span className="text-muted-foreground">Years in Business: </span>{application.yearsInBusiness}</div>
          )}
          {application.portfolioUrl && (
            <div>
              <span className="text-muted-foreground">Portfolio: </span>
              <a href={application.portfolioUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                View <ExternalLink className="inline w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {application.audienceDescription && (
          <div className="text-sm">
            <p className="text-muted-foreground mb-1">Audience Description:</p>
            <p>{application.audienceDescription}</p>
          </div>
        )}

        <div className="text-sm">
          <p className="text-muted-foreground mb-1">Why They Want to Partner:</p>
          <p>{application.whyPartner}</p>
        </div>

        {application.experience && (
          <div className="text-sm">
            <p className="text-muted-foreground mb-1">Experience:</p>
            <p>{application.experience}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-end gap-4 pt-4 border-t">
          <div className="flex-shrink-0">
            <Label className="text-xs text-muted-foreground">
              {isCleaning ? "Wholesale Discount (%)" : "Commission Rate (%)"}
            </Label>
            <Input
              type="number"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              className="w-24"
              min="1"
              max={isCleaning ? "30" : "50"}
            />
            {isCleaning && (
              <p className="text-xs text-muted-foreground mt-1">15-30% based on volume</p>
            )}
          </div>
          <Button
            onClick={() => onApprove(Number(commissionRate) / 100)}
            disabled={isApproving}
            size="sm"
          >
            {isApproving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
            Approve
          </Button>
          <Button
            variant="destructive"
            onClick={onReject}
            disabled={isRejecting}
            size="sm"
          >
            {isRejecting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <X className="w-4 h-4 mr-1" />}
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Payouts Sub-Component
// ============================================

function PayoutsSection({ affiliates }: { affiliates: AffiliateWithStats[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAffiliate, setSelectedAffiliate] = useState<number | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const createPayoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAffiliate) throw new Error("Select a partner");
      return apiRequest("POST", `/api/admin/affiliates/${selectedAffiliate}/payouts`, {
        amount: Number(payoutAmount),
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(periodEnd).toISOString(),
      });
    },
    onSuccess: () => {
      toast({ title: "Payout Created", description: "Payout record created." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/affiliates"] });
      setPayoutAmount("");
      setPeriodStart("");
      setPeriodEnd("");
      setSelectedAffiliate(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create payout", variant: "destructive" });
    },
  });

  const activePartners = affiliates.filter((a) => a.outstandingBalance > 0);

  return (
    <div className="space-y-6">
      {/* Create Payout */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create Payout</CardTitle>
          <CardDescription>Record a payout to a partner</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label>Partner</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                value={selectedAffiliate ?? ""}
                onChange={(e) => setSelectedAffiliate(Number(e.target.value) || null)}
              >
                <option value="">Select partner...</option>
                {activePartners.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.brandName} (${a.outstandingBalance.toFixed(2)} owed)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Amount ($)</Label>
              <Input
                type="number"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="0.00"
                min="0.01"
                step="0.01"
              />
            </div>
            <div>
              <Label>Period Start</Label>
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label>Period End</Label>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>
          <Button
            onClick={() => createPayoutMutation.mutate()}
            disabled={!selectedAffiliate || !payoutAmount || !periodStart || !periodEnd || createPayoutMutation.isPending}
            className="mt-4"
          >
            {createPayoutMutation.isPending ? "Creating..." : "Create Payout"}
          </Button>
        </CardContent>
      </Card>

      {/* Summary */}
      {affiliates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Outstanding Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partner</TableHead>
                  <TableHead>Commission Earned</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliates.filter((a) => a.totalCommission > 0).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.brandName}</TableCell>
                    <TableCell>${a.totalCommission.toFixed(2)}</TableCell>
                    <TableCell>${a.totalPaid.toFixed(2)}</TableCell>
                    <TableCell className="font-medium">
                      ${a.outstandingBalance.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
