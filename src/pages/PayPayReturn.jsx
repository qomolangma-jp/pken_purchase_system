import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ''
).replace(/\/$/, '');

/**
 * PayPay 決済後のリダイレクト先ページ
 * PayPay からのコールバックパラメータを処理し、注文確定 or エラー表示を行う
 */
const PayPayReturn = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // 'processing' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [orderId, setOrderId] = useState(null);
  const navigate = useNavigate();
  const { fetchCartCount } = useAuth();

  useEffect(() => {
    handlePayPayReturn();
  }, []);

  const handlePayPayReturn = async () => {
    // PayPay がリダイレクト時に付与するクエリパラメータを取得
    const merchantPaymentId = searchParams.get('merchantPaymentId');
    const transactionId = searchParams.get('transactionId');
    const paymentStatus = searchParams.get('status');

    console.log('[PayPayReturn] パラメータ:', {
      merchantPaymentId,
      transactionId,
      paymentStatus,
    });

    try {
      // 1. localStorage からトークンを取得（通常のケース）
      let token = localStorage.getItem('authToken');
      
      // 2. localStorage にない場合は、sessionStorage から復元（PayPayリダイレクト後のケース）
      if (!token) {
        token = sessionStorage.getItem('paypay_session_token');
        console.log('[PayPayReturn] sessionStorage からトークンを復元');
        
        // トークンが復元できた場合は、localStorage にも復元
        if (token) {
          localStorage.setItem('authToken', token);
          console.log('[PayPayReturn] トークンを localStorage に復元');
        }
      }
      
      // 3. それでもトークンがない場合はエラー
      if (!token) {
        setStatus('error');
        setMessage('セッションが切れています。再度ログインしてください。');
        console.error('[PayPayReturn] トークンが見つかりません');
        return;
      }

      // バックエンドに決済完了を通知して注文を確定させる
      const response = await fetch(`${API_BASE_URL}/api/payments/paypay/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          merchantPaymentId: merchantPaymentId,
          transaction_id: transactionId,
          status: paymentStatus,
        }),
      });

      console.log('[PayPayReturn] 確定 API ステータス:', response.status);

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('[PayPayReturn] 非JSONレスポンス:', text.substring(0, 500));
        throw new Error('サーバーから正しい応答が得られませんでした');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '決済の確認に失敗しました');
      }

      console.log('[PayPayReturn] 注文確定:', data);

      // カート件数を更新
      await fetchCartCount();

      const confirmedOrderId = data.data?.id || data.order_id || merchantPaymentId;

      // sessionStorage のPayPay関連データをクリア
      sessionStorage.removeItem('paypay_session_token');
      sessionStorage.removeItem('paypay_redirect_timestamp');
      console.log('[PayPayReturn] セッション情報をクリア');

      // 直接注文完了ページへ遷移
      navigate(`/order-complete?order_id=${confirmedOrderId}`, { replace: true });
      return;

    } catch (err) {
      console.error('[PayPayReturn] エラー:', err);
      setStatus('error');
      setMessage(err.message || '決済処理中にエラーが発生しました');
      
      // エラー時もセッション情報をクリア
      sessionStorage.removeItem('paypay_session_token');
      sessionStorage.removeItem('paypay_redirect_timestamp');
    }
  };

  // --- 処理中 ---
  if (status === 'processing') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full mx-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <h1 className="text-lg font-bold text-stone-800 mb-2">PayPay 決済を確認中...</h1>
          <p className="text-sm text-stone-500">しばらくお待ちください</p>
        </div>
      </div>
    );
  }

  // --- 成功 ---
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-stone-800 mb-2">PayPay 決済が完了しました</h1>
          <p className="text-sm text-stone-500 mb-6">注文完了ページへ移動します...</p>
          <Link
            to={`/order-complete?order_id=${orderId}`}
            className="inline-block bg-mos-green hover:bg-mos-green-dark text-white font-bold py-2 px-6 rounded transition-all text-sm"
          >
            注文完了ページへ
          </Link>
        </div>
      </div>
    );
  }

  // --- エラー ---
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-md p-8 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-stone-800 mb-2">決済の確認に失敗しました</h1>
        <p className="text-sm text-red-500 mb-6">{message}</p>
        <div className="space-y-2">
          <Link
            to="/checkout"
            className="block bg-mos-green hover:bg-mos-green-dark text-white font-bold py-2 px-6 rounded transition-all text-sm"
          >
            注文画面に戻る
          </Link>
          <Link
            to="/"
            className="block text-stone-600 hover:text-stone-800 text-sm py-1"
          >
            トップページへ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PayPayReturn;
