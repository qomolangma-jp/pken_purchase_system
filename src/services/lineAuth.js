import liff from '@line/liff';

/**
 * LINEプロフィール情報を取得する共通関数
 * モックモードが有効な場合は、テスト用のユーザー情報を返します。
 * 
 * @returns {Promise<{userId: string, displayName: string, pictureUrl: string}>}
 */
export const getLineProfile = async () => {
  // 環境変数の確認 (Vite では import.meta.env を使用)
  const isMockEnabled = import.meta.env.VITE_DEBUG_MOCK === 'true';

  if (isMockEnabled) {
    console.warn('⚠️ LINE LIFF Mock Mode is ENABLED.');
    
    // モック用のテストユーザー情報
    return {
      userId: 'U1234567890abcdef1234567890abcdef',
      displayName: 'テストユーザー (MOCK)',
      pictureUrl: 'https://profile.line-scdn.net/mock-image-url'
    };
  }

  // 通常のLIFF処理
  if (!liff.isLoggedIn()) {
    console.log('LIFF is not logged in. Triggering login...');
    liff.login();
    // ログイン処理後はリダイレクトされるため、ここでは空のプロミスを返すか
    // エラーを投げて呼び出し側でハンドリングさせる
    throw new Error('LIFF_NOT_LOGGED_IN');
  }

  try {
    const profile = await liff.getProfile();
    return profile;
  } catch (error) {
    console.error('Error fetching LINE profile:', error);
    throw error;
  }
};
