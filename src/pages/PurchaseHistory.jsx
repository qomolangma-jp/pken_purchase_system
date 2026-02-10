import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL = 'https://komapay.p-kmt.com';

const PurchaseHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPurchaseHistory();
  }, []);

  const fetchPurchaseHistory = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('ログインしてください');
        setLoading(false);
        return;
      }

      console.log('購入履歴取得開始');
      const response = await fetch(`${API_BASE_URL}/api/orders/my/list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('購入履歴レスポンス:', response.status);

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('JSONでないレスポンス:', text.substring(0, 500));
        
        // 403エラーの場合は権限エラー
        if (response.status === 403) {
          throw new Error('アクセス権限がありません。ログインし直してください。');
        }
        
        throw new Error(`サーバーエラー (${response.status}): 購入履歴の取得に失敗しました`);
      }

      const data = await response.json();
      console.log('購入履歴データ:', data);

      if (!response.ok) {
        // サーバーからのエラーメッセージを表示
        const errorMsg = data.message || data.error || '購入履歴の取得に失敗しました';
        console.error('APIエラー:', errorMsg);
        throw new Error(errorMsg);
      }

      // APIレスポンスの構造に応じて調整
      if (data.success && Array.isArray(data.data)) {
        setOrders(data.data);
      } else if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Purchase history fetch error:', String(err));
      console.error('エラーメッセージ:', err.message || 'メッセージなし');
      setError(err.message || '購入履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex justify-center items-center">
        <div className="text-center">
          <div className="text-lg">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex justify-center items-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link to="/login" className="text-blue-600 hover:underline">
            ログインページへ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pt-20 pb-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-2xl font-bold text-stone-800 mb-6">購入履歴</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-stone-600 mb-4">購入履歴がありません</p>
            <Link to="/" className="text-blue-600 hover:underline">
              商品一覧へ戻る
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-stone-800">
                      注文番号: #{order.id}
                    </h3>
                    <p className="text-sm text-stone-600">
                      {new Date(order.created_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-stone-600">ステータス</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status === 'completed' ? '完了' :
                       order.status === 'pending' ? '処理中' :
                       order.status === 'cancelled' ? 'キャンセル' :
                       order.status}
                    </span>
                  </div>
                </div>

                {/* 注文商品一覧 */}
                {order.items && order.items.length > 0 && (
                  <div className="border-t border-stone-200 pt-4">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2">
                        <div className="flex-1">
                          <p className="font-semibold text-stone-800">{item.product_name}</p>
                          <p className="text-sm text-stone-600">数量: {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-stone-800">
                          ¥{(item.price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 合計金額 */}
                <div className="border-t border-stone-200 pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <p className="text-lg font-bold text-stone-800">合計</p>
                    <p className="text-xl font-bold text-stone-800">
                      ¥{order.total_amount ? order.total_amount.toLocaleString() : '0'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseHistory;
