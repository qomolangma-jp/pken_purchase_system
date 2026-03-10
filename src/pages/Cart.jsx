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
    <div className="min-h-screen bg-stone-50 pt-24">
      {/* Main Content */}
      <main className="main-content min-h-screen pb-20">
        <div className="container py-2 md:py-10">
          <div className="flex justify-between items-center mb-2 md:mb-6">
            <h1 className="page-title text-lg md:text-2xl">ショッピングカート</h1>
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-600 hover:text-red-700"
              >
                カートを空にする
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1 rounded mb-2 text-xs">
              {error}
            </div>
          )}

          {cartItems.length === 0 ? (
            <div className="text-center py-4 md:py-16">
              <p className="text-stone-600 mb-2 text-xs md:text-base">カートに商品がありません</p>
              <Link to="/" className="link-text link-text-bold text-xs md:text-base">商品を見る</Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-1.5 md:gap-4">
              {/* Cart Items */}
              <div className="md:col-span-1 space-y-1 md:space-y-3">
                {cartItems.map((item) => {
                  // APIレスポンスの構造に応じて商品情報を取得
                  const product = item.product || item;
                  const productName = product.name || 'Unknown Product';
                  const productPrice = product.price || 0;
                  const productImage = product.image_url || '';
                  const quantity = item.quantity || 1;

                  return (
                    <div key={item.id} className="bg-white rounded-lg shadow-sm p-1">
                      <div className="flex gap-1">
                        {/* Product Image */}
                        <Link to={`/product/${product.id}`} className="w-8 md:w-12 bg-stone-200 rounded flex-shrink-0 flex items-center justify-center overflow-hidden aspect-square">
                          {productImage ? (
                            <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-stone-400">No Image</span>
                          )}
                        </Link>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0 flex md:flex-col justify-between md:justify-between text-xs">
                          {/* Left section: name and quantity */}
                          <div className="flex-1 min-w-0">
                            <Link to={`/product/${product.id}`} className="font-bold text-xs md:text-sm text-stone-800 hover:text-stone-600 block truncate">
                              {productName}
                            </Link>
                            <p className="text-stone-600 text-xs mt-0.5">¥{productPrice.toLocaleString()}</p>
                          </div>

                          {/* Right section: quantity and actions */}
                          <div className="flex flex-col items-end justify-between gap-0.5">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => updateQuantity(item.id, quantity - 1)}
                                className="w-4 h-4 md:w-6 md:h-6 rounded border border-mos-green text-mos-green flex items-center justify-center hover:bg-green-50 text-xs transition-all duration-200 active:scale-95"
                              >
                                -
                              </button>
                              <span className="w-4 md:w-6 text-center text-xs">{quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, quantity + 1)}
                                className="w-4 h-4 md:w-6 md:h-6 rounded border border-mos-green text-mos-green flex items-center justify-center hover:bg-green-50 text-xs transition-all duration-200 active:scale-95"
                              >
                                +
                              </button>
                            </div>

                            {/* Remove Button and Price */}
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-red-600 hover:text-red-700 flex-shrink-0"
                                aria-label="削除"
                              >
                                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                              <p className="font-bold text-xs md:text-sm text-stone-800">
                                ¥{(productPrice * quantity).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="md:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-2 md:p-6 md:sticky md:top-4">
                  <h2 className="font-bold text-base md:text-lg mb-2 md:mb-4">注文サマリー</h2>
                  
                  <div className="space-y-1.5 mb-2 md:mb-4">
                    <div className="flex justify-between text-xs md:text-base">
                      <span className="text-stone-600">小計</span>
                      <span>¥{getTotalPrice().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs md:text-base">
                      <span className="text-stone-600">配送料</span>
                      <span>¥0</span>
                    </div>
                  </div>

                  <div className="border-t pt-2 md:pt-4 mb-3 md:mb-6">
                    <div className="flex justify-between font-bold text-sm md:text-lg">
                      <span>合計</span>
                      <span>¥{getTotalPrice().toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    className="w-full h-10 md:h-24 bg-mos-green hover:bg-mos-green-dark text-white font-bold px-4 rounded-2xl transition-all duration-200 text-xs md:text-base flex items-center justify-center shadow-lg hover:shadow-xl active:scale-95"
                    onClick={() => alert('購入機能はまだ実装されていません')}
                  >
                    購入手続きへ
                  </button>

                  <Link to="/" className="block text-center text-mos-green hover:text-mos-green-dark font-semibold mt-1.5 md:mt-4 text-xs md:text-base h-10 md:h-24 flex items-center justify-center border-2 border-mos-green rounded-2xl transition-all duration-200 hover:bg-green-50 active:scale-95">
                    買い物を続ける
                  </Link>
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
