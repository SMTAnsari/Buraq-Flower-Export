import { useState, useEffect } from 'react';

const KEY = 'fh_recently_viewed';
const MAX  = 6;

const useRecentlyViewed = (currentProductId = null) => {
  const [viewed, setViewed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  });

  // Add current product to recently viewed on mount
  useEffect(() => {
    if (!currentProductId) return;
    setViewed(prev => {
      const filtered = prev.filter(p => p._id !== currentProductId && p !== currentProductId);
      // We store full product objects — but on ProductDetail we only have the ID at hook call time
      // The product object gets merged in via addProduct()
      return filtered.slice(0, MAX - 1);
    });
  }, [currentProductId]);

  const addProduct = (product) => {
    if (!product?._id) return;
    setViewed(prev => {
      const filtered = prev.filter(p => p._id !== product._id);
      const next = [product, ...filtered].slice(0, MAX);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  };

  const clearViewed = () => {
    localStorage.removeItem(KEY);
    setViewed([]);
  };

  return { viewed, addProduct, clearViewed };
};

export default useRecentlyViewed;
