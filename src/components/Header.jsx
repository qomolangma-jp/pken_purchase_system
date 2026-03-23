import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logoImg from '../assets/logo.png';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // useAuth must be called at the top level, not inside try-catch
  const authContext = useAuth();
  const { cartCount = 0, user = null, logout = () => {} } = authContext || {};
  const navigate = useNavigate();

  // デバッグ用：userオブジェクトの内容を確認
  React.useEffect(() => {
    console.log('Header - user情報:', user);
    if (user && typeof user === 'object' && !user.username) {
      console.log('Header - user.name:', user.name);
      console.log('Header - user.displayName:', user.displayName);
      console.log('Header - user.student_id:', user.student_id);
    } else if (user && user.username) {
      console.warn('Header: Invalid user object (looks like DB user):', user);
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    navigate('/login');
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 w-full z-[100] flex items-center justify-between px-3"
        style={{ backgroundColor: '#00873c', height: '56px', boxShadow: '0 2px 4px rgba(0,0,0,0.15)' }}
      >
        {/* 左から右へ：ロゴ → カート → 通知 → メニュー */}
        <div className="flex items-center gap-2 flex-1">
          {/* 1. コマペイのロゴ */}
          <Link
            to="/"
            aria-label="ホームへ"
            className="flex items-center"
          >
            <img src={logoImg} alt="ロゴ" style={{ height: '36px', width: 'auto' }} />
          </Link>

          {/* スペーサー */}
          <div className="flex-1"></div>

          {/* 2. カートアイコン */}
          <Link
            to="/cart"
            aria-label="カート画面へ"
            className="relative flex items-center justify-center text-white active:bg-green-700 rounded-full"
            style={{ width: '40px', height: '40px' }}
          >
            <span className="material-icons" style={{ fontSize: '22px' }}>shopping_cart</span>
            {cartCount > 0 && (
              <span
                className="absolute flex items-center justify-center bg-red-500 text-white font-bold rounded-full"
                style={{ top: '4px', right: '4px', minWidth: '16px', height: '16px', fontSize: '9px', padding: '0 3px' }}
              >
                {cartCount > 99 ? '99+' : cartCount}
              </span>
            )}
          </Link>

          {/* 3. 通知アイコン */}
          <button
            className="relative flex items-center justify-center text-white active:bg-green-700 rounded-full"
            style={{ width: '40px', height: '40px' }}
            aria-label="通知"
          >
            <span className="material-icons" style={{ fontSize: '22px' }}>notifications</span>
            {/* 通知バッジ（必要に応じて表示） */}
            {/* <span
              className="absolute flex items-center justify-center bg-red-500 text-white font-bold rounded-full"
              style={{ top: '4px', right: '4px', minWidth: '16px', height: '16px', fontSize: '9px', padding: '0 3px' }}
            >
              1
            </span> */}
          </button>

          {/* 4. メニューボタン */}
          <button
            className="flex items-center justify-center rounded-full text-white active:bg-green-700"
            style={{ width: '40px', height: '40px' }}
            aria-label="メニューを開く"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className="material-icons" style={{ fontSize: '22px' }}>menu</span>
          </button>
        </div>
      </header>

      {/* ドロワーメニュー */}
      <>
          {/* オーバーレイ */}
          <div 
            className={`fixed inset-0 bg-black bg-opacity-50 z-[110] transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* メニューパネル（右からスライド） */}
          <div
            className={`fixed top-0 right-0 w-72 h-full bg-white shadow-2xl z-[120] flex flex-col border-l-4 border-stone-300 transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
            style={{ backgroundColor: '#ffffff' }}
          >
            <div className="p-4 border-b-2 border-stone-200 bg-stone-50" style={{ backgroundColor: '#fafaf9' }}>
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
              
              {/* ユーザー情報表示（ログインなしは「ゲスト」と表示） */}
              <div className="bg-stone-50 bg-opacity-100 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-icons text-stone-600">account_circle</span>
                  <span className="font-bold text-stone-800">
                    {user ? (user.name || user.displayName || user.student_id || '名前未設定') : 'ゲスト'}
                  </span>
                </div>
                {user && (
                  <div className="ml-8 space-y-1">
                    <p className="text-xs text-stone-600">
                      <span className="font-semibold">名前:</span> {user.name || user.displayName || '未設定'}
                    </p>
                    <p className="text-xs text-stone-600">
                      <span className="font-semibold">学生番号:</span> {user.student_id || '-'}
                    </p>
                  </div>
                )}
              </div>
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
                <Link 
                  to="/news" 
                  className="px-4 py-3 hover:bg-stone-100 text-stone-800 rounded transition-colors flex items-center gap-2"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span className="material-icons text-lg">newspaper</span>
                  <span>ニュース</span>
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
    </>
  );
};

// Verification: Ensure Header is exported correctly
if (typeof Header !== 'function') {
  console.error('🔴 CRITICAL ERROR: Header is not a function!', typeof Header, Header);
}

export default Header;
