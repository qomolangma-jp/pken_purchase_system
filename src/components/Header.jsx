import React from 'react';

const Header = ({ onMenuClick }) => (
  <header className="fixed top-0 left-0 w-full h-16 bg-white shadow z-50 flex items-center justify-between px-4">
    <button
      className="text-2xl focus:outline-none"
      onClick={onMenuClick}
      aria-label="メニューを開く"
    >
      <span className="material-icons">menu</span>
    </button>
    <h1 className="text-lg font-bold">モバイルオーダー</h1>
    {/* 必要ならロゴや他の要素も追加 */}
  </header>
);

export default Header;
