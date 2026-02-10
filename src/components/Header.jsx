import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { cartCount, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    navigate('/login');
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full h-14 bg-green-600 shadow-md z-50 flex items-center justify-between px-4 md:px-6 border-b border-green-700">
        {/* 左側：ロゴとナビゲーション */}
        <div className="flex items-center gap-6">
          {/* モバイルメニューボタン */}
          <button
            className="md:hidden text-white text-2xl focus:outline-none"
            aria-label="メニューを開く"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="material-icons">menu</span>
          </button>
          
          {/* ロゴ */}
          <Link to="/" className="text-white font-bold text-lg md:text-xl hover:text-green-100 transition-colors">
            Mobile Order
          </Link>
          
          {/* デスクトップナビゲーション */}
          <nav className="hidden md:flex items-center gap-1">
            <Link 
              to="/" 
              className="px-4 py-2 text-white hover:bg-green-700 rounded transition-colors text-sm"
            >
              商品一覧
            </Link>
            <Link 
              to="/purchase-history" 
              className="px-4 py-2 text-white hover:bg-green-700 rounded transition-colors text-sm"
            >
              購入履歴
            </Link>
          </nav>
        </div>
        
        {/* 右側：ユーザー情報とカート */}
        <div className="flex items-center gap-3">
          {/* ユーザー名表示 */}
          {user ? (
            <div className="hidden md:flex items-center gap-2 bg-green-700 px-3 py-1.5 rounded hover:bg-green-800 transition-colors">
              <span className="material-icons text-lg text-white">account_circle</span>
              <span className="text-sm text-white font-medium">{user.name || user.student_id}</span>
            </div>
          ) : (
            <Link 
              to="/login" 
              className="hidden md:flex items-center gap-1 px-4 py-1.5 bg-white text-green-600 rounded hover:bg-green-50 transition-colors text-sm font-medium"
            >
              <span className="material-icons text-lg">login</span>
              <span>ログイン</span>
            </Link>
          )}
          
          {/* カートアイコン */}
          <Link to="/cart" aria-label="カート画面へ" className="relative p-2 hover:bg-green-700 rounded transition-colors">
            <span className="material-icons text-white text-2xl">shopping_cart</span>
            {cartCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>
        </div>
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
          <div className="fixed top-0 left-0 w-64 h-full bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col border-r-4 border-stone-300">
            <div className="p-4 border-b-2 border-stone-200 bg-stone-50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-stone-800">メニュー</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="text-stone-800 text-2xl focus:outline-none hover:bg-stone-100 rounded p-1"
                  aria-label="メニューを閉じる"
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
              
              {/* ユーザー情報表示 */}
              {user && (
                <div className="bg-stone-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-icons text-stone-600">account_circle</span>
                    <span className="font-bold text-stone-800">{user.name || '名前未設定'}</span>
                  </div>
                  <p className="text-xs text-stone-500 ml-8">学生番号: {user.student_id || '-'}</p>
                </div>
              )}
            </div>
            
            <nav className="flex-1 flex flex-col p-4 overflow-y-auto">
              <div className="space-y-2">
                <Link 
                  to="/" 
                  className="px-4 py-3 hover:bg-stone-100 text-stone-800 rounded transition-colors flex items-center gap-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="material-icons text-lg">store</span>
                  <span>商品一覧</span>
                </Link>
                <Link 
                  to="/cart" 
                  className="px-4 py-3 hover:bg-stone-100 text-stone-800 rounded transition-colors flex items-center gap-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="material-icons text-lg">shopping_cart</span>
                  <span>カート</span>
                  {cartCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {cartCount}
                    </span>
                  )}
                </Link>
                <Link 
                  to="/purchase-history" 
                  className="px-4 py-3 hover:bg-stone-100 text-stone-800 rounded transition-colors flex items-center gap-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="material-icons text-lg">history</span>
                  <span>購入履歴</span>
                </Link>
              </div>
              
              <div className="mt-auto pt-4 border-t border-stone-200 space-y-2">
                {user ? (
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 hover:bg-red-50 text-red-600 rounded transition-colors flex items-center gap-2"
                  >
                    <span className="material-icons text-lg">logout</span>
                    <span>ログアウト</span>
                  </button>
                ) : (
                  <>
                    <Link 
                      to="/login" 
                      className="px-4 py-3 hover:bg-stone-100 text-stone-800 rounded transition-colors flex items-center gap-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="material-icons text-lg">login</span>
                      <span>ログイン</span>
                    </Link>
                    <Link 
                      to="/register" 
                      className="px-4 py-3 hover:bg-stone-100 text-stone-800 rounded transition-colors flex items-center gap-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="material-icons text-lg">person_add</span>
                      <span>新規登録</span>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
};

export default Header;
