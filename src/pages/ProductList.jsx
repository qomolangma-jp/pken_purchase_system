import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, ArrowUpDown, Star } from 'lucide-react';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortType, setSortType] = useState('popularity');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const headers = { 'Content-Type': 'application/json' };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/products`, { headers });

        if (!response.ok) {
          throw new Error('商品データの取得に失敗しました');
        }

        const data = await response.json();
        let productsData = [];

        if (data.success && Array.isArray(data.data)) {
          productsData = data.data;
        } else if (Array.isArray(data)) {
          productsData = data;
        } else {
          console.error('Unexpected API response format:', data);
          throw new Error('予期しないデータ形式です。');
        }

        const validProducts = productsData
          .filter(item => item.id && item.name && !item.username && !item.student_id)
          .map(item => ({
            ...item,
            sales: item.sales || Math.floor(Math.random() * 200),
            rating: item.rating || (Math.random() * 2 + 3).toFixed(1),
            category_name: item.category_name?.trim() || '',
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

  const filteredAndSortedProducts = useMemo(() => {
    return products
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        switch (sortType) {
          case 'price_asc':  return a.price - b.price;
          case 'price_desc': return b.price - a.price;
          case 'rating':     return b.rating - a.rating;
          case 'popularity':
          default:           return b.sales - a.sales;
        }
      });
  }, [products, searchTerm, sortType]);

  const sortOptions = [
    { key: 'popularity',  label: '売れ筋' },
    { key: 'price_asc',   label: '価格の安い順' },
    { key: 'price_desc',  label: '価格の高い順' },
    { key: 'rating',      label: '評価の高い順' },
  ];

  if (loading) {
    return <div className="flex justify-center items-center h-screen">読み込み中...</div>;
  }

  if (error) {
    return <div className="text-center mt-20 text-red-500">{error}</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 pt-20 pb-8">

        {/* 検索バー */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="商品を検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow"
          />
        </div>

        {/* 並び替えチップ */}
        <div className="mb-6">
          <p className="text-sm font-bold text-gray-600 mb-2 flex items-center gap-1">
            <ArrowUpDown size={16} />
            並び替え
          </p>
          <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 no-scrollbar">
            {sortOptions.map(option => (
              <button
                key={option.key}
                onClick={() => setSortType(option.key)}
                style={{ minHeight: '44px' }}
                className={[
                  'whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold',
                  'transition-all duration-200 shadow-sm border flex-shrink-0',
                  sortType === option.key
                    ? 'bg-green-600 text-white border-transparent'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300',
                ].join(' ')}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* 商品グリッド */}
        <div className="grid grid-cols-2 gap-3">
          {filteredAndSortedProducts.length === 0 ? (
            <p className="col-span-2 text-center text-gray-500 py-16">該当する商品が見つかりませんでした。</p>
          ) : (
            filteredAndSortedProducts.map(product => (
              <Link
                to={`/products/${product.id}`}
                key={product.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="relative">
                  <img
                    src={product.image_url || 'https://placehold.jp/300x300.png?text=No+Image'}
                    alt={product.name}
                    className="w-full h-36 object-cover"
                    loading="lazy"
                  />
                  {product.label && (
                    <span className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-md leading-5">
                      {product.label}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-bold text-sm text-gray-800 truncate-2-lines leading-snug mb-1">
                    {product.name}
                  </h3>
                  <p className="text-base font-extrabold text-orange-500 leading-tight">
                    ¥{Number(product.price).toLocaleString()}
                    <span className="text-xs text-gray-400 font-normal ml-1">税込</span>
                  </p>
                  <div className="mt-1.5 text-xs text-gray-400 space-y-0.5">
                    {product.vendor_name && (
                      <p className="truncate">{product.vendor_name}</p>
                    )}
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
                      <span>{product.rating}</span>
                      <span>({product.sales}+件)</span>
                    </div>
                  </div>
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