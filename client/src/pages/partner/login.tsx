import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Handshake } from "lucide-react";
import { SiGoogle } from "react-icons/si";

export default function PartnerLogin() {
  const { isLoaded, isSignedIn, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // After sign-in, attempt auto-link then redirect to dashboard
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const autoLink = async () => {
      setLinking(true);
      try {
        await apiRequest("POST", "/api/partner/link");
        setLocation("/partner/dashboard");
      } catch (err: any) {
        if (err?.status === 404) {
          setLinkError("No approved partner account found for your email. If you've applied, your application may still be under review.");
        } else if (err?.status === 409) {
          setLinkError("This partner account is linked to another user. Please contact support.");
        } else {
          setLinkError("Unable to access your partner account. Please try again.");
        }
      } finally {
        setLinking(false);
      }
    };

    autoLink();
  }, [isLoaded, isSignedIn, setLocation]);

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/partner/login`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  // Loading state
  if (isLoading || linking) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              {linking ? "Connecting your partner account..." : "Loading..."}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Error state (signed in but no partner account)
  if (isSignedIn && linkError) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-6 pt-32 pb-24 flex justify-center">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <Handshake className="w-10 h-10 text-primary mx-auto mb-2" />
              <CardTitle className="font-serif">Partner Access</CardTitle>
              <CardDescription>{linkError}</CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <a href="/partners" className="block">
                <Button variant="outline" className="w-full">
                  Apply to Become a Partner
                </Button>
              </a>
              <a href="/" className="text-sm text-muted-foreground hover:underline">
                Return to Homepage
              </a>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  // Not signed in — show sign-in form
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-6 pt-32 pb-24 flex justify-center">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Handshake className="w-10 h-10 text-primary mx-auto mb-2" />
            <CardTitle className="font-serif text-2xl">Partner Sign In</CardTitle>
            <CardDescription>
              Sign in to access your partner dashboard, track performance, and view your unique link.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={handleGoogleSignIn}
              variant="outline"
              className="w-full h-12 text-base"
            >
              <SiGoogle className="w-5 h-5 mr-3" />
              Continue with Google
            </Button>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Not a partner yet?{" "}
                <a href="/partners" className="text-primary hover:underline">
                  Apply here
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
