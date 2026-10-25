import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loginWithIdToken,
  loginWithPassword,
  checkUserByIdToken,
  registerUser,
  masterRequest,
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

describe('パスワードログイン', () => {
  it('student_id と password を送り line_id は送らない', async () => {
    fetch.mockResolvedValue(jsonResponse(200, { token: 't', user: { id: 1 } }));
    await loginWithPassword({ studentId: 'S1', password: 'pw' });
    expect(lastCall().body).toEqual({ student_id: 'S1', password: 'pw' });
  });

  it('失敗時はトークンを保存しない', async () => {
    fetch.mockResolvedValue(jsonResponse(401, { message: 'パスワードが設定されていません' }));
    await expect(loginWithPassword({ studentId: 'S1', password: 'pw' })).rejects.toThrow('パスワードが設定されていません');
    expect(localStorage.getItem('authToken')).toBeNull();
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
