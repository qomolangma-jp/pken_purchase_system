import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);

  useEffect(() => {
    const fetchProductDetail = async () => {
      try {
        // 商品詳細の取得
        // API仕様書によると GET /api/products/{id} がある
        const response = await fetch(`https://komapay.p-kmt.com/api/products/${id}`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        
        if (data.success && data.data) {
          setProduct(data.data);
          
          // 関連商品の取得（同じカテゴリの商品を取得するために一覧APIを叩く必要があるかもしれないが、
          // ここでは簡易的に一覧APIから同じカテゴリのものをフィルタリングするロジックを想定）
          // 実際のAPI仕様に「関連商品」のエンドポイントがないため、一覧から取得してフィルタリングする
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
        const response = await fetch('https://komapay.p-kmt.com/api/products');
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

  const handleAddToCart = () => {
    // カート機能はまだAPI連携していないため、アラートのみ
    alert(`${product.name}をカートに追加しました（デモ）`);
    // TODO: POST /api/cart/add の実装
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
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="logo">Mobile Order</Link>
          <div className="header-actions">
            <Link to="/cart" className="cart-button">
              <svg className="w-6 h-6" style={{ width: '24px', height: '24px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content min-h-screen pb-20">
        <div className="container">
          <div className="product-detail-container">
            <div className="detail-card bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="md:flex">
                {/* Image Section */}
                <div className="md:w-1/2 bg-stone-200 aspect-square md:aspect-auto flex items-center justify-center relative">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl text-stone-400">No Image</span>
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
                      className="w-full bg-stone-800 hover:bg-stone-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                      カートに入れる
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
