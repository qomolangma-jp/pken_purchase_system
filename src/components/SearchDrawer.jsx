import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';

const SearchDrawer = ({ isOpen, onClose, onSearch, initialValue = '' }) => {
  const [searchValue, setSearchValue] = useState(initialValue);
  const [recentKeywords, setRecentKeywords] = useState([]);

  // 最近検索したキーワードの履歴を取得
  const loadSearchHistory = () => {
    try {
      const history = localStorage.getItem('searchHistory');
      if (history) {
        setRecentKeywords(JSON.parse(history));
      }
    } catch (err) {
      console.error('検索履歴の読み込みエラー:', err);
      setRecentKeywords([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSearchValue(initialValue);
      loadSearchHistory();
    }
  }, [isOpen, initialValue]);

  // 検索キーワードをLocalStorageに保存
  const saveSearchToHistory = (keyword) => {
    if (!keyword || !keyword.trim()) return;

    try {
      let history = [];
      const stored = localStorage.getItem('searchHistory');
      if (stored) {
        history = JSON.parse(stored);
      }

      // 新しいキーワードを配列の先頭に追加（重複は削除）
      const filtered = history.filter(item => item !== keyword);
      const newHistory = [keyword, ...filtered].slice(0, 5); // 直近5個のみ保持

      localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      setRecentKeywords(newHistory);
    } catch (err) {
      console.error('検索履歴の保存エラー:', err);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      saveSearchToHistory(searchValue);
    }
    onSearch(searchValue);
    onClose();
  };

  return (
    <>
      {/* オーバーレイ */}
      <div
        className={`fixed inset-0 bg-black/50 z-[100] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={onClose}
      />

      {/* ドロワーコンテナ */}
      <div
        className={`fixed top-0 left-0 h-full w-[85%] max-w-sm bg-white z-[101] shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold text-gray-800">商品を検索</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={24} className="text-gray-500" />
            </button>
          </div>

          {/* 検索フォーム */}
          <form onSubmit={handleSubmit} className="p-4">
            <div className="relative">
              <input
                type="text"
                placeholder="キーワードを入力..."
                className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-black outline-none transition-all text-sm"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                autoFocus={isOpen}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
            <button
              type="submit"
              className="w-full mt-4 bg-black text-white font-bold py-3 rounded-xl active:scale-[0.98] transition-all"
            >
              検索する
            </button>
          </form>

          {/* おすすめキーワードなど（オプション） */}
          <div className="flex-1 p-4 overflow-y-auto">
            <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">
              {recentKeywords.length > 0 ? '最近検索したキーワード' : '人気のキーワード'}
            </p>
            <div className="flex flex-wrap gap-2">
              {(recentKeywords.length > 0
                ? recentKeywords
                : ['チキン', 'コーヒー', 'セット', '期間限定']
              ).map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSearchValue(tag);
                    saveSearchToHistory(tag);
                    onSearch(tag);
                    onClose();
                  }}
                  className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-sm text-gray-600 rounded-full transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SearchDrawer;
