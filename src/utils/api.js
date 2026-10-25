// バックエンドAPIのベースURL（環境変数から取得）
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const STATUS_MESSAGES = {
  400: '入力内容に誤りがあります。',
  401: '認証に失敗しました。再度ログインしてください。',
  403: 'この操作を行う権限がありません。',
  404: '対象が見つかりません。',
  422: '入力内容に誤りがあります。',
  429: 'リクエストが多すぎます。しばらくしてからお試しください。',
  500: 'サーバーでエラーが発生しました。',
  502: 'LINE認証サービスを利用できません。しばらくしてからお試しください。',
  503: 'LINE認証サービスが利用できません。しばらくしてからお試しください。',
  504: 'サーバーの応答がありません。しばらくしてからお試しください。',
};

/**
 * バリデーションエラー(errors オブジェクト)を含めてユーザー向けメッセージを組み立てる
 */
export const buildErrorMessage = (status, data, fallback) => {
  const parts = [];
  const base = data && (data.message || data.error);
  if (typeof base === 'string' && base) parts.push(base);
  if (data && data.errors && typeof data.errors === 'object') {
    const details = Object.values(data.errors).flat().filter((v) => typeof v === 'string');
    parts.push(...details);
  }
  if (parts.length === 0) {
    parts.push(STATUS_MESSAGES[status] || fallback || `エラーが発生しました (Status: ${status})`);
  }
  return parts.join(' ');
};

const readJson = async (response) => {
  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const getAuthToken = () => localStorage.getItem('authToken');

export const IDEMPOTENCY_HEADER = 'X-Idempotency-Key';

export const generateIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
};

const IDEMPOTENCY_STORAGE_PREFIX = 'idem:';

/**
 * 同じ操作（scope + 内容 fingerprint）の再送には同じキーを返す。
 * 連打・通信瞬断後の再試行・リロードでも同一キーになるよう sessionStorage に保持する。
 * 内容が変われば新しいキーを発行する。
 */
export const getIdempotencyKey = (scope, fingerprint = '') => {
  const storageKey = IDEMPOTENCY_STORAGE_PREFIX + scope;
  const fp = typeof fingerprint === 'string' ? fingerprint : JSON.stringify(fingerprint);
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (saved && saved.fp === fp && saved.key) return saved.key;
  } catch {
    // 壊れた保存値は破棄して再発行
  }
  const key = generateIdempotencyKey();
  try {
    sessionStorage.setItem(storageKey, JSON.stringify({ fp, key }));
  } catch {
    // ストレージ不可でもキー自体は有効
  }
  return key;
};

export const clearIdempotencyKey = (scope) => {
  try {
    sessionStorage.removeItem(IDEMPOTENCY_STORAGE_PREFIX + scope);
  } catch {
    // 無視
  }
};

/**
 * レスポンス確定後にキーを破棄すべきか。
 * 成功、または再送しても結果が変わらない確定的な 4xx では破棄。
 * ネットワーク断・5xx・408/409/429 は再送されうるため同じキーを保持する。
 */
export const shouldReleaseIdempotencyKey = (status) => {
  if (status >= 200 && status < 300) return true;
  if ([408, 409, 429].includes(status)) return false;
  return status >= 400 && status < 500;
};

export const clearStoredAuth = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  sessionStorage.removeItem('user');
};

const postJson = async (path, body, fallbackMessage) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new ApiError(buildErrorMessage(response.status, data, fallbackMessage), response.status, data);
  }
  return data;
};

/**
 * ログイン・登録の成功レスポンスを検証する。
 * token / user が無い場合は成功扱いにしない。
 */
export const assertAuthResponse = (data) => {
  if (!data || !data.token || !data.user) {
    throw new ApiError('認証トークンが取得できませんでした', 200, data);
  }
  return data;
};

/**
 * LINE IDトークンでログイン
 * @param {string} idToken - LINE発行のIDトークン
 */
export const loginWithIdToken = async (idToken) => {
  if (!idToken) throw new ApiError('LINEのIDトークンが取得できませんでした。LINEでログインし直してください。', 401);
  return assertAuthResponse(await postJson('/api/auth/login', { id_token: idToken }, 'ログインに失敗しました'));
};

/**
 * IDトークンでユーザーの存在確認（POST）。
 * ユーザー未登録（404）の場合は null、それ以外のエラーは ApiError を投げる。
 */
export const checkUserByIdToken = async (idToken, path = '/api/auth/check') => {
  if (!idToken) throw new ApiError('LINEのIDトークンが取得できませんでした。LINEでログインし直してください。', 401);
  try {
    return await postJson(path, { id_token: idToken }, 'ユーザー確認に失敗しました');
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && path === '/api/auth/check') return null;
    throw error;
  }
};

/**
 * ユーザー登録。権限系フィールドは送らない（バックエンドが student を設定）。
 * @param {{id_token: string, name_2nd: string, name_1st: string, username?: string, student_id?: string, password?: string}} userData
 */
export const registerUser = async (userData) => {
  const { status, is_admin, line_id, lineId, ...profile } = userData;
  if (!profile.id_token) throw new ApiError('LINEのIDトークンが取得できませんでした。LINEでログインし直してください。', 401);
  const data = await postJson(
    '/api/auth/register',
    { ...profile, send_verification_email: true },
    '登録に失敗しました',
  );
  return assertAuthResponse(data);
};

/**
 * 認証付きでAPIを呼ぶ共通関数（マスター管理API等）。
 * 401: 保存済み認証情報を破棄し、onUnauthorized を呼ぶ。403: 権限不足の ApiError。
 */
export const authFetch = async (path, { method = 'GET', body, headers = {}, onUnauthorized, idempotencyKey, idempotencyScope } = {}) => {
  const token = getAuthToken();
  if (!token) {
    if (onUnauthorized) onUnauthorized();
    throw new ApiError('ログインが必要です。再度ログインしてください。', 401);
  }
  // 明示キーが無く scope が指定された場合は、内容に応じた永続キーを自動付与
  const key = idempotencyKey
    || (idempotencyScope ? getIdempotencyKey(idempotencyScope, body ?? '') : undefined);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
      ...(key ? { [IDEMPOTENCY_HEADER]: key } : {}),
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await readJson(response);
  if (idempotencyScope && shouldReleaseIdempotencyKey(response.status)) {
    clearIdempotencyKey(idempotencyScope);
  }
  if (!response.ok) {
    if (response.status === 401) {
      clearStoredAuth();
      if (onUnauthorized) onUnauthorized();
      throw new ApiError(buildErrorMessage(401, data), 401, data);
    }
    if (response.status === 403) {
      throw new ApiError(buildErrorMessage(403, data, 'この操作にはマスター権限が必要です。'), 403, data);
    }
    throw new ApiError(buildErrorMessage(response.status, data), response.status, data);
  }
  return data;
};

/** マスター管理API (/api/master/*) 呼び出し */
export const masterRequest = (subPath, options) =>
  authFetch(`/api/master/${String(subPath).replace(/^\/+/, '')}`, options);

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

