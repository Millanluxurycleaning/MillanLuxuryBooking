import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useAssets } from "@/hooks/useAssets";
import { QuoteModal } from "@/components/QuoteModal";

const fallbackCrown =
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/millan-logo%20-%20Edited.png";
const fallbackBg = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/dark-botanical-bg.png";

export function Hero() {
  const { data: assets = {} } = useAssets();
  const crown = assets?.heroCrown?.url ?? assets?.logo?.url ?? fallbackCrown;
  const background = assets?.heroBackground?.url ?? assets?.servicesBackground?.url ?? fallbackBg;
  const [quoteOpen, setQuoteOpen] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Parallax Effect */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${background})`,
          backgroundAttachment: 'fixed'
        }}
      />
      
      {/* Gradient Overlay for Text Legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 md:px-8 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8 mt-10 md:mt-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="relative inline-block crown-shimmer">
            <img
              src={crown}
              alt="Gold Crown"
              className="w-64 mx-auto drop-shadow-xl object-contain"
            />
            <span className="crown-sparkle sparkle-1" aria-hidden="true" />
            <span className="crown-sparkle sparkle-2" aria-hidden="true" />
            <span className="crown-sparkle sparkle-3" aria-hidden="true" />
          </div>
        </div>
        
        {/* Brand Name */}
        <h1 className="text-white font-serif font-semibold text-4xl md:text-6xl lg:text-7xl mb-4 tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
          MILLAN
        </h1>
        <h2 className="text-white font-serif font-medium text-2xl md:text-4xl lg:text-5xl mb-6 tracking-widest animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
          LUXURY CLEANING
        </h2>
        
        {/* Tagline */}
        <div className="flex items-center justify-center gap-3 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          <p className="text-white text-lg md:text-xl lg:text-2xl font-serif tracking-wide">
            Crowning Every Space in Sparkle
          </p>
          <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary" />
        </div>
        
        {/* Subtitle */}
        <p className="text-white/90 text-sm md:text-base lg:text-lg max-w-2xl mx-auto mb-4 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-400">
          Personal Cleaning Service
        </p>
        
        {/* Description */}
        <p className="text-white/80 text-base md:text-lg max-w-3xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
          An immaculate home should feel like a retreat—restful, rejuvenating, and refined. 
          Millan Luxury Cleaning delivers high-end home cleaning services in Phoenix, AZ, 
          with a dedication to precision and care that sets us apart.
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-700">
          <Button
            asChild
            variant="default"
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xl shadow-primary/50 border-2 border-primary-foreground/20 px-10 py-6 text-lg font-bold tracking-wider"
            data-testid="button-book-hero"
          >
            <a href="/book">BOOK NOW</a>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setQuoteOpen(true)}
            className="border-2 border-white/60 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm px-10 py-6 text-lg font-bold tracking-wider"
            data-testid="button-quote-hero"
          >
            GET A FREE QUOTE
          </Button>
        </div>
        <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />
        
        {/* Location */}
        <p className="text-white/70 text-sm md:text-base mt-8 animate-in fade-in duration-1000 delay-1000">
          Serving Phoenix, AZ And Surrounding Areas
        </p>
      </div>
    </section>
  );
}
