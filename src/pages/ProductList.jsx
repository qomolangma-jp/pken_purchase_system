import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getFavorites, toggleFavorite } from '../utils/favorites';
import CategoryChips from '../components/CategoryChips';
import SearchDrawer from '../components/SearchDrawer';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [initialFavorites, setInitialFavorites] = useState([]); // 初回読み込み時のお気に入りを保持
  const hasFetchedRef = useRef(false); // 一度だけ実行するためのフラグ
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);
  
  // 認証状態を取得
  const { loading: authLoading, user } = useAuth();
  
  // マウント時にお気に入り情報を読み込む
  useEffect(() => {
    const savedFavorites = getFavorites();
    setFavorites(savedFavorites);
    setInitialFavorites(savedFavorites); // 初期並び替え用のお気に入りを保存
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
    return ['すべて', 'お気に入り', ...cats];
  }, [products]);

  // 表示商品
  const displayedProducts = useMemo(() => {
    let filtered = products;
    
    // カテゴリフィルタリング
    if (activeCategory === 'お気に入り') {
      filtered = products.filter(p => favorites.includes(p.id));
    } else if (activeCategory !== 'すべて') {
      filtered = products.filter(p => p.category_name === activeCategory);
    }

    // 検索フィルタリング
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.category_name && p.category_name.toLowerCase().includes(query))
      );
    }
    
    // お気に入りを上に出すようにソート（『お気に入り』タブ以外、または検索中以外）
    // 動的な並び替えを防ぐため、初回読み込み時の favorites (initialFavorites) を使用する
    if (activeCategory !== 'お気に入り') {
      const favorited = filtered.filter(p => initialFavorites.includes(p.id));
      const notFavorited = filtered.filter(p => !initialFavorites.includes(p.id));
      return [...favorited, ...notFavorited];
    }

    return filtered;
  }, [products, activeCategory, favorites, initialFavorites, searchQuery]);

  // カテゴリ変更ハンドラー
  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    // お気に入りタブを選択した時のみ、最新の状態を取得
    if (category === 'お気に入り') {
      setFavorites(getFavorites());
    }
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
  };

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    if (!touch || touchStartXRef.current === null || touchStartYRef.current === null) return;

    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;
    const threshold = 60;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      const currentIndex = categories.indexOf(activeCategory);
      if (currentIndex !== -1) {
        if (deltaX < 0 && currentIndex < categories.length - 1) {
          handleCategoryChange(categories[currentIndex + 1]);
        } else if (deltaX > 0 && currentIndex > 0) {
          handleCategoryChange(categories[currentIndex - 1]);
        }
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // お気に入りボタンのクリックハンドラー
  const handleFavoriteClick = (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(productId);
    // ハートの色を更新（displayedProductsの順序は変わらない）
    setFavorites(getFavorites());
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
    <div style={{ backgroundColor: '#faf3e8', minHeight: '100vh', paddingTop: '0px' }}>

      {/* ─── カテゴリチップスバー ─── */}
      <CategoryChips
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        onSearchClick={() => setIsSearchOpen(true)}
        bgColor="#ffffff"
      />

      {/* ─── 検索ドロワー ─── */}
      <SearchDrawer
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSearch={(query) => setSearchQuery(query)}
        initialValue={searchQuery}
      />

      {/* ─── コンテンツ ─── */}
      <div className="p-4 pb-20">

        {/* セクションタイトル */}
        <div className="flex items-center justify-between mb-4 px-1">
          <h1 className="text-xl font-bold text-gray-800">
            {searchQuery ? `「${searchQuery}」の検索結果` : activeCategory}
          </h1>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-sm text-blue-500 font-bold"
            >
              リセット
            </button>
          )}
        </div>

        {/* 商品グリッド */}
        <div
          className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 px-0"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {displayedProducts.length === 0 ? (
            <p className="text-center py-16 text-sm text-gray-400 col-span-2">
              該当する商品が見つかりませんでした。
            </p>
          ) : (
            displayedProducts.map(product => {
              const imageSrc = toAbsoluteUrl(product.thumbnail_url || product.image_url || product.image_original_url);

              return (
                <Link
                  to={`/products/${product.id}`}
                  key={product.id}
                  className="block bg-white rounded-sm shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform relative aspect-[7/8]"
                >
                {/* 商品画像（全体の2/3 = 66.6%） */}
                <div className="w-full h-[66.6%] relative overflow-hidden bg-gray-50">
                  <img
                    src={imageSrc}
                    alt={product.name}
                    className={`object-cover w-full h-full hover:scale-105 transition-transform duration-300 ${
                      product.stock === 0 ? 'brightness-50' : ''
                    }`}
                    loading="lazy"
                    onError={(e) => {
                      if (e.currentTarget.src.endsWith(PLACEHOLDER_IMAGE)) return;
                      e.currentTarget.src = PLACEHOLDER_IMAGE;
                    }}
                  />

                  {/* 在庫状態オーバーレイ */}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/60 px-3 py-2 rounded-sm text-white text-sm font-bold">
                        売り切れ
                      </div>
                    </div>
                  )}

                  {/* お気に入りボタン（右上） */}
                  <button
                    onClick={(e) => handleFavoriteClick(e, product.id)}
                    className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 shadow-sm hover:bg-white hover:scale-110 transition-transform active:scale-90"
                    aria-label="お気に入りに追加"
                    style={{ backdropFilter: 'blur(4px)' }}
                  >
                    <Heart
                      size={16}
                      className={`transition-colors ${
                        favorites.includes(product.id)
                          ? 'fill-red-500 text-red-500'
                          : 'text-gray-400'
                      }`}
                    />
                  </button>

                  {/* ラベル（画像左上） */}
                  {product.label && (
                    <div
                      className="absolute text-white font-bold"
                      style={{
                        top: '12px',
                        left: '-28px',
                        width: '100px',
                        textAlign: 'center',
                        backgroundColor: '#ff6b35',
                        transform: 'rotate(-45deg)',
                        transformOrigin: 'center',
                        fontSize: '11px',
                        lineHeight: '1.6',
                        padding: '4px 0',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        zIndex: 10,
                      }}
                    >
                      {product.label}
                    </div>
                  )}
                </div>

                {/* 商品情報（全体の1/3 = 33.3%） */}
                <div className="p-2 flex flex-col justify-between h-[33.4%]">
                  <div>
                    {/* カテゴリ (スマホ版では非表示) */}
                    <div className="hidden lg:flex items-center gap-1">
                      <span className="text-[14px] text-gray-400 font-medium truncate uppercase tracking-tighter">
                        {product.category_name}
                      </span>
                    </div>

                    {/* 商品名 (スマホ版でサイズアップ) */}
                    <h3 className="text-[13px] lg:text-[22px] font-bold text-gray-800 line-clamp-2 leading-tight mt-0.5 lg:mt-1.5">
                      {product.name}
                    </h3>
                  </div>

                  {/* 価格と在庫ステータス (スマホ版でサイズアップ) */}
                  <div className="flex items-baseline gap-1.5 lg:gap-4 mt-1 lg:mt-3">
                    <p className="text-green-600 font-extrabold text-[22px] lg:text-[40px] leading-none">
                      ¥{Number(product.price).toLocaleString()}
                    </p>
                    
                    {product.stock > 0 && product.stock <= 5 && (
                      <span className="text-[9px] lg:text-[18px] font-bold text-orange-500 bg-orange-50 px-1 py-0.5 lg:px-2.5 lg:py-1 rounded-sm">
                        残り{product.stock}
                      </span>
                    )}
                  </div>
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
