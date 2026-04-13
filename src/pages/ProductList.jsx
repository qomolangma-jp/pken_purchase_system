import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getFavorites, toggleFavorite } from '../utils/favorites';

const PLACEHOLDER_IMAGE = '/no-image.png';

const toAbsoluteUrl = (url) => {
  if (!url || typeof url !== 'string') return PLACEHOLDER_IMAGE;

  const normalizedUrl = url.trim();
  if (!normalizedUrl) return PLACEHOLDER_IMAGE;
  if (/^https?:\/\//i.test(normalizedUrl)) return normalizedUrl;

  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  return `${base}${normalizedUrl.startsWith('/') ? '' : '/'}${normalizedUrl}`;
};

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('すべて');
  const [favorites, setFavorites] = useState([]);
  const categoryBarRef = useRef(null);
  const hasFetchedRef = useRef(false); // 一度だけ実行するためのフラグ
  
  // 認証状態を取得
  const { loading: authLoading, user } = useAuth();
  
  // マウント時にお気に入り情報を読み込む
  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const apiUrl = `${import.meta.env.VITE_API_BASE_URL || ''}/api/products`;
        console.log('API URL:', apiUrl);
        console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);

        const response = await fetch(apiUrl, { headers });
        
        // コンテンツタイプをチェック
        const contentType = response.headers.get('content-type');
        console.log('Response status:', response.status);
        console.log('Content-Type:', contentType);

        if (!response.ok) {
          const responseText = await response.text();
          console.error('Response body:', responseText.substring(0, 500));
          throw new Error(`API エラー (${response.status}): 商品データの取得に失敗しました`);
        }

        if (!contentType || !contentType.includes('application/json')) {
          const responseText = await response.text();
          console.error('JSON でないレスポンス:', responseText.substring(0, 500));
          throw new Error(`無効なレスポンス形式です。サーバーが JSON を返していません。レスポンス: ${responseText.substring(0, 100)}`);
        }

        const data = await response.json();
        let productsData = [];

        if (data.success && Array.isArray(data.data)) {
          productsData = data.data;
        } else if (Array.isArray(data)) {
          productsData = data;
        } else {
          throw new Error('予期しないデータ形式です。');
        }

        const validProducts = productsData
          .filter(item => item.id && item.name && !item.username && !item.student_id)
          .map(item => {
            const normalizedLabel = (item.label || '').trim();

            return {
              ...item,
              category_name: item.category_name?.trim() || 'その他',
              vendor_name: item.vendor_name?.trim() || '',
              label: normalizedLabel && normalizedLabel !== '未入力' ? normalizedLabel : '',
            };
          });

        setProducts(validProducts);
      } catch (err) {
        setError(err.message);
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    // ガード節: 認証が完了し、user が存在し、まだフェッチしていない場合のみ実行
    if (authLoading || !user || hasFetchedRef.current) {
      setLoading(false);
      return;
    }

    hasFetchedRef.current = true; // 実行フラグを立てる
    fetchProducts();
  }, [authLoading, user]);

  // カテゴリ一覧（重複排除）
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category_name).filter(Boolean))];
    return ['すべて', ...cats];
  }, [products]);

  // 表示商品
  const displayedProducts = useMemo(() => {
    if (activeCategory === 'すべて') return products;
    return products.filter(p => p.category_name === activeCategory);
  }, [products, activeCategory]);

  const scrollCategories = (dir) => {
    categoryBarRef.current?.scrollBy({ left: dir * 140, behavior: 'smooth' });
  };

  // お気に入りボタンのクリックハンドラー
  const handleFavoriteClick = (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(productId);
    setFavorites(getFavorites()); // 状態を更新
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen" style={{ backgroundColor: '#faf3e8' }}>
        <div className="text-sm font-bold" style={{ color: '#00873c' }}>読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 mt-20 text-red-500 text-sm">{error}</div>
    );
  }

  return (
    <div style={{ backgroundColor: '#faf3e8', minHeight: '100vh', paddingTop: '56px' }}>

      {/* ─── カテゴリタブバー ─── */}
      <div
        className="sticky z-50 flex items-center"
        style={{ top: '56px', backgroundColor: '#faf3e8', borderBottom: '1px solid #ddd0bb' }}
      >
        <button
          onClick={() => scrollCategories(-1)}
          aria-label="左へスクロール"
          className="flex-shrink-0 flex items-center justify-center text-gray-500 active:bg-gray-100"
          style={{ width: '32px', height: '46px' }}
        >
          <ChevronLeft size={18} />
        </button>

        <div ref={categoryBarRef} className="flex overflow-x-auto no-scrollbar flex-1 items-center py-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 px-4 text-sm transition-colors"
              style={{
                padding: '7px 14px',
                lineHeight: '1.2',
                marginRight: '8px',
                fontWeight: activeCategory === cat ? '700' : '400',
                color: activeCategory === cat ? '#00873c' : '#444',
                backgroundColor: activeCategory === cat ? '#e8f5ed' : '#fffaf2',
                border: activeCategory === cat ? '1px solid #00873c' : '1px solid #d6c9b8',
                borderRadius: '999px',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={() => scrollCategories(1)}
          aria-label="右へスクロール"
          className="flex-shrink-0 flex items-center justify-center text-gray-500 active:bg-gray-100"
          style={{ width: '32px', height: '46px' }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ─── コンテンツ ─── */}
      <div style={{ padding: '12px 8px 80px' }}>

        {/* セクションタイトル */}
        <h1
          className="font-bold mb-2"
          style={{ fontSize: '18px', color: '#1a1a1a', padding: '4px 4px 8px' }}
        >
          {activeCategory}
        </h1>

        {/* 商品グリッド */}
        <div 
          className="product-grid" 
          style={{ gap: '6px' }}
        >
          {displayedProducts.length === 0 ? (
            <p className="text-center py-16 text-sm text-gray-400" style={{ gridColumn: '1 / -1' }}>
              該当する商品が見つかりませんでした。
            </p>
          ) : (
            displayedProducts.map(product => {
              const imageSrc = toAbsoluteUrl(product.thumbnail_url || product.image_url || product.image_original_url);

              return (
                <Link
                  to={`/products/${product.id}`}
                  key={product.id}
                  className="block bg-white"
                  style={{
                    borderRadius: '4px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                    overflow: 'hidden',
                  }}
                >
                {/* 商品画像（4:3） */}
                <div
                  className="relative w-full"
                  style={{ aspectRatio: '4 / 3', backgroundColor: '#f0ebe3', overflow: 'hidden' }}
                >
                  <img
                    src={imageSrc}
                    alt={product.name}
                    className="w-full h-full"
                    style={{ objectFit: 'fill' }}
                    loading="lazy"
                    onError={(e) => {
                      if (e.currentTarget.src.endsWith(PLACEHOLDER_IMAGE)) return;
                      e.currentTarget.src = PLACEHOLDER_IMAGE;
                    }}
                  />
                  {/* お気に入りボタン（右上） */}
                  <button
                    onClick={(e) => handleFavoriteClick(e, product.id)}
                    className="absolute top-2 right-2 z-20 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 shadow-md hover:bg-white hover:scale-110 transition-transform active:scale-95"
                    aria-label="お気に入りに追加"
                    style={{ backdropFilter: 'blur(4px)' }}
                  >
                    <Heart
                      size={20}
                      className={`transition-colors ${
                        favorites.includes(product.id)
                          ? 'fill-red-500 text-red-500'
                          : 'text-gray-400'
                      }`}
                    />
                  </button>
                  {/* ドロップリボン（画像左上角） */}
                  {product.label && (
                    <div
                      className="absolute text-white font-bold"
                      style={{
                        top: '8px',
                        left: '-28px',
                        width: '100px',
                        textAlign: 'center',
                        backgroundColor: '#ff6b35',
                        transform: 'rotate(-45deg)',
                        transformOrigin: 'center',
                        fontSize: '10px',
                        lineHeight: '1.6',
                        padding: '3px 0',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        zIndex: 10,
                      }}
                    >
                      {product.label}
                    </div>
                  )}
                </div>

                {/* 商品情報 */}
                <div style={{ padding: '8px 8px 10px' }}>
                  {/* 商品名 (▶ プレフィックス付き) */}
                  <p
                    className="leading-snug mb-1.5"
                    style={{
                      fontSize: '12px',
                      color: '#1a1a1a',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{ color: '#00873c', fontSize: '10px', marginRight: '2px' }}>▶</span>
                    {product.name}
                  </p>
                  {/* 価格 */}
                  <p
                    className="font-bold"
                    style={{ color: '#00873c', fontSize: '15px', letterSpacing: '-0.3px' }}
                  >
                    ¥{Number(product.price).toLocaleString()}
                  </p>
                </div>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductList;
