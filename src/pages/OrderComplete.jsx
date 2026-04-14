import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Check } from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const OrderComplete = () => {
  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState('');
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading, fetchCartCount } = useAuth();

  useEffect(() => {
    if (authLoading) {
      return;
    }
    
    if (!isAuthenticated || !user) {
      navigate('/login');
      return;
    }

    // URLからorder_idを取得
    const id = searchParams.get('order_id');
    if (!id) {
      setLoading(false);
      return;
    }

    setOrderId(id);
    fetchOrderDetails(id);
    
    // カート数を更新
    fetchCartCount();
  }, [authLoading, isAuthenticated, user, searchParams, navigate, fetchCartCount]);

  const fetchOrderDetails = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('サーバーから正しい応答が得られませんでした');
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (response.ok && data.data) {
        setOrderData(data.data);
      }
    } catch (err) {
      console.error('Order details fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      {/* Fixed Header */}
      <div className="fixed left-0 right-0 bg-white shadow-sm z-[90]" style={{ top: '56px', height: '48px' }}>
        <div className="container px-3 h-full flex items-center">
          <h1 className="text-base font-bold text-stone-800">注文が完了しました</h1>
        </div>
      </div>

      {/* Main Content */}
      <main className="pb-20 w-full flex flex-col items-center" style={{ paddingTop: '48px' }}>
        <div className="w-full max-w-2xl mx-auto px-3 md:px-6">
          
          {/* Success Icon and Message */}
          <div className="text-center py-8 md:py-12">
            {/* Animated Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-mos-green rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <Check size={40} className="text-white md:w-12 md:h-12" strokeWidth={3} />
              </div>
            </div>

            {/* Main Message */}
            <h2 className="text-2xl md:text-4xl font-black text-stone-900 mb-2 md:mb-3">
              ご注文ありがとうございました！
            </h2>
            <p className="text-sm md:text-base text-stone-600 mb-6 md:mb-8">
              ご注文ありがとうございます。<br />
              注文確認メールをお送りいたしました。
            </p>
          </div>

          {/* Order Details Card */}
          <div className="bg-white rounded-lg shadow-lg p-5 md:p-8 mb-6">
            <h3 className="text-lg md:text-xl font-bold text-stone-800 mb-4 pb-3 border-b-2 border-stone-200">
              注文情報
            </h3>

            {/* Order Number */}
            <div className="mb-5 p-4 bg-green-50 border-l-4 border-mos-green rounded">
              <p className="text-xs md:text-sm text-stone-600 mb-1">注文番号</p>
              <p className="text-lg md:text-2xl font-bold text-mos-green font-mono">
                {orderId}
              </p>
            </div>

            {/* Order Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="p-3 md:p-4 bg-stone-50 rounded">
                <p className="text-xs md:text-sm text-stone-600 mb-1">注文日時</p>
                <p className="text-sm md:text-base font-semibold text-stone-800">
                  {new Date().toLocaleString('ja-JP')}
                </p>
              </div>
              <div className="p-3 md:p-4 bg-stone-50 rounded">
                <p className="text-xs md:text-sm text-stone-600 mb-1">ステータス</p>
                <p className="text-sm md:text-base font-semibold text-mos-green">
                  ✓ 確認済み
                </p>
              </div>
            </div>

            {/* Order Items */}
            {orderData && orderData.items && orderData.items.length > 0 && (
              <div className="mb-5">
                <h4 className="text-base font-bold text-stone-800 mb-3">注文内容</h4>
                <div className="space-y-2">
                  {orderData.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-stone-50 rounded text-sm md:text-base">
                      <div>
                        <p className="font-medium text-stone-800">
                          {item.product?.name || item.name || '商品'}
                        </p>
                        <p className="text-xs md:text-sm text-stone-600">
                          数量: {item.quantity || 1}
                        </p>
                      </div>
                      <p className="font-bold text-mos-green">
                        ¥{((item.product?.price || item.price || 0) * (item.quantity || 1)).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="p-3 md:p-4 bg-green-50 rounded border-t-2 border-stone-200 mt-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-base md:text-lg font-bold text-stone-800">合計金額</span>
                <span className="text-2xl md:text-3xl font-black text-mos-green">
                  ¥{(orderData?.total_amount || '0').toLocaleString ? (orderData?.total_amount || '0').toLocaleString() : orderData?.total_amount || '0'}
                </span>
              </div>
            </div>
          </div>

          {/* Store Information - MOS Burger style */}
          <div className="bg-white rounded-lg shadow-md p-5 md:p-6 mb-6">
            <h4 className="text-base md:text-lg font-bold text-stone-800 mb-4">
              📍 受け取り店舗
            </h4>
            <div className="space-y-3 text-sm md:text-base">
              <div>
                <p className="text-xs text-stone-600 mb-1">店舗</p>
                <p className="font-semibold text-stone-800">MOS バーガー 渋谷店</p>
              </div>
              <div>
                <p className="text-xs text-stone-600 mb-1">住所</p>
                <p className="font-semibold text-stone-800">
                  東京都渋谷区道玄坂1-2-3
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-600 mb-1">電話番号</p>
                <p className="font-semibold text-stone-800">03-XXXX-XXXX</p>
              </div>
              <div>
                <p className="text-xs text-stone-600 mb-1">営業時間</p>
                <p className="font-semibold text-stone-800">10:00 - 23:00</p>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border-l-4 border-blue-600 rounded p-4 md:p-5 mb-6">
            <h4 className="font-bold text-stone-800 mb-2 text-sm md:text-base">次のステップ</h4>
            <ol className="text-sm md:text-base text-stone-700 space-y-1 list-decimal list-inside">
              <li>注文確認メールをご確認ください</li>
              <li>店舗に商品を受け取りに来てください</li>
              <li>商品をお受け取られたら、評価をお願いします</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 md:space-y-2">
            <Link
              to="/"
              className="block text-center bg-mos-green hover:bg-mos-green-dark text-white font-bold py-3 md:py-4 px-4 md:px-6 rounded transition-all text-base md:text-lg"
            >
              トップページに戻る
            </Link>

            <Link
              to="/purchase-history"
              className="block text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 md:py-4 px-4 md:px-6 rounded transition-all text-base md:text-lg"
            >
              注文履歴を見る
            </Link>

            <Link
              to="/"
              className="block text-center text-stone-700 hover:text-stone-900 border-2 border-stone-700 font-bold py-2.5 md:py-3 px-4 md:px-6 rounded transition-all text-base md:text-lg"
            >
              買い物を続ける
            </Link>
          </div>

          {/* Footer Note */}
          <div className="text-center text-xs md:text-sm text-stone-600 mt-8 md:mt-10 pb-4">
            <p>ご質問がある場合は、お気軽にお問い合わせください。</p>
            <p className="mt-1">平日 9:00-18:00 (土日祝休)</p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default OrderComplete;
