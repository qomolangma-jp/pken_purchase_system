import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

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
    // 認証されていない場合はログインページへリダイレクト
    console.warn('ProtectedRoute: ユーザーがログインしていません。ログインページへリダイレクトします。');
    return <Navigate to="/login" replace />;
  }

  // 認証済みの場合は子要素を表示
  return children;
};

export default ProtectedRoute;
