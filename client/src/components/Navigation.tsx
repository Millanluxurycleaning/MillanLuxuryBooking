import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, ShoppingCart } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAssets } from "@/hooks/useAssets";
import { useCart } from "@/contexts/CartContext";

const fallbackLogo =
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/IMG_5919%20-%20Millan%20Luxury%20Cleaning%20(1).png";

export function Navigation() {
  const { data: assets = {} } = useAssets();
  const [isScrolled, setIsScrolled] = useState(false);
  const logo = assets?.logo?.url ?? fallbackLogo;
  const { cart } = useCart();
  const cartCount = cart?.totals?.itemCount ?? 0;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/#about", label: "About" },
    { href: "/services", label: "Services" },
    { href: "/fragrances", label: "Fragrances" },
    { href: "/#gallery", label: "Gallery" },
    { href: "/#testimonials", label: "Reviews" },
    { href: "/blog", label: "Blog" },
    { href: "/#faq", label: "FAQ" },
    { href: "/#contact", label: "Contact" },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-card/95 backdrop-blur-md shadow-md border-b border-border" 
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-6 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <a
            href="/"
            className="transition-opacity hover:opacity-80"
            data-testid="link-logo"
          >
            <img
              src={logo}
              alt="Millan Luxury Cleaning Logo"
              className="h-14 w-auto object-contain md:h-16"
            />
          </a>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors hover-elevate px-3 py-2 rounded-md ${
                  isScrolled ? "text-foreground" : "text-white"
                }`}
                data-testid={`link-nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </a>
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <a
              href="/cart"
              className={`relative inline-flex items-center justify-center rounded-full p-2 transition-colors hover:bg-white/10 ${
                isScrolled ? "text-foreground" : "text-white"
              }`}
              aria-label="View selections"
              data-testid="link-nav-cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[0.65rem] font-semibold text-primary-foreground">
                  {cartCount}
                </span>
              )}
            </a>

            {/* CTA Button */}
            <div className="hidden lg:flex items-center gap-3">
              <Button
                asChild
                variant="default"
                size="default"
                data-testid="button-book-nav"
              >
                <a href="/book">
                  Book Now
                </a>
              </Button>
            </div>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button 
                  variant="ghost" 
                  size="icon"
                  className={isScrolled ? "text-foreground" : "text-white"}
                  data-testid="button-menu-toggle"
                >
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <div className="flex flex-col gap-6 mt-8">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="text-lg font-medium text-foreground hover-elevate px-4 py-2 rounded-md transition-colors"
                      data-testid={`link-mobile-${link.label.toLowerCase()}`}
                    >
                      {link.label}
                    </a>
                  ))}
                  <Button 
                    asChild
                    variant="default"
                    className="w-full mt-4"
                    data-testid="button-book-mobile"
                  >
                    <a href="/book">Book Now</a>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
