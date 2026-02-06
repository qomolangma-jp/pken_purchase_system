import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'https://komapay.p-kmt.com';

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('ログインしてください');
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
    } catch (err) {
      console.error('Cart fetch error:', String(err));
      console.error('エラーメッセージ:', err.message || 'メッセージなし');
      setError(err.message || 'カート情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    try {
      const token = localStorage.getItem('authToken');
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
      fetchCart();
    } catch (err) {
      console.error('Update quantity error:', err);
      alert(err.message || '数量の更新に失敗しました');
    }
  };

  const removeItem = async (itemId) => {
    if (!confirm('この商品をカートから削除しますか？')) return;

    try {
      const token = localStorage.getItem('authToken');
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
      fetchCart();
    } catch (err) {
      console.error('Remove item error:', err);
      alert(err.message || '削除に失敗しました');
    }
  };

  const clearCart = async () => {
    if (!confirm('カートを空にしますか？')) return;

    try {
      const token = localStorage.getItem('authToken');
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
    <div className="min-h-screen bg-stone-50 pt-20">
      {/* Main Content */}
      <main className="main-content min-h-screen pb-20">
        <div className="container py-10">
          <div className="flex justify-between items-center mb-6">
            <h1 className="page-title">ショッピングカート</h1>
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-sm text-red-600 hover:text-red-700"
              >
                カートを空にする
              </button>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {cartItems.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-stone-600 mb-4">カートに商品がありません</p>
              <Link to="/" className="link-text link-text-bold">商品を見る</Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Cart Items */}
              <div className="md:col-span-2 space-y-4">
                {cartItems.map((item) => {
                  // APIレスポンスの構造に応じて商品情報を取得
                  const product = item.product || item;
                  const productName = product.name || 'Unknown Product';
                  const productPrice = product.price || 0;
                  const productImage = product.image_url || '';
                  const quantity = item.quantity || 1;

                  return (
                    <div key={item.id} className="bg-white rounded-lg shadow-sm p-4">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <Link to={`/product/${product.id}`} className="w-24 h-24 bg-stone-200 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {productImage ? (
                            <img src={productImage} alt={productName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-stone-400">No Image</span>
                          )}
                        </Link>

                        {/* Product Info */}
                        <div className="flex-1">
                          <Link to={`/product/${product.id}`} className="font-bold text-stone-800 hover:text-stone-600">
                            {productName}
                          </Link>
                          <p className="text-stone-600 mt-1">¥{productPrice.toLocaleString()}</p>

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2 mt-3">
                            <button
                              onClick={() => updateQuantity(item.id, quantity - 1)}
                              className="w-8 h-8 rounded border border-stone-300 flex items-center justify-center hover:bg-stone-100"
                              disabled={quantity <= 1}
                            >
                              -
                            </button>
                            <span className="w-12 text-center">{quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, quantity + 1)}
                              className="w-8 h-8 rounded border border-stone-300 flex items-center justify-center hover:bg-stone-100"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <div className="flex flex-col justify-between items-end">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <p className="font-bold text-stone-800">
                            ¥{(productPrice * quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="md:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
                  <h2 className="font-bold text-lg mb-4">注文サマリー</h2>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-stone-600">小計</span>
                      <span>¥{getTotalPrice().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">配送料</span>
                      <span>¥0</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between font-bold text-lg">
                      <span>合計</span>
                      <span>¥{getTotalPrice().toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    className="w-full bg-stone-800 hover:bg-stone-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    onClick={() => alert('購入機能はまだ実装されていません')}
                  >
                    購入手続きへ
                  </button>

                  <Link to="/" className="block text-center link-text mt-4">
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
