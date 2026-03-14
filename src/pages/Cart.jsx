import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { fetchCartCount } = useAuth();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('カートを表示するにはログインが必要です');
        setLoading(false);
        return;
      }

      console.log('カート取得開始');
      console.log('トークン:', token ? `あり (長さ: ${token.length})` : 'なし');

      const response = await fetch(`${API_BASE_URL}/api/cart`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('カートレスポンス:', response.status);
      console.log('レスポンスヘッダー:', response.headers.get('content-type'));

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('JSONでないレスポンス:', text.substring(0, 500));
        throw new Error('サーバーから正しい応答が得られませんでした');
      }

      const data = await response.json();
      console.log('カートデータ:', data);

      if (!response.ok) {
        // 認証エラーの場合はトークンをクリアしてログインページへ
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('authToken');
          setError('認証エラーが発生しました。再度ログインしてください。');
          setLoading(false);
          return;
        }
        throw new Error(data.message || 'カート情報の取得に失敗しました');
      }

      // APIレスポンスの構造: { success: true, data: { items: [...], total: 1000, count: 5 } }
      if (data.success && data.data && Array.isArray(data.data.items)) {
        console.log('カートアイテム数:', data.data.items.length);
        console.log('合計金額:', data.data.total);
        setCartItems(data.data.items);
      } else if (Array.isArray(data)) {
        console.log('カートアイテム数:', data.length);
        setCartItems(data);
      } else {
        console.warn('カートデータが期待する構造ではありません:', data);
        setCartItems([]);
      }
      
      // グローバルなカート数を更新
      await fetchCartCount();
    } catch (err) {
      console.error('Cart fetch error:', String(err));
      console.error('エラーメッセージ:', err.message || 'メッセージなし');
      setError(err.message || 'カート情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 0) return;

    try {
      // 数量が0の場合は削除（確認なし）
      if (newQuantity === 0) {
        await removeItem(itemId, false);
        return;
      }

      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const response = await fetch(`${API_BASE_URL}/api/cart/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '数量の更新に失敗しました');
      }

      // カートを再取得
      await fetchCart();
    } catch (err) {
      console.error('Update quantity error:', err);
      alert(err.message || '数量の更新に失敗しました');
    }
  };

  const removeItem = async (itemId, showConfirm = true) => {
    if (showConfirm && !confirm('この商品をカートから削除しますか？')) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const response = await fetch(`${API_BASE_URL}/api/cart/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '削除に失敗しました');
      }

      // カートを再取得
      await fetchCart();
    } catch (err) {
      console.error('Remove item error:', err);
      alert(err.message || '削除に失敗しました');
    }
  };

  const clearCart = async () => {
    if (!confirm('カートを空にしますか？')) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const response = await fetch(`${API_BASE_URL}/api/cart`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'カートのクリアに失敗しました');
      }

      setCartItems([]);
      
      // グローバルなカート数を更新
      await fetchCartCount();
    } catch (err) {
      console.error('Clear cart error:', err);
      alert(err.message || 'カートのクリアに失敗しました');
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => {
      const price = item.price || item.product?.price || 0;
      const quantity = item.quantity || 1;
      return total + (price * quantity);
    }, 0);
  };

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed Header */}
      <div className="fixed left-0 right-0 bg-white shadow-sm z-[90] h-12" style={{ top: '3.5rem', backgroundColor: '#ffffff' }}>
        <div className="container px-3 h-full flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-stone-700 text-xl font-light">←</button>
          <h1 className="text-base font-bold text-stone-800">カート</h1>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded transition-colors text-xs"
            onClick={() => alert('購入機能はまだ実装されていません')}
          >
            お会計へ進む
          </button>
        </div>
      </div>

      {/* Main Content */}
  <main className="pb-20" style={{ paddingTop: '3rem' }}>
        {error && (
          <div className="bg-red-50 border-l-4 border-red-600 text-red-700 px-3 py-2 m-2 mt-2 rounded text-xs">
            <p className="font-semibold">⚠️ エラー</p>
            <p className="text-xs">{error}</p>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="text-center py-8 px-3">
            <p className="text-stone-600 mb-3 text-sm font-semibold">カートに商品がありません</p>
            <Link to="/" className="inline-block bg-mos-green hover:bg-mos-green-dark text-white font-bold py-2 px-4 rounded text-sm transition-all">
              商品を見る
            </Link>
          </div>
        ) : (
          <div className="px-2">
            {/* Tap to expand notice */}
            <div className="text-center text-xs text-blue-600 font-bold mb-2 py-0.5 bg-blue-50 rounded">
              <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs inline-block">タップ</span>
            </div>

            {/* Cart Summary Line */}
            <div className="bg-white rounded px-2 py-1.5 mb-2 text-xs">
              <p className="text-stone-700 font-semibold">
                小計（アイテム）: <span className="text-mos-green font-bold text-sm">¥{getTotalPrice().toLocaleString()}</span>
              </p>
            </div>

            {/* Cart Items */}
            <div className="space-y-2">
              {cartItems.map((item, index) => {
                const product = item.product || item;
                const productName = product.name || 'Unknown Product';
                const productPrice = product.price || 0;
                const productImage = product.image_url || '';
                const quantity = item.quantity || 1;

                return (
                  <React.Fragment key={item.id}>
                    <div className="bg-white rounded-lg shadow-sm p-2">
                      {/* Top Row: Image + Product Info + Price */}
                      <div className="flex gap-2 items-start">
                        {/* Product Image - Thumbnail (70px max) */}
                        <Link to={`/product/${product.id}`} className="w-[70px] h-[70px] bg-gray-200 rounded flex-shrink-0 flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity" style={{ maxWidth: '70px', maxHeight: '70px' }}>
                          {productImage ? (
                            <img src={productImage} alt={productName} className="w-full h-full object-contain" style={{ width: '70px', height: 'auto' }} />
                          ) : (
                            <span className="text-xs text-stone-400">No Image</span>
                          )}
                        </Link>

                        {/* Product Info and Controls - Center Section */}
                        <div className="flex-1 min-w-0">
                          <Link to={`/product/${product.id}`} className="font-bold text-xs text-stone-800 hover:text-mos-green line-clamp-2 block mb-0.5">
                            {productName}
                          </Link>
                          <p className="text-xs text-stone-600 mb-1 line-clamp-1">
                            {product.description || ''}
                          </p>
                          
                          {/* Quantity Controls - Ultra Compact */}
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-stone-600">数量:</span>
                            <div className="flex items-center gap-0.5 bg-stone-100 rounded">
                              <button
                                onClick={() => updateQuantity(item.id, quantity - 1)}
                                className="w-5 h-5 text-xs font-bold text-mos-green flex items-center justify-center hover:bg-green-200 transition-colors"
                              >
                                −
                              </button>
                              <span className="w-4 text-center text-xs font-semibold">{quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, quantity + 1)}
                                className="w-5 h-5 text-xs font-bold text-mos-green flex items-center justify-center hover:bg-green-200 transition-colors"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-red-600 hover:text-red-700 text-lg leading-none ml-1"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Price - Right Side */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <p className="text-sm font-bold text-mos-green whitespace-nowrap">
                            ¥{productPrice.toLocaleString()}
                          </p>
                          <p className="text-xs text-stone-600 whitespace-nowrap">
                            × {quantity}
                          </p>
                        </div>
                      </div>

                      {/* Subtotal Line */}
                      <div className="mt-2 text-right border-t border-stone-100 pt-1.5">
                        <p className="text-xs text-mos-green font-bold">
                          計: ¥{(productPrice * quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {index < cartItems.length - 1 && (
                      <div className="border-t border-stone-300 my-1" aria-hidden="true" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Bottom Summary Card */}
            <div className="bg-white rounded-lg shadow-md p-2.5 mt-3 sticky bottom-0">
              <div className="text-center mb-2 pb-2 border-b border-stone-200">
                <p className="text-xs text-stone-600 mb-0.5">合計</p>
                <p className="text-2xl font-black text-mos-green">
                  ¥{getTotalPrice().toLocaleString()}
                </p>
              </div>

              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded text-xs transition-all mb-1.5"
                onClick={() => alert('購入機能はまだ実装されていません')}
              >
                お会計へ進む
              </button>

              <Link to="/" className="block text-center text-mos-green hover:text-mos-green-dark font-semibold py-2 px-3 border border-mos-green rounded transition-all text-xs">
                買い物を続ける
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;
