import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles } from 'lucide-react';
import type { FragranceProduct } from '@shared/types';
import { useCart } from '@/contexts/CartContext';
import { useEffect, useMemo, useState } from 'react';

interface FragranceCardProps {
  products: FragranceProduct[];
}

const CATEGORY_LABELS: Record<string, string> = {
  "candle-3wick": "3-Wick Candle",
  "candle-single": "Single Candle",
  "candle-mini": "Mini Candle",
  "car-diffuser": "Car Diffuser",
  "room-spray": "Room Spray",
  "cleaner": "All-Purpose Cleaner",
};

export function FragranceCard({ products }: FragranceCardProps) {
  // Sort products alphabetically by fragrance name
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const aLabel = a.fragrance || a.name;
      const bLabel = b.fragrance || b.name;
      return aLabel.localeCompare(bLabel);
    });
  }, [products]);

  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    sortedProducts[0]?.id ?? null
  );

  const selectedProduct =
    sortedProducts.find((item) => item.id === selectedProductId) ?? sortedProducts[0];

  const categoryLabel = selectedProduct ? CATEGORY_LABELS[selectedProduct.category] || "Product" : "Product";
  const fragranceLabel = selectedProduct?.fragrance || "Signature";
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const isFeatured = sortedProducts.some((item) => item.featured);
  const hasOptions = sortedProducts.length > 0;
  const isOutOfStock = (product: FragranceProduct) =>
    Boolean(product.trackInventory) && (product.inventoryCount ?? 0) <= 0;
  const isSelectedOutOfStock = selectedProduct ? isOutOfStock(selectedProduct) : false;

  // Keep selection in sync with available products
  useEffect(() => {
    if (!selectedProductId && sortedProducts[0]) {
      setSelectedProductId(sortedProducts[0].id);
      return;
    }
    if (selectedProductId && !sortedProducts.some((item) => item.id === selectedProductId)) {
      setSelectedProductId(sortedProducts[0]?.id ?? null);
    }
  }, [selectedProductId, sortedProducts]);

  const handleAddToCart = async () => {
    if (!selectedProduct) {
      return;
    }
    setIsAdding(true);
    try {
      await addItem(selectedProduct.id, 1);
    } finally {
      setIsAdding(false);
    }
  };

  if (!selectedProduct) {
    return null;
  }

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-[0_20px_50px_rgba(244,114,182,0.25)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-8 rounded-3xl bg-[radial-gradient(circle_at_top,_rgba(253,164,175,0.45),_rgba(252,211,77,0.22)_45%,_transparent_70%)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
      />
      <div className="relative z-10 flex h-full flex-col">
        {/* Product Image */}
        <div className="relative h-64 overflow-hidden bg-gradient-to-br from-rose-100 via-pink-100 to-amber-100">
          {selectedProduct.imageUrl ? (
            <img
              src={selectedProduct.imageUrl}
              alt={selectedProduct.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <p className="text-muted-foreground">No image</p>
            </div>
          )}
          {isFeatured && (
            <Badge className="absolute top-3 right-3 bg-gradient-to-r from-rose-500 to-amber-400">
              <Sparkles className="mr-1 h-3 w-3" />
              Featured
            </Badge>
          )}
        </div>

        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{categoryLabel}</Badge>
            {selectedProduct.fragrance && selectedProduct.fragrance !== "Signature" && (
              <Badge variant="secondary">{selectedProduct.fragrance}</Badge>
            )}
          </div>
          <CardTitle className="text-xl">{selectedProduct.name}</CardTitle>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Fragrance: {fragranceLabel}
          </p>
          <CardDescription className="text-sm text-muted-foreground">
            {selectedProduct.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1">
          {/* Fragrance Selector */}
          {hasOptions && (
            <div className="space-y-2 pb-4">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                Fragrance
              </Label>
              <Select
                value={selectedProductId ? String(selectedProductId) : undefined}
                onValueChange={(value) => setSelectedProductId(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a fragrance" />
                </SelectTrigger>
                <SelectContent>
                  {sortedProducts.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)} disabled={isOutOfStock(item)}>
                      {(item.fragrance || item.name) + (isOutOfStock(item) ? " - Out of stock" : "")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Price - Only show if displayPrice is true */}
          {selectedProduct.displayPrice && (
            <div className="flex items-center gap-2">
              {selectedProduct.salePrice ? (
                <>
                  <span className="text-lg line-through text-muted-foreground">
                    ${Number(selectedProduct.price).toFixed(2)}
                  </span>
                  <span className="text-2xl font-bold text-primary">
                    ${Number(selectedProduct.salePrice).toFixed(2)}
                  </span>
                  <Badge variant="destructive" className="ml-2">Sale</Badge>
                </>
              ) : (
                <span className="text-2xl font-bold text-primary">
                  ${Number(selectedProduct.price).toFixed(2)}
                </span>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Button
            className="w-full transition-shadow group-hover:shadow-md"
            onClick={handleAddToCart}
            disabled={isAdding || isSelectedOutOfStock}
          >
            {isSelectedOutOfStock ? "Out of stock" : isAdding ? "Adding..." : "Add to Order"}
          </Button>
        </CardFooter>
      </div>
    </Card>
  );
}
