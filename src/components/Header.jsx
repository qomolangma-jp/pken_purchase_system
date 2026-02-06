import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => (
  <header className="fixed top-0 left-0 w-full h-16 bg-white shadow z-50 flex items-center justify-between px-4">
    <div className="flex items-center gap-4">
      <button
        className="text-2xl focus:outline-none"
        aria-label="メニューを開く"
      >
        <span className="material-icons">menu</span>
      </button>
      <h1 className="text-lg font-bold">Mobile Order</h1>
    </div>
    <Link to="/cart" aria-label="カート画面へ" className="text-2xl">
      <span className="material-icons">shopping_cart</span>
    </Link>
  </header>
);

export default Header;
