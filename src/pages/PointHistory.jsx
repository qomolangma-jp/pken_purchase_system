import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ''
).replace(/\/$/, '');

const FILTERS = [
  { id: 'all', label: 'すべて' },
  { id: 'grant', label: '付与' },
  { id: 'use', label: '利用' },
];

const TYPE_LABELS = {
  charge: 'チャージ',
  grant: 'ポイント付与',
  refund: '返金',
  purchase: '商品購入',
  use: 'ポイント利用',
  order: '商品購入',
  adjustment: '調整',
};

const METHOD_LABELS = {
  cash: '現金',
  bank_transfer: '銀行振込',
  paypay: 'PayPay',
};

const STATUS_LABELS = {
  pending: '承認待ち',
  rejected: '却下',
  cancelled: 'キャンセル',
  canceled: 'キャンセル',
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// 金額の符号が無い場合は種別から付与・利用を判定する
const normalizeEntry = (entry, index) => {
  const rawAmount = toNumber(entry.amount ?? entry.points ?? entry.point ?? entry.delta);
  const type = String(entry.type ?? entry.kind ?? entry.transaction_type ?? '').toLowerCase();
  const direction = String(entry.direction ?? '').toLowerCase();
  const usageTypes = ['use', 'purchase', 'order', 'payment', 'spend'];

  let isGrant;
  if (direction === 'in' || direction === 'grant') {
    isGrant = true;
  } else if (direction === 'out' || direction === 'use') {
    isGrant = false;
  } else if (rawAmount !== null && rawAmount < 0) {
    isGrant = false;
  } else if (usageTypes.includes(type)) {
    isGrant = false;
  } else {
    isGrant = true;
  }

  return {
    id: entry.id ?? `${entry.created_at ?? 'entry'}-${index}`,
    isGrant,
    amount: rawAmount === null ? 0 : Math.abs(rawAmount),
    balanceAfter: toNumber(entry.balance_after ?? entry.balance),
    label: entry.title || entry.description || TYPE_LABELS[type] || (isGrant ? 'ポイント付与' : 'ポイント利用'),
    method: METHOD_LABELS[String(entry.method ?? '').toLowerCase()] || '',
    status: STATUS_LABELS[String(entry.status ?? '').toLowerCase()] || '',
    createdAt: entry.created_at ?? entry.createdAt ?? entry.date ?? null,
  };
};

const extractEntries = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.history)) return data.history;
  return [];
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const PointHistory = () => {
  const { loading: authLoading, user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('ポイント履歴を表示するにはログインが必要です。');
      }

      const response = await fetch(`${API_BASE_URL}/api/points/history`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        console.error('JSONでないレスポンス:', text.substring(0, 500));
        throw new Error(`サーバーエラー (${response.status}): ポイント履歴の取得に失敗しました。`);
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'ポイント履歴の取得に失敗しました。');
      }

      setEntries(extractEntries(data).map(normalizeEntry));
    } catch (err) {
      console.error('Point history fetch error:', err);
      setError(err?.message || 'ポイント履歴の取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchHistory();
  }, [authLoading, user, fetchHistory]);

  const filteredEntries = useMemo(() => {
    if (filter === 'grant') return entries.filter((entry) => entry.isGrant);
    if (filter === 'use') return entries.filter((entry) => !entry.isGrant);
    return entries;
  }, [entries, filter]);

  const points = Number(user?.points ?? 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:py-10">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-200 md:p-8">
          <p className="text-sm font-semibold text-mos-green">マイページ</p>
          <h1 className="mt-1 text-2xl font-black text-stone-900 md:text-3xl">ポイント履歴</h1>

          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm text-stone-500">現在の保有ポイント</p>
              <p className="mt-1 text-3xl font-black text-mos-green">
                {points.toLocaleString()}
                <span className="ml-1 text-base font-bold text-stone-700">pt</span>
              </p>
            </div>
            <Link
              to="/charge"
              className="rounded-xl bg-mos-green px-4 py-2 text-sm font-bold text-white transition-all hover:bg-mos-green-dark"
            >
              チャージする
            </Link>
          </div>

          <div className="mt-6 flex gap-2" role="tablist" aria-label="履歴の絞り込み">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition-all ${
                  filter === item.id
                    ? 'bg-mos-green text-white shadow-sm'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {loading && <p className="py-10 text-center text-sm text-stone-500">読み込み中...</p>}

            {!loading && error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={fetchHistory}
                  className="mt-2 font-bold underline"
                >
                  再読み込み
                </button>
              </div>
            )}

            {!loading && !error && filteredEntries.length === 0 && (
              <p className="py-10 text-center text-sm text-stone-500">履歴はありません</p>
            )}

            {!loading && !error && filteredEntries.length > 0 && (
              <ul className="divide-y divide-stone-200">
                {filteredEntries.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-stone-800">{entry.label}</p>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {formatDateTime(entry.createdAt)}
                        {entry.method && ` ・ ${entry.method}`}
                      </p>
                      {entry.status && (
                        <span className="mt-1 inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-800">
                          {entry.status}
                        </span>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-lg font-black ${entry.isGrant ? 'text-mos-green' : 'text-red-600'}`}>
                        {entry.isGrant ? '+' : '-'}{entry.amount.toLocaleString()} pt
                      </p>
                      {entry.balanceAfter !== null && (
                        <p className="text-xs text-stone-500">残高 {entry.balanceAfter.toLocaleString()} pt</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PointHistory;
