import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { createPartnerApplicationSchema, type CreatePartnerApplication } from "@shared/types";
import {
  Handshake,
  CheckCircle,
  Sparkles,
  TrendingUp,
  Users,
  Award,
  Globe,
  DollarSign,
  Building2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useState, useRef } from "react";
import { useAssets } from "@/hooks/useAssets";

type PartnerTab = "brand_affiliate" | "cleaning_partner";

export default function PartnersPage() {
  const { toast } = useToast();
  const { data: assets = {} } = useAssets();
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<PartnerTab>("brand_affiliate");
  const formRef = useRef<HTMLDivElement>(null);

  const fallbackBg = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/dark-botanical-bg.png";
  const heroBg = assets?.heroBackground?.url ?? assets?.servicesBackground?.url ?? fallbackBg;

  const form = useForm<CreatePartnerApplication>({
    resolver: zodResolver(createPartnerApplicationSchema),
    defaultValues: {
      partnerType: "brand_affiliate",
      brandName: "",
      contactName: "",
      contactEmail: "",
      website: "",
      instagram: "",
      tiktok: "",
      youtube: "",
      otherSocial: "",
      audienceSize: "",
      audienceDescription: "",
      whyPartner: "",
      experience: "",
      portfolioUrl: "",
      companySize: "",
      serviceArea: "",
      yearsInBusiness: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: CreatePartnerApplication) => {
      return await apiRequest("POST", "/api/partner-applications", data);
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: "Application Submitted",
        description: "We'll review your application and get back to you soon.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreatePartnerApplication) => {
    submitMutation.mutate(data);
  };

  const scrollToForm = (tab: PartnerTab) => {
    setActiveTab(tab);
    form.setValue("partnerType", tab);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-6 pt-32 pb-24">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl font-serif font-semibold mb-4">Application Received</h1>
            <p className="text-muted-foreground text-lg mb-4">
              Thank you for your interest in partnering with Millan Luxury.
            </p>
            <p className="text-muted-foreground mb-8">
              Our team will review your application and reach out within a few business days. We look forward to exploring this opportunity with you.
            </p>
            <a
              href="/"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              Return to Homepage
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="relative py-32 md:py-40 px-6 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroBg})`, backgroundAttachment: 'fixed' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        <div className="relative container mx-auto max-w-5xl text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 bg-primary/60" />
            <p className="text-sm uppercase tracking-[0.25em] text-primary/80 font-medium">
              Partnership Opportunities
            </p>
            <div className="h-px w-12 bg-primary/60" />
          </div>
          <h1 className="text-5xl md:text-7xl font-serif font-semibold text-white mb-6 leading-tight">
            Grow With
            <span className="block text-primary">Millan Luxury</span>
          </h1>
          <p className="text-xl md:text-2xl text-stone-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            Earn commissions as a brand affiliate or access wholesale pricing as a
            cleaning company partner. Two programs built for people who share our
            commitment to elevated experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="text-base px-8"
              onClick={() => scrollToForm("brand_affiliate")}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Become a Brand Partner
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 border-stone-500 text-white hover:bg-white/10"
              onClick={() => scrollToForm("cleaning_partner")}
            >
              <Building2 className="w-5 h-5 mr-2" />
              Cleaning Company Partner
            </Button>
          </div>
        </div>
      </section>

      {/* Partner Types Section */}
      <section className="py-20 md:py-28 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.2em] text-primary font-medium mb-3">
              Two Ways to Partner
            </p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold mb-4">
              Choose Your Path
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Whether you're a content creator looking to earn commissions or a cleaning business
              looking for premium products at wholesale prices, we have a program for you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Brand Affiliate Card */}
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-amber-500 to-primary" />
              <CardContent className="p-8 md:p-10">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-2xl font-serif font-semibold mb-3">Brand Affiliates</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Represent Millan Luxury to your audience and earn 10% commission on every
                  sale. Share your personalized partner link and get paid for the clients you bring in.
                </p>

                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <DollarSign className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">10% Commission on Every Sale</p>
                      <p className="text-sm text-muted-foreground">Earn on every booking, product, and service your referrals purchase</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Globe className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Your Own Partner Link</p>
                      <p className="text-sm text-muted-foreground">A discrete, personalized URL — no codes, no clutter, just clean attribution</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Real-Time Earnings Dashboard</p>
                      <p className="text-sm text-muted-foreground">Track your conversions, commissions, and payouts from your private portal</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-medium">
                  Ideal For
                </p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {["Content Creators", "Lifestyle Bloggers", "Home & Design Influencers", "Real Estate Agents"].map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-3 py-1.5 rounded-full bg-primary/5 text-primary border border-primary/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Button className="w-full" size="lg" onClick={() => scrollToForm("brand_affiliate")}>
                  Apply as Brand Affiliate
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Cleaning Company Partner Card */}
            <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 group">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-stone-600 via-stone-400 to-stone-600" />
              <CardContent className="p-8 md:p-10">
                <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-6 group-hover:bg-stone-200 dark:group-hover:bg-stone-700 transition-colors">
                  <Building2 className="w-7 h-7 text-stone-600 dark:text-stone-300" />
                </div>
                <h3 className="text-2xl font-serif font-semibold mb-3">Cleaning Company Partners</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Elevate your cleaning business with Millan Luxury products and branding.
                  Get wholesale pricing on our full product line and the option to co-brand
                  under the Millan Luxury name.
                </p>

                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <DollarSign className="w-4 h-4 text-stone-600 dark:text-stone-300" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Wholesale Product Pricing</p>
                      <p className="text-sm text-muted-foreground">15-30% off retail on all candles, sprays, and cleaning products — volume-based tiers</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4 text-stone-600 dark:text-stone-300" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Branding & Licensing</p>
                      <p className="text-sm text-muted-foreground">Co-brand under the Millan Luxury name — use our logos, packaging, and reputation</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Award className="w-4 h-4 text-stone-600 dark:text-stone-300" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Training & Quality Standards</p>
                      <p className="text-sm text-muted-foreground">Access our operating playbook, quality checklists, and marketing assets</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3 font-medium">
                  Ideal For
                </p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {["Cleaning Companies", "Maid Services", "Property Managers", "Hospitality Businesses"].map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-3 py-1.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  onClick={() => scrollToForm("cleaning_partner")}
                >
                  Apply as Cleaning Partner
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-[0.2em] text-primary font-medium mb-3">
              Simple Process
            </p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                icon: Users,
                title: "Apply",
                description: "Fill out the application below with your details and vision",
              },
              {
                step: "02",
                icon: ShieldCheck,
                title: "Review",
                description: "Our team reviews your application within a few business days",
              },
              {
                step: "03",
                icon: Handshake,
                title: "Onboard",
                description: "Get your partner link, dashboard access, and welcome materials",
              },
              {
                step: "04",
                icon: TrendingUp,
                title: "Grow",
                description: "Earn commissions, access wholesale pricing, and scale with Millan Luxury",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="relative mx-auto mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-background border-2 border-border flex items-center justify-center mx-auto shadow-sm">
                    <item.icon className="w-7 h-7 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-serif font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-20 md:py-28 px-6" ref={formRef} id="apply">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <p className="text-sm uppercase tracking-[0.2em] text-primary font-medium mb-3">
              Get Started
            </p>
            <h2 className="text-3xl md:text-4xl font-serif font-semibold mb-4">
              Partner Application
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Tell us about yourself and your vision for this partnership.
              Fields marked with * are required.
            </p>
          </div>

          {/* Partner Type Toggle */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex rounded-xl border border-border p-1 bg-muted/50">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("brand_affiliate");
                  form.setValue("partnerType", "brand_affiliate");
                }}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "brand_affiliate"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-4 h-4 inline mr-2" />
                Brand Affiliate
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("cleaning_partner");
                  form.setValue("partnerType", "cleaning_partner");
                }}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "cleaning_partner"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="w-4 h-4 inline mr-2" />
                Cleaning Partner
              </button>
            </div>
          </div>

          <Card className="border-2">
            <CardContent className="p-8 md:p-10">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">

                  {/* About You */}
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-lg font-serif font-semibold">About You</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField
                        control={form.control}
                        name="brandName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {activeTab === "cleaning_partner" ? "Company Name *" : "Brand / Business Name *"}
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={activeTab === "cleaning_partner" ? "Your cleaning company" : "Your brand name"}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contactEmail"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Email Address *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="you@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Cleaning Partner Specific */}
                  {activeTab === "cleaning_partner" && (
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-stone-600 dark:text-stone-300" />
                        </div>
                        <h3 className="text-lg font-serif font-semibold">Your Business</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField
                          control={form.control}
                          name="companySize"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Team Size</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="How many team members?" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="solo">Solo Operator</SelectItem>
                                  <SelectItem value="2-5">2 - 5 people</SelectItem>
                                  <SelectItem value="6-15">6 - 15 people</SelectItem>
                                  <SelectItem value="16-50">16 - 50 people</SelectItem>
                                  <SelectItem value="50+">50+ people</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="yearsInBusiness"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Years in Business</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="How long?" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="<1">Less than 1 year</SelectItem>
                                  <SelectItem value="1-3">1 - 3 years</SelectItem>
                                  <SelectItem value="3-5">3 - 5 years</SelectItem>
                                  <SelectItem value="5-10">5 - 10 years</SelectItem>
                                  <SelectItem value="10+">10+ years</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="serviceArea"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Service Area</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. Phoenix Metro, Dallas-Fort Worth, Nationwide" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Online Presence */}
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-lg font-serif font-semibold">Online Presence</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input placeholder="https://yoursite.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="instagram"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Instagram</FormLabel>
                            <FormControl>
                              <Input placeholder="@handle" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tiktok"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>TikTok</FormLabel>
                            <FormControl>
                              <Input placeholder="@handle" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="youtube"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>YouTube</FormLabel>
                            <FormControl>
                              <Input placeholder="Channel URL" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="otherSocial"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Other Platforms</FormLabel>
                            <FormControl>
                              <Input placeholder="Any other relevant links" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Audience - Brand Affiliate specific */}
                  {activeTab === "brand_affiliate" && (
                    <div>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="text-lg font-serif font-semibold">Your Audience</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField
                          control={form.control}
                          name="audienceSize"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Audience Size</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select range" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="under-1k">Under 1,000</SelectItem>
                                  <SelectItem value="1k-10k">1,000 - 10,000</SelectItem>
                                  <SelectItem value="10k-50k">10,000 - 50,000</SelectItem>
                                  <SelectItem value="50k-100k">50,000 - 100,000</SelectItem>
                                  <SelectItem value="100k-500k">100,000 - 500,000</SelectItem>
                                  <SelectItem value="500k+">500,000+</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="audienceDescription"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Describe Your Audience</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Who follows you? What are their interests and demographics?"
                                  rows={3}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Why Partner */}
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Handshake className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-lg font-serif font-semibold">
                        {activeTab === "cleaning_partner"
                          ? "Why Partner With Millan Luxury"
                          : "Why Partner With Us"}
                      </h3>
                    </div>
                    <FormField
                      control={form.control}
                      name="whyPartner"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {activeTab === "cleaning_partner"
                              ? "Tell us about your interest in using Millan Luxury products and branding *"
                              : "Tell us why you'd like to collaborate *"}
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={
                                activeTab === "cleaning_partner"
                                  ? "What interests you about offering Millan Luxury products? How would this partnership benefit your clients?"
                                  : "What excites you about Millan Luxury? How do you envision this partnership?"
                              }
                              rows={5}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Experience */}
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Award className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="text-lg font-serif font-semibold">Experience & Credentials</h3>
                    </div>
                    <div className="space-y-5">
                      <FormField
                        control={form.control}
                        name="experience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Relevant Experience</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={
                                  activeTab === "cleaning_partner"
                                    ? "Share your cleaning industry experience, certifications, or notable clients"
                                    : "Share any relevant brand partnerships, industry experience, or credentials"
                                }
                                rows={4}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="portfolioUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {activeTab === "cleaning_partner" ? "Company Profile / Portfolio URL" : "Portfolio / Media Kit URL"}
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="https://your-portfolio.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={submitMutation.isPending}
                    >
                      {submitMutation.isPending
                        ? "Submitting..."
                        : activeTab === "cleaning_partner"
                          ? "Submit Cleaning Partner Application"
                          : "Submit Brand Affiliate Application"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      By submitting, you agree to be contacted by our partnerships team regarding your application.
                    </p>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
