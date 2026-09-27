import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, ProductItem } from '../types';
import { calculateCartGrandTotal } from '../utils/currencies';

interface CartContextType {
  cart: CartItem[];
  cartCount: number;
  cartTotal: number;
  cartPrimaryCurrency: string;
  getCartTotal: (targetCurrency?: string, customEgpRate?: number) => number;
  addToCart: (product: ProductItem, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('site_cart');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed)
        ? parsed.filter((item: any) => item && item.product && typeof item.product.price === 'number')
        : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('site_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Could not save cart to localStorage', e);
    }
  }, [cart]);

  const addToCart = (product: ProductItem, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        // Enforce physical product stock limit
        const newQty = product.type === 'physical'
          ? Math.min(existing.quantity + quantity, product.stock)
          : existing.quantity + quantity;

        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { product, quantity: Math.max(1, quantity) }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const maxStock = item.product.type === 'physical' ? item.product.stock : 9999;
          return { ...item, quantity: Math.min(quantity, maxStock) };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = (cart || []).reduce((total, item) => total + (item?.quantity || 0), 0);
  
  // Primary currency of the items in cart (defaults to the first product's currency or USD)
  const cartPrimaryCurrency = cart[0]?.product?.currency || 'USD';

  const getCartTotal = (targetCurrency?: string, customEgpRate?: number): number => {
    if (!cart || cart.length === 0) return 0;
    const target = targetCurrency || cartPrimaryCurrency;
    return calculateCartGrandTotal(cart, target, customEgpRate);
  };

  // cartTotal represents the total accurately calculated in the cart's primary currency
  const cartTotal = getCartTotal(cartPrimaryCurrency);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        cartTotal,
        cartPrimaryCurrency,
        getCartTotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
