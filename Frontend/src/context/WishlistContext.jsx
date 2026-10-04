import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api';
import { AuthContext } from './AuthContext';

export const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const { user } = useContext(AuthContext);

  const fetchWishlist = useCallback(async () => {
    try {
      const res = await api.get('/auth/wishlist');
      setWishlist(Array.isArray(res.data) ? res.data : []);
    } catch {
      setWishlist([]);
    }
  }, []);

  useEffect(() => {
    if (user) fetchWishlist();
    else setWishlist([]);
  }, [user, fetchWishlist]);

  const toggleWishlist = async (product) => {
    if (!user) return;
    const exists = wishlist.some(item => item._id === product._id);
    if (exists) {
      setWishlist(prev => prev.filter(item => item._id !== product._id));
      try {
        const updated = wishlist.filter(item => item._id !== product._id);
        await api.post('/auth/wishlist', { wishlist: updated.map(i => i._id) });
      } catch {
        fetchWishlist();
      }
    } else {
      setWishlist(prev => [...prev, product]);
      try {
        const updated = [...wishlist, product];
        await api.post('/auth/wishlist', { wishlist: updated.map(i => i._id) });
      } catch {
        fetchWishlist();
      }
    }
  };

  const isInWishlist = (productId) => wishlist.some(item => item._id === productId);

  return (
    <WishlistContext.Provider value={{ wishlist, toggleWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};
