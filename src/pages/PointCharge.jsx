import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  ''
).replace(/\/$/, '');

const PRESET_AMOUNTS = [500, 1000, 3000];
const MIN_AMOUNT = 100;
const MAX_AMOUNT = 50000;

const PointCharge = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openModal } = useModal();
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-stone-900 md:text-3xl">ポイントチャージ申請</h1>
        </div>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 md:p-6">
          <div className="mt-4 flex flex-wrap gap-3">
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
              任意のポイント数を入力
            </label>
            <div className="flex items-center gap-3 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 focus-within:border-mos-green focus-within:bg-white">
              <input
                id="chargeAmount"
                type="number"
                min={0}
                step={1}
                value={amount}
                onChange={handleAmountChange}
                className="w-full bg-transparent text-lg font-bold text-stone-900 outline-none"
                placeholder="例: 1200"
              />
              <span className="text-sm font-semibold text-stone-500">pt</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="mt-6 w-full rounded-xl bg-mos-green px-4 py-3 text-base font-bold text-white transition-all hover:bg-mos-green-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? '送信中...' : '申請する'}
          </button>
        </section>
            title: '申請エラー',
            message: error?.message || 'チャージ申請に失敗しました。',
          });
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-green-50">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 md:py-10">
        <div className="mb-6">
          <p className="text-sm font-semibold text-mos-green">ポイント管理</p>
          <h1 className="mt-1 text-2xl font-black text-stone-900 md:text-3xl">ポイントチャージ申請</h1>
          <p className="mt-2 text-sm text-stone-600">
            申請額を選択して、校内現金受付窓口または申請フローを利用してください。
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 md:p-6">
            <h2 className="text-lg font-bold text-stone-800">チャージ金額を選ぶ</h2>

            <div className="mt-4 flex flex-wrap gap-3">
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
                任意のポイント数を入力
              </label>
              <div className="flex items-center gap-3 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2 focus-within:border-mos-green focus-within:bg-white">
                <input
                  id="chargeAmount"
                  type="number"
                  min={0}
                  step={1}
                  value={amount}
                  onChange={handleAmountChange}
                  className="w-full bg-transparent text-lg font-bold text-stone-900 outline-none"
                  placeholder="例: 1200"
                />
                <span className="text-sm font-semibold text-stone-500">pt</span>
              </div>
              <p className="mt-2 text-xs text-stone-500">100pt以上、50,000pt未満で申請できます。</p>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="mt-6 w-full rounded-xl bg-mos-green px-4 py-3 text-base font-bold text-white transition-all hover:bg-mos-green-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? '送信中...' : '申請する'}
            </button>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
              <p className="text-sm font-bold text-orange-800">承認待ちの確認</p>
              <p className="mt-2 text-sm text-orange-700">
                申請後は、処理状況がマイページで確認できる想定です。
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 md:p-5">
              <h2 className="text-lg font-bold text-stone-800">校内現金受付窓口</h2>
              <div className="mt-4 space-y-3 text-sm text-stone-700">
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="font-semibold text-stone-800">場所</p>
                  <p>1階 購買部</p>
                </div>
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="font-semibold text-stone-800">時間</p>
                  <p>平日 12:00〜13:00</p>
                </div>
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="font-semibold text-stone-800">担当</p>
                  <p>購買スタッフ</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default PointCharge;
