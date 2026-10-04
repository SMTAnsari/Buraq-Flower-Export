import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { WishlistContext } from '../context/WishlistContext';
import ProductCard from '../components/ProductCard';
import './Wishlist.css';

const Wishlist = () => {
  const { wishlist } = useContext(WishlistContext);

  const validItems = (wishlist ?? []).filter(p => p?._id && p?.name);

  return (
    <div className="wishlist-page">
      <div className="wishlist-container">

        {validItems.length === 0 ? (
          <div className="wishlist-empty-state">
            <svg className="wishlist-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <h2 className="wishlist-empty-heading">No items in wishlist yet</h2>
            <p className="wishlist-empty-text">Save flowers you love and find them here.</p>
            <Link to="/" className="wishlist-explore-btn">Explore Collections</Link>
          </div>
        ) : (
          <>
            <h1 className="wishlist-title">My Wishlist</h1>
            <p className="wishlist-count">{validItems.length} {validItems.length === 1 ? 'item' : 'items'}</p>
            <div className="wishlist-grid">
              {validItems.map(product => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default Wishlist;
