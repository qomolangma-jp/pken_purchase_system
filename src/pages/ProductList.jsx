import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortType, setSortType] = useState('popularity');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('https://komapay.p-kmt.com/api/products');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        // APIレスポンスの構造に合わせてデータをセット
        // { success: true, data: [...], count: 5 }
        if (data.success && Array.isArray(data.data)) {
          setProducts(data.data);
        } else {
          // 配列が直接返ってくる場合やその他の形式へのフォールバック
          setProducts(Array.isArray(data) ? data : []);
          console.warn('Unexpected API response format:', data);
        }
      } catch (err) {
        setError('商品データの取得に失敗しました。');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter and Sort
  const getFilteredAndSortedProducts = () => {
    let filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      if (sortType === 'price_asc') return a.price - b.price;
      if (sortType === 'price_desc') return b.price - a.price;
      if (sortType === 'name') return a.name.localeCompare(b.name);
      // default: popularity (assuming higher number is more popular)
      // APIデータにpopularityがない場合はid順などにする必要があるが、
      // 既存のJSロジックに従い popularity を使用。なければ0として扱う。
      return (b.popularity || 0) - (a.popularity || 0);
    });
  };

  const displayedProducts = getFilteredAndSortedProducts();

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center">読み込み中...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex justify-center items-center text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="site-header">
        <div className="container header-inner">
          {/* Logo */}
          <Link to="/" className="logo">Mobile Order</Link>

          <div className="flex items-center gap-4">
            <Link to="/cart" className="relative text-stone-600 hover:text-stone-800">
              <svg className="w-6 h-6" style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center" style={{ display: 'none' }}>0</span>
            </Link>

            {/* Hamburger Menu Button */}
            <button 
              className="menu-button" 
              aria-label="メニューを開く"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <svg className="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              ) : (
                <svg className="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Drawer Menu */}
        <div className={`mobile-menu ${isMenuOpen ? 'is-open' : ''}`}>
          <nav className="mobile-nav">
            <Link to="/" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>すべて表示</Link>
            <Link to="/" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>商品一覧</Link>
            <Link to="#" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>購入履歴</Link>
            <Link to="#" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>ユーザー情報</Link>
            <Link to="#" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>意見を送る</Link>
            <Link to="#" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>使い方</Link>
            <Link to="#" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>お知らせ</Link>
            <Link to="/login" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>ログイン</Link>
            <Link to="/register" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>新規登録</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content min-h-screen pb-20">
        <div className="container">

          {/* Search & Sort Area with left sidebar buttons */}
          <div className="flex gap-6">
            <aside className="w-40">
              <div className="sticky top-4 bg-white p-3 rounded-md shadow-sm">
                <h4 className="text-sm font-semibold mb-3">並び替え</h4>
                <div className="flex flex-col space-y-2">
                  <button
                    className={`px-3 py-2 rounded text-sm text-left ${sortType === 'popularity' ? 'bg-blue-600 text-white' : 'bg-white text-stone-700 border'}`}
                    onClick={() => setSortType('popularity')}
                  >
                    売れ筋順
                  </button>

                  <button
                    className={`px-3 py-2 rounded text-sm text-left ${sortType === 'price_asc' ? 'bg-blue-600 text-white' : 'bg-white text-stone-700 border'}`}
                    onClick={() => setSortType('price_asc')}
                  >
                    価格が安い順
                  </button>

                  <button
                    className={`px-3 py-2 rounded text-sm text-left ${sortType === 'price_desc' ? 'bg-blue-600 text-white' : 'bg-white text-stone-700 border'}`}
                    onClick={() => setSortType('price_desc')}
                  >
                    価格が高い順
                  </button>

                  <button
                    className={`px-3 py-2 rounded text-sm text-left ${sortType === 'name' ? 'bg-blue-600 text-white' : 'bg-white text-stone-700 border'}`}
                    onClick={() => setSortType('name')}
                  >
                    名前順
                  </button>
                </div>
              </div>
            </aside>

            <div className="flex-1">
              <div className="search-wrapper mb-4">
                <input 
                  type="text" 
                  placeholder="商品を検索..." 
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>

              <div className="product-grid">
                {displayedProducts.length > 0 ? (
                  displayedProducts.map(product => (
                    <Link to={`/product/${product.id}`} key={product.id} className="product-card">
                      <div className="card-image-wrapper">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} className="card-image" />
                        ) : (
                          <span>No Image</span>
                        )}
                      </div>
                      <div className="card-content">
                        <h3 className="card-title">{product.name}</h3>
                        <p className="card-price">¥{product.price ? product.price.toLocaleString() : '-'}</p>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="no-results col-span-full">
                    該当する商品が見つかりませんでした。
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default ProductList;
