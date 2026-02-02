import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { FragranceCard } from '@/components/FragranceCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';
import type { FragranceProduct } from '@shared/types';

const CATEGORIES = [
  { id: 'all', label: 'All Products' },
  { id: 'candle-3wick', label: '3-Wick Candles' },
  { id: 'candle-single', label: 'Single Candles' },
  { id: 'candle-mini', label: 'Mini Candles' },
  { id: 'car-diffuser', label: 'Car Diffusers' },
  { id: 'room-spray', label: 'Room Sprays' },
  { id: 'cleaner', label: 'All-Purpose Cleaners' },
];

export default function Fragrances() {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: products = [], isLoading, error } = useQuery<FragranceProduct[]>({
    queryKey: ['/api/products'],
  });

  // Filter to only Square-synced products
  const squareProducts = products.filter((product) => Boolean(product.squareCatalogId));

  // Group products by squareItemId (variations of the same product)
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, FragranceProduct[]>();
    squareProducts.forEach((product) => {
      // Use squareItemId as the grouping key, fall back to squareCatalogId or product id
      const key = product.squareItemId ?? product.squareCatalogId ?? `product-${product.id}`;
      const existing = groups.get(key) ?? [];
      existing.push(product);
      groups.set(key, existing);
    });
    return Array.from(groups.entries()).map(([key, items]) => ({
      key,
      items: items.sort((a, b) => (a.fragrance || a.name).localeCompare(b.fragrance || b.name)),
    }));
  }, [squareProducts]);

  // Filter groups by category
  const filteredGroups = selectedCategory === 'all'
    ? groupedProducts
    : groupedProducts.filter((group) => group.items.some((item) => item.category === selectedCategory));

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="relative py-32 px-6 bg-gradient-to-br from-purple-50 via-pink-50 to-background">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-purple-500" />
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Millan Luxury Fragrances
            </p>
          </div>
          <h1 className="text-5xl md:text-6xl font-serif font-semibold mb-6">
            Handmade Bespoke Fragrances
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            100% organic soy candles with natural luxury scents, plus air fresheners,
            car fresheners, incense, and linen sprays — all handcrafted with care.
          </p>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-8 px-6 border-b">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">Failed to load products</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                Try Again
              </Button>
            </div>
          ) : filteredGroups.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No products in this category yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredGroups.map((group) => (
                <FragranceCard key={group.key} products={group.items} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-serif font-semibold mb-4">
            Transform Your Space
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Each fragrance is carefully crafted to create the perfect ambiance
            for your home or office.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            <a href="/book">Book a Service</a>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
