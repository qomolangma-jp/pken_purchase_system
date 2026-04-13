import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getFavorites, toggleFavorite } from '../utils/favorites';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const ProductDetail = () => {
  console.log('✅ ProductDetail component is rendering');
  
  const { id } = useParams();
  console.log('📝 Product ID from params:', id);
  
  const navigate = useNavigate();
  const { fetchCartCount, loading: authLoading, user } = useAuth();
  console.log('✅ Hooks initialized');
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [favorites, setFavorites] = useState([]);
  console.log('✅ State initialized');

  const hasDisplayValue = (value) => {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    return trimmed !== '' && trimmed !== '未入力' && trimmed !== '未設定';
  };

  const getVendorDisplayName = (productData) => {
    if (hasDisplayValue(productData?.vendor_name)) {
      return productData.vendor_name.trim();
    }
    return '';
  };

  const getCategoryDisplayName = (productData) => {
    if (hasDisplayValue(productData?.category_name)) {
      return productData.category_name.trim();
    }
    return '';
  };

  const getAllergensList = (allergens) => {
    if (Array.isArray(allergens)) {
      return allergens
        .filter((item) => hasDisplayValue(item))
        .map((item) => item.trim());
    }
    if (hasDisplayValue(allergens)) {
      return allergens.split(/[・,、]/).map((item) => item.trim()).filter(Boolean);
    }
    return [];
  };

  const getLabelText = (label) => {
    if (hasDisplayValue(label)) {
      return label.trim();
    }
    return '';
  };

  useEffect(() => {
    // マウント時にお気に入り情報を読み込む
    setFavorites(getFavorites());
  }, []);

  useEffect(() => {
    // ガード節: 認証が完了するまで待機（authLoading が false && user が存在するまで）
    if (authLoading || !user) {
      setLoading(false);
      return;
    }

    const fetchProductDetail = async () => {
      try {
        // 認証トークンを取得
        const token = localStorage.getItem('authToken');
        const headers = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // 商品詳細の取得
        const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
          method: 'GET',
          headers: headers,
        });

        if (!response.ok) {
          throw new Error('商品データの取得に失敗しました');
        }

        const data = await response.json();
        console.log('APIレスポンス:', data);
        console.log('data.success:', data.success);
        console.log('data.data:', data.data);
        console.log('data.dataの型:', typeof data.data);
        if (data.data) {
          console.log('data.dataのキー:', Object.keys(data.data));
        }
        
        // Safely extract product data
        let productData = null;
        
        if (data.success && data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
          // Check if data.data is actual product data (has product-like properties)
          if (data.data.id && data.data.name && !data.data.username) {
            productData = data.data;
          }
        }
        
        if (!productData) {
          console.error('❌ Invalid product data from API:', data);
          setError('サーバーから認識できない形式のデータが返されました');
          setLoading(false);
          return;
        }
        
        console.log('✅ Valid product:', { id: productData.id, name: productData.name });
        console.log('Product data (full):', JSON.stringify(productData, null, 2).substring(0, 500));
        console.log('Raw description:', JSON.stringify(productData.description));
        setProduct(productData);
        
        // 関連商品の取得
        const relatedCategoryKey = getCategoryDisplayName(productData);
        if (relatedCategoryKey) {
          fetchRelatedProducts(relatedCategoryKey);
        }
      } catch (err) {
        setError('商品データの取得に失敗しました。');
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchRelatedProducts = async (category) => {
      try {
        const token = localStorage.getItem('authToken');
        const headers = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/api/products`, {
          method: 'GET',
          headers: headers,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            // 同じカテゴリで、かつ現在のIDではない商品を抽出
            // Invalid products (e.g., user objects) should be filtered out
            const related = data.data
              .filter(p => {
                // Valid products have 'id' and 'name', but NOT 'username' or 'student_id'
                const isValid = p && p.id && p.name && !p.username && !p.student_id;
                if (p && !isValid) {
                  console.warn('⚠️ Filtered out invalid product:', p);
                }
                const categoryKey = getCategoryDisplayName(p);
                return isValid && categoryKey === category && p.id !== parseInt(id);
              })
              .slice(0, 4);
            console.log('✅ Related products filtered:', related.length);
            setRelatedProducts(related);
          }
        }
      } catch (err) {
        console.error('Related products fetch error:', err);
      }
    };

    fetchProductDetail();
    
    // 商品が変わったら数量を1にリセット
    setQuantity(1);
  }, [id]);

  // お気に入りボタンのクリックハンドラー
  const handleFavoriteClick = () => {
    toggleFavorite(parseInt(id));
    setFavorites(getFavorites()); // 状態を更新
  };

  const handleAddToCart = async () => {
    setAddingToCart(true);

    try {
      const token = localStorage.getItem('authToken');
      console.log('=== カート追加処理開始 ===');
      console.log('トークン存在:', token ? 'あり' : 'なし');
      
      if (!token) {
        console.error('トークンが見つかりません');
        alert('カートに追加するにはログインが必要です');
        navigate('/login');
        return;
      }

      const requestData = {
        product_id: parseInt(id),
        quantity: quantity,
      };

      console.log('トークン:', token ? `あり (長さ: ${token.length}, 最初の10文字: ${token.substring(0, 10)}...)` : 'なし');
      console.log('カート追加リクエスト:', requestData);
      console.log('リクエストURL:', `${API_BASE_URL}/api/cart/add`);

      const response = await fetch(`${API_BASE_URL}/api/cart/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      console.log('レスポンスステータス:', response.status);
      console.log('レスポンスヘッダー:', response.headers.get('content-type'));
      console.log('レスポンスURL:', response.url);

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('JSONでないレスポンス:', text.substring(0, 500));
        
        // 500エラーの場合はサーバー側のエラー
        if (response.status === 500) {
          throw new Error('サーバーエラーが発生しました。カートの追加に失敗しました。');
        }
        
        throw new Error(`サーバーエラー (${response.status}): APIエンドポイントが見つからないか、サーバー側でエラーが発生しています`);
      }

      const data = await response.json();
      console.log('レスポンスデータ:', data);

      if (!response.ok) {
        // 認証エラーの場合はトークンをクリアしてログインページへ
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('authToken');
          alert('認証エラーが発生しました。再度ログインしてください。');
          navigate('/login');
          return;
        }
        throw new Error(data.message || `カートへの追加に失敗しました (${response.status})`);
      }

      // カート数を更新
      await fetchCartCount();

      alert(`${product.name} を ${quantity}個 カートに追加しました！`);
      // カートページへ遷移するか確認
      if (confirm('カートを確認しますか？')) {
        navigate('/cart');
      }
      
      // 数量をリセット
      setQuantity(1);
    } catch (err) {
      console.error('Add to cart error:', String(err));
      console.error('エラーメッセージ:', err.message || 'メッセージなし');
      if (err.stack) {
        console.error('エラースタック:', err.stack);
      }
      alert(err.message || 'カートへの追加に失敗しました');
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    console.log('⏳ ProductDetail: Loading state');
    return <div className="min-h-screen flex justify-center items-center">読み込み中...</div>;
  }

  if (error || !product) {
    console.log('❌ ProductDetail: Error or no product', { error, product });
    return (
      <div className="min-h-screen flex flex-col justify-center items-center gap-4">
        <p className="text-red-500">{error || '商品が見つかりませんでした。'}</p>
        <Link to="/" className="link-text">商品一覧に戻る</Link>
      </div>
    );
  }

  console.log('✅ ProductDetail: Rendering product', { productName: product.name, productId: product.id });

  const vendorDisplayName = getVendorDisplayName(product);
  const categoryDisplayName = getCategoryDisplayName(product);
  const allergensList = getAllergensList(product.allergens);
  const labelText = getLabelText(product.label);
  const descriptionText = hasDisplayValue(product.description) ? product.description.trim() : '';
  
  // 在庫警告色の判定
  const getStockColor = () => {
    if (product.stock && product.stock <= 5) {
      return 'text-red-600';
    }
    return 'text-stone-700';
  };

 return (
    <div className="min-h-screen bg-stone-50 pt-6">
      {/* Main Content */}
      <main className="main-content pb-20 product-detail-container">
        <div className="product-detail-content">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-10 p-4 md:p-6 lg:p-8">
              {/* Image Section - 左側（PC時） */}
              <div className="w-full md:w-1/2 flex-shrink-0">
                <div className="relative bg-gradient-to-br from-stone-100 to-stone-200 rounded-lg overflow-hidden aspect-[4/3]">
                  <div className="w-full h-full flex items-center justify-center p-4">
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="w-full h-full object-contain drop-shadow-2xl" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-stone-400">
                        <svg className="w-20 h-20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm">画像なし</span>
                      </div>
                    )}
                  </div>
                  {/* お気に入りボタン（右上） */}
                  <button
                    onClick={handleFavoriteClick}
                    className="absolute top-4 right-4 z-20 w-12 h-12 flex items-center justify-center rounded-full bg-white/80 shadow-lg hover:bg-white hover:scale-110 transition-transform active:scale-95"
                    aria-label="お気に入りに追加"
                    style={{ backdropFilter: 'blur(4px)' }}
                  >
                    <Heart
                      size={24}
                      className={`transition-colors ${
                        favorites.includes(parseInt(id))
                          ? 'fill-red-500 text-red-500'
                          : 'text-gray-400'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Content Section - 右側（PC時） */}
              {/* md:flex-1 と min-w-0 で横幅を正しく計算させる */}
              <div className="w-full md:flex-1 flex flex-col justify-center min-w-0">
                {/* 店舗名とカテゴリタグ - 商品名の上 */}
                {(categoryDisplayName || vendorDisplayName) && (
                  <div className="flex flex-wrap items-center gap-4 mb-8">
                    {/* カテゴリタグ */}
                    {categoryDisplayName && (
                      <span className="bg-gradient-to-r from-amber-100 to-amber-50 text-amber-900 text-sm md:text-base font-bold px-7 py-3 rounded-full border-2 border-amber-300 shadow-md">
                        {categoryDisplayName}
                      </span>
                    )}
                    {/* 店舗名タグ - ピンアイコン付き */}
                    {vendorDisplayName && (
                      <span className="flex items-center gap-2 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-900 text-sm md:text-base font-bold px-7 py-3 rounded-full border-2 border-blue-300 shadow-md">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                        </svg>
                        {vendorDisplayName}
                      </span>
                    )}
                  </div>
                )}
                
                {/* 商品名とラベル */}
                <div className="mb-6">
                  <div className="flex flex-wrap items-center gap-4 mb-3">
                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-stone-900 leading-tight">
                      {String(product.name)}
                    </h1>
                    {labelText && (
                      <span className="text-sm md:text-base font-bold text-white bg-mos-green px-5 py-2.5 rounded-full shadow-md whitespace-nowrap">
                        {labelText}
                      </span>
                    )}
                  </div>
                </div>

                {/* 商品説明 */}
                {descriptionText && (
                  <div className="mb-8">
                    <p className="text-sm md:text-base text-stone-600 leading-relaxed bg-stone-50 p-5 rounded-xl border border-stone-200">
                      {descriptionText}
                    </p>
                  </div>
                )}

                {/* 価格表示 - 独立した区画 */}
                <div className="mb-8 px-6 py-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl border-2 border-mos-green shadow-md">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-5xl md:text-6xl font-black text-mos-green">
                      ¥{product.price ? product.price.toLocaleString() : '-'}
                    </span>
                    <span className="text-lg md:text-xl text-stone-600 font-semibold">税込</span>
                  </div>
                </div>

                {/* 在庫情報 - 数量選択の上に配置 */}
                <div className="mb-8 px-5 py-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                  <p className={`text-lg md:text-xl font-bold ${getStockColor()}`}>
                    {product.stock ? (
                      <>
                        残り <span className="text-2xl md:text-3xl">{product.stock}</span> 個
                        {product.stock <= 5 && (
                          <span className="ml-2 text-xs md:text-sm text-red-600 font-bold">（在庫わずか）</span>
                        )}
                      </>
                    ) : (
                      '在庫数は不明です'
                    )}
                  </p>
                </div>

                {/* 数量選択 */}
                <div className="mb-8">
                  <label className="block text-lg font-bold text-stone-900 mb-4">数量を選択</label>
                  <div className="flex items-center gap-4 bg-stone-50 p-5 rounded-xl">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-14 h-14 md:w-16 md:h-16 rounded-lg border-2 border-stone-300 text-stone-700 flex items-center justify-center hover:border-mos-green hover:bg-green-50 hover:text-mos-green transition-all duration-200 font-bold text-3xl active:scale-95 touch-manipulation"
                    >
                      −
                    </button>
                    <span className="text-4xl md:text-5xl font-bold text-stone-900 min-w-[5rem] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock || 999, quantity + 1))}
                      disabled={quantity >= (product.stock || 999)}
                      className="w-14 h-14 md:w-16 md:h-16 rounded-lg border-2 border-stone-300 text-stone-700 flex items-center justify-center hover:border-mos-green hover:bg-green-50 hover:text-mos-green transition-all duration-200 font-bold text-3xl active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
                    >
                      ＋
                    </button>
                  </div>
                </div>

                {/* カートに入れるボタン */}
                <div className="mb-8">
                  <button 
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className="w-full h-16 md:h-20 bg-mos-green hover:bg-[#006b30] text-white font-bold px-8 rounded-xl transition-all duration-200 disabled:opacity-50 text-lg md:text-2xl flex items-center justify-center shadow-lg active:scale-[0.98]"
                  >
                    {addingToCart ? "追加中..." : "カートに入れる"}
                  </button>
                </div>

                {/* アレルギー情報 - 改善版 */}
                {allergensList.length > 0 && (
                  <div className="pt-8 border-t-4 border-amber-300">
                    <h3 className="font-black text-amber-900 mb-4 text-lg md:text-xl flex items-center gap-2">
                      <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                      </svg>
                      アレルギー情報
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {allergensList.map((allergen, index) => (
                        <span key={index} className="bg-amber-100 text-amber-900 font-bold text-sm md:text-base px-4 py-2 rounded-lg border-2 border-amber-300 shadow-sm">
                          {allergen}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs md:text-sm text-amber-800 mt-4 italic">
                      ※ 詳しい成分確認はお店のスタッフへお問い合わせください。
                    </p>
                  </div>
                )}
              </div> {/* Content Section 閉じ */}
            </div> {/* Flex Container 閉じ */}
          </div> {/* bg-white card 閉じ */}

          {/* Related Products - TEMPORARILY DISABLED FOR DEBUGGING */}
          {false && relatedProducts.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-bold text-stone-800 mb-4">関連商品</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {relatedProducts.map(related => (
                    <Link 
                      to={`/products/${related.id}`} 
                      key={related.id} 
                      className="block bg-white rounded-2xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-95 group"
                    >
                      <div className="aspect-square bg-gradient-to-br from-stone-100 to-stone-200 relative flex items-center justify-center overflow-hidden">
                        {related.image_url ? (
                          <img 
                            src={related.image_url} 
                            alt={related.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                        ) : (
                          <span className="text-stone-400 text-sm">No Image</span>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-bold text-sm md:text-base text-stone-800 truncate mb-1">{related.name}</h3>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg md:text-xl font-black text-mos-green">¥{related.price.toLocaleString()}</span>
                          <span className="text-xs text-stone-500">税込</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
        </div> {/* product-detail-content 閉じ */}
      </main>
    </div>
  );
};

// Verification: Ensure ProductDetail is exported correctly
if (typeof ProductDetail !== 'function') {
  console.error('🔴 CRITICAL ERROR: ProductDetail is not a function!', typeof ProductDetail, ProductDetail);
}

export default ProductDetail;
