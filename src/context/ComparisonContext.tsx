import React, { createContext, useContext, useState } from 'react';
import { ProductItem } from '../types';

interface ComparisonContextType {
  comparisonProducts: ProductItem[];
  addToComparison: (product: ProductItem) => boolean;
  removeFromComparison: (productId: string) => void;
  toggleComparison: (product: ProductItem) => void;
  isInComparison: (productId: string) => boolean;
  clearComparison: () => void;
  isComparisonModalOpen: boolean;
  setIsComparisonModalOpen: (open: boolean) => void;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

const MAX_COMPARISON_ITEMS = 4;

export const ComparisonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [comparisonProducts, setComparisonProducts] = useState<ProductItem[]>([]);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);

  const isInComparison = (productId: string) => {
    return comparisonProducts.some(p => p.id === productId);
  };

  const addToComparison = (product: ProductItem): boolean => {
    if (isInComparison(product.id)) return true;
    if (comparisonProducts.length >= MAX_COMPARISON_ITEMS) {
      return false; // Reached limit
    }
    setComparisonProducts(prev => [...prev, product]);
    return true;
  };

  const removeFromComparison = (productId: string) => {
    setComparisonProducts(prev => prev.filter(p => p.id !== productId));
  };

  const toggleComparison = (product: ProductItem) => {
    if (isInComparison(product.id)) {
      removeFromComparison(product.id);
    } else {
      addToComparison(product);
    }
  };

  const clearComparison = () => {
    setComparisonProducts([]);
  };

  return (
    <ComparisonContext.Provider
      value={{
        comparisonProducts,
        addToComparison,
        removeFromComparison,
        toggleComparison,
        isInComparison,
        clearComparison,
        isComparisonModalOpen,
        setIsComparisonModalOpen,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
};

export const useComparison = (): ComparisonContextType => {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
};
