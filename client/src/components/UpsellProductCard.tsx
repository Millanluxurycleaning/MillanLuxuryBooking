import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ShoppingBag } from "lucide-react";
import type { FragranceProduct } from "@shared/types";
import { useCart } from "@/contexts/CartContext";

const CATEGORY_LABELS: Record<string, string> = {
  "candle-3wick": "3-Wick Candle",
  "candle-single": "Single Candle",
  "candle-mini": "Mini Candle",
  "car-diffuser": "Car Diffuser",
  "room-spray": "Room Spray",
  "cleaner": "All-Purpose Cleaner",
};

interface UpsellProductCardProps {
  product: FragranceProduct;
}

export function UpsellProductCard({ product }: UpsellProductCardProps) {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const categoryLabel = CATEGORY_LABELS[product.category] || "Product";
  const isOutOfStock =
    Boolean(product.trackInventory) && (product.inventoryCount ?? 0) <= 0;

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      await addItem(product.id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } finally {
      setIsAdding(false);
    }
  };

  const price = product.salePrice ?? product.price;

  return (
    <Card className="group overflow-hidden transition-shadow hover:shadow-lg w-[260px] flex-shrink-0">
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <ShoppingBag className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        <Badge className="absolute top-2 left-2 text-xs" variant="secondary">
          {categoryLabel}
        </Badge>
      </div>
      <CardContent className="p-3 space-y-2">
        <p className="font-semibold text-sm line-clamp-1">{product.name}</p>
        {product.fragrance && product.fragrance !== "Signature" && (
          <p className="text-xs text-muted-foreground">{product.fragrance}</p>
        )}
        <div className="flex items-center justify-between">
          {product.displayPrice && (
            <div className="flex items-center gap-1.5">
              {product.salePrice ? (
                <>
                  <span className="text-xs line-through text-muted-foreground">
                    ${Number(product.price).toFixed(2)}
                  </span>
                  <span className="font-bold text-purple-600">
                    ${Number(product.salePrice).toFixed(2)}
                  </span>
                </>
              ) : (
                <span className="font-bold text-purple-600">
                  ${Number(price).toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>
        <Button
          size="sm"
          className={`w-full text-xs ${
            added
              ? "bg-emerald-500 hover:bg-emerald-600"
              : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          }`}
          onClick={handleAdd}
          disabled={isAdding || isOutOfStock}
        >
          {isOutOfStock ? (
            "Out of Stock"
          ) : added ? (
            <>
              <Check className="w-3.5 h-3.5 mr-1" /> Added
            </>
          ) : isAdding ? (
            "Adding..."
          ) : (
            "Add to Cart"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
