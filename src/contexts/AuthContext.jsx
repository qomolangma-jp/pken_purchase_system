import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import liff from '@line/liff';
import { getLineProfile, getLineIdToken } from '../services/lineAuth';
import { loginWithIdToken, checkUserByIdToken, ApiError, clearStoredAuth } from '../utils/api';
const AuthContext = createContext();
const DEFAULT_USER_POINTS = 1000;
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const normalizePoints = (points) => {
  const parsedPoints = Number(points);
  return Number.isFinite(parsedPoints) && parsedPoints >= 0 ? parsedPoints : DEFAULT_USER_POINTS;
};

const normalizeUser = (rawUser, fallback = {}) => {
  if (!rawUser) return null;

  const rawPoints = rawUser?.points ?? rawUser?.wallet_balance ?? rawUser?.current_points ?? fallback.points;

  return {
    ...rawUser,
    ...fallback,
    displayName: rawUser.displayName || rawUser.display_name || rawUser.name || rawUser.student_id || fallback.displayName || 'ゲスト',
    lineId: rawUser.lineId || rawUser.line_id || fallback.lineId,
    points: normalizePoints(rawPoints),
  };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const location = useLocation();
  const refreshInFlight = useRef(false);
  const setPointsRef = useRef(() => {});
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liffInitialized, setLiffInitialized] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasApiToken, setHasApiToken] = useState(false);
  const [authError, setAuthError] = useState('');

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
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
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
      const storedUser = sessionStorage.getItem('user') || localStorage.getItem('authUser');

      if (token && storedUser) {
        console.log('保存された認証情報を使用');
        try {
          const parsedUser = JSON.parse(storedUser);
          const normalizedUser = normalizeUser(parsedUser);
          console.log('✅ Restored user from storage:', { id: normalizedUser.id, displayName: normalizedUser.displayName });
          setUser(normalizedUser);
          sessionStorage.setItem('user', JSON.stringify(normalizedUser));
          localStorage.setItem('authUser', JSON.stringify(normalizedUser));
          setIsAuthenticated(true);
          setHasApiToken(true);
          return;
        } catch (e) {
          console.warn('保存されたユーザー情報のパースに失敗:', e);
        }
      }

      console.log('ストレージに認証情報がありません');
      if (!token) {
        localStorage.removeItem('authUser');
        sessionStorage.removeItem('user');
      }
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
      const storedUser = sessionStorage.getItem('user') || localStorage.getItem('authUser');
      
      if (token && storedUser) {
        console.log('保存された認証情報を使用');
        try {
          const parsedUser = JSON.parse(storedUser);
          // sessionStorage から復元されたユーザーを正規化
          const normalizedUser = normalizeUser(parsedUser);
          console.log('✅ Restored normalized user:', { id: normalizedUser.id, displayName: normalizedUser.displayName });
          setUser(normalizedUser);
          sessionStorage.setItem('user', JSON.stringify(normalizedUser));
          localStorage.setItem('authUser', JSON.stringify(normalizedUser));
          setIsAuthenticated(true);
          setHasApiToken(true);
          setLoading(false);
          return;
        } catch (e) {
          console.warn('保存されたユーザー情報のパースに失敗:', e);
        }
      }

      // LINEプロフィール（表示用）とIDトークン（本人確認用）を取得
      const profile = await getLineProfile();
      const idToken = await getLineIdToken();

      // バックエンドAPIに問い合わせ（IDトークンのみ送信。検証はバックエンド）
      try {
        let data;
        try {
          data = await checkUserByIdToken(idToken, '/api/auth/line-login');
        } catch (lineLoginError) {
          if (lineLoginError instanceof ApiError && lineLoginError.status === 404) {
            data = await checkUserByIdToken(idToken, '/api/auth/check');
          } else {
            throw lineLoginError;
          }
        }

        if (data && data.user) {
          // ユーザーが見つかった場合、自動ログイン
          if (!data.user.id) {
            console.error('❌ Invalid user object (no id)');
            setUser(null);
            setIsAuthenticated(false);
            setHasApiToken(false);
            return;
          }

          // トークンが無い場合はログイン成功扱いにしない
          if (!data.token) {
            clearStoredAuth();
            setUser(null);
            setIsAuthenticated(false);
            setHasApiToken(false);
            setCartCount(0);
            setAuthError('認証トークンが取得できませんでした。再度ログインしてください。');
            return;
          }
          localStorage.setItem('authToken', data.token);
          setHasApiToken(true);

          if (typeof data.cart_count === 'number') {
            setCartCount(data.cart_count);
          }

          const normalizedUser = normalizeUser(
            { ...data.user, displayName: profile.displayName, pictureUrl: profile.pictureUrl },
            { points: DEFAULT_USER_POINTS },
          );
          setUser(normalizedUser);
          setIsAuthenticated(true);
          setAuthError('');
          // セッションストレージに保存（setUser と同じ形式で保存）
          sessionStorage.setItem('user', JSON.stringify(normalizedUser));
          localStorage.setItem('authUser', JSON.stringify(normalizedUser));
        } else {
          // ユーザーが見つからない場合はnullのまま（ログインページへリダイレクト）
          console.log('ユーザーが見つかりません');
          setUser(null);
          setIsAuthenticated(false);
          setHasApiToken(false);
          setCartCount(0);
        }
      } catch (fetchError) {
        console.error('認証APIエラー:', fetchError);
        clearStoredAuth();
        setAuthError(
          fetchError instanceof ApiError
            ? fetchError.message
            : '認証サーバーに接続できませんでした。ネットワークを確認してください。'
        );
        setUser(null);
        setIsAuthenticated(false);
        setHasApiToken(false);
        setCartCount(0);
      }
    } catch (error) {
      console.error('認証チェックエラー:', error);
      if (error.message !== 'LIFF_NOT_LOGGED_IN') {
        setAuthError(error.message || '認証に失敗しました。');
      }
      setUser(null);
      setIsAuthenticated(false);
      setHasApiToken(false);
      setCartCount(0);
    } finally {
      setLoading(false);
    }
  };

  const login = async (userData, token) => {
    if (!token && !localStorage.getItem('authToken')) {
      throw new Error('認証トークンが取得できませんでした');
    }
    if (token) {
      localStorage.setItem('authToken', token);
    }
    const nextUser = normalizeUser({
      ...userData,
      displayName: userData.display_name || userData.name || userData.student_id || 'ゲスト',
    });
    setUser(nextUser);
    setIsAuthenticated(true);
    setAuthError('');
    setHasApiToken(true);
    sessionStorage.setItem('user', JSON.stringify(nextUser));
    localStorage.setItem('authUser', JSON.stringify(nextUser));
  };

  const updateUserPoints = (nextPoints) => {
    setUser((currentUser) => {
      if (!currentUser) {
        return currentUser;
      }

      const updatedUser = {
        ...currentUser,
        points: normalizePoints(nextPoints),
      };

      sessionStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('authUser', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  const setPoints = (nextPoints) => {
    const parsed = Number(nextPoints);
    if (Number.isFinite(parsed) && parsed >= 0) {
      updateUserPoints(parsed);
    }
  };

  const refreshPoints = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token || refreshInFlight.current) return;
    refreshInFlight.current = true;
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/status`, {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const body = await response.json();
      const status = body?.data ?? body;
      const parsed = Number(status?.current_points);
      if (status?.current_points != null && Number.isFinite(parsed) && parsed >= 0) {
        setPointsRef.current(parsed);
      }
      setHasPendingRequest(Boolean(status?.has_pending_request));
    } catch (error) {
      console.warn('ポイント残高の更新に失敗しました（次回再試行）:', error);
    } finally {
      refreshInFlight.current = false;
    }
  }, []);

  setPointsRef.current = setPoints;

  const userId = user?.id;
  useEffect(() => {
    if (!isAuthenticated || !hasApiToken || userId == null) {
      setHasPendingRequest(false);
      return undefined;
    }

    refreshPoints();

    const intervalMs = hasPendingRequest ? 10000 : 30000;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshPoints();
    }, intervalMs);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshPoints();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAuthenticated, hasApiToken, userId, hasPendingRequest, location.pathname, refreshPoints]);

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setHasApiToken(false);
    setCartCount(0);
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
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
    authError,
    cartCount,
    fetchCartCount,
    login,
    logout,
    updateUserPoints,
    setPoints,
    refreshPoints,
    liff,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
