import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MyPage = () => {
  const { user } = useAuth();
  const points = Number(user?.points ?? 0);
  const pendingPoints = Number(user?.pending_points ?? 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 md:py-10">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-stone-200 md:p-8">
          <p className="text-sm font-semibold text-mos-green">マイページ</p>
          <h1 className="mt-1 text-2xl font-black text-stone-900 md:text-3xl">保有ポイント</h1>

          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm text-stone-500">現在の保有ポイント</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-4xl font-black text-mos-green md:text-5xl">{points.toLocaleString()}</span>
                <span className="pb-1 text-lg font-bold text-stone-700">pt</span>
              </div>
            </div>

            <Link
              to="/charge"
              className="inline-flex items-center justify-center rounded-xl bg-mos-green px-5 py-3 text-sm font-bold text-white transition-all hover:bg-mos-green-dark"
            >
              ポイントをチャージする
            </Link>
          </div>

          {pendingPoints > 0 && (
            <div className="mt-5 inline-flex rounded-full bg-orange-100 px-4 py-2 text-sm font-bold text-orange-800">
              承認待ち（{pendingPoints.toLocaleString()}pt）
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPage;
