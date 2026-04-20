import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user, liffInitialized } = useAuth();

  const isDebug = import.meta.env.VITE_FORCE_DEBUG === 'true' || import.meta.env.DEV;

  // 認証確認中はローディング表示
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-stone-50">
        <p className="text-stone-600 text-lg">認証中...</p>
      </div>
    );
  }

  // ログイン状態をチェック
  if (!isAuthenticated) {
    console.warn('ProtectedRoute: ユーザーがログインしていません。');

    // デバッグモード時はリダイレクトせず、状態を表示
    if (isDebug) {
      const authToken = localStorage.getItem('authToken');
      const sessionUser = sessionStorage.getItem('user');
      const debugInfo = {
        'VITE_DEBUG_MOCK': import.meta.env.VITE_DEBUG_MOCK,
        'VITE_FORCE_DEBUG': import.meta.env.VITE_FORCE_DEBUG,
        'VITE_LIFF_ID': import.meta.env.VITE_LIFF_ID,
        'VITE_API_BASE_URL': import.meta.env.VITE_API_BASE_URL || '(空)',
        'MODE': import.meta.env.MODE,
        'isAuthenticated': String(isAuthenticated),
        'loading': String(loading),
        'liffInitialized': String(liffInitialized),
        'user (context)': user ? JSON.stringify(user) : 'null',
        'authToken (localStorage)': authToken ? authToken.substring(0, 30) + '...' : 'null',
        'user (sessionStorage)': sessionUser || 'null',
      };

      return (
        <div style={{ fontFamily: 'monospace', padding: '24px', background: '#1e1e1e', minHeight: '100vh', color: '#d4d4d4' }}>
          <h1 style={{ color: '#f14c4c', fontSize: '20px', marginBottom: '8px' }}>
            🔴 ProtectedRoute: 未認証 (リダイレクト停止中)
          </h1>
          <p style={{ color: '#888', marginBottom: '24px', fontSize: '13px' }}>
            VITE_FORCE_DEBUG=true のため /login へのリダイレクトを無効化しています
          </p>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 16px 6px 0', color: '#9cdcfe', borderBottom: '1px solid #333' }}>変数</th>
                <th style={{ textAlign: 'left', padding: '6px 0', color: '#9cdcfe', borderBottom: '1px solid #333' }}>値</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(debugInfo).map(([key, val]) => (
                <tr key={key}>
                  <td style={{ padding: '5px 16px 5px 0', color: '#9cdcfe', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{key}</td>
                  <td style={{ padding: '5px 0', color: '#ce9178', wordBreak: 'break-all' }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return <Navigate to="/login" replace />;
  }

  // 認証済みの場合は子要素を表示
  return children;
};

export default ProtectedRoute;
