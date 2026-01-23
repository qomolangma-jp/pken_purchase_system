import React, { createContext, useState, useContext, useEffect } from 'react';
import liff from '@line/liff';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liffInitialized, setLiffInitialized] = useState(false);

  useEffect(() => {
    initializeLiff();
  }, []);

  const initializeLiff = async () => {
    try {
      // LIFF IDは環境変数から取得（後で設定が必要）
      const liffId = import.meta.env.VITE_LIFF_ID;
      
      if (!liffId) {
        console.error('LIFF IDが設定されていません');
        setLoading(false);
        return;
      }

      await liff.init({ liffId });
      setLiffInitialized(true);

      // LIFFがログインしているかチェック
      if (liff.isLoggedIn()) {
        await checkAndAuthenticateUser();
      } else {
        // LIFFログインを促す
        liff.login();
      }
    } catch (error) {
      console.error('LIFF initialization failed:', error);
      setLoading(false);
    }
  };

  const checkAndAuthenticateUser = async () => {
    try {
      // LINEプロフィールを取得
      const profile = await liff.getProfile();
      const lineId = profile.userId;

      // バックエンドAPIに問い合わせ
      const response = await fetch('/api/auth/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ line_id: lineId }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        // ユーザーが見つかった場合、自動ログイン
        setUser({
          ...data.user,
          lineId: lineId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
        });
        
        // セッションストレージに保存
        sessionStorage.setItem('user', JSON.stringify(data.user));
      } else {
        // ユーザーが見つからない場合はnullのまま（ログインページへリダイレクト）
        setUser(null);
      }
    } catch (error) {
      console.error('認証チェックエラー:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData) => {
    setUser(userData);
    sessionStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
    if (liffInitialized && liff.isLoggedIn()) {
      liff.logout();
    }
  };

  const value = {
    user,
    loading,
    liffInitialized,
    login,
    logout,
    liff,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
