import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('すべて');
  const categoryBarRef = useRef(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/products`, { headers });
        if (!response.ok) throw new Error('商品データの取得に失敗しました');

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
          .map(item => ({
            ...item,
            category_name: item.category_name?.trim() || 'その他',
            vendor_name: item.vendor_name?.trim() || '',
            label: item.label?.trim() || '',
          }));

        setProducts(validProducts);
      } catch (err) {
        setError(err.message);
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

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

        <div ref={categoryBarRef} className="flex overflow-x-auto no-scrollbar flex-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex-shrink-0 px-4 text-sm transition-colors"
              style={{
                height: '46px',
                fontWeight: activeCategory === cat ? '700' : '400',
                color: activeCategory === cat ? '#00873c' : '#444',
                borderBottom: activeCategory === cat ? '3px solid #00873c' : '3px solid transparent',
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
        <div className="grid grid-cols-2" style={{ gap: '6px' }}>
          {displayedProducts.length === 0 ? (
            <p className="col-span-2 text-center py-16 text-sm text-gray-400">
              該当する商品が見つかりませんでした。
            </p>
          ) : (
            displayedProducts.map(product => (
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
                {/* 商品画像（正方形） */}
                <div
                  className="relative w-full"
                  style={{ aspectRatio: '1 / 1', backgroundColor: '#f0ebe3' }}
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xs text-gray-400">No Image</span>
                    </div>
                  )}
                  {/* ラベルバッジ（画像左下） */}
                  {product.label && (
                    <span
                      className="absolute bottom-1.5 left-1.5 text-white font-bold"
                      style={{
                        backgroundColor: '#e50012',
                        fontSize: '10px',
                        lineHeight: '1.4',
                        padding: '1px 5px',
                      }}
                    >
                      {product.label}
                    </span>
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
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductList;
