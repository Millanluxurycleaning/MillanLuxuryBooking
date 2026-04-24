import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { UserMenu } from "@/components/auth/UserMenu";
import { SignInButton } from "@/components/auth/SignInButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ImageIcon, MessageSquare, Star, Briefcase, BookOpen, HelpCircle, Package, Handshake, Megaphone } from "lucide-react";
import { ContactMessages } from "@/components/admin/ContactMessages";
import { GalleryManagement } from "@/components/admin/GalleryManagement";
import { TestimonialsManagement } from "@/components/admin/TestimonialsManagement";
import { ServicesManagement } from "@/components/admin/ServicesManagement";
import { ProductsManagement } from "@/components/admin/ProductsManagement";
import { SiteAssetsManagement } from "@/components/admin/SiteAssetsManagement";
import { BlogManagement } from "@/components/admin/BlogManagement";
import { FaqManagement } from "@/components/admin/FaqManagement";
import { BlobBrowser } from "@/components/admin/BlobBrowser";
import { PartnersManagement } from "@/components/admin/PartnersManagement";
import { AnnouncementManagement } from "@/components/admin/AnnouncementManagement";

export default function Admin() {
  const { user, isLoading, isLoaded, isSignedIn, isAdmin, error } = useAuth();
  const [, setLocation] = useLocation();

  // Show sign-in screen if not signed in
  if (!isLoading && isLoaded && !isSignedIn) {
    return <SignInButton redirectTo="/admin" />;
  }

  // Show loading spinner while checking user permissions
  if (isLoading || !isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" data-testid="loader-admin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if authentication failed
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Error</CardTitle>
            <CardDescription>
              Failed to load your account. {error.message || 'Please try again.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button 
              onClick={() => window.location.reload()} 
              className="text-sm text-primary hover:underline"
              data-testid="button-retry"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect non-admins once loaded
  if (isLoaded && isSignedIn && !isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Admin Access Required</CardTitle>
            <CardDescription>You need admin permissions to view this dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => setLocation("/")}
              className="text-sm text-primary hover:underline"
              data-testid="button-go-home"
            >
              Go back home
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-semibold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome, {user?.firstName || user?.email || "Admin"}
            </p>
          </div>
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="gallery" className="w-full">
          <TabsList className="grid w-full grid-cols-11 max-w-6xl">
            <TabsTrigger value="gallery" data-testid="tab-gallery">
              <ImageIcon className="mr-2 h-4 w-4" />
              Gallery
            </TabsTrigger>
            <TabsTrigger value="branding" data-testid="tab-branding">
              <ImageIcon className="mr-2 h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="assets" data-testid="tab-assets">
              <ImageIcon className="mr-2 h-4 w-4" />
              Assets
            </TabsTrigger>
            <TabsTrigger value="testimonials" data-testid="tab-testimonials">
              <Star className="mr-2 h-4 w-4" />
              Testimonials
            </TabsTrigger>
            <TabsTrigger value="services" data-testid="tab-services">
              <Briefcase className="mr-2 h-4 w-4" />
              Services
            </TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-products">
              <Package className="mr-2 h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="blog" data-testid="tab-blog">
              <BookOpen className="mr-2 h-4 w-4" />
              Blog
            </TabsTrigger>
            <TabsTrigger value="faq" data-testid="tab-faq">
              <HelpCircle className="mr-2 h-4 w-4" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="partners" data-testid="tab-partners">
              <Handshake className="mr-2 h-4 w-4" />
              Partners
            </TabsTrigger>
            <TabsTrigger value="notices" data-testid="tab-notices">
              <Megaphone className="mr-2 h-4 w-4" />
              Notices
            </TabsTrigger>
            <TabsTrigger value="messages" data-testid="tab-messages">
              <MessageSquare className="mr-2 h-4 w-4" />
              Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">Gallery Management</h2>
              <p className="text-muted-foreground">
                Manage before/after photos and gallery images
              </p>
            </div>
            <GalleryManagement />
          </TabsContent>

          <TabsContent value="branding" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">Branding Assets</h2>
              <p className="text-muted-foreground">
                Update logo and background images stored in Vercel Blob.
              </p>
            </div>
            <SiteAssetsManagement />
          </TabsContent>

          <TabsContent value="assets" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">Blob Assets</h2>
              <p className="text-muted-foreground">
                Browse all images stored in Vercel Blob, set brand assets, and delete old uploads.
              </p>
            </div>
            <BlobBrowser />
          </TabsContent>

          <TabsContent value="testimonials" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">Testimonials Management</h2>
              <p className="text-muted-foreground">
                Manage customer reviews and testimonials
              </p>
            </div>
            <TestimonialsManagement />
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">Services Management</h2>
              <p className="text-muted-foreground">
                Manage service offerings and details
              </p>
            </div>
            <ServicesManagement />
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">Products Management</h2>
              <p className="text-muted-foreground">
                Manage fragrance products and inventory
              </p>
            </div>
            <ProductsManagement />
          </TabsContent>

          <TabsContent value="blog" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">Blog Management</h2>
              <p className="text-muted-foreground">
                Publish updates and announcements for your clients
              </p>
            </div>
            <BlogManagement />
          </TabsContent>

          <TabsContent value="faq" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">FAQ Management</h2>
              <p className="text-muted-foreground">
                Manage common questions displayed on the public site
              </p>
            </div>
            <FaqManagement />
          </TabsContent>

          <TabsContent value="partners" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">Partner Management</h2>
              <p className="text-muted-foreground">
                Review applications, manage partners, and track payouts
              </p>
            </div>
            <PartnersManagement />
          </TabsContent>

          <TabsContent value="notices" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">Site Notices</h2>
              <p className="text-muted-foreground">
                Post late notices, closures, or monthly messages shown at the top of the site
              </p>
            </div>
            <AnnouncementManagement />
          </TabsContent>

          <TabsContent value="messages" className="mt-6">
            <div className="mb-6">
              <h2 className="text-2xl font-serif font-semibold mb-2">Contact Messages</h2>
              <p className="text-muted-foreground">
                View and manage contact form submissions
              </p>
            </div>
            <ContactMessages />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
