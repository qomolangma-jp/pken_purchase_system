// バックエンドAPIのベースURL（環境変数から取得）
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

/**
 * LINE IDでユーザーをチェックし、存在すれば返す
 * @param {string} lineId - LINE User ID
 * @returns {Promise<{user: object} | null>}
 */
export const checkUserByLineId = async (lineId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ line_id: lineId }),
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('ユーザーチェックエラー:', error);
    return null;
  }
};

/**
 * ユーザー登録
 * @param {object} userData - ユーザー情報
 * @returns {Promise<object>}
 */
export const registerUser = async (userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error('登録に失敗しました');
    }

    return await response.json();
  } catch (error) {
    console.error('登録エラー:', error);
    throw error;
  }
};

/**
 * ログイン
 * @param {object} credentials - ログイン情報
 * @returns {Promise<object>}
 */
export const loginUser = async (credentials) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      throw new Error('ログインに失敗しました');
    }

    return await response.json();
  } catch (error) {
    console.error('ログインエラー:', error);
    throw error;
  }
};

/**
 * 検索履歴の取得
 * @returns {Promise<string[]>} キーワードの配列
 */
export const getSearchHistory = async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return [];

    // クエリパラメータ search_type=product を追加
    const response = await fetch(`${API_BASE_URL}/api/search-history?search_type=product`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return [];
      }
      // 500サーバーエラーなどの詳細をログに出す
      const errorText = await response.text().catch(() => 'No response body');
      console.warn(`[API] 検索履歴の取得に失敗しました (Status: ${response.status})`, errorText);
      return [];
    }

    const data = await response.json();
    return data.success && Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    console.error('検索履歴取得エラー:', error);
    return [];
  }
};

/**
 * 検索履歴のクリア
 * @returns {Promise<boolean>} 成功・失敗
 */
export const clearSearchHistory = async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return false;

    const response = await fetch(`${API_BASE_URL}/api/search-history`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    return response.ok;
  } catch (error) {
    console.error('検索履歴クリアエラー:', error);
    return false;
  }
};

/**
 * 検索履歴の保存
 * @param {string} keyword - 検索キーワード
 * @returns {Promise<boolean>} 成功・失敗
 */
export const saveSearchHistory = async (keyword) => {
  if (!keyword || !keyword.trim()) return false;

  try {
    const token = localStorage.getItem('authToken');
    if (!token) return false;

    const response = await fetch(`${API_BASE_URL}/api/search-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify({ 
        keyword: keyword.trim(),
        search_type: 'product' 
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response body');
      console.warn(`[API] 検索履歴の保存に失敗しました (Status: ${response.status})`, errorText);
    }

    return response.ok;
  } catch (error) {
    console.error('検索履歴保存エラー:', error);
    return false;
  }
};

/**
 * 自分の注文リストを取得
 * @returns {Promise<any[]>}
 */
export const getMyOrders = async () => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) return [];

    const response = await fetch(`${API_BASE_URL}/api/orders/my/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    
    // APIレスポンスの構造に応じて調整
    if (data.success && data.data && Array.isArray(data.data.data)) {
      return data.data.data;
    } else if (data.data && Array.isArray(data.data.data)) {
      return data.data.data;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch (error) {
    console.error('注文取得エラー:', error);
    return [];
  }
};

