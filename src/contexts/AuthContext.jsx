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
      
      console.log('LIFF初期化開始:', { liffId: liffId ? '設定済み' : '未設定' });
      
      if (!liffId) {
        console.warn('LIFF IDが設定されていません。開発モードで続行します。');
        // 開発モードではLIFFなしで続行
        setLoading(false);
        return;
      }

      await liff.init({ liffId });
      setLiffInitialized(true);
      console.log('LIFF初期化成功');

      // LIFFがログインしているかチェック
      if (liff.isLoggedIn()) {
        console.log('LIFFログイン済み');
        await checkAndAuthenticateUser();
      } else {
        console.log('LIFFログインが必要');
        // LIFFログインを促す
        liff.login();
      }
    } catch (error) {
      console.error('LIFF初期化失敗:', error);
      console.error('エラー詳細:', error.message, error.stack);
      setLoading(false);
    }
  };

  const checkAndAuthenticateUser = async () => {
    try {
      console.log('ユーザー認証チェック開始');
      // LINEプロフィールを取得
      const profile = await liff.getProfile();
      const lineId = profile.userId;
      console.log('LINEプロフィール取得成功:', { lineId, displayName: profile.displayName });

      // バックエンドAPIに問い合わせ
      const response = await fetch('https://komapay.p-kmt.com/api/auth/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ line_id: lineId }),
      });

      console.log('認証APIレスポンス:', response.status);
      const data = await response.json();

      if (response.ok && data.user) {
        // ユーザーが見つかった場合、自動ログイン
        console.log('ユーザー認証成功:', data.user);
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
        console.log('ユーザーが見つかりません');
        setUser(null);
      }
    } catch (error) {
      console.error('認証チェックエラー:', error);
      console.error('エラー詳細:', error.message, error.stack);
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
