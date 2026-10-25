import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loginWithIdToken,
  checkUserByIdToken,
  registerUser,
  masterRequest,
  authFetch,
  generateIdempotencyKey,
  getIdempotencyKey,
  shouldReleaseIdempotencyKey,
  IDEMPOTENCY_HEADER,
  ApiError,
} from './api';

const store = () => {
  let data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
    clear: () => { data = {}; },
  };
};

const jsonResponse = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  vi.stubGlobal('localStorage', store());
  vi.stubGlobal('sessionStorage', store());
  vi.stubGlobal('fetch', vi.fn());
});

const lastCall = () => {
  const [url, init] = fetch.mock.calls.at(-1);
  return { url, init, body: init.body ? JSON.parse(init.body) : undefined };
};

describe('LINE IDトークンログイン', () => {
  it('id_token のみを POST /api/auth/login に送る（line_id / X-Line-Id なし）', async () => {
    fetch.mockResolvedValue(jsonResponse(200, { token: 't', user: { id: 1 } }));
    await loginWithIdToken('ID.TOKEN');
    const { url, init, body } = lastCall();
    expect(url).toMatch(/\/api\/auth\/login$/);
    expect(init.method).toBe('POST');
    expect(body).toEqual({ id_token: 'ID.TOKEN' });
    expect(JSON.stringify(init.headers).toLowerCase()).not.toContain('x-line-id');
  });

  it('IDトークンが無ければリクエストせず失敗', async () => {
    await expect(loginWithIdToken('')).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('トークン無しの成功レスポンスはログイン成功扱いにしない', async () => {
    fetch.mockResolvedValue(jsonResponse(200, { user: { id: 1 } }));
    await expect(loginWithIdToken('x')).rejects.toThrow(ApiError);
  });

  it.each([
    [401, 'LINEトークンが無効です'],
    [503, 'LINE認証サービスが利用できません'],
  ])('%i エラーを ApiError で返す', async (status, message) => {
    fetch.mockResolvedValue(jsonResponse(status, { message }));
    await expect(loginWithIdToken('x')).rejects.toMatchObject({ status, message });
  });

  it('check は POST で id_token を送り、404 は null', async () => {
    fetch.mockResolvedValue(jsonResponse(404, { message: 'not found' }));
    expect(await checkUserByIdToken('ID')).toBeNull();
    const { init, body } = lastCall();
    expect(init.method).toBe('POST');
    expect(body).toEqual({ id_token: 'ID' });
  });
});

describe('登録', () => {
  it('status / is_admin / line_id を送らず id_token を送る', async () => {
    fetch.mockResolvedValue(jsonResponse(201, { token: 't', user: { id: 1 } }));
    await registerUser({
      id_token: 'ID',
      name_2nd: '山田',
      name_1st: '太郎',
      student_id: 'S1',
      status: 'master',
      is_admin: true,
      line_id: 'U123',
    });
    const { url, body } = lastCall();
    expect(url).toMatch(/\/api\/auth\/register$/);
    expect(body.id_token).toBe('ID');
    expect(body).not.toHaveProperty('status');
    expect(body).not.toHaveProperty('is_admin');
    expect(body).not.toHaveProperty('line_id');
  });

  it('バリデーションエラーの詳細を表示用メッセージに含める', async () => {
    fetch.mockResolvedValue(jsonResponse(422, { message: '入力エラー', errors: { student_id: ['学籍番号は既に使われています'] } }));
    await expect(registerUser({ id_token: 'ID' })).rejects.toThrow('学籍番号は既に使われています');
  });
});

describe('冪等性キー', () => {
  const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('UUID v4 を生成する', () => {
    expect(generateIdempotencyKey()).toMatch(UUID_V4);
  });

  it('同一内容の再送は同じキー、内容が変われば別キー', () => {
    const a = getIdempotencyKey('charge:apply', { amount: 1000 });
    expect(getIdempotencyKey('charge:apply', { amount: 1000 })).toBe(a);
    expect(getIdempotencyKey('charge:apply', { amount: 2000 })).not.toBe(a);
  });

  it('キー破棄の判定: 成功と確定的な4xxは破棄、5xx/409/429は保持', () => {
    expect(shouldReleaseIdempotencyKey(200)).toBe(true);
    expect(shouldReleaseIdempotencyKey(422)).toBe(true);
    expect(shouldReleaseIdempotencyKey(500)).toBe(false);
    expect(shouldReleaseIdempotencyKey(409)).toBe(false);
    expect(shouldReleaseIdempotencyKey(429)).toBe(false);
  });

  it('authFetch は scope 指定で X-Idempotency-Key を付け、失敗(5xx)後の再送で同一キー', async () => {
    localStorage.setItem('authToken', 'TOK');
    fetch.mockResolvedValueOnce(jsonResponse(500, {})).mockResolvedValueOnce(jsonResponse(200, { ok: true })).mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const opts = { method: 'POST', body: { amount: 500 }, idempotencyScope: 'charge:apply' };
    await expect(authFetch('/api/charge/apply', opts)).rejects.toMatchObject({ status: 500 });
    const first = fetch.mock.calls[0][1].headers[IDEMPOTENCY_HEADER];
    await authFetch('/api/charge/apply', opts);
    const second = fetch.mock.calls[1][1].headers[IDEMPOTENCY_HEADER];
    expect(first).toMatch(UUID_V4);
    expect(second).toBe(first);
    // 成功後は破棄され、次の操作は新しいキー
    await authFetch('/api/charge/apply', { ...opts });
    expect(fetch.mock.calls[2][1].headers[IDEMPOTENCY_HEADER]).not.toBe(first);
  });
});

describe('マスターAPI', () => {
  it('Authorization: Bearer を付与する', async () => {
    localStorage.setItem('authToken', 'TOK');
    fetch.mockResolvedValue(jsonResponse(200, { data: [] }));
    await masterRequest('products');
    const { url, init } = lastCall();
    expect(url).toMatch(/\/api\/master\/products$/);
    expect(init.headers.Authorization).toBe('Bearer TOK');
  });

  it('トークンが無ければ送信せず 401 扱い', async () => {
    const onUnauthorized = vi.fn();
    await expect(masterRequest('products', { onUnauthorized })).rejects.toMatchObject({ status: 401 });
    expect(fetch).not.toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it('401 は認証情報を破棄して再ログインを促す', async () => {
    localStorage.setItem('authToken', 'TOK');
    localStorage.setItem('authUser', '{}');
    const onUnauthorized = vi.fn();
    fetch.mockResolvedValue(jsonResponse(401, { message: 'Unauthenticated' }));
    await expect(masterRequest('x', { onUnauthorized })).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('authUser')).toBeNull();
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it('403 は権限不足として扱い、ログイン状態は維持する', async () => {
    localStorage.setItem('authToken', 'TOK');
    const onUnauthorized = vi.fn();
    fetch.mockResolvedValue(jsonResponse(403, {}));
    await expect(masterRequest('x', { onUnauthorized })).rejects.toMatchObject({ status: 403 });
    expect(localStorage.getItem('authToken')).toBe('TOK');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
