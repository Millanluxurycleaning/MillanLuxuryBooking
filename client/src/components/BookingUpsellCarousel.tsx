import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Sparkles, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import { UpsellProductCard } from "@/components/UpsellProductCard";
import { useCart } from "@/contexts/CartContext";
import type { FragranceProduct } from "@shared/types";

interface BookingUpsellCarouselProps {
  serviceName: string;
  bookingDate: string;
  bookingId: number;
}

export function BookingUpsellCarousel({
  serviceName,
  bookingDate,
  bookingId,
}: BookingUpsellCarouselProps) {
  const [products, setProducts] = useState<FragranceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const { cart } = useCart();
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data: FragranceProduct[]) => {
        const visible = data.filter((p) => p.isVisible);
        const featured = visible.filter((p) => p.featured);
        setProducts(featured.length >= 3 ? featured : visible.slice(0, 8));
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const handleViewCart = () => {
    sessionStorage.setItem(
      "bookingUpsell",
      JSON.stringify({ bookingId, serviceName, bookingDate }),
    );
    setLocation("/checkout");
  };

  if (dismissed || loading || products.length === 0) return null;

  const itemCount = cart?.totals?.itemCount ?? 0;

  return (
    <div className="mt-8 rounded-2xl border border-purple-200/60 bg-gradient-to-br from-purple-50/80 via-white to-pink-50/80 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold">
              Add a Touch of Luxury to Your Service
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Handcrafted products delivered with your {serviceName} on{" "}
            {bookingDate} — free delivery with service.
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-10">
        <Carousel
          opts={{
            align: "start",
            loop: products.length > 3,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-3">
            {products.map((product) => (
              <CarouselItem
                key={product.id}
                className="pl-3 basis-[280px] md:basis-[280px]"
              >
                <UpsellProductCard product={product} />
              </CarouselItem>
            ))}
          </CarouselContent>
          {products.length > 3 && (
            <>
              <CarouselPrevious className="-left-8" />
              <CarouselNext className="-right-8" />
            </>
          )}
        </Carousel>
      </div>

      <div className="flex items-center gap-3 mt-5">
        {itemCount > 0 && (
          <Button
            onClick={handleViewCart}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            View Cart ({itemCount})
          </Button>
        )}
        <Button
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => setDismissed(true)}
        >
          No thanks
        </Button>
      </div>
    </div>
  );
}
