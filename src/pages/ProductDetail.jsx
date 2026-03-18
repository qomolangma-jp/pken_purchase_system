import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const ProductDetail = () => {
  console.log('✅ ProductDetail component is rendering');
  
  const { id } = useParams();
  console.log('📝 Product ID from params:', id);
  
  const navigate = useNavigate();
  const { fetchCartCount } = useAuth();
  console.log('✅ Hooks initialized');
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);
  console.log('✅ State initialized');

  const hasDisplayValue = (value) => typeof value === 'string' && value.trim() !== '' && value.trim() !== '未入力';

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

  return (
    <div className="min-h-screen bg-stone-50 pt-6">
      {/* Main Content */}
      <main className="main-content min-h-screen pb-20">
        <div className="container">
          <div className="product-detail-container">
            <div className="detail-card bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Image Section */}
                <div className="w-full md:w-2/5 bg-stone-200 flex items-center justify-center relative h-48 md:h-80">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name} 
                      className="max-w-full max-h-full object-contain" 
                    />
                  ) : (
                    <span className="text-2xl text-stone-400">No Image</span>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-4 md:p-6 md:w-3/5 flex flex-col">
                  <div className="mb-4 md:mb-6">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-start gap-2">
                        <h1 className="text-3xl font-bold text-[#00873c]">{String(product.name)}</h1>
                        {labelText && (
                          <span className="text-xs font-bold text-white bg-mos-green px-2 py-1 rounded-full shadow-sm self-start">
                            {labelText}
                          </span>
                        )}
                      </div>

                      {product.popularity && (
                        <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                          人気度: {product.popularity}
                        </span>
                      )}
                    </div>

                    {((vendorDisplayName && vendorDisplayName !== '未入力') || (categoryDisplayName && categoryDisplayName !== '未入力')) && (
                      <div className="flex flex-wrap gap-3 text-sm text-stone-600 mb-2">
                        {vendorDisplayName && vendorDisplayName !== '未入力' && (
                          <div>
                            販売者: <span className="font-semibold text-stone-700">
                              {vendorDisplayName}
                            </span>
                          </div>
                        )}
                        {categoryDisplayName && categoryDisplayName !== '未入力' && (
                          <div>
                            カテゴリ: <span className="font-semibold text-stone-700">{categoryDisplayName}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl md:text-4xl font-black text-mos-green">¥{product.price ? product.price.toLocaleString() : '-'}</span>
                      <span className="text-xs text-stone-500">税込</span>
                    </div>
                  </div>

                  {descriptionText && (
                    <div className="mb-6">
                      <h3 className="font-bold text-stone-700 mb-2">商品説明</h3>
                      <p className="text-stone-600 leading-relaxed">{descriptionText}</p>
                    </div>
                  )}

                  {((vendorDisplayName && vendorDisplayName !== '未入力') || (categoryDisplayName && categoryDisplayName !== '未入力')) && (
                    <div className="mb-6 p-4 bg-stone-50 rounded-lg border border-stone-200">
                      <h3 className="font-bold text-stone-700 mb-2">商品情報</h3>
                      <div className="space-y-1 text-sm text-stone-700">
                        {categoryDisplayName && categoryDisplayName !== '未入力' && (
                          <p>
                            カテゴリ: <span className="font-semibold">{categoryDisplayName}</span>
                          </p>
                        )}
                        {vendorDisplayName && vendorDisplayName !== '未入力' && (
                          <p>
                            販売者: <span className="font-semibold">{vendorDisplayName}</span>
                            {product.vendor_id ? <span className="text-stone-500">（ID: {product.vendor_id}）</span> : null}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Allergens (Mock data as API might not return it yet based on message.txt) */}
                  {/* message.txtのAPIレスポンス例にはallergensが含まれていないが、
                      元のHTMLにはあったため、データがあれば表示する実装にしておく */}
                  {allergensList.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-bold text-stone-700 mb-2">アレルゲン情報</h3>
                      <div className="flex flex-wrap gap-2">
                        {allergensList.map((allergen, index) => (
                          <span key={index} className="bg-stone-100 text-stone-600 text-sm px-3 py-1 rounded-full">
                            {allergen}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Purchase Info (Mock) */}
                  {product.purchaseCountLast30Days && (
                    <div className="mb-8 p-4 bg-blue-50 text-blue-700 rounded-lg text-sm">
                      💡 過去30日で{product.purchaseCountLast30Days}回購入されました！
                    </div>
                  )}

                  {/* 数量選択 */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-stone-700 mb-2">数量</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="rounded-lg border-2 border-mos-green text-mos-green flex items-center justify-center hover:bg-green-50 transition-all duration-200 font-bold active:scale-95"
                        style={{ width: '56px', height: '56px', fontSize: '32px', lineHeight: 1 }}
                      >
                        -
                      </button>
                      <span className="text-2xl font-bold text-stone-800 min-w-[4rem] text-center">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="rounded-lg border-2 border-mos-green text-mos-green flex items-center justify-center hover:bg-green-50 transition-all duration-200 font-bold active:scale-95"
                        style={{ width: '56px', height: '56px', fontSize: '32px', lineHeight: 1 }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <button 
                      onClick={handleAddToCart}
                      disabled={addingToCart}
                      className="w-full h-24 !py-8 bg-mos-green hover:bg-mos-green-dark text-white font-bold px-4 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg flex items-center justify-center shadow-lg hover:shadow-xl active:scale-95"
                    >
                      {addingToCart ? '追加中...' : 'カートに入れる'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

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
          </div>
        </div>
      </main>
    </div>
  );
};

// Verification: Ensure ProductDetail is exported correctly
if (typeof ProductDetail !== 'function') {
  console.error('🔴 CRITICAL ERROR: ProductDetail is not a function!', typeof ProductDetail, ProductDetail);
}

export default ProductDetail;
