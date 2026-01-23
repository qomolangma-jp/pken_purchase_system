// バックエンドAPIのベースURL（環境変数から取得）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

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
