import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://komapay.p-kmt.com';

const Register = () => {
  const [name2nd, setName2nd] = useState('');
  const [name1st, setName1st] = useState('');
  const [lineId, setLineId] = useState('');
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

  useEffect(() => {
    // LIFFからLINE IDを取得
    const getLineId = async () => {
      if (liffInitialized && liff.isLoggedIn()) {
        try {
          const profile = await liff.getProfile();
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
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name_2nd: name2nd,
          name_1st: name1st,
          line_id: lineId,
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
        throw new Error(data.message || '登録に失敗しました');
      }

      // 認証コンテキストにログイン
      await login(data.user);

      // 登録成功時、トークンがあれば保存
      if (data.token) {
        localStorage.setItem('authToken', data.token);
      }

      alert('登録が完了しました！');
      navigate('/login');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || '登録中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="site-header">
        <div className="container header-inner">
          <Link to="/" className="logo">Mobile Order</Link>
          <Link to="/" className="text-sm text-stone-600">トップへ戻る</Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content min-h-screen">
        <div className="container container-narrow py-10">
          <h1 className="page-title">新規登録-01.23</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form id="registerForm" className="form-card" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="name_2nd">姓</label>
              <input
                id="name_2nd"
                type="text"
                className="form-input"
                placeholder="山田"
                required
                value={name2nd}
                onChange={(e) => setName2nd(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="name_1st">名</label>
              <input
                id="name_1st"
                type="text"
                className="form-input"
                placeholder="太郎"
                required
                value={name1st}
                onChange={(e) => setName1st(e.target.value)}
              />
            </div>

            {/* LINE ID (Hidden or Readonly) */}
            <div className="form-group">
              <label className="form-label" htmlFor="line_id">LINE ID</label>
              <input
                id="line_id"
                type="text"
                className="form-input bg-stone-100"
                placeholder="LIFFから自動取得"
                readOnly
                required
                value={lineId}
              />
              <p className="text-xs text-stone-500 mt-1">※LINE IDは自動的に取得されます</p>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '登録中...' : '登録する'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="link-text">すでにアカウントをお持ちの方はこちら</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Register;
