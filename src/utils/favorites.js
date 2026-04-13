/**
 * お気に入り機能の管理
 * LocalStorageを使用してお気に入り商品IDを保存・管理
 */

const FAVORITES_KEY = 'favoriteProducts';

/**
 * LocalStorageからお気に入り一覧を取得
 * @returns {number[]} お気に入り商品IDの配列
 */
export const getFavorites = () => {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get favorites from localStorage:', error);
    return [];
  }
};

/**
 * 特定の商品がお気に入りかどうかを確認
 * @param {number} productId - 商品ID
 * @returns {boolean} お気に入りの場合true
 */
export const isFavorite = (productId) => {
  return getFavorites().includes(productId);
};

/**
 * お気に入りを追加
 * @param {number} productId - 商品ID
 */
export const addFavorite = (productId) => {
  const favorites = getFavorites();
  if (!favorites.includes(productId)) {
    favorites.push(productId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }
};

/**
 * お気に入りを削除
 * @param {number} productId - 商品ID
 */
export const removeFavorite = (productId) => {
  const favorites = getFavorites();
  const filtered = favorites.filter(id => id !== productId);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(filtered));
};

/**
 * お気に入りを切り替え
 * @param {number} productId - 商品ID
 * @returns {boolean} 切り替え後の状態（true: お気に入り、false: 非お気に入り）
 */
export const toggleFavorite = (productId) => {
  if (isFavorite(productId)) {
    removeFavorite(productId);
    return false;
  } else {
    addFavorite(productId);
    return true;
  }
};

/**
 * すべてのお気に入りをクリア
 */
export const clearAllFavorites = () => {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([]));
};
