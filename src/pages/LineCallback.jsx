import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://komapay.p-kmt.com';

const LineCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, fetchCartCount } = useAuth();
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const savedState = sessionStorage.getItem('line_login_state');

      // CSRF対策: stateの検証
      if (!state || state !== savedState) {
        throw new Error('不正なリクエストです');
      }

      if (!code) {
        throw new Error('認証コードが取得できませんでした');
      }

      // バックエンドに認証コードを送信してユーザー情報を取得
      const response = await fetch(`${API_BASE_URL}/api/auth/line-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          redirect_uri: import.meta.env.VITE_LINE_LOGIN_CALLBACK_URL,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'ログインに失敗しました');
      }

      // トークンを保存
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      // ユーザー情報をコンテキストに保存
      await login(data.user);

      // カート数を取得
      await fetchCartCount();

      // セッションストレージをクリア
      sessionStorage.removeItem('line_login_state');

      // トップページへリダイレクト
      navigate('/', { replace: true });
    } catch (err) {
      console.error('LINE Login callback error:', err);
      setError(err.message || 'ログイン処理中にエラーが発生しました');
      setProcessing(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 pt-20 flex items-center justify-center">
        <div className="container container-narrow">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
            <h2 className="font-bold text-lg mb-2">エラー</h2>
            <p className="mb-4">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
            >
              ログイン画面に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pt-20 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-stone-800 mb-4"></div>
        <p className="text-stone-600">ログイン処理中...</p>
      </div>
    </div>
  );
};

export default LineCallback;
