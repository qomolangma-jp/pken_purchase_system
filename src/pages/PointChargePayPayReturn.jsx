import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  IDEMPOTENCY_HEADER,
  getIdempotencyKey,
  clearIdempotencyKey,
  shouldReleaseIdempotencyKey,
} from '../utils/api';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ''
).replace(/\/$/, '');

const PointChargePayPayReturn = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('');
  const [creditedPoints, setCreditedPoints] = useState(null);
  const requestStarted = useRef(false);
  const { setPoints, refreshPoints } = useAuth();

  useEffect(() => {
    if (requestStarted.current) return;
    requestStarted.current = true;

    const confirmCharge = async () => {
      try {
        const token = localStorage.getItem('authToken')
          || sessionStorage.getItem('charge_paypay_session_token');
        if (!token) {
          throw new Error('ログイン情報が見つかりません。再度ログインしてください。');
        }
        if (!localStorage.getItem('authToken')) {
          localStorage.setItem('authToken', token);
        }

        const confirmation = {
          merchantPaymentId: searchParams.get('merchantPaymentId'),
        };
        const transactionId = searchParams.get('transactionId');
        const paymentStatus = searchParams.get('status');
        if (transactionId) confirmation.transaction_id = transactionId;
        if (paymentStatus) confirmation.status = paymentStatus;

        if (!confirmation.merchantPaymentId) {
          throw new Error('決済IDが戻りURLに含まれていません。マスター管理者へお問い合わせください。');
        }

        const confirmScope = `charge-confirm:${confirmation.merchantPaymentId}`;
        const confirmKey = getIdempotencyKey(confirmScope, confirmation);
        const response = await fetch(`${API_BASE_URL}/api/charge/paypay/confirm`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            [IDEMPOTENCY_HEADER]: confirmKey,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(confirmation),
        });
        const contentType = response.headers.get('content-type');
        if (shouldReleaseIdempotencyKey(response.status)) clearIdempotencyKey(confirmScope);
        if (!contentType?.includes('application/json')) {
          const responseText = await response.text();
          console.error('JSON でないレスポンス:', responseText.substring(0, 500));
          throw new Error('サーバーから正しい応答が得られませんでした。');
        }

        const data = await response.json();
        if (response.status === 409) {
          await refreshPoints();
          setMessage(data.message || 'この決済は既に処理済みです。');
          setStatus('success');
          return;
        }
        if (!response.ok) {
          throw new Error(data.message || 'PayPay決済の確認に失敗しました。');
        }

        const result = data.data || data;
        const balance = Number(
          data.points_balance
          ?? result.balance
          ?? result.current_points
          ?? result.user?.points
        );
        const chargedAmount = Number(result.amount ?? result.credited_points);
        if (Number.isFinite(balance) && balance >= 0) {
          setPoints(balance);
        } else {
          await refreshPoints();
        }
        setCreditedPoints(
          Number.isFinite(chargedAmount) && chargedAmount >= 0
            ? chargedAmount
            : null
        );
        setMessage(data.message || 'PayPay決済が確認され、ポイントが付与されました。');
        setStatus('success');
      } catch (error) {
        console.error('[PointChargePayPayReturn] 決済確認エラー:', error);
        setMessage(error?.message || '決済の確認に失敗しました。');
        setStatus('error');
      } finally {
        sessionStorage.removeItem('charge_paypay_session_token');
      }
    };

    confirmCharge();
  }, [searchParams, setPoints, refreshPoints]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-gray-100 px-4 py-10">
      <section className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-md">
        {status === 'processing' && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-red-500" />
            <h1 className="mb-2 text-lg font-bold text-stone-800">PayPay決済を確認中...</h1>
            <p className="text-sm text-stone-500">そのまましばらくお待ちください。</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">
              ✓
            </div>
            <h1 className="mb-2 text-xl font-bold text-stone-800">ポイントチャージ完了</h1>
            <p className="mb-2 text-sm text-stone-600">{message}</p>
            {creditedPoints !== null && (
              <p className="mb-6 font-bold text-mos-green">{Number(creditedPoints).toLocaleString()}pt</p>
            )}
            <Link
              to="/point-history"
              className="inline-block rounded bg-mos-green px-6 py-2 font-bold text-white transition-all hover:bg-mos-green-dark"
            >
              ポイント履歴へ
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-600">
              ×
            </div>
            <h1 className="mb-2 text-xl font-bold text-stone-800">決済を確認できませんでした</h1>
            <p className="mb-6 text-sm text-red-600">{message}</p>
            <div className="flex flex-col gap-2">
              <Link
                to="/charge"
                className="rounded bg-mos-green px-6 py-2 font-bold text-white transition-all hover:bg-mos-green-dark"
              >
                チャージ画面に戻る
              </Link>
              <Link to="/point-history" className="py-2 text-sm text-stone-600 hover:text-stone-800">
                ポイント履歴へ
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default PointChargePayPayReturn;
