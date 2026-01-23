import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'https://komapay.p-kmt.com';

const Login = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: studentId,
          password: password,
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
