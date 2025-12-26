import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login:', { studentId, password });

    // Simulate login success
    alert('ログインしました（デモ）');
    navigate('/');
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

            <button type="submit" className="btn-primary">ログイン</button>
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
