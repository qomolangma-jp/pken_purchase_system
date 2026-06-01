import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getFavorites, toggleFavorite } from '../utils/favorites';
import CategoryChips from '../components/CategoryChips';
import SearchDrawer from '../components/SearchDrawer';
import NotificationBar from '../components/NotificationBar';
import { getMyOrders } from '../utils/api';

const PLACEHOLDER_IMAGE = '/no-image.png';

/**
 * 画像のURLを正しい絶対パスに変換し、Chromeキャッシュ対策を施す
 */
const toAbsoluteUrl = (url) => {
  if (!url || typeof url !== 'string') return '';

  let normalizedUrl = url.trim();
  
  // Chromebook/Mixed Content対策: httpをhttpsに強制変換
  normalizedUrl = normalizedUrl.replace(/^http:\/\//i, 'https://');

  let absoluteUrl = normalizedUrl;
  if (!/^https?:\/\//i.test(normalizedUrl) && !normalizedUrl.startsWith('data:')) {
    // 環境変数からベースURLを取得
    const apiBase = (
      import.meta.env.VITE_API_BASE_URL || 
      import.meta.env.VITE_API_URL || 
      ''
    ).replace(/\/$/, '');

    const path = normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`;
    absoluteUrl = `${apiBase}${path}`;
  }

  // Chromeキャッシュ対策（Cache Buster）: URLに日付ベースのクエリを付与
  if (absoluteUrl && !absoluteUrl.startsWith('data:')) {
    const separator = absoluteUrl.includes('?') ? '&' : '?';
    // 日付を使用することで、日ごとにキャッシュを更新
    const cb = new Date().getUTCDate();
    absoluteUrl = `${absoluteUrl}${separator}cb=${cb}`;
  }
  
  return absoluteUrl;
};

/**
 * 画像読み込み失敗時のハンドラー
 */
const handleImageError = (e, originalSrc) => {
  const target = e.currentTarget;
  
  // すでにプレースホルダーなら何もしない
  if (target.src.includes(PLACEHOLDER_IMAGE)) return;
  
  console.warn(`[ImageLoadError] Failed to load: ${originalSrc}. Falling back to ${PLACEHOLDER_IMAGE}`);
  
  target.src = PLACEHOLDER_IMAGE;
  target.onerror = null; // ループ防止
};

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('すべて');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [initialFavorites, setInitialFavorites] = useState([]);
  const [notification, setNotification] = useState(null);
  const [isNotificationDismissed, setIsNotificationDismissed] = useState(false);

  const { loading: authLoading, user } = useAuth();

  useEffect(() => {
    if (user) {
      const userKey = user.id || user.student_id || 'default';
      const dismissed = localStorage.getItem('notification_dismissed_' + userKey) === 'true';
      setIsNotificationDismissed(dismissed);
    }
  }, [user]);

  const hasFetchedRef = useRef(false);
  const touchStartXRef = useRef(null);
  const touchStartYRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    if (authLoading || !user || isNotificationDismissed) {
      return;
    }

    const checkOrders = async () => {
      try {
        const orders = await getMyOrders();
        
        // すでに閉じられたか、マウント解除されていたら何もしない
        if (!isMounted) return;
        
        // 注文チェック中に dismiss された場合を考慮して再度チェック
        const userKey = user.id || user.student_id || 'default';
        if (localStorage.getItem('notification_dismissed_' + userKey) === 'true') {
          return;
        }

        if (!orders || orders.length === 0) return;

        const alertOrders = orders.filter(o => {
          const s = (o.status || '').trim();
          return s === '停止' || s === 'キャンセル';
        });
        const cookedOrders = orders.filter(o => {
          const s = (o.status || '').trim();
          return s === '調理済' || s === '調理済み' || s === '調理完了' || s === '完了';
        });

        if (alertOrders.length > 0) {
          const hasCancel = alertOrders.some(o => (o.status || '').trim() === 'キャンセル');
          const hasStop = alertOrders.some(o => (o.status || '').trim() === '停止');
          
          let msg = '【重要】注文が停止されている商品があります。ご確認ください。';
          if (hasCancel && hasStop) {
            msg = '【重要】キャンセルまたは停止された注文があります。ご確認ください。';
          } else if (hasCancel) {
            msg = '【重要】キャンセルされた注文があります。ご確認ください。';
          }

          // 調理済みもある場合は追記
          if (cookedOrders.length > 0) {
            msg += '（受取可能な商品もあります）';
          }

          setNotification({ message: msg, type: 'warning' });
        } else if (cookedOrders.length > 0) {
          const msg = cookedOrders.length > 1 
            ? '【お知らせ】調理済み、または完了した商品が' + cookedOrders.length + '件あります。お受け取りください。'
            : '【お知らせ】調理済み、または完了した商品があります。お受け取りください。';
          setNotification({ message: msg, type: 'info' });
        } else {
          // 該当する注文がなくなったら通知を消す
          setNotification(null);
        }
      } catch (error) {
        console.error('Failed to fetch orders for notification:', error);
      }
    };

    checkOrders();
    const intervalId = setInterval(checkOrders, 30000); // 30秒ごとに更新

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [authLoading, user, isNotificationDismissed]);

  const handleCloseNotification = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('Notification closing...');
    setNotification(null);
    setIsNotificationDismissed(true);
    if (user) {
      const userKey = user.id || user.student_id || 'default';
      localStorage.setItem('notification_dismissed_' + userKey, 'true');
      console.log('Notification dismissed for user:', userKey);
    }
  };
  
  useEffect(() => {
    const savedFavorites = getFavorites();
    setFavorites(savedFavorites);
    setInitialFavorites(savedFavorites);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const headers = {};
        if (token) headers['Authorization'] = 'Bearer ' + token;

        const apiUrl = (import.meta.env.VITE_API_BASE_URL || '') + '/api/products';
        const response = await fetch(apiUrl, { headers });
        
        if (!response.ok) {
          throw new Error('API エラー (' + response.status + '): 商品データの取得に失敗しました');
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('無効なレスポンス形式です。');
        }

        const data = await response.json();
        let productsData = [];

        if (data.success && Array.isArray(data.data)) {
          productsData = data.data;
        } else if (Array.isArray(data)) {
          productsData = data;
        }

        const validProducts = productsData
          .filter(item => item.id && item.name && !item.username && !item.student_id)
          .map(item => ({
            ...item,
            category_name: item.category_name?.trim() || 'その他',
            vendor_name: item.vendor_name?.trim() || '',
            label: (item.label || '').trim() !== '未入力' ? (item.label || '').trim() : '',
          }));

        setProducts(validProducts);
      } catch (err) {
        setError(err.message);
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (authLoading || !user || hasFetchedRef.current) {
      return;
    }

    hasFetchedRef.current = true;
    fetchProducts();
  }, [authLoading, user]);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category_name).filter(Boolean))];
    return ['すべて', 'お気に入り', ...cats];
  }, [products]);

  const displayedProducts = useMemo(() => {
    let filtered = products;
    
    if (activeCategory === 'お気に入り') {
      filtered = products.filter(p => favorites.includes(p.id));
    } else if (activeCategory !== 'すべて') {
      filtered = products.filter(p => p.category_name === activeCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.category_name && p.category_name.toLowerCase().includes(query))
      );
    }
    
    if (activeCategory !== 'お気に入り') {
      const favorited = filtered.filter(p => initialFavorites.includes(p.id));
      const notFavorited = filtered.filter(p => !initialFavorites.includes(p.id));
      return [...favorited, ...notFavorited];
    }

    return filtered;
  }, [products, activeCategory, favorites, initialFavorites, searchQuery]);

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
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

  const handleFavoriteClick = (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(productId);
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
      {notification && (
        <NotificationBar
          message={notification.message}
          type={notification.type}
          onClose={handleCloseNotification}
        />
      )}

      <CategoryChips
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        onSearchClick={() => setIsSearchOpen(true)}
        bgColor="#ffffff"
      />

      <SearchDrawer
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSearch={(query) => setSearchQuery(query)}
        initialValue={searchQuery}
      />

      <div className="p-4 pb-20">
        <div className="flex items-center justify-between mb-4 px-1">
          <h1 className="text-xl font-bold text-gray-800">
            {searchQuery ? '「' + searchQuery + '」の検索結果' : activeCategory}
          </h1>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-3 py-1 text-sm bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold rounded-full transition-colors flex items-center gap-1 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              リセット
            </button>
          )}
        </div>

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
              const rawPath = product.thumbnail_url || product.image_url || product.image_original_url;
              const imageSrc = toAbsoluteUrl(rawPath) || PLACEHOLDER_IMAGE;

              // 開発時のデバッグ用
              if (product.id === displayedProducts[0]?.id) {
                console.log(`[ImageDebug] Product: ${product.name}, URL: ${imageSrc}`);
              }

              return (
                <Link
                  to={'/products/' + product.id}
                  key={product.id}
                  className="block bg-white rounded-sm shadow-sm border border-gray-100 overflow-hidden active:scale-[0.98] transition-transform relative aspect-[7/8]"
                >
                  <div className="w-full h-[66.6%] relative overflow-hidden bg-gray-50">
                    <img
                      key={imageSrc}
                      src={imageSrc}
                      alt={product.name}
                      className={"object-cover w-full h-full hover:scale-105 transition-transform duration-300 " + (product.stock === 0 ? 'brightness-50' : '')}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => handleImageError(e, imageSrc)}
                    />
                    {product.stock === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-black/60 px-3 py-2 rounded-sm text-white text-sm font-bold">
                          売り切れ
                        </div>
                      </div>
                    )}
                    <button
                      onClick={(e) => handleFavoriteClick(e, product.id)}
                      className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/90 shadow-sm hover:bg-white hover:scale-110 transition-transform active:scale-90"
                      aria-label="お気に入りに追加"
                      style={{ backdropFilter: 'blur(4px)' }}
                    >
                      <Heart
                        size={16}
                        className={"transition-colors " + (favorites.includes(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400')}
                      />
                    </button>
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
                  <div className="p-2 flex flex-col justify-between h-[33.4%]">
                    <div>
                      <div className="hidden lg:flex items-center gap-1">
                        <span className="text-[14px] text-gray-400 font-medium truncate uppercase tracking-tighter">
                          {product.category_name}
                        </span>
                      </div>
                      <h3 className="text-[13px] lg:text-[22px] font-bold text-gray-800 line-clamp-2 leading-tight mt-0.5 lg:mt-1.5">
                        {product.name}
                      </h3>
                    </div>
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
