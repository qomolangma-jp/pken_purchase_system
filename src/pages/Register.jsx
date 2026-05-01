import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Link as LinkIcon, User, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { getLineProfile } from '../services/lineAuth';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const Register = () => {
  const [name2nd, setName2nd] = useState('');
  const [name1st, setName1st] = useState('');
  const [studentId, setStudentId] = useState('');
  const [lineId, setLineId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, liff, liffInitialized, user } = useAuth();
  const { openModal } = useModal();

  // すでにログイン済みの場合はトップページへリダイレクト
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    // LIFFからLINE IDを取得
    const getLineId = async () => {
      if (liffInitialized && liff.isLoggedIn()) {
        try {
          const profile = await getLineProfile();
          setLineId(profile.userId);
          console.log('LINE ID取得:', profile.userId);
        } catch (err) {
          console.error('LINE IDの取得に失敗しました:', err);
          setError('LINE IDの取得に失敗しました');
        }
      }
    };

    getLineId();
  }, [liff, liffInitialized]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const requestData = {
        name_2nd: name2nd,
        name_1st: name1st,
        student_id: studentId,
        line_id: lineId,
      };

      console.log('=== 登録リクエスト送信 ===');
      console.log('URL:', `${API_BASE_URL}/api/auth/register`);
      console.log('送信データ:', requestData);

      let response;
      try {
        response = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });
      } catch (fetchError) {
        console.error('❌ ネットワークエラー:', fetchError);
        throw new Error(`通信エラー: バックエンドに接続できません。\n\n原因:\n- バックエンドサーバーがダウンしている\n- CORS設定が正しくない\n- ネットワーク接続の問題\n\nバックエンド管理者に確認してください。`);
      }

      console.log('レスポンスステータス:', response.status);
      console.log('レスポンスOK:', response.ok);

      // Content-Typeをチェック
      const contentType = response.headers.get('content-type');
      console.log('Content-Type:', contentType);

      let data;
      const responseText = await response.text();

      if (contentType && contentType.includes('application/json')) {
        try {
          data = responseText ? JSON.parse(responseText) : {};
          console.log('レスポンスデータ:', data);
        } catch {
          console.error('JSON parse error response (最初の1000文字):', responseText.substring(0, 1000));
          throw new Error(`バックエンド応答の解析に失敗しました (Status ${response.status})`);
        }
      } else {
        // JSONでない場合（HTMLなど）
        console.error('Non-JSON response (最初の1000文字):', responseText.substring(0, 1000));

        // HTMLからエラーメッセージを抽出を試みる
        const titleMatch = responseText.match(/<title>(.*?)<\/title>/i);
        const h1Match = responseText.match(/<h1[^>]*>(.*?)<\/h1>/i);
        const errorInfo = titleMatch ? titleMatch[1] : (h1Match ? h1Match[1] : 'サーバーエラー');

        throw new Error(`バックエンドエラー (Status ${response.status}): ${errorInfo}\n\nバックエンド側のログを確認してください。`);
      }

      if (!response.ok) {
        console.error('登録エラーレスポンス:', data);
        const errorMessage = data.message || data.error || '登録に失敗しました';
        throw new Error(errorMessage);
      }

      console.log('✅ 登録成功！');
      console.log('ユーザーデータ:', data.user);

      // 認証コンテキストにログイン
      await login(data.user);

      // 登録成功時、トークンがあれば保存
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        console.log('トークン保存完了');
      }

      openModal({
        type: 'success',
        title: '登録完了',
        message: '登録が完了しました！自動的にログインします。',
        onConfirm: () => navigate('/')
      });
      console.log('トップページへリダイレクト');
    } catch (err) {
      console.error('Registration error:', err);
      console.error('エラー詳細:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      setError(err.message || '登録中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 pt-12 pb-8 flex flex-col items-center justify-center">
      <main className="w-full max-w-md px-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
          <h1 className="text-xl font-bold text-center mb-6 text-stone-800">アカウント新規登録</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-xl mb-4 text-xs">
              {error}
            </div>
          )}

          <form id="registerForm" className="space-y-4" onSubmit={handleSubmit}>
            {/* 姓・名 2カラム */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-600 ml-1" htmlFor="name_2nd">姓</label>
                <input
                  id="name_2nd"
                  type="text"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all placeholder:text-stone-400 text-sm"
                  placeholder="山田"
                  required
                  value={name2nd}
                  onChange={(e) => setName2nd(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-600 ml-1" htmlFor="name_1st">名</label>
                <input
                  id="name_1st"
                  type="text"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all placeholder:text-stone-400 text-sm"
                  placeholder="太郎"
                  required
                  value={name1st}
                  onChange={(e) => setName1st(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 ml-1" htmlFor="student_id">学籍番号</label>
              <input
                id="student_id"
                type="text"
                inputMode="text"
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all placeholder:text-stone-400 text-sm"
                placeholder="例：S12345678"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>

            {/* LINE ID (Readonly) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-600 ml-1 flex items-center gap-1" htmlFor="line_id">
                LINE ID
                <span className="text-[10px] font-normal text-stone-400">(自動取得済み)</span>
              </label>
              <div className="relative">
                <input
                  id="line_id"
                  type="text"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-stone-500 outline-none text-sm cursor-not-allowed"
                  placeholder="LIFFから自動取得中..."
                  readOnly
                  required
                  value={lineId}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                  <LinkIcon size={16} />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full mt-2 bg-stone-900 hover:bg-stone-800 text-white font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? '登録中...' : '登録する'}
            </button>
          </form>

          <div className="mt-8 pt-5 border-t border-stone-100 text-center flex flex-col gap-3">
            <div className="px-2">
              <Link to="/login" className="inline-block w-full py-3 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-all text-sm">
                すでにアカウントをお持ちの方はこちら
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Register;
