import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = 'https://komapay.p-kmt.com';

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
      // 一時的に認証なしでもカート取得可能にする
      const token = localStorage.getItem('authToken') || 'guest-token';
      /* 元のコード（ログイン必須にする場合は以下を有効化）
      if (!token) {
        setError('ログインしてください');
        setLoading(false);
        return;
      }
      */

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

      const token = localStorage.getItem('authToken') || 'guest-token';
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
      const token = localStorage.getItem('authToken') || 'guest-token';
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
      const token = localStorage.getItem('authToken') || 'guest-token';
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
    <div className="min-h-screen bg-gray-50 pt-14">
      {/* Header with Action Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <button className="text-stone-700 text-2xl">←</button>
          <h1 className="text-lg font-bold text-stone-800">カート</h1>
          <div className="w-6"></div>
        </div>
      </div>

      {/* Main Content */}
      <main className="main-content pb-20">
        <div className="container px-0 md:px-4">
          {/* Sticky Top Action Button */}
          {cartItems.length > 0 && (
            <div className="sticky top-14 bg-white shadow-md p-3 md:p-4 z-40">
              <button
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-stone-800 font-bold py-3 px-4 rounded-lg transition-all duration-200 text-base md:text-lg flex items-center justify-center gap-2 active:scale-95 shadow-md"
                onClick={() => alert('お会計機能はまだ実装されていません')}
              >
                <span>💳</span>
                <span>お会計へ進む</span>
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-600 text-red-700 px-4 py-3 m-3 rounded-lg">
              <p className="font-semibold">⚠️ エラー</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {cartItems.length === 0 ? (
            <div className="text-center py-12 md:py-20 px-4">
              <div className="text-6xl md:text-7xl mb-4">🛒</div>
              <p className="text-stone-600 mb-4 text-base md:text-lg font-semibold">カートに商品がありません</p>
              <p className="text-stone-500 mb-6 text-sm md:text-base">商品を探してカートに追加しましょう</p>
              <Link to="/" className="inline-block bg-mos-green hover:bg-mos-green-dark text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:scale-105">
                商品を見る
              </Link>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3 p-3 md:p-4">
              {/* Campaign Banner */}
              <div className="bg-yellow-100 border-b-4 border-yellow-400 p-3 rounded-lg md:rounded-xl">
                <p className="text-sm md:text-base font-semibold text-yellow-800">
                  📢 キャンペーン情報はこちら
                </p>
              </div>

              {/* Cart Items */}
              {cartItems.map((item) => {
                const product = item.product || item;
                const productName = product.name || 'Unknown Product';
                const productPrice = product.price || 0;
                const productImage = product.image_url || '';
                const quantity = item.quantity || 1;

                return (
                  <div key={item.id} className="bg-white rounded-lg md:rounded-xl shadow-sm hover:shadow-md transition-shadow border border-stone-200 overflow-hidden">
                    {/* Item Header */}
                    <div className="p-3 md:p-4 border-b border-stone-100">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-bold text-sm md:text-base text-stone-800 line-clamp-2">
                            {productName}
                          </h3>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="ml-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded p-1 transition-colors flex-shrink-0"
                          aria-label="削除"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Item Content */}
                    <div className="p-3 md:p-4">
                      <div className="flex gap-3">
                        {/* Product Image */}
                        <Link to={`/product/${product.id}`} className="w-20 h-20 md:w-28 md:h-28 bg-gradient-to-br from-stone-100 to-stone-200 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity">
                          {productImage ? (
                            <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-stone-400">No Image</span>
                          )}
                        </Link>

                        {/* Product Details */}
                        <div className="flex-1 flex flex-col justify-between">
                          {/* Price and Quantity */}
                          <div>
                            <p className="text-stone-600 text-xs md:text-sm mb-1">¥{productPrice.toLocaleString()}</p>
                            <div className="inline-block text-xs md:text-sm px-2 py-1 bg-green-50 text-mos-green border border-mos-green rounded">
                              数量: {quantity}
                            </div>
                          </div>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-1 bg-stone-50 rounded-lg p-1 w-fit">
                            <button
                              onClick={() => updateQuantity(item.id, quantity - 1)}
                              className="w-6 h-6 md:w-8 md:h-8 rounded border border-mos-green text-mos-green flex items-center justify-center hover:bg-green-100 text-base font-semibold transition-all active:scale-95"
                            >
                              −
                            </button>
                            <span className="w-4 md:w-6 text-center text-xs md:text-sm font-semibold">{quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, quantity + 1)}
                              className="w-6 h-6 md:w-8 md:h-8 rounded border border-mos-green text-mos-green flex items-center justify-center hover:bg-green-100 text-base font-semibold transition-all active:scale-95"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Subtotal */}
                        <div className="text-right flex flex-col justify-between">
                          <p className="text-xs text-stone-500">小計</p>
                          <p className="text-xl md:text-2xl font-bold text-mos-green">
                            ¥{(productPrice * quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-3">
                        <button
                          className="w-full bg-yellow-400 hover:bg-yellow-500 text-stone-800 font-bold py-2 px-3 rounded-lg transition-all duration-200 text-sm md:text-base active:scale-95"
                          onClick={() => alert('セット機能はまだ実装されていません')}
                        >
                          セットにする
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Order Summary at Bottom */}
              <div className="bg-white rounded-lg md:rounded-xl shadow-md p-4 md:p-6 mt-4 border border-stone-200 sticky bottom-20 md:bottom-0">
                <div className="border-b border-stone-200 pb-3 mb-3">
                  <div className="flex justify-between mb-2">
                    <span className="text-stone-600 text-sm">小計（アイテム）</span>
                    <span className="font-semibold">¥{getTotalPrice().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-600 text-sm">配送料</span>
                    <span className="font-semibold text-green-600">無料</span>
                  </div>
                </div>

                <div className="text-center py-2 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-stone-600 mb-1">合計金額</p>
                  <p className="text-3xl md:text-4xl font-black text-mos-green">
                    ¥{getTotalPrice().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Cart;
