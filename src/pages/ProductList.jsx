import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortType, setSortType] = useState('popularity');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // 認証トークンを取得
        const token = localStorage.getItem('authToken');
        const headers = {
          'Content-Type': 'application/json',
        };
        
        // トークンがあればAuthorizationヘッダーに追加
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('https://komapay.p-kmt.com/api/products', {
          method: 'GET',
          headers: headers,
        });

        if (!response.ok) {
          throw new Error('商品データの取得に失敗しました');
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
    <div className="min-h-screen bg-stone-50 pt-24">
      {/* Main Content */}
      <main className="main-content min-h-screen pb-20">
        <div className="container">

          {/* Search & Sort Area with left sidebar buttons */}
          <div className="flex gap-6">
            <aside className="w-40">
              <div className="sticky top-20 bg-white p-3 rounded-md shadow-sm z-10">
                <h4 className="text-sm font-semibold mb-3 text-stone-800">並び替え</h4>
                <div className="flex flex-col space-y-2">
                  <button
                    className={`px-3 py-2 rounded-lg text-sm text-left font-semibold transition-all duration-200 active:scale-95 ${sortType === 'popularity' ? 'bg-mos-green text-white shadow-md' : 'bg-white text-stone-700 border border-stone-300 hover:border-mos-green hover:bg-green-50'}`}
                    onClick={() => setSortType('popularity')}
                  >
                    売れ筋順
                  </button>

                  <button
                    className={`px-3 py-2 rounded-lg text-sm text-left font-semibold transition-all duration-200 active:scale-95 ${sortType === 'price_asc' ? 'bg-mos-green text-white shadow-md' : 'bg-white text-stone-700 border border-stone-300 hover:border-mos-green hover:bg-green-50'}`}
                    onClick={() => setSortType('price_asc')}
                  >
                    価格が安い順
                  </button>

                  <button
                    className={`px-3 py-2 rounded-lg text-sm text-left font-semibold transition-all duration-200 active:scale-95 ${sortType === 'price_desc' ? 'bg-mos-green text-white shadow-md' : 'bg-white text-stone-700 border border-stone-300 hover:border-mos-green hover:bg-green-50'}`}
                    onClick={() => setSortType('price_desc')}
                  >
                    価格が高い順
                  </button>

                  <button
                    className={`px-3 py-2 rounded-lg text-sm text-left font-semibold transition-all duration-200 active:scale-95 ${sortType === 'name' ? 'bg-mos-green text-white shadow-md' : 'bg-white text-stone-700 border border-stone-300 hover:border-mos-green hover:bg-green-50'}`}
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
                    <Link 
                      to={`/product/${product.id}`} 
                      key={product.id} 
                      className="block bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-95 group"
                    >
                      <div className="aspect-square bg-gradient-to-br from-stone-100 to-stone-200 relative flex items-center justify-center overflow-hidden">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                        ) : (
                          <span className="text-stone-400 text-sm">No Image</span>
                        )}
                      </div>
                      <div className="p-4 relative">
                        <div className="absolute -top-3 right-4 bg-gradient-to-r from-orange-400 to-yellow-400 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                          人気
                        </div>
                        <h3 className="text-base md:text-lg font-bold text-stone-800 mb-2 truncate pt-6">{product.name}</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl md:text-3xl font-black text-mos-green">¥{product.price ? product.price.toLocaleString() : '-'}</span>
                          <span className="text-xs text-stone-500">税込</span>
                        </div>
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
