import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'https://komapay.p-kmt.com';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [addingToCart, setAddingToCart] = useState(false);

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
  }, [id]);

  const handleAddToCart = async () => {
    setAddingToCart(true);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('ログインしてください');
        navigate('/login');
        return;
      }

      const requestData = {
        product_id: parseInt(id),
        quantity: 1,
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

      alert(`${product.name}をカートに追加しました！`);
      // カートページへ遷移するか確認
      if (confirm('カートを確認しますか？')) {
        navigate('/cart');
      }
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
    <div className="min-h-screen bg-stone-50 pt-20">
      {/* Main Content */}
      <main className="main-content min-h-screen pb-20">\n        <div className="container">\n          <div className="product-detail-container">\n            <div className="detail-card bg-white rounded-lg shadow-sm overflow-hidden">\n              <div className="md:flex">\n                {/* Image Section */}\n                <div className="md:w-1/2 bg-stone-200 aspect-square md:aspect-auto flex items-center justify-center relative">\n                  {product.image_url ? (\n                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />\n                  ) : (\n                    <span className="text-2xl text-stone-400">No Image</span>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-6 md:w-1/2 flex flex-col">
                  <div className="mb-6">
                    <div className="flex justify-between items-start mb-2">
                      <h1 className="text-2xl font-bold text-stone-800">{product.name}</h1>
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
