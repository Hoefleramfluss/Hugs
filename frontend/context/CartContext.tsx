import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// Fix: Use relative path for type imports
import { CartItem } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    // Load cart from localStorage on initial render
    try {
      const storedCart = localStorage.getItem('shoppingCart');
      if (storedCart) {
        setCart(JSON.parse(storedCart));
      }
    } catch (error) {
        console.error("Failed to parse cart from localStorage", error);
        localStorage.removeItem('shoppingCart');
    }
  }, []);

  useEffect(() => {
    // Save cart to localStorage whenever it changes
    if(cart.length > 0) {
        localStorage.setItem('shoppingCart', JSON.stringify(cart));
    } else {
        localStorage.removeItem('shoppingCart');
    }
  }, [cart]);

  const addToCart = (newItem: CartItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === newItem.id);
      if (existingItem) {
        // Increment quantity if item already exists
        return prevCart.map(item =>
          item.id === newItem.id ? { ...item, quantity: item.quantity + newItem.quantity } : item
        );
      } else {
        // Add new item to cart
        return [...prevCart, newItem];
      }
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart(prevCart =>
        prevCart.map(item => (item.id === itemId ? { ...item, quantity } : item))
      );
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const value = { cart, addToCart, removeFromCart, updateQuantity, clearCart };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
