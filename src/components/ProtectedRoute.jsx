import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // 認証チェック中はローディング表示
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">認証チェック中...</p>
        </div>
      </div>
    );
  }

  // ログインページと登録ページは認証不要
  const publicPaths = ['/login', '/register'];
  const isPublicPath = publicPaths.includes(location.pathname);

  // ユーザーがログインしていない場合はログインページへリダイレクト
  if (!user && !isPublicPath) {
    return <Navigate to="/login" replace />;
  }

  // ログイン済みでログインページにアクセスした場合はトップページへ
  if (user && location.pathname === '/login') {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
