import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Copy, DollarSign, TrendingUp, CreditCard, BarChart3, Handshake } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, parseJsonResponse } from "@/lib/queryClient";
import type { AffiliateStats } from "@shared/types";

interface PartnerProfile {
  id: number;
  brandName: string;
  slug: string;
  commissionRate: number;
  attributionWindowDays: number;
  status: string;
  vanityUrl: string;
  createdAt: string;
}

interface ConversionRow {
  id: number;
  grossAmount: number;
  commissionAmount: number;
  status: string;
  source: string;
  attributedAt: string;
  createdAt: string;
}

interface PayoutRow {
  id: number;
  amount: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

export default function PartnerDashboard() {
  const { isLoaded, isSignedIn, isLoading } = useAuth();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery<PartnerProfile>({
    queryKey: ["/api/partner/profile"],
    enabled: isLoaded && isSignedIn,
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/partner/profile");
      return parseJsonResponse<PartnerProfile>(res);
    },
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<AffiliateStats>({
    queryKey: ["/api/partner/stats"],
    enabled: Boolean(profile),
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/partner/stats");
      return parseJsonResponse<AffiliateStats>(res);
    },
  });

  const { data: conversions = [] } = useQuery<ConversionRow[]>({
    queryKey: ["/api/partner/conversions"],
    enabled: Boolean(profile),
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/partner/conversions");
      return parseJsonResponse<ConversionRow[]>(res);
    },
  });

  const { data: payouts = [] } = useQuery<PayoutRow[]>({
    queryKey: ["/api/partner/payouts"],
    enabled: Boolean(profile),
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/partner/payouts");
      return parseJsonResponse<PayoutRow[]>(res);
    },
  });

  const copyVanityUrl = () => {
    if (profile?.vanityUrl) {
      navigator.clipboard.writeText(profile.vanityUrl);
      toast({ title: "Link Copied", description: "Your partner link has been copied to clipboard." });
    }
  };

  // Loading state
  if (isLoading || (isSignedIn && profileLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-6 pt-32 pb-24 flex justify-center">
          <Card className="max-w-md w-full text-center">
            <CardHeader>
              <Handshake className="w-10 h-10 text-primary mx-auto mb-2" />
              <CardTitle className="font-serif">Partner Dashboard</CardTitle>
              <CardDescription>Please sign in to access your dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <a href="/partner/login">
                <Button className="w-full">Sign In</Button>
              </a>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // No partner account (403 or error)
  if (profileError) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-6 pt-32 pb-24 flex justify-center">
          <Card className="max-w-md w-full text-center">
            <CardHeader>
              <Handshake className="w-10 h-10 text-primary mx-auto mb-2" />
              <CardTitle className="font-serif">Application Under Review</CardTitle>
              <CardDescription>
                Your partner application is being reviewed. You'll receive an email once approved.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <a href="/partners">
                <Button variant="outline" className="w-full">Apply to Become a Partner</Button>
              </a>
              <a href="/" className="block text-sm text-muted-foreground hover:underline">
                Return to Homepage
              </a>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "approved": case "paid": return "default";
      case "pending": return "secondary";
      case "refunded": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-6 pt-32 pb-24">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-serif font-semibold mb-2">Partner Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.brandName}
            </p>
          </div>

          {/* Vanity URL */}
          {profile && (
            <Card className="mb-8">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Your Partner Link</p>
                    <p className="text-lg font-mono">{profile.vanityUrl}</p>
                  </div>
                  <Button variant="outline" onClick={copyVanityUrl}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Commission Rate: {(profile.commissionRate * 100).toFixed(0)}% &middot; Attribution Window: {profile.attributionWindowDays} days
                </p>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Conversions</p>
                    {statsLoading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <p className="text-2xl font-semibold">{stats?.totalConversions ?? 0}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Attributed Revenue</p>
                    {statsLoading ? (
                      <Skeleton className="h-7 w-24" />
                    ) : (
                      <p className="text-2xl font-semibold">${stats?.totalRevenue?.toFixed(2) ?? "0.00"}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Earned Commission</p>
                    {statsLoading ? (
                      <Skeleton className="h-7 w-24" />
                    ) : (
                      <p className="text-2xl font-semibold">${stats?.totalCommission?.toFixed(2) ?? "0.00"}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                    {statsLoading ? (
                      <Skeleton className="h-7 w-24" />
                    ) : (
                      <p className="text-2xl font-semibold text-primary">
                        ${stats?.outstandingBalance?.toFixed(2) ?? "0.00"}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conversions Table */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="font-serif text-lg">Conversions</CardTitle>
              <CardDescription>Attributed orders from your partner link</CardDescription>
            </CardHeader>
            <CardContent>
              {conversions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No conversions yet. Share your partner link to get started.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Order Amount</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversions.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{new Date(c.attributedAt).toLocaleDateString()}</TableCell>
                        <TableCell>${c.grossAmount.toFixed(2)}</TableCell>
                        <TableCell>${c.commissionAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={statusColor(c.status)}>{c.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Payouts Table */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-lg">Payouts</CardTitle>
              <CardDescription>Payment history</CardDescription>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No payouts yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          {new Date(p.periodStart).toLocaleDateString()} - {new Date(p.periodEnd).toLocaleDateString()}
                        </TableCell>
                        <TableCell>${p.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={statusColor(p.status)}>{p.status}</Badge>
                        </TableCell>
                        <TableCell>
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
