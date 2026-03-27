import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const Checkout = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, fetchCartCount } = useAuth();

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }
    fetchCart();
  }, [authLoading, isAuthenticated, user]);

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('カートを表示するにはログインが必要です');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/cart`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('カート取得 - API URL:', API_BASE_URL + '/api/cart');
      console.log('カート取得 - ステータス:', response.status);

      const contentType = response.headers.get('content-type');
      console.log('カート取得 - Content-Type:', contentType);

      if (!response.ok) {
        const responseText = await response.text();
        console.error('カート取得エラーレスポンス:', responseText.substring(0, 500));
        throw new Error(`API エラー (${response.status}): カート情報の取得に失敗しました`);
      }

      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('JSON でないレスポンス:', responseText.substring(0, 500));
        throw new Error(`無効なレスポンス形式です。サーバーが JSON を返していません。`);
      }

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('authToken');
          setError('認証エラーが発生しました。再度ログインしてください。');
          setLoading(false);
          return;
        }
        throw new Error(data.message || 'カート情報の取得に失敗しました');
      }

      if (data.success && data.data && Array.isArray(data.data.items)) {
        setCartItems(data.data.items);
      } else if (Array.isArray(data)) {
        setCartItems(data);
      } else {
        setCartItems([]);
      }
    } catch (err) {
      console.error('Cart fetch error:', err);
      setError(err.message || 'カート情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => {
      const price = item.price || item.product?.price || 0;
      const quantity = item.quantity || 1;
      return total + (price * quantity);
    }, 0);
  };

  const handleConfirmOrder = async () => {
    if (cartItems.length === 0) {
      alert('カートに商品がありません');
      return;
    }

    setIsProcessing(true);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        alert('ログインが必要です');
        navigate('/login');
        return;
      }

      // 注文データを構築（バックエンド仕様に準拠）
      // items: product_id と quantity のみ
      // 合計金額はサーバー側で計算
      const orderData = {
        items: cartItems.map(item => ({
          product_id: item.product?.id || item.id,
          quantity: item.quantity || 1,
        })),
      };

      console.log('注文データを送信:', orderData);

      // APIに注文を送信
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      console.log('注文送信 - API URL:', API_BASE_URL + '/api/orders');
      console.log('注文送信 - ステータス:', response.status);

      const contentType = response.headers.get('content-type');
      console.log('注文送信 - Content-Type:', contentType);

      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('JSON でないレスポンス:', responseText.substring(0, 500));
        throw new Error('サーバーから正しい応答が得られませんでした');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '注文処理に失敗しました');
      }

      console.log('注文完了:', data);

      // 注文成功後、カートをクリア
      try {
        const clearToken = localStorage.getItem('authToken');
        if (clearToken) {
          await fetch(`${API_BASE_URL}/api/cart`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${clearToken}`,
            },
          });
          // カート数を更新
          await fetchCartCount();
        }
      } catch (clearErr) {
        console.warn('カート削除エラー（処理は継続）:', clearErr);
      }

      // 注文完了画面へ遷移（注文番号をパラメータで渡す）
      const orderId = data.data?.id || data.order_id || Math.random().toString(36).substr(2, 9);
      navigate(`/order-complete?order_id=${orderId}`);

    } catch (err) {
      console.error('Order processing error:', err);
      setError(err.message || '注文処理に失敗しました');
      alert(err.message || '注文処理に失敗しました。もう一度お試しください。');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center">読み込み中...</div>;
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="fixed left-0 right-0 bg-white shadow-sm z-[90]" style={{ top: '56px', height: '48px' }}>
          <div className="container px-3 h-full flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="text-stone-700 text-xl font-light">←</button>
            <h1 className="text-base font-bold text-stone-800">注文確認</h1>
          </div>
        </div>

        <main className="w-full flex flex-col items-center" style={{ paddingTop: '48px' }}>
          <div className="w-full max-w-4xl px-2 md:px-4 lg:px-6">
            <div className="text-center py-8 px-3 mt-4">
              <p className="text-stone-600 mb-3 text-sm font-semibold">カートに商品がありません</p>
              <Link to="/" className="inline-block bg-mos-green hover:bg-mos-green-dark text-white font-bold py-2 px-4 rounded text-sm transition-all">
                商品を見る
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="fixed left-0 right-0 bg-white shadow-sm z-[90]" style={{ top: '56px', height: '48px' }}>
        <div className="container px-3 h-full flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-stone-700 text-xl font-light">←</button>
          <h1 className="text-base font-bold text-stone-800">注文確認</h1>
        </div>
      </div>

      {/* Main Content */}
      <main className="pb-20 w-full flex flex-col items-center" style={{ paddingTop: '48px' }}>
        {error && (
          <div className="w-full max-w-4xl px-2 md:px-4 lg:px-6">
            <div className="bg-red-50 border-l-4 border-red-600 text-red-700 px-3 py-2 m-2 mt-2 rounded text-xs">
              <p className="font-semibold">⚠️ エラー</p>
              <p className="text-xs">{error}</p>
            </div>
          </div>
        )}

        <div className="w-full max-w-6xl mx-auto px-2 md:px-4 lg:px-6">
          {/* 2カラムレイアウト: PC版、モバイル版は縦 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            
            {/* 左カラム: 商品リスト (lg:col-span-2) */}
            <div className="lg:col-span-2 space-y-3">
              <h2 className="text-lg md:text-xl font-bold text-stone-800 mb-3">注文内容</h2>
              
              {/* 商品アイテム */}
              <div className="space-y-2">
                {cartItems.map((item, index) => {
                  const product = item.product || item;
                  const productName = product.name || 'Unknown Product';
                  const productPrice = product.price || 0;
                  const productImage = product.image_url || '';
                  const quantity = item.quantity || 1;

                  return (
                    <div key={item.id} className="bg-white rounded-lg shadow-sm p-3 md:p-4">
                      <div className="flex gap-3 md:gap-4 items-start">
                        {/* Product Image */}
                        <div className="w-[60px] h-[60px] md:w-24 md:h-24 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {productImage ? (
                            <img src={productImage} alt={productName} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-xs text-stone-400">No Image</span>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-xs md:text-base text-stone-800 line-clamp-2 mb-1">
                            {productName}
                          </h3>
                          <p className="text-xs md:text-sm text-stone-600 mb-2 line-clamp-1">
                            {product.description || ''}
                          </p>
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-xs text-stone-500">数量: {quantity}</p>
                            </div>
                            <p className="text-sm md:text-base font-bold text-mos-green">
                              ¥{productPrice.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Subtotal */}
                        <div className="flex flex-col items-end flex-shrink-0">
                          <p className="text-xs md:text-sm text-stone-600">小計</p>
                          <p className="text-sm md:text-lg font-bold text-mos-green">
                            ¥{(productPrice * quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 右カラム: 注文サマリー・支払い方法 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-4 md:p-5 sticky top-24">
                
                {/* 注文サマリー */}
                <div className="mb-6 pb-4 border-b border-stone-200">
                  <h3 className="text-base font-bold text-stone-800 mb-3">注文サマリー</h3>
                  
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-stone-600">小計</span>
                      <span className="font-semibold">¥{getTotalPrice().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">送料</span>
                      <span className="font-semibold">¥0</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-base md:text-lg border-t pt-3">
                    <span className="font-bold text-stone-800">合計</span>
                    <span className="font-bold text-mos-green text-lg md:text-2xl">
                      ¥{getTotalPrice().toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* 支払い方法 */}
                <div className="mb-6 pb-4 border-b border-stone-200">
                  <h3 className="text-base font-bold text-stone-800 mb-3">支払い方法</h3>
                  
                  <div className="space-y-2">
                    <label className="flex items-center p-2 border border-stone-300 rounded cursor-pointer hover:bg-stone-50 transition-colors" style={{ borderColor: paymentMethod === 'credit_card' ? '#16A34A' : 'inherit', backgroundColor: paymentMethod === 'credit_card' ? '#F0FDF4' : 'inherit' }}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="credit_card"
                        checked={paymentMethod === 'credit_card'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="ml-2 text-sm font-medium text-stone-700">クレジットカード</span>
                    </label>

                    <label className="flex items-center p-2 border border-stone-300 rounded cursor-pointer hover:bg-stone-50 transition-colors" style={{ borderColor: paymentMethod === 'bank_transfer' ? '#16A34A' : 'inherit', backgroundColor: paymentMethod === 'bank_transfer' ? '#F0FDF4' : 'inherit' }}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="bank_transfer"
                        checked={paymentMethod === 'bank_transfer'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="ml-2 text-sm font-medium text-stone-700">銀行振込</span>
                    </label>

                    <label className="flex items-center p-2 border border-stone-300 rounded cursor-pointer hover:bg-stone-50 transition-colors" style={{ borderColor: paymentMethod === 'convenience_store' ? '#16A34A' : 'inherit', backgroundColor: paymentMethod === 'convenience_store' ? '#F0FDF4' : 'inherit' }}>
                      <input
                        type="radio"
                        name="payment_method"
                        value="convenience_store"
                        checked={paymentMethod === 'convenience_store'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-4 h-4"
                      />
                      <span className="ml-2 text-sm font-medium text-stone-700">コンビニ支払い</span>
                    </label>
                  </div>
                </div>

                {/* 注文確定ボタン */}
                <button
                  onClick={handleConfirmOrder}
                  disabled={isProcessing || cartItems.length === 0}
                  className="w-full bg-mos-green hover:bg-mos-green-dark text-white font-bold py-3 px-4 rounded transition-all text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? '処理中...' : '注文を確定する'}
                </button>

                <Link
                  to="/cart"
                  className="block text-center text-stone-700 hover:text-stone-900 font-semibold py-2.5 px-3 border border-stone-300 rounded transition-all text-sm mt-2"
                >
                  カートに戻る
                </Link>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
