import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { FragranceProduct } from "@shared/types";

type CartItem = {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  createdAt: string | Date;
  product: FragranceProduct | null;
};

type Cart = {
  id: string;
  sessionId: string | null;
  userId: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  expiresAt: string | Date;
  items: CartItem[];
  totals: {
    subtotal: number;
    itemCount: number;
  };
};

type CartContextValue = {
  cart: Cart | null;
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
  refreshCart: () => Promise<void>;
  addItem: (productId: number, quantity?: number) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const CART_SESSION_KEY = "cartSessionId";

const readStoredSessionId = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CART_SESSION_KEY);
};

const storeSessionId = (sessionId: string | null) => {
  if (typeof window === "undefined") return;
  if (!sessionId) {
    window.localStorage.removeItem(CART_SESSION_KEY);
    return;
  }
  window.localStorage.setItem(CART_SESSION_KEY, sessionId);
};

const extractSessionId = (response: Response, fallback?: string | null) => {
  const headerValue = response.headers.get("x-cart-session");
  if (headerValue && headerValue.trim()) {
    return headerValue.trim();
  }
  return fallback ?? null;
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(readStoredSessionId());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const applySessionId = (nextSessionId: string | null) => {
    setSessionId(nextSessionId);
    storeSessionId(nextSessionId);
  };

  const handleResponse = async (response: Response) => {
    const data = (await response.json()) as Cart;
    const nextSessionId = extractSessionId(response, data.sessionId);
    if (nextSessionId) {
      applySessionId(nextSessionId);
    }
    setCart(data);
    return data;
  };

  const refreshCart = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/cart${sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : ""}`, {
        headers: sessionId ? { "x-cart-session": sessionId } : undefined,
      });
      if (!response.ok) {
        throw new Error("Unable to load selections");
      }
      await handleResponse(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load selections");
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = async (productId: number, quantity = 1) => {
    setError(null);
    const response = await fetch("/api/cart/items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionId ? { "x-cart-session": sessionId } : {}),
      },
      body: JSON.stringify({ productId, quantity }),
    });
    if (!response.ok) {
      throw new Error("Unable to add item");
    }
    await handleResponse(response);
  };

  const updateItem = async (itemId: number, quantity: number) => {
    setError(null);
    const response = await fetch(`/api/cart/items/${itemId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(sessionId ? { "x-cart-session": sessionId } : {}),
      },
      body: JSON.stringify({ quantity }),
    });
    if (!response.ok) {
      throw new Error("Unable to update selections");
    }
    await handleResponse(response);
  };

  const removeItem = async (itemId: number) => {
    setError(null);
    const response = await fetch(`/api/cart/items/${itemId}`, {
      method: "DELETE",
      headers: sessionId ? { "x-cart-session": sessionId } : undefined,
    });
    if (!response.ok) {
      throw new Error("Unable to remove item");
    }
    await handleResponse(response);
  };

  const clearCart = async () => {
    setError(null);
    const response = await fetch("/api/cart", {
      method: "DELETE",
      headers: sessionId ? { "x-cart-session": sessionId } : undefined,
    });
    if (!response.ok) {
      throw new Error("Unable to clear selections");
    }
    await handleResponse(response);
  };

  useEffect(() => {
    refreshCart();
  }, []);

  const value = useMemo(
    () => ({
      cart,
      sessionId,
      isLoading,
      error,
      refreshCart,
      addItem,
      updateItem,
      removeItem,
      clearCart,
    }),
    [cart, sessionId, isLoading, error],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};
