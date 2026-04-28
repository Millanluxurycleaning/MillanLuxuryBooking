import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import ReactCompareImage from "react-compare-image";
import type { GalleryItem } from "@shared/types";
import { normalizeArrayData } from "@/lib/arrayUtils";

const placeholderImage = "https://placehold.co/1200x800?text=Image+coming+soon";

const normalizeCategoryKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const formatCategoryLabel = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "Uncategorized";
  if (/[-_]/.test(trimmed)) {
    return trimmed
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return trimmed;
};

export function Gallery() {
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const { data: galleryItems, isLoading, error } = useQuery<GalleryItem[]>({
    queryKey: ["/api/gallery"]
  });

  const { items, isValid } = normalizeArrayData<GalleryItem>(galleryItems);
  const hasShapeError = !isLoading && !error && !isValid;
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      const raw = item.category?.trim();
      if (!raw) return;
      const key = normalizeCategoryKey(raw);
      if (!key || key === "all") return;
      if (!map.has(key)) {
        map.set(key, formatCategoryLabel(raw));
      }
    });
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const filteredImages = items.filter((img) => {
    const key = normalizeCategoryKey(img.category || "");
    if (filter === "all") return true;
    return key === filter || key === "all";
  });

  useEffect(() => {
    if (items.length === 0) return;
    if (filter === "all") return;
    const hasCurrent = items.some((img) => {
      const key = normalizeCategoryKey(img.category || "");
      return key === filter || key === "all";
    });
    if (!hasCurrent) {
      setFilter(categories[0]?.key ?? "all");
    }
  }, [items, filter, categories]);

  const selectedIndex = selectedItemId !== null 
    ? filteredImages.findIndex(img => img.id === selectedItemId)
    : -1;

  const openLightbox = (itemId: number) => {
    setSelectedItemId(itemId);
  };

  const closeLightbox = () => {
    setSelectedItemId(null);
  };

  const goToPrevious = () => {
    if (selectedIndex >= 0 && filteredImages.length > 0) {
      const prevIndex = selectedIndex === 0 ? filteredImages.length - 1 : selectedIndex - 1;
      setSelectedItemId(filteredImages[prevIndex].id);
    }
  };

  const goToNext = () => {
    if (selectedIndex >= 0 && filteredImages.length > 0) {
      const nextIndex = selectedIndex === filteredImages.length - 1 ? 0 : selectedIndex + 1;
      setSelectedItemId(filteredImages[nextIndex].id);
    }
  };

  const renderGalleryImage = (item: GalleryItem) => {
    if (item.beforeImageUrl && item.afterImageUrl) {
      return (
        <div className="w-full aspect-video overflow-hidden">
          <ReactCompareImage
            leftImage={item.beforeImageUrl || placeholderImage}
            rightImage={item.afterImageUrl || placeholderImage}
            sliderLineColor="hsl(var(--primary))"
            sliderLineWidth={3}
            handleSize={40}
            leftImageLabel="Before"
            rightImageLabel="After"
          />
        </div>
      );
    }
    return (
      <img
        src={item.imageUrl || placeholderImage}
        alt={item.title || "Gallery image"}
        className="w-full aspect-video object-cover transition-transform duration-300 group-hover:scale-105"
        data-testid={`img-gallery-${item.id}`}
      />
    );
  };

  const renderLightboxImage = (item: GalleryItem) => {
    if (item.beforeImageUrl && item.afterImageUrl) {
      return (
        <div className="w-full max-h-[70vh] overflow-hidden">
          <ReactCompareImage
            leftImage={item.beforeImageUrl || placeholderImage}
            rightImage={item.afterImageUrl || placeholderImage}
            sliderLineColor="hsl(var(--primary))"
            sliderLineWidth={4}
            handleSize={50}
            leftImageLabel="Before"
            rightImageLabel="After"
          />
        </div>
      );
    }
    return (
      <img
        src={item.imageUrl || placeholderImage}
        alt={item.title || "Gallery image"}
        className="w-full h-auto max-h-[85vh] object-contain"
        data-testid="img-lightbox-current"
      />
    );
  };

  return (
    <section id="gallery" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-6 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl md:text-5xl font-semibold mb-4">
            Before & After
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            See the transformative power of professional luxury cleaning
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
            data-testid="button-filter-all"
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category.key}
              variant={filter === category.key ? "default" : "outline"}
              onClick={() => setFilter(category.key)}
              data-testid={`button-filter-${category.key}`}
            >
              {category.label}
            </Button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="w-full h-64 rounded-md" />
            ))}
          </div>
        )}

        {/* Gallery Grid */}
        {!isLoading && !error && isValid && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredImages.map((item) => (
              <div
                key={item.id}
                onClick={() => openLightbox(item.id)}
                className="group relative overflow-hidden rounded-md cursor-pointer hover-elevate transition-all duration-300"
                data-testid={`gallery-item-${item.id}`}
              >
                {renderGalleryImage(item)}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 
                      className="text-white font-semibold text-lg"
                      data-testid={`text-gallery-title-${item.id}`}
                    >
                      {item.title}
                    </h3>
                    <p className="text-white/80 text-sm">
                      {item.beforeImageUrl && item.afterImageUrl 
                        ? "Slide to compare before & after" 
                        : "Click to view larger"}
                    </p>
                  </div>
                </div>
                {/* Before/After Label - only show on before/after pairs */}
                {item.beforeImageUrl && item.afterImageUrl && (
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-md text-xs font-semibold pointer-events-none">
                    Before &amp; After
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && isValid && filteredImages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No gallery items found for this category.
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              We couldn't load the gallery right now. Please refresh the page.
            </p>
          </div>
        )}

        {hasShapeError && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              We ran into unexpected data while loading the gallery. Please refresh and try again.
            </p>
          </div>
        )}

        {/* Lightbox Modal */}
        <Dialog open={selectedItemId !== null} onOpenChange={closeLightbox}>
          <DialogContent className="max-w-5xl p-0 bg-black/95 border-none">
            {selectedIndex >= 0 && selectedIndex < filteredImages.length && (
              <div className="relative">
                {/* Close Button */}
                <DialogClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 right-4 z-20 text-white hover:bg-white/20"
                    data-testid="button-close-lightbox"
                  >
                    <X className="w-6 h-6" />
                  </Button>
                </DialogClose>

                {/* Navigation Arrows */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20"
                  data-testid="button-prev-image"
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white hover:bg-white/20"
                  data-testid="button-next-image"
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>

                {/* Image */}
                {renderLightboxImage(filteredImages[selectedIndex])}

                {/* Caption */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pointer-events-none">
                  <h3 
                    className="text-white font-serif text-2xl font-semibold"
                    data-testid="text-lightbox-title"
                  >
                    {filteredImages[selectedIndex].title}
                  </h3>
                  <p 
                    className="text-white/70 text-sm mt-1"
                    data-testid="text-lightbox-position"
                  >
                    {filteredImages[selectedIndex].beforeImageUrl && filteredImages[selectedIndex].afterImageUrl
                      ? "Slide to see the transformation"
                      : `Image ${selectedIndex + 1} of ${filteredImages.length}`}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
