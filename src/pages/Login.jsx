import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://komapay.p-kmt.com';

const Login = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, liff, liffInitialized, user } = useAuth();

  // すでにログイン済みの場合はトップページへリダイレクト
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleLineLogin = () => {
    const channelId = import.meta.env.VITE_LINE_LOGIN_CHANNEL_ID;
    const callbackUrl = import.meta.env.VITE_LINE_LOGIN_CALLBACK_URL;
    const state = Math.random().toString(36).substring(7);
    
    // セッションストレージにstateを保存（CSRF対策）
    sessionStorage.setItem('line_login_state', state);
    
    // LINE Login URLを構築
    const lineLoginUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
      `response_type=code&` +
      `client_id=${channelId}&` +
      `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
      `state=${state}&` +
      `scope=profile%20openid`;
    
    // LINE Loginページへリダイレクト
    window.location.href = lineLoginUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // LIFFプロフィールからLINE IDを取得
      let lineId = null;
      if (liffInitialized && liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        lineId = profile.userId;
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          password: password,
          line_id: lineId, // LINE IDも送信
        }),
      });

      // Content-Typeをチェック
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // JSONでない場合（HTMLなど）
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error(`サーバーエラー: APIが正しく応答していません (Status: ${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data.message || 'ログインに失敗しました');
      }

      // 認証コンテキストにログイン
      await login(data.user);

      // トークンを保存
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      alert('ログインしました！');
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'ログイン中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 pt-20">
      {/* Main Content */}
      <main className="main-content min-h-screen">
        <div className="container container-narrow py-10">
          <h1 className="page-title">ログイン</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form id="loginForm" className="form-card" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="studentId">学生番号</label>
              <input
                id="studentId"
                type="text"
                className="form-input"
                placeholder="1234567"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">パスワード</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-stone-50 text-stone-500">または</span>
              </div>
            </div>

            <button
              onClick={handleLineLogin}
              className="mt-4 w-full flex items-center justify-center gap-3 bg-[#06C755] hover:bg-[#05b34b] text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
              LINEでログイン
            </button>
          </div>

          <div className="mt-6 text-center flex flex-col gap-2">
            <div>
              <Link to="#" className="link-text">パスワードを忘れた方はこちら</Link>
            </div>
            <div>
              <Link to="/register" className="link-text link-text-bold">新規登録はこちら</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
