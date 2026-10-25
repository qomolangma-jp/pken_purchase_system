import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import SubmitButton from '../components/SubmitButton';
import { useAsyncSubmit, KEEP_LOCKED } from '../hooks/useAsyncSubmit';
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

const PRESET_AMOUNTS = [500, 1000, 3000];
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 50000;
const PAYPAY_FEE_RATE = 0.05;

const CHARGE_METHODS = [
  {
    id: 'cash',
    label: '現金',
    description: '申請後、マスター管理者が確認してポイントを付与します。',
  },
  {
    id: 'bank_transfer',
    label: '銀行振込',
    description: '指定口座への振込を確認後、ポイントを付与します。',
  },
  {
    id: 'paypay',
    label: 'PayPay決済',
    description: '決済手数料（約5%）が加算されます。',
  },
];

const getResponseData = async (response, defaultMessage) => {
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    const responseText = await response.text();
    console.error('JSON でないレスポンス:', responseText.substring(0, 500));
    throw new Error('サーバーから正しい応答が得られませんでした。');
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || defaultMessage);
  }
  return data;
};

const PointCharge = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openModal } = useModal();
  const [amount, setAmount] = useState(1000);
  const [method, setMethod] = useState('cash');
  const [submittedRequest, setSubmittedRequest] = useState(null);

  const normalizedAmount = useMemo(() => {
    const parsed = Number(amount);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amount]);
  const paypayFee = Math.ceil(normalizedAmount * PAYPAY_FEE_RATE);
  const paypayTotal = normalizedAmount + paypayFee;

  const applyPresetAmount = (presetAmount) => {
    setAmount(presetAmount);
    setSubmittedRequest(null);
  };

  const handleAmountChange = (event) => {
    setAmount(event.target.value);
    setSubmittedRequest(null);
  };

  const showValidationWarning = (message) => {
    openModal({
      type: 'warning',
      title: '申請内容を確認してください',
      message,
    });
  };

  const executeChargeRequest = async () => {
    setSubmittedRequest(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('ログイン情報が見つかりませんでした。');
      }

      if (method === 'paypay') {
        const paypayBody = {
          amount: normalizedAmount,
          return_url: `${window.location.origin}/charge/paypay/return`,
        };
        // 同一内容の再送（連打・再試行）には同じキーを使う
        const idempotencyKey = getIdempotencyKey('charge:paypay', paypayBody);
        const response = await fetch(`${API_BASE_URL}/api/charge/paypay`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [IDEMPOTENCY_HEADER]: idempotencyKey,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(paypayBody),
        });
        if (shouldReleaseIdempotencyKey(response.status)) clearIdempotencyKey('charge:paypay');
        const data = await getResponseData(response, 'PayPay決済を開始できませんでした。');
        const paymentUrl = data.payment_url || data.data?.payment_url || data.redirect_url;
        if (!paymentUrl) {
          throw new Error('決済URLがサーバーから返されませんでした。');
        }

        sessionStorage.setItem('charge_paypay_session_token', token);
        window.location.assign(paymentUrl);
        return KEEP_LOCKED;
      }

      const applyBody = { amount: normalizedAmount, method };
      const applyKey = getIdempotencyKey('charge:apply', applyBody);
      const response = await fetch(`${API_BASE_URL}/api/charge/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [IDEMPOTENCY_HEADER]: applyKey,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(applyBody),
      });
      if (shouldReleaseIdempotencyKey(response.status)) clearIdempotencyKey('charge:apply');
      const data = await getResponseData(response, 'チャージ申請に失敗しました。');
      setSubmittedRequest({
        method,
        request: data.data || data,
        message: data.message,
      });
    } catch (error) {
      openModal({
        type: 'error',
        title: '申請エラー',
        message: error?.message || 'チャージ申請に失敗しました。',
      });
    }
    return undefined;
  };

  const { run: submitChargeRequest, isSubmitting } = useAsyncSubmit(executeChargeRequest);

  const handleSubmit = () => {
    if (!user) {
      showValidationWarning('ログインが必要です。');
      return;
    }

    if (!Number.isInteger(normalizedAmount) || normalizedAmount < MIN_AMOUNT) {
      showValidationWarning('申請額は100pt以上の整数で入力してください。');
      return;
    }

    if (normalizedAmount >= MAX_AMOUNT) {
      showValidationWarning('申請額は50,000pt未満で入力してください。');
      return;
    }

    const selectedMethod = CHARGE_METHODS.find((item) => item.id === method);
    const paymentSummary = method === 'paypay'
      ? `PayPay決済額: ${paypayTotal.toLocaleString()}円（手数料 ${paypayFee.toLocaleString()}円を含む）`
      : selectedMethod?.description;

    openModal({
      type: 'confirm',
      title: 'ポイントチャージ申請の確認',
      message: `${normalizedAmount.toLocaleString()}ptを${selectedMethod?.label}で申請します。\n${paymentSummary}\nよろしいですか？`,
      confirmText: method === 'paypay' ? 'PayPayへ進む' : '申請する',
      cancelText: '戻る',
      onConfirm: submitChargeRequest,
    });
  };

  const transferInstructions = submittedRequest?.request?.transfer_instructions;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-stone-900 md:text-3xl">ポイントチャージ申請</h1>
        </div>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 md:p-6">
          <fieldset>
            <legend className="text-sm font-bold text-stone-800">チャージ方法を選択</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {CHARGE_METHODS.map((chargeMethod) => (
                <label
                  key={chargeMethod.id}
                  className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                    method === chargeMethod.id
                      ? 'border-mos-green bg-green-50 ring-1 ring-mos-green'
                      : 'border-stone-300 bg-white hover:bg-stone-50'
                  }`}
                >
                  <span className="flex items-center gap-2 font-bold text-stone-800">
                    <input
                      type="radio"
                      name="chargeMethod"
                      value={chargeMethod.id}
                      checked={method === chargeMethod.id}
                      onChange={() => {
                        setMethod(chargeMethod.id);
                        setSubmittedRequest(null);
                      }}
                      className="accent-green-700"
                    />
                    {chargeMethod.label}
                  </span>
                  <span className="mt-2 block text-xs leading-relaxed text-stone-600">
                    {chargeMethod.description}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 flex flex-wrap gap-3">
            {PRESET_AMOUNTS.map((presetAmount) => (
              <button
                key={presetAmount}
                type="button"
                onClick={() => applyPresetAmount(presetAmount)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition-all ${normalizedAmount === presetAmount ? 'bg-mos-green text-white shadow-md' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
              >
                {presetAmount.toLocaleString()}pt
              </button>
            ))}
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-semibold text-stone-700" htmlFor="chargeAmount">
              チャージするポイント数
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 focus-within:border-mos-green focus-within:bg-white">
              <input
                id="chargeAmount"
                type="number"
                min={MIN_AMOUNT}
                max={MAX_AMOUNT - 1}
                step={1}
                value={amount}
                onChange={handleAmountChange}
                className="w-full bg-transparent text-lg font-bold text-stone-900 outline-none"
                placeholder="例: 1200"
              />
              <span className="text-sm font-semibold text-stone-500">pt</span>
            </div>
          </div>

          {method === 'paypay' && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p>チャージポイント: {normalizedAmount.toLocaleString()}pt</p>
              <p>決済手数料（約5%）: {paypayFee.toLocaleString()}円</p>
              <p className="mt-1 font-bold">PayPay決済額（概算）: {paypayTotal.toLocaleString()}円</p>
              <p className="mt-2 text-xs">手数料と最終決済額は決済開始時にサーバー側で再計算されます。</p>
            </div>
          )}

          {submittedRequest && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900" role="status">
              <h2 className="font-bold">
                {submittedRequest.method === 'cash' ? '現金での申請を受け付けました' : '銀行振込での申請を受け付けました'}
              </h2>
              <p className="mt-1">
                {submittedRequest.message || 'マスター管理者が入金を確認後、ポイントを付与します。'}
              </p>
              {submittedRequest.method === 'cash' && (
                <p className="mt-2">現金を管理者へお渡しください。承認されるまでポイントは反映されません。</p>
              )}
              {submittedRequest.method === 'bank_transfer' && (
                transferInstructions ? (
                  typeof transferInstructions === 'string' ? (
                    <p className="mt-2 whitespace-pre-line">{transferInstructions}</p>
                  ) : (
                    <dl className="mt-3 space-y-1">
                      {[
                        ['金融機関', transferInstructions.bank_name],
                        ['支店', transferInstructions.branch_name],
                        ['口座種別', transferInstructions.account_type],
                        ['口座番号', transferInstructions.account_number],
                        ['口座名義', transferInstructions.account_holder],
                        ['振込依頼人名・照合番号', transferInstructions.reference],
                        ['振込期限', transferInstructions.deadline],
                      ].filter(([, value]) => value).map(([label, value]) => (
                        <div key={label} className="flex flex-wrap gap-x-2">
                          <dt className="font-semibold">{label}:</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  )
                ) : (
                  <p className="mt-2 font-semibold text-amber-800">
                    振込先情報が取得できませんでした。振込前にマスター管理者へご確認ください。
                  </p>
                )
              )}
              <button
                type="button"
                onClick={() => navigate('/mypage')}
                className="mt-4 rounded-lg bg-mos-green px-4 py-2 font-bold text-white hover:bg-mos-green-dark"
              >
                マイページへ
              </button>
            </div>
          )}

          <SubmitButton
            onClick={handleSubmit}
            loading={isSubmitting}
            loadingText="送信中..."
            className="mt-6 w-full rounded-xl bg-mos-green px-4 py-3 text-base font-bold text-white transition-all hover:bg-mos-green-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {method === 'paypay' ? 'PayPayで決済する' : '申請する'}
          </SubmitButton>
        </section>
      </div>
    </div>
  );
};

export default PointCharge;
