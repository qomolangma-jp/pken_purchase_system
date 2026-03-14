import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortType, setSortType] = useState('popularity');

  const hasDisplayValue = (value) => typeof value === 'string' && value.trim() !== '' && value.trim() !== '未入力';

  const getVendorDisplayName = (product) => {
    if (hasDisplayValue(product?.vendor_name)) {
      return product.vendor_name.trim();
    }
    return '';
  };

  const getCategoryDisplayName = (product) => {
    if (hasDisplayValue(product?.category_name)) {
      return product.category_name.trim();
    }
    return '';
  };

  const getAllergensText = (allergens) => {
    if (Array.isArray(allergens)) {
      return allergens
        .filter((item) => hasDisplayValue(item))
        .map((item) => item.trim())
        .join('・');
    }
    if (hasDisplayValue(allergens)) {
      return allergens.trim();
    }
    return '';
  };

  const getLabelText = (label) => {
    if (hasDisplayValue(label)) {
      return label.trim();
    }
    return '';
  };

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

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/products`, {
          method: 'GET',
          headers: headers,
        });

        if (!response.ok) {
          throw new Error('商品データの取得に失敗しました');
        }

        const data = await response.json();
        // APIレスポンスの構造に合わせてデータをセット
        // { success: true, data: [...], count: 5 }
        let productsData = [];
        
        if (data.success && Array.isArray(data.data)) {
          // Filter out invalid products (e.g., user objects)
          productsData = data.data.filter(item => {
            // Valid products should have 'id' and 'name', but NOT 'username' or 'student_id'
            const isValidProduct = item.id && item.name && !item.username && !item.student_id;
            if (!isValidProduct) {
              console.warn('⚠️ Filtered out invalid item:', item);
            }
            return isValidProduct;
          }).map((item) => ({
            ...item,
            category_name: getCategoryDisplayName(item),
            vendor_name: getVendorDisplayName(item),
            label: getLabelText(item.label),
          }));
          setProducts(productsData);
        } else if (Array.isArray(data)) {
          // 配列が直接返ってくる場合
          productsData = data
            .filter(item => item.id && item.name && !item.username && !item.student_id)
            .map((item) => ({
              ...item,
              category_name: getCategoryDisplayName(item),
              vendor_name: getVendorDisplayName(item),
              label: getLabelText(item.label),
            }));
          setProducts(productsData);
        } else {
          console.error('❌ Unexpected API response format:', data);
          setProducts([]);
        }
      } catch (err) {
        setError('商品データの取得に失敗しました。');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchNews = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/news`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            // 最新3件のニュースのみ取得
            setNewsList(data.data.slice(0, 3));
          } else if (Array.isArray(data)) {
            setNewsList(data.slice(0, 3));
          }
        }
      } catch (err) {
        console.error('News fetch error:', err);
      }
    };

    fetchProducts();
    fetchNews();
  }, []);

  // Filter and Sort
  const getFilteredAndSortedProducts = () => {
    // Ensure all products are valid before filtering
    const validProducts = products.filter(product => 
      product && product.id && product.name && !product.username
    );
    
    let filtered = validProducts.filter(product => {
      const name = product.name && typeof product.name === 'string' ? product.name : '';
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return filtered.sort((a, b) => {
      try {
        if (sortType === 'price_asc') return (a.price || 0) - (b.price || 0);
        if (sortType === 'price_desc') return (b.price || 0) - (a.price || 0);
        if (sortType === 'name') {
          const nameA = a.name || '';
          const nameB = b.name || '';
          return nameA.localeCompare(nameB);
        }
        // default: popularity
        return (b.popularity || 0) - (a.popularity || 0);
      } catch (err) {
        console.error('Sort error:', err);
        return 0;
      }
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
    <div className="min-h-screen bg-stone-50 pt-6">
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
                      <div className="p-4">
                        {product.label && (
                          <div className="mb-2 flex justify-end">
                            <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                              {product.label}
                            </span>
                          </div>
                        )}
                        <h3 className="text-base md:text-lg font-bold text-stone-800 mb-2 leading-snug break-words">{product.name}</h3>

                        {((product.category_name && product.category_name !== '未入力') || (product.vendor_name && product.vendor_name !== '未入力') || getAllergensText(product.allergens)) && (
                          <div className="flex flex-wrap gap-2 text-xs text-stone-500 mb-2">
                            {product.vendor_name && product.vendor_name !== '未入力' && (
                              <span className="px-2 py-1 bg-stone-100 rounded-full">
                                販売者 {product.vendor_name}
                                {product.vendor_id ? ` (#${product.vendor_id})` : ''}
                              </span>
                            )}
                            {product.category_name && product.category_name !== '未入力' && (
                              <span className="px-2 py-1 bg-stone-100 rounded-full">
                                カテゴリ {product.category_name}
                              </span>
                            )}
                            {getAllergensText(product.allergens) && (
                              <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-full">
                                アレルゲン {getAllergensText(product.allergens)}
                              </span>
                            )}
                          </div>
                        )}

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

          {/* News Section */}
          {newsList.length > 0 && (
            <div className="mt-16">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-stone-800">最新ニュース</h2>
                <Link to="/news" className="text-mos-green hover:text-mos-green-dark font-semibold text-sm">
                  すべて見る →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {newsList.map((newsItem) => (
                  <div key={newsItem.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow duration-300">
                    <div className="text-sm text-stone-500 mb-2">
                      {new Date(newsItem.created_at).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                      })}
                    </div>
                    <h3 className="text-base font-bold text-stone-800 mb-2 line-clamp-2">
                      {newsItem.title}
                    </h3>
                    <p className="text-stone-600 text-sm line-clamp-2">
                      {newsItem.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default ProductList;
