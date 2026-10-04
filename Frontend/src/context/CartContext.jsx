import React, { createContext, useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from './AuthContext';

export const CartContext = createContext();

const CART_KEY = 'fh_cart';

export const CartProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
    catch { return []; }
  });

  // Clear cart on logout
  useEffect(() => {
    if (!user) {
      setCart([]);
      localStorage.removeItem(CART_KEY);
    }
  }, [user]);

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, qty = 1, selectedOption = null) => {
    if (!user) return;
    const cartKey = selectedOption
      ? `${product._id || product.product}__${selectedOption.label}`
      : (product._id || product.product);
    const existing = cart.find(item => item.cartKey === cartKey);
    const itemPrice = selectedOption ? selectedOption.price : product.price;

    // For free-form weight options, stock is in grams; convert option value to grams
    const optionGrams = selectedOption
      ? (selectedOption.unit === 'kg' ? selectedOption.value * 1000 : selectedOption.unit === 'gram' ? selectedOption.value : null)
      : null;
    const stockCheck = optionGrams !== null ? optionGrams : qty;
    const existingStockUsed = existing
      ? (optionGrams !== null ? optionGrams * existing.qty : existing.qty)
      : 0;

    let newCart;
    if (existing) {
      if (existingStockUsed + stockCheck > product.stock) {
        toast.error('Not enough stock available.');
        return;
      }
      newCart = cart.map(item =>
        item.cartKey === cartKey
          ? { ...item, qty: item.qty + qty }
          : item
      );
      toast.success(qty > 1 ? `Added ${qty} items to cart!` : 'Added to cart!');
    } else {
      if (product.stock === 0) { toast.error('Product is out of stock.'); return; }
      if (stockCheck > product.stock) { toast.error('Not enough stock available.'); return; }
      newCart = [...cart, {
        cartKey,
        product: product._id,
        name: product.name,
        price: itemPrice,
        image: product.image,
        qty,
        stock: product.stock,
        ...(selectedOption && { selectedOption }),
      }];
      toast.success(qty > 1 ? `Added ${qty} items to cart!` : 'Added to cart!');
    }
    setCart(newCart);
  };

  const updateQty = (cartKey, newQty) => {
    const newCart = cart.map(item => {
      if ((item.cartKey || item.product) !== cartKey) return item;
      if (newQty > item.stock) { toast.error('Cannot exceed available stock.'); return item; }
      if (newQty < 1) return item;
      return { ...item, qty: newQty };
    });
    setCart(newCart);
  };

  const removeFromCart = (cartKey) => {
    setCart(cart.filter(item => (item.cartKey || item.product) !== cartKey));
    toast.success('Removed from cart');
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(CART_KEY);
  };

  const getCartTotal = () =>
    cart.reduce((total, item) => total + item.price * item.qty, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQty, removeFromCart, clearCart, getCartTotal }}>
      {children}
    </CartContext.Provider>
  );
};
