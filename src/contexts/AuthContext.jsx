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
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    initializeLiff();
  }, []);

  // カートアイテム数を取得
  const fetchCartCount = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setCartCount(0);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/cart`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && Array.isArray(data.data.items)) {
          const count = data.data.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
          setCartCount(count);
        } else if (Array.isArray(data)) {
          const count = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
          setCartCount(count);
        }
      } else {
        // 認証エラー（401/403）の場合はトークンをクリア
        if (response.status === 401 || response.status === 403) {
          console.warn('認証エラー: トークンが無効です');
          localStorage.removeItem('authToken');
        }
        setCartCount(0);
      }
    } catch (error) {
      console.error('カート数取得エラー:', error);
      setCartCount(0);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      fetchCartCount();
    } else {
      setCartCount(0);
    }
  }, [user]);

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
      
      // まずローカルストレージのトークンをチェック
      const token = localStorage.getItem('authToken');
      const storedUser = sessionStorage.getItem('user');
      
      if (token && storedUser) {
        console.log('保存された認証情報を使用');
        try {
          setUser(JSON.parse(storedUser));
          setLoading(false);
          return;
        } catch (e) {
          console.warn('保存されたユーザー情報のパースに失敗:', e);
        }
      }

      // LINEプロフィールを取得
      const profile = await liff.getProfile();
      const lineId = profile.userId;
      console.log('LINEプロフィール取得成功:', { lineId, displayName: profile.displayName });

      // バックエンドAPIに問い合わせ
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

        // まず /api/auth/line-login を試す（トークン生成用）
        let response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/line-login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ line_id: lineId }),
          signal: controller.signal,
        });

        // /api/auth/line-login が存在しない場合は /api/auth/check を使用
        if (!response.ok && response.status === 404) {
          console.log('/api/auth/line-login が見つかりません。/api/auth/check を使用します。');
          response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/auth/check`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ line_id: lineId }),
            signal: controller.signal,
          });
        }

        clearTimeout(timeoutId);
        console.log('認証APIレスポンス:', response.status);
        
        const data = await response.json();
        console.log('認証APIレスポンスデータ（全体）:', data);

        if (response.ok && data.user) {
          // ユーザーが見つかった場合、自動ログイン
          console.log('ユーザー認証成功:', data.user);
          
          // トークンが返されている場合は保存
          if (data.token) {
            console.log('トークン取得:', data.token.substring(0, 20) + '...');
            localStorage.setItem('authToken', data.token);
            console.log('トークン保存完了');
          } else {
            // トークンが返されない場合は、LINE IDをトークンとして使用（暫定対処）
            console.warn('警告: APIからトークンが返されていません。LINE IDをトークンとして使用します。');
            localStorage.setItem('authToken', lineId);
            console.log('LINE IDをトークンとして保存:', lineId.substring(0, 10) + '...');
          }
          
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
      } catch (fetchError) {
        console.error('認証API接続エラー:', fetchError);
        console.error('エラー名:', fetchError.name);
        console.error('エラーメッセージ:', fetchError.message);
        
        if (fetchError.name === 'AbortError') {
          console.error('認証APIがタイムアウトしました');
        } else {
          console.error('認証APIへの接続に失敗しました。ネットワークまたはCORSの問題の可能性があります。');
        }
        
        // API接続失敗時も、ログインページへ遷移できるようにする
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
    cartCount,
    fetchCartCount,
    login,
    logout,
    liff,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
