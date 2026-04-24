import { useState } from "react";
import { Link } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Trash2, Truck, Store } from "lucide-react";

export default function CartPage() {
  const { cart, isLoading, error, updateItem, removeItem, clearCart } = useCart();
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [fulfillment, setFulfillment] = useState<"shipping" | "pickup">(() => {
    return (localStorage.getItem("fulfillmentType") as "shipping" | "pickup") ?? "pickup";
  });

  const handleFulfillment = (type: "shipping" | "pickup") => {
    setFulfillment(type);
    localStorage.setItem("fulfillmentType", type);
  };

  const items = cart?.items ?? [];
  const subtotal = cart?.totals.subtotal ?? 0;

  const handleUpdate = async (itemId: number, quantity: number) => {
    setIsUpdating(itemId);
    try {
      if (quantity <= 0) {
        await removeItem(itemId);
      } else {
        await updateItem(itemId, quantity);
      }
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-28 pb-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-semibold">Your Selections</h1>
              <p className="text-muted-foreground">Review your selections before checkout.</p>
            </div>
          </div>

          {isLoading && (
            <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-40" />
                </CardHeader>
                <CardContent className="space-y-6">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="flex gap-4">
                      <Skeleton className="h-20 w-20" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            </div>
          )}

          {!isLoading && error && (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-destructive mb-4">{error}</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {!isLoading && !error && (
            <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Items ({cart?.totals.itemCount ?? 0})</CardTitle>
                  {items.length > 0 && (
                    <Button variant="ghost" onClick={clearCart} className="text-muted-foreground">
                      Clear selections
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  {items.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      Your selections are empty.
                    </div>
                  ) : (
                    items.map((item) => {
                      const product = item.product;
                      return (
                        <div key={item.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-20 w-20 rounded-xl overflow-hidden bg-muted flex items-center justify-center">
                              {product?.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                              ) : (
                                <span className="text-xs text-muted-foreground">No image</span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{product?.name ?? "Item"}</p>
                              <p className="text-xs text-muted-foreground">
                                Fragrance: {product?.fragrance || "Signature"}
                              </p>
                              <p className="text-sm text-muted-foreground">${item.price.toFixed(2)} each</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center border rounded-full px-2 py-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdate(item.id, item.quantity - 1)}
                                disabled={isUpdating === item.id}
                              >
                                -
                              </Button>
                              <span className="px-3 text-sm font-medium">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUpdate(item.id, item.quantity + 1)}
                                disabled={isUpdating === item.id}
                              >
                                +
                              </Button>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUpdate(item.id, 0)}
                              disabled={isUpdating === item.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>

                  {/* How to get it */}
                  {items.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">How to get it</p>
                        <span className="text-xs text-rose-500 font-medium">Required</span>
                      </div>
                      <button
                        onClick={() => handleFulfillment("shipping")}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg border-2 transition-all text-left ${
                          fulfillment === "shipping" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          fulfillment === "shipping" ? "border-primary" : "border-muted-foreground"
                        }`}>
                          {fulfillment === "shipping" && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <Truck className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium">Shipping</span>
                      </button>
                      <button
                        onClick={() => handleFulfillment("pickup")}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg border-2 transition-all text-left ${
                          fulfillment === "pickup" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          fulfillment === "pickup" ? "border-primary" : "border-muted-foreground"
                        }`}>
                          {fulfillment === "pickup" && <div className="w-2 h-2 rounded-full bg-primary" />}
                        </div>
                        <Store className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Store Pickup</p>
                          <p className="text-xs text-muted-foreground">Millan Luxury Cleaning · 811 N 3rd St Phoenix, AZ</p>
                        </div>
                      </button>
                    </div>
                  )}

                  <Button asChild className="w-full" disabled={items.length === 0}>
                    <Link href="/checkout">Proceed to Checkout</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/fragrances">Continue Shopping</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
