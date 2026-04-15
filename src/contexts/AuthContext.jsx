import React, { createContext, useState, useContext, useEffect } from 'react';
import liff from '@line/liff';
import { getLineProfile } from '../services/lineAuth';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasApiToken, setHasApiToken] = useState(false);

  useEffect(() => {
    initializeLiff();
  }, []);

  // カートアイテム数を取得
  const fetchCartCount = async () => {
    try {
      // ガード節: user が null またはトークンが存在しない場合はスキップ
      const token = localStorage.getItem('authToken');
      if (!token || !user) {
        setCartCount(0);
        return;
      }

      const response = await fetch(`${(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')}/api/cart`, {
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
          setHasApiToken(false);
        }
        setCartCount(0);
      }
    } catch (error) {
      console.error('カート数取得エラー:', error);
      setCartCount(0);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !hasApiToken) {
      setCartCount(0);
      return;
    }
    fetchCartCount();
  }, [user, isAuthenticated, hasApiToken]);

  const initializeLiff = async () => {
    try {
      // LIFF IDは環境変数から取得（後で設定が必要）
      const liffId = import.meta.env.VITE_LIFF_ID;
      
      console.log('LIFF初期化開始:', { liffId: liffId ? '設定済み' : '未設定' });
      
      if (!liffId) {
        console.warn('LIFF IDが設定されていません。開発モードで続行します。');
        // 開発モードでも、保存されたトークンとユーザー情報を復元する
        await restoreAuthenticationFromStorage();
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

  const restoreAuthenticationFromStorage = async () => {
    try {
      console.log('ストレージから認証情報を復元中...');
      const token = localStorage.getItem('authToken');
      const storedUser = sessionStorage.getItem('user');

      if (token && storedUser) {
        console.log('保存された認証情報を使用');
        try {
          const parsedUser = JSON.parse(storedUser);
          const normalizedUser = {
            ...parsedUser,
            displayName: parsedUser.displayName || parsedUser.display_name || parsedUser.name || parsedUser.student_id || 'ゲスト',
            lineId: parsedUser.lineId || parsedUser.line_id,
          };
          console.log('✅ Restored user from storage:', { id: normalizedUser.id, displayName: normalizedUser.displayName });
          setUser(normalizedUser);
          setIsAuthenticated(true);
          setHasApiToken(true);
          return;
        } catch (e) {
          console.warn('保存されたユーザー情報のパースに失敗:', e);
        }
      }

      console.log('ストレージに認証情報がありません');
      setUser(null);
      setIsAuthenticated(false);
      setHasApiToken(false);
    } catch (error) {
      console.error('ストレージから認証情報を復元中にエラー:', error);
      setUser(null);
      setIsAuthenticated(false);
      setHasApiToken(false);
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
          const parsedUser = JSON.parse(storedUser);
          // sessionStorage から復元されたユーザーを正規化
          const normalizedUser = {
            ...parsedUser,
            displayName: parsedUser.displayName || parsedUser.display_name || parsedUser.name || parsedUser.student_id || 'ゲスト',
            lineId: parsedUser.lineId || parsedUser.line_id,
          };
          console.log('✅ Restored normalized user:', { id: normalizedUser.id, displayName: normalizedUser.displayName });
          setUser(normalizedUser);
          setIsAuthenticated(true);
          setHasApiToken(true);
          setLoading(false);
          return;
        } catch (e) {
          console.warn('保存されたユーザー情報のパースに失敗:', e);
        }
      }

      // LINEプロフィールを取得
      const profile = await getLineProfile();
      const lineId = profile.userId;
      console.log('LINEプロフィール取得成功:', { lineId, displayName: profile.displayName });

      // バックエンドAPIに問い合わせ
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

        const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
        console.log('認証API - ベースURL:', apiBaseUrl);

        // まず /api/auth/line-login を試す（トークン生成用）
        let apiUrl = `${apiBaseUrl}/api/auth/line-login`;
        console.log('認証API - 試行URL:', apiUrl);

        let response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ line_id: lineId }),
          signal: controller.signal,
        });

        console.log('認証APIレスポンス状態:', response.status);
        const contentType = response.headers.get('content-type');
        console.log('認証APIレスポンス Content-Type:', contentType);

        // /api/auth/line-login が存在しない場合は /api/auth/check を使用
        if (!response.ok && response.status === 404) {
          console.log('/api/auth/line-login が見つかりません。/api/auth/check を使用します。');
          apiUrl = `${apiBaseUrl}/api/auth/check`;
          console.log('認証API - フォールバックURL:', apiUrl);
          
          response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ line_id: lineId }),
            signal: controller.signal,
          });

          console.log('認証API（フォールバック）レスポンス状態:', response.status);
        }

        clearTimeout(timeoutId);
        
        // コンテンツタイプをチェック
        const responseCT = response.headers.get('content-type');
        console.log('認証API最終ステータス:', response.status, '| Content-Type:', responseCT);

        if (!responseCT || !responseCT.includes('application/json')) {
          const responseText = await response.text();
          console.error('認証API: JSON でないレスポンス:', responseText.substring(0, 500));
          throw new Error(`認証API が無効なレスポンス形式を返しました。Content-Type: ${responseCT}`);
        }
        
        const data = await response.json();
        console.log('認証APIレスポンスデータ（全体）:', data);

        if (response.ok && data.user) {
          // ユーザーが見つかった場合、自動ログイン
          console.log('ユーザー認証成功:', data.user);
          console.log('data.user keys:', Object.keys(data.user));
          
          // Validate user object - should be an actual user object, not something else
          if (!data.user.id) {
            console.error('❌ Invalid user object (no id):', data.user);
            setUser(null);
            setIsAuthenticated(false);
            setHasApiToken(false);
            return;
          }
          
          // トークンが返されている場合は保存
          if (data.token) {
            console.log('トークン取得:', data.token.substring(0, 20) + '...');
            localStorage.setItem('authToken', data.token);
            setHasApiToken(true);
            console.log('トークン保存完了');
          } else {
            console.warn('警告: APIからトークンが返されていないため /api/cart の取得は行いません。');
            localStorage.removeItem('authToken');
            setHasApiToken(false);
          }

          if (typeof data.cart_count === 'number') {
            setCartCount(data.cart_count);
          }
          
          const userObject = {
            ...data.user,
            lineId: lineId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
          };
          
          console.log('✅ Setting user object:', { id: userObject.id, displayName: userObject.displayName });
          setUser(userObject);
          setIsAuthenticated(true);
          
          // セッションストレージに保存（setUser と同じ形式で保存）
          sessionStorage.setItem('user', JSON.stringify(userObject));
        } else {
          // ユーザーが見つからない場合はnullのまま（ログインページへリダイレクト）
          console.log('ユーザーが見つかりません');
          setUser(null);
          setIsAuthenticated(false);
          setHasApiToken(false);
          setCartCount(0);
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
        setIsAuthenticated(false);
        setHasApiToken(false);
        setCartCount(0);
      }
    } catch (error) {
      console.error('認証チェックエラー:', error);
      console.error('エラー詳細:', error.message, error.stack);
      setUser(null);
      setIsAuthenticated(false);
      setHasApiToken(false);
      setCartCount(0);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData) => {
    // userData は DB user object なので、セッションストレージに直接保存するのではなく、
    // 形式を統一する
    const normalizedUser = {
      ...userData,
      // displayName と pictureUrl は userData に含まれていない可能性があるため、
      // 利用可能な情報から生成する
      displayName: userData.display_name || userData.name || userData.student_id || 'ゲスト',
      // lineId は userData に含まれているはず
      lineId: userData.line_id,
    };
    
    console.log('✅ Setting normalized user from login():', { 
      id: normalizedUser.id, 
      displayName: normalizedUser.displayName,
      keys: Object.keys(normalizedUser).filter(k => k !== 'display_name' && k !== 'name_1st' && k !== 'name_2nd').slice(0, 5)
    });
    
    setUser(normalizedUser);
    setIsAuthenticated(true);
    setHasApiToken(Boolean(localStorage.getItem('authToken')));
    sessionStorage.setItem('user', JSON.stringify(normalizedUser));
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setHasApiToken(false);
    setCartCount(0);
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    if (liffInitialized && liff.isLoggedIn()) {
      liff.logout();
    }
  };

  const value = {
    user,
    loading,
    liffInitialized,
    isAuthenticated,
    cartCount,
    fetchCartCount,
    login,
    logout,
    liff,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
