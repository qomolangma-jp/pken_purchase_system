import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 w-full h-16 bg-white shadow z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            className="text-2xl focus:outline-none"
            aria-label="メニューを開く"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="material-icons">menu</span>
          </button>
          <h1 className="text-lg font-bold">Mobile Order</h1>
        </div>
        <Link to="/cart" aria-label="カート画面へ" className="text-2xl">
          <span className="material-icons">shopping_cart</span>
        </Link>
      </header>

      {/* ドロワーメニュー */}
      {isMenuOpen && (
        <>
          {/* オーバーレイ */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* メニューパネル */}
          <div className="fixed top-0 left-0 w-64 h-full bg-white shadow-lg z-50 transform transition-transform duration-300">
            <div className="p-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">メニュー</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="text-2xl focus:outline-none"
                  aria-label="メニューを閉じる"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
              
              <nav className="flex flex-col space-y-2">
                <Link 
                  to="/" 
                  className="px-4 py-3 hover:bg-stone-100 rounded transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  商品一覧
                </Link>
                <Link 
                  to="/cart" 
                  className="px-4 py-3 hover:bg-stone-100 rounded transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  カート
                </Link>
                <Link 
                  to="/purchase-history" 
                  className="px-4 py-3 hover:bg-stone-100 rounded transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  購入履歴
                </Link>
                <hr className="my-2" />
                <Link 
                  to="/login" 
                  className="px-4 py-3 hover:bg-stone-100 rounded transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  ログイン
                </Link>
                <Link 
                  to="/register" 
                  className="px-4 py-3 hover:bg-stone-100 rounded transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  新規登録
                </Link>
              </nav>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Header;
