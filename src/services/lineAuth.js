import liff from '@line/liff';

/**
 * LINEプロフィール（表示名・画像用）を取得する。
 * 本人確認には使わず、認証には getLineIdToken() の IDトークンを使うこと。
 *
 * @returns {Promise<{userId: string, displayName: string, pictureUrl: string}>}
 */
export const getLineProfile = async () => {
  if (!liff.isLoggedIn()) {
    liff.login();
    throw new Error('LIFF_NOT_LOGGED_IN');
  }

  try {
    return await liff.getProfile();
  } catch (error) {
    console.error('Error fetching LINE profile:', error);
    throw error;
  }
};

/**
 * LINE(LIFF)が発行したIDトークンを取得する。検証はバックエンドが行う。
 * 取得できない場合はエラーを投げる（ログイン成功扱いにしない）。
 *
 * @returns {Promise<string>}
 */
export const getLineIdToken = async () => {
  if (!liff.isLoggedIn()) {
    liff.login();
    throw new Error('LIFF_NOT_LOGGED_IN');
  }
  const idToken = liff.getIDToken();
  if (!idToken) {
    throw new Error('LINEのIDトークンを取得できませんでした。LINEでログインし直してください。');
  }
  logIdTokenClaims(idToken);
  return idToken;
};

/**
 * 認証失敗の切り分け用に、IDトークンの aud / iss / exp のみを出力する（署名や本体は出さない）。
 * 検証自体はバックエンドが行う。
 */
const logIdTokenClaims = (idToken) => {
  try {
    const payload = JSON.parse(atob(idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const expiresInSec = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : null;
    console.info('[LINE IDトークン]', {
      aud: payload.aud,
      iss: payload.iss,
      expiresInSec,
      expired: expiresInSec !== null && expiresInSec <= 0,
    });
  } catch {
    console.warn('[LINE IDトークン] 解析できませんでした');
  }
};
