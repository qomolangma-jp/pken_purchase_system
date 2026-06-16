import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Check } from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const normalizeOrder = (rawOrder) => {
  if (!rawOrder) return null;
  const base = rawOrder.data ?? rawOrder.order ?? rawOrder;
  const items = base.items ?? base.order_items ?? base.order_details ?? base.details ?? [];
  return {
    ...base,
    items,
  };
};

const extractOrdersArray = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (payload.data && Array.isArray(payload.data)) return payload.data;
  if (payload.data && payload.data.data && Array.isArray(payload.data.data)) return payload.data.data;
  if (payload.success && payload.data && Array.isArray(payload.data.data)) return payload.data.data;
  return [];
};

const OrderComplete = () => {
  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState('');
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const normalizeOrder = (rawOrder) => {
    if (!rawOrder) return null;
    const base = rawOrder.data || rawOrder.order || rawOrder;
    const items = base.items || base.order_items || base.order_details || base.details || [];
    return {
      ...base,
      items,
    };
  };

  const fetchOrderDetails = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('ログイン情報が見つかりませんでした。再度ログインしてください。');
        setLoading(false);
        return;
      }

      const persistedOrderJson = sessionStorage.getItem('paypay_order_data');
      if (persistedOrderJson) {
        sessionStorage.removeItem('paypay_order_data');
        try {
          const persistedOrder = JSON.parse(persistedOrderJson);
          const normalizedPersisted = normalizeOrder(persistedOrder);
          if (normalizedPersisted) {
            setOrderData(normalizedPersisted);
            setLoading(false);
            return;
          }
        } catch (parseErr) {
          console.warn('Persisted order JSON parse error', parseErr);
        }
      }

      const response = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const contentType = response.headers.get('content-type');
      const text = await response.text();
      let data;

      if (contentType && contentType.includes('application/json')) {
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.warn('Order complete response JSON parse error', parseError, text);
        }
      } else {
        console.warn('サーバーから正しい応答が得られませんでした', text);
      }

      if (response.ok && data) {
        const normalized = normalizeOrder(data);
        if (normalized) {
          setOrderData(normalized);
          return;
        }
      }

      console.warn('Order detail fetch failed, fallback to list', response.status, text);

      const listResponse = await fetch(`${API_BASE_URL}/api/orders/my/list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const listContentType = listResponse.headers.get('content-type');
      if (!listContentType || !listContentType.includes('application/json')) {
        const listText = await listResponse.text();
        console.error('Order list response is not JSON:', listText);
        throw new Error('注文データの取得に失敗しました');
      }

      const listData = await listResponse.json();
      const orders = extractOrdersArray(listData);
      const matchedOrder = orders.find((order) => String(order.id) === String(id) || String(order.order_id) === String(id));

      if (matchedOrder) {
        setOrderData(normalizeOrder(matchedOrder));
        return;
      }

      throw new Error('注文データが見つかりませんでした');
    } catch (err) {
      console.error('Order details fetch error:', err);
      setError(err.message || '注文データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalAmount = () => {
    if (!orderData) {
      return 0;
    }

    const rawTotal = orderData.total_price ?? orderData.total_amount ?? orderData.amount ?? orderData.total;
    const parsedTotal = Number(rawTotal);
    if (!Number.isNaN(parsedTotal) && parsedTotal >= 0) {
      return parsedTotal;
    }

    if (!orderData.items?.length) {
      return 0;
    }

    return orderData.items.reduce((sum, item) => {
      const unitPrice = Number(item.price ?? item.unit_price ?? item.product?.price ?? 0) || 0;
      const quantity = Number(item.quantity ?? item.qty ?? 1) || 1;
      return sum + unitPrice * quantity;
    }, 0);
  };

  const totalAmount = calculateTotalAmount();

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

            {error && (
              <div className="mb-5 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                <p className="text-sm font-semibold text-red-700">注文データの取得に問題がありました</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            )}

            {/* Order Status */}
            <div className="mb-5">
              <div className="p-3 md:p-4 bg-stone-50 rounded">
                <p className="text-xs md:text-sm text-stone-600 mb-1">注文日時</p>
                <p className="text-base md:text-lg font-semibold text-stone-800">
                  {new Date().toLocaleString('ja-JP')}
                </p>
              </div>
            </div>

            {/* Order Items */}
            {orderData && orderData.items && orderData.items.length > 0 && (
              <div className="mb-5">
                <h4 className="text-base font-bold text-stone-800 mb-3">注文内容</h4>
                <div className="space-y-2">
                  {orderData.items.map((item, index) => {
                    const product = item.product || {};
                    const basePrice = Number(item.price || item.unit_price || product.price || 0) || 0;
                    const quantity = Number(item.quantity || 1) || 1;
                    
                    // サイズ情報の取得 (size, selected_size, size_label)
                    const currentSize = item.size || item.selected_size || item.size_label;
                    
                    return (
                      <div key={index} className="flex justify-between items-center p-2 bg-stone-50 rounded text-sm md:text-base">
                        <div>
                          <p className="font-medium text-stone-800">
                            {product.name || item.name || '商品'}
                          </p>
                          {currentSize && (
                            <p className="text-[10px] md:text-xs text-mos-green font-bold">
                              サイズ: {currentSize}
                            </p>
                          )}
                          <p className="text-xs md:text-sm text-stone-600">
                            数量: {quantity}
                          </p>
                        </div>
                        <p className="font-bold text-mos-green">
                          ¥{(basePrice * quantity).toLocaleString()}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="p-3 md:p-4 bg-green-50 rounded border-t-2 border-stone-200 mt-4 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-base md:text-lg font-bold text-stone-800">合計金額</span>
                <span className="text-2xl md:text-3xl font-black text-mos-green">
                  ¥{totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
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

        </div>
      </main>
    </div>
  );
};

export default OrderComplete;
