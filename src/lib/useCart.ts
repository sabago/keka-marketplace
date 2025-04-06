import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  thumbnail: string;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

// Create a Zustand store with persistence
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product) => {
        set((state) => {
          const existingItem = state.items.find(item => item.id === product.id);
          
          if (existingItem) {
            // If item exists, increment quantity
            return {
              items: state.items.map(item => 
                item.id === product.id 
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              )
            };
          } else {
            // Add new item with quantity 1
            return {
              items: [...state.items, { ...product, quantity: 1 }]
            };
          }
        });
      },
      
      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter(item => item.id !== id)
        }));
      },
      
      updateQuantity: (id, quantity) => {
        set((state) => ({
          items: state.items.map(item => 
            item.id === id 
              ? { ...item, quantity: Math.max(1, quantity) }
              : item
          )
        }));
      },
      
      clearCart: () => {
        set({ items: [] });
      },
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      }
    }),
    {
      name: 'keka-marketplace-cart', // Storage key
      skipHydration: true, // Important for server-side rendering
      storage: {
        getItem: (name) => {
          // When in browser, use localStorage
          if (typeof window !== 'undefined') {
            const str = localStorage.getItem(name);
            return str ? JSON.parse(str) : null;
          }
          return null;
        },
        setItem: (name, value) => {
          // When in browser, use localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem(name, JSON.stringify(value));
          }
        },
        removeItem: (name) => {
          // When in browser, use localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem(name);
          }
        },
      }
    }
  )
);

// Hook for hydrating the store on client side
export function useCart() {
  const [isHydrated, setIsHydrated] = useState(false);
  const cart = useCartStore();
  
  useEffect(() => {
    // Check if localStorage is available
    if (typeof window !== 'undefined') {
      // Rehydrate the store
      useCartStore.persist.rehydrate();
      setIsHydrated(true);
    }
  }, []);
  
  return {
    ...cart,
    isHydrated
  };
}
