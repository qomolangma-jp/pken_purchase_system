import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = 'https://komapay.p-kmt.com';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchCartCount } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [addingToCart, setAddingToCart] = useState(false);
  const [quantity, setQuantity] = useState(1);

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
        const response = await fetch(`https://komapay.p-kmt.com/api/products/${id}`, {
          method: 'GET',
          headers: headers,
        });

        if (!response.ok) {
          throw new Error('商品データの取得に失敗しました');
        }

        const data = await response.json();
        
        if (data.success && data.data) {
          setProduct(data.data);
          
          // 関連商品の取得
          fetchRelatedProducts(data.data.category);
        } else {
          setError('商品が見つかりませんでした。');
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

        const response = await fetch('https://komapay.p-kmt.com/api/products', {
          method: 'GET',
          headers: headers,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            // 同じカテゴリで、かつ現在のIDではない商品を抽出
            const related = data.data
              .filter(p => p.category === category && p.id !== parseInt(id))
              .slice(0, 4);
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
      // 一時的に認証なしでもカート操作可能にする
      const token = localStorage.getItem('authToken') || 'guest-token';
      /* 元のコード（ログイン必須にする場合は以下を有効化）
      if (!token) {
        alert('ログインしてください');
        navigate('/login');
        return;
      }
      */

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
    return <div className="min-h-screen flex justify-center items-center">読み込み中...</div>;
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center gap-4">
        <p className="text-red-500">{error || '商品が見つかりませんでした。'}</p>
        <Link to="/" className="link-text">商品一覧に戻る</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pt-24">
      {/* Main Content */}
      <main className="main-content min-h-screen pb-20">
        <div className="container">
          <div className="product-detail-container">
            <div className="detail-card bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="flex flex-col md:flex-row">
                {/* Image Section */}
                <div className="w-full md:w-2/5 bg-stone-200 flex items-center justify-center relative h-48 md:h-80">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="text-2xl text-stone-400">No Image</span>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-4 md:p-6 md:w-3/5 flex flex-col">
                  <div className="mb-4 md:mb-6">
                    <div className="flex justify-between items-start mb-2">
                      <h1 className="text-xl md:text-2xl font-bold text-stone-800">{product.name}</h1>
                      {product.popularity && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                          人気度: {product.popularity}
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-bold text-stone-600">¥{product.price ? product.price.toLocaleString() : '-'}</p>
                  </div>

                  <div className="mb-6">
                    <p className="text-stone-600 leading-relaxed">{product.description}</p>
                  </div>

                  {/* Allergens (Mock data as API might not return it yet based on message.txt) */}
                  {/* message.txtのAPIレスポンス例にはallergensが含まれていないが、
                      元のHTMLにはあったため、データがあれば表示する実装にしておく */}
                  {product.allergens && product.allergens.length > 0 && (
                    <div className="mb-6">
                      <h3 className="font-bold text-stone-700 mb-2">アレルゲン情報</h3>
                      <div className="flex flex-wrap gap-2">
                        {product.allergens.map((allergen, index) => (
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
                        className="w-10 h-10 rounded border-2 border-stone-300 flex items-center justify-center hover:bg-stone-100 transition-colors text-lg font-bold"
                      >
                        -
                      </button>
                      <span className="text-xl font-bold text-stone-800 min-w-[3rem] text-center">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-10 h-10 rounded border-2 border-stone-300 flex items-center justify-center hover:bg-stone-100 transition-colors text-lg font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <button 
                      onClick={handleAddToCart}
                      disabled={addingToCart}
                      className="w-full bg-stone-800 hover:bg-stone-700 text-white font-bold py-12 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-2xl"
                    >
                      {addingToCart ? '追加中...' : 'カートに入れる'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Related Products */}
            {relatedProducts.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-bold text-stone-800 mb-4">関連商品</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {relatedProducts.map(related => (
                    <Link to={`/product/${related.id}`} key={related.id} className="product-card block bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <div className="aspect-square bg-stone-200 flex items-center justify-center relative">
                        {related.image_url ? (
                          <img src={related.image_url} alt={related.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-stone-400 text-sm">No Image</span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-stone-800 truncate">{related.name}</h3>
                        <p className="text-stone-600 text-sm">¥{related.price.toLocaleString()}</p>
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

export default ProductDetail;
