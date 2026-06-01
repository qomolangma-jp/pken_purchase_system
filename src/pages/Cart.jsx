import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 
  import.meta.env.VITE_API_URL || 
  ''
).replace(/\/$/, '');
const PLACEHOLDER_IMAGE = '/no-image.png';

/**
 * 画像のURLを正しい絶対パスに変換し、Chromeキャッシュ対策を施す
 */
const toAbsoluteUrl = (url) => {
  if (!url || typeof url !== 'string') return '';

  let normalizedUrl = url.trim();
  
  // Chromebook 対策: http を https に変換
  normalizedUrl = normalizedUrl.replace(/^http:\/\//i, 'https://');

  let absoluteUrl = normalizedUrl;
  if (!/^https?:\/\//i.test(normalizedUrl) && !normalizedUrl.startsWith('data:')) {
    const path = normalizedUrl.startsWith('/') ? normalizedUrl : `/${normalizedUrl}`;
    absoluteUrl = `${API_BASE_URL}${path}`;
  }

  // Chromeキャッシュ対策（Cache Buster）
  if (absoluteUrl && !absoluteUrl.startsWith('data:')) {
    const separator = absoluteUrl.includes('?') ? '&' : '?';
    const cb = new Date().getUTCDate();
    absoluteUrl = `${absoluteUrl}${separator}cb=${cb}`;
  }

  return absoluteUrl;
};

/**
 * 画像読み込み失敗時のハンドラー
 */
const handleImageError = (e, src) => {
  const target = e.currentTarget;
  if (target.src.includes(PLACEHOLDER_IMAGE)) return;
  
  console.warn(`[ImageLoadError] Failed to load: ${src}`);
  
  target.src = PLACEHOLDER_IMAGE;
  target.onerror = null;
};

const Cart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { fetchCartCount, user, isAuthenticated, loading: authLoading } = useAuth();
  const { openModal } = useModal();

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }
    fetchCart();
  }, [authLoading, isAuthenticated, user]);

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('カートを表示するにはログインが必要です');
        setLoading(false);
        return;
      }

      console.log('カート取得開始');
      console.log('トークン:', token ? `あり (長さ: ${token.length})` : 'なし');

      const response = await fetch(`${API_BASE_URL}/api/cart`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      console.log('カートレスポンス:', response.status);
      console.log('レスポンスヘッダー:', response.headers.get('content-type'));

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('JSONでないレスポンス:', text.substring(0, 500));
        throw new Error('サーバーから正しい応答が得られませんでした');
      }

      const data = await response.json();
      console.log('カートデータ:', data);

      if (!response.ok) {
        // 認証エラーの場合はトークンをクリアしてログインページへ
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('authToken');
          setError('認証エラーが発生しました。再度ログインしてください。');
          setLoading(false);
          return;
        }
        throw new Error(data.message || 'カート情報の取得に失敗しました');
      }

      // APIレスポンスの構造: { success: true, data: { items: [...], total: 1000, count: 5 } }
      let items = [];
      if (data.success && data.data && Array.isArray(data.data.items)) {
        console.log('カートアイテム数:', data.data.items.length);
        console.log('合計金額:', data.data.total);
        items = data.data.items.map(item => ({
          ...item,
          id: item.cart_id || item.id // cart_idを優先してidとして扱う
        }));
      } else if (Array.isArray(data)) {
        console.log('カートアイテム数:', data.length);
        items = data.map(item => ({
          ...item,
          id: item.cart_id || item.id
        }));
      } else if (data.data && Array.isArray(data.data)) {
        // ネストされたdata.dataが配列の場合に対応
        items = data.data.map(item => ({
          ...item,
          id: item.cart_id || item.id
        }));
      } else {
        console.warn('カートデータが期待する構造ではありません:', data);
      }
      
      // syncInventory で ID が消失しないよう、生のアイテムをそのままセットするか
      // mergeCartItems の実装を修正する必要があります。
      // 今回は一旦 merge せずに inventory 同期へ回します。
      await syncInventory(items);
      
      // グローバルなカート数を更新
      await fetchCartCount();
    } catch (err) {
      console.error('Cart fetch error:', String(err));
      console.error('エラーメッセージ:', err.message || 'メッセージなし');
      setError(err.message || 'カート情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  /**
   * カート内の在庫を最新の状態に同期する
   */
  const syncInventory = async (items) => {
    if (!items || items.length === 0) {
      setCartItems([]);
      return;
    }

    const token = localStorage.getItem('authToken');
    const notifications = [];
    const serverOperations = []; // サーバー同期用のプロミスを格納

    try {
      // 1. 全アイテムの最新製品情報を並列で取得
      const inventoryChecks = await Promise.all(items.map(async (item) => {
        if (!item) return null;

        const cartItemId = item.id || item.cart_item_id || item.product_id || item.product?.id;
        const productId = item.product?.id || item.product_id;
        
        if (!productId) {
          return { item, cartItemId, productData: null, error: 'Product ID missing' };
        }

        try {
          const prodResponse = await fetch(`${API_BASE_URL}/api/products/${productId}`);
          if (!prodResponse.ok) return { item, cartItemId, productData: null, error: 'Fetch failed' };
          const prodData = await prodResponse.json();
          return { item, cartItemId, productData: prodData.data || prodData };
        } catch (e) {
          return { item, cartItemId, productData: null, error: e.message };
        }
      }));

      const adjustedItems = [];

      // 2. 取得した結果に基づいて調整
      for (const result of inventoryChecks) {
        if (!result) continue;
        const { item, cartItemId, productData, error } = result;

        if (error || !productData) {
          adjustedItems.push(item);
          continue;
        }

        const stock = productData.stock ?? 0;
        const currentQuantity = item.quantity || 1;

        if (stock <= 0) {
          // 在庫切れ: カートから削除
          notifications.push(`「${productData.name || '不明な商品'}」は在庫切れのためカートから削除されました。`);
          
          if (cartItemId && cartItemId !== 'undefined') {
            serverOperations.push(
              fetch(`${API_BASE_URL}/api/cart/${cartItemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              }).catch(e => console.error('削除リクエスト失敗:', e))
            );
          }
        } else if (currentQuantity > stock) {
          // 在庫不足: 数量を引き下げ
          notifications.push(`「${productData.name || '不明な商品'}」の在庫が不足しているため、数量を最大数（${stock}個）に変更しました。`);
          
          if (cartItemId && cartItemId !== 'undefined') {
            serverOperations.push(
              fetch(`${API_BASE_URL}/api/cart/${cartItemId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ quantity: stock })
              }).catch(e => console.error('更新リクエスト失敗:', e))
            );
          }
          adjustedItems.push({ ...item, id: cartItemId, quantity: stock, product: productData });
        } else {
          // 在庫あり: 商品情報を最新に更新
          adjustedItems.push({ ...item, id: cartItemId, product: productData });
        }
      }

      // サーバー更新処理があれば並列で実行
      if (serverOperations.length > 0) {
        await Promise.all(serverOperations);
      }

      setCartItems(adjustedItems);

      if (notifications.length > 0) {
        openModal({
          type: 'warning',
          title: '在庫状況の更新',
          message: (
            <div className="text-left space-y-1">
              {notifications.map((msg, i) => <p key={i} className="text-sm">• {msg}</p>)}
            </div>
          )
        });
      }
    } catch (err) {
      console.error('Inventory sync error:', err);
      // 同期失敗時はユーザーに通知してリロードを促すなどの対応（ここではエラーログのみ）
      throw new Error('在庫状況に合わせてカートを更新できませんでした。画面を再読み込みしてください。');
    }
  };

  /**
   * カート内の重複商品をIDごとに統合する
   */
  const mergeCartItems = (items) => {
    if (!Array.isArray(items)) return [];
    
    const mergedMap = new Map();
    
    items.forEach(item => {
      // カートアイテム自体のIDを保持するように修正
      const productId = item.product?.id || item.product_id || item.id;
      if (mergedMap.has(productId)) {
        const existingItem = mergedMap.get(productId);
        existingItem.quantity += (item.quantity || 1);
        console.log(`表示上で商品を統合: ID ${productId}, 新しい数量: ${existingItem.quantity}`);
      } else {
        // オブジェクト全体をコピーして保持
        mergedMap.set(productId, { ...item });
      }
    });
    
    return Array.from(mergedMap.values());
  };

  const updateQuantity = async (itemId, newQuantity, maxStock = 999) => {
    console.log("受信データ詳細:", { itemId, newQuantity, maxStock });
    
    if (newQuantity < 1) return;
    
    // itemIdの存在確認
    if (!itemId) {
      console.error("更新失敗: itemIdが渡されていません。データ構造を確認してください。", { itemId, newQuantity });
      return;
    }

    // 在庫チェック
    if (newQuantity > maxStock) {
      openModal({
        type: 'warning',
        title: '在庫数エラー',
        message: `在庫数（${maxStock}個）を超えて注文することはできません。`
      });
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      // 1. 楽観的UI更新: サーバーの応答を待たずにUIを更新
      const previousItems = [...cartItems];
      setCartItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
      
      const url = `${API_BASE_URL}/api/cart/${itemId}`;
      console.log('📦 カート更新リクエスト (楽観的):', { itemId, newQuantity });
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({ quantity: newQuantity }),
      });

      if (!response.ok) {
        const data = await response.json();
        // 失敗した場合は元の状態に戻す
        setCartItems(previousItems);
        throw new Error(data.message || '数量の更新に失敗しました');
      }

      // 2. ヘッダーの点数バッジなどを更新 (これは軽いリクエスト)
      await fetchCartCount();
      
      console.log('📦 カート更新成功');
    } catch (err) {
      console.error('Update quantity error:', err);
      // エラー時は改めてサーバーから正確なデータを取得
      await fetchCart();
      
      openModal({
        type: 'error',
        title: '更新エラー',
        message: err.message || '数量の更新に失敗しました'
      });
    }
  };

  const removeItem = async (itemId, showConfirm = true) => {
    if (showConfirm) {
      openModal({
        type: 'confirm',
        title: '商品の削除',
        message: 'この商品をカートから削除しますか？',
        onConfirm: () => executeRemoveItem(itemId)
      });
      return;
    }
    executeRemoveItem(itemId);
  };

  const executeRemoveItem = async (itemId) => {
    // itemIdの存在確認
    if (!itemId) {
      console.error('Remove item error: itemId is undefined or null');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      // 1. 楽観的UI更新
      const previousItems = [...cartItems];
      setCartItems(prev => prev.filter(item => item.id !== itemId));
      
      const url = `${API_BASE_URL}/api/cart/${itemId}`;
      console.log('🗑️ カート削除リクエスト (楽観的):', { itemId });
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        // 失敗したら戻す
        setCartItems(previousItems);
        throw new Error(data.message || '削除に失敗しました');
      }

      // 2. カウントだけ更新
      await fetchCartCount();
      console.log('🗑️ カート削除成功');
    } catch (err) {
      console.error('Remove item error:', err);
      // 再取得して同期
      await fetchCart();
      
      openModal({
        type: 'error',
        title: '削除エラー',
        message: err.message || '削除に失敗しました'
      });
    }
  };

  const clearCart = async () => {
    openModal({
      type: 'confirm',
      title: 'カートを空にする',
      message: 'カートを空にしますか？',
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('authToken');
          if (!token) return;
          
          const url = `${API_BASE_URL}/api/cart`;
          console.log('🗑️ カート全削除リクエスト:', { url, method: 'DELETE' });
          
          const response = await fetch(url, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
          });

          console.log('🗑️ カート全削除レスポンス:', { status: response.status, url });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'カートのクリアに失敗しました');
          }

          setCartItems([]);
          
          // グローバルなカート数を更新
          await fetchCartCount();
        } catch (err) {
          console.error('Clear cart error:', err);
          openModal({
            type: 'error',
            title: 'エラー',
            message: err.message || 'カートのクリアに失敗しました'
          });
        }
      }
    });
  };

  const getTotalPrice = () => {
    if (!cartItems || !Array.isArray(cartItems)) return 0;
    return cartItems.reduce((total, item) => {
      const product = item?.product || item;
      const price = product?.price || 0;
      const quantity = item?.quantity || 0;
      return total + (price * quantity);
    }, 0);
  };

  const handleCheckout = async () => {
    try {
      setLoading(true);
      // チェックアウト直前に再度最新の在庫を確認
      await fetchCart();
      // fetchCart -> syncInventory 内でエラー（同期失敗）があれば catch に飛ぶ
      navigate('/checkout');
    } catch (err) {
      console.error('Checkout preparation error:', err);
      openModal({
        type: 'error',
        title: '注文処理の中断',
        message: err.message || '在庫状況の確認中にエラーが発生しました。'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed Header */}
      <div className="fixed left-0 right-0 bg-white shadow-sm z-[90]" style={{ top: '56px', height: '48px', backgroundColor: '#ffffff' }}>
        <div className="container px-3 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => navigate(-1)} className="text-stone-700 text-xl font-light">←</button>
            <h1 className="text-base font-bold text-stone-800">カート</h1>
          </div>
          <div className="text-sm font-bold text-stone-800">
            合計 <span className="text-mos-green text-base">¥{getTotalPrice().toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="pb-20 w-full flex flex-col items-center" style={{ paddingTop: '48px' }}>
        {error && (
          <div className="w-full max-w-4xl px-2 md:px-4 lg:px-6">
            <div className="bg-red-50 border-l-4 border-red-600 text-red-700 px-3 py-2 m-2 mt-2 rounded text-xs">
              <p className="font-semibold">⚠️ エラー</p>
              <p className="text-xs">{error}</p>
            </div>
          </div>
        )}

        {cartItems.length === 0 ? (
          <div className="w-full max-w-2xl px-2 md:px-4 lg:px-6">
            <div className="text-center py-8 px-3">
              <p className="text-stone-600 mb-3 text-sm font-semibold">カートに商品がありません</p>
              <Link to="/" className="inline-block bg-mos-green hover:bg-mos-green-dark text-white font-bold py-2 px-4 rounded text-sm transition-all">
                商品を見る
              </Link>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-2xl mx-auto px-2 md:px-4 lg:px-6">
            {/* Cart Items */}
            <div className="space-y-2">
              {cartItems.map((item, index) => {
                if (!item) return null;
                const product = item?.product || item;
                const productName = product?.name || '不明な商品';
                const productPrice = product?.price || 0;
                const productImage = product?.image_url || product?.thumbnail_url || '';
                const quantity = item?.quantity || 1;

                const imageSrc = toAbsoluteUrl(productImage) || PLACEHOLDER_IMAGE;
                
                // デバッグ用
                if (index === 0) {
                  console.log(`[ImageDebug] Cart: ${productName}, Src: ${imageSrc}`);
                }

                return (
                  <React.Fragment key={item?.id || index}>
                    <div className="bg-white rounded-lg shadow-sm p-2 md:p-4">
                      {/* Top Row: Image + Product Info + Price */}
                      <div className="flex gap-2 md:gap-4 items-start">
                        {/* Product Image - Thumbnail (70px → md:128px) */}
                        <Link to={`/products/${product?.id}`} className="w-[70px] h-[70px] md:w-24 md:h-24 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity" style={{ maxWidth: '70px', maxHeight: '70px' }}>
                          {imageSrc ? (
                            <img 
                              key={imageSrc}
                              src={imageSrc} 
                              alt={productName} 
                              className="w-full h-full object-contain" 
                              style={{ width: '70px', height: 'auto' }} 
                              referrerPolicy="no-referrer"
                              onError={(e) => handleImageError(e, imageSrc)}
                            />
                          ) : (
                            <span className="text-xs text-stone-400">No Image</span>
                          )}
                        </Link>

                        {/* Product Info and Controls - Center Section */}
                        <div className="flex-1 min-w-0">
                          <Link to={`/products/${product?.id}`} className="font-bold text-lg md:text-xl text-stone-800 hover:text-mos-green line-clamp-2 block mb-2 md:mb-3">
                            {productName}
                          </Link>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2 md:gap-3 mt-1 md:mt-2">
                            <span className="text-xs md:text-sm text-stone-600">数量:</span>
                            <div className="flex items-center gap-1 md:gap-1.5 bg-stone-100 rounded">
                              <button
                                onClick={() => {
                                  const id = item?.id || item?.cart_id || item?.cart_item_id;
                                  updateQuantity(id, Math.max(1, quantity - 1), product?.stock || 0);
                                }}
                                disabled={quantity <= 1 || (product?.stock ?? 0) <= 0}
                                className="w-8 h-8 md:w-9 md:h-9 text-base md:text-lg font-bold text-mos-green flex items-center justify-center hover:bg-green-200 active:bg-green-300 transition-colors rounded-l disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-200"
                              >
                                −
                              </button>
                              <span className="w-6 md:w-8 text-center text-sm md:text-base font-semibold">{quantity}</span>
                              <button
                                onClick={() => {
                                  const id = item?.id || item?.cart_id || item?.cart_item_id;
                                  updateQuantity(id, quantity + 1, product?.stock || 0);
                                }}
                                disabled={(product?.stock ?? 0) <= 0 || quantity >= (product?.stock ?? 0)}
                                className="w-8 h-8 md:w-9 md:h-9 text-base md:text-lg font-bold text-mos-green flex items-center justify-center hover:bg-green-200 active:bg-green-300 transition-colors rounded-r disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-200"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="mt-1 md:mt-2">
                            { (product?.stock ?? 0) > 0 ? (
                                <p className="text-xs md:text-sm text-stone-500">在庫: {product?.stock}個</p>
                              ) : (
                                <p className="text-xs md:text-sm text-red-600 font-bold bg-red-50 inline-block px-1.5 py-0.5 rounded">本日分終了（入荷待ち）</p>
                              )
                            }
                          </div>
                        </div>

                        {/* Price - Right Side */}
                        <div className="flex flex-col items-end gap-1 md:gap-1.5 flex-shrink-0 pr-2 md:pr-3">
                          <p className="text-xl md:text-2xl font-black text-mos-green whitespace-nowrap">
                            ¥{productPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Bottom Section: Remove Button + Subtotal */}
                      <div className="mt-3 md:mt-4 pt-2 md:pt-3 border-t border-stone-50 flex justify-between items-center">
                        <button
                          onClick={() => {
                            const id = item?.id || item?.cart_id || item?.cart_item_id;
                            removeItem(id);
                          }}
                          className="text-red-500 hover:text-red-700 text-sm md:text-base font-medium transition-colors hover:underline"
                        >
                          この商品を削除する
                        </button>
                        <p className="text-xl md:text-2xl text-mos-green font-black">
                          計: ¥{(productPrice * quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {index < cartItems.length - 1 && (
                      <div className="border-t border-stone-300 my-1" aria-hidden="true" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Bottom Summary Card */}
            <div className="bg-white rounded-lg shadow-md p-2.5 md:p-4 mt-3 md:mt-5 sticky bottom-0">
              <div className="text-center mb-2 md:mb-3 pb-2 md:pb-3 border-b border-stone-200">
                <p className="text-xs md:text-sm text-stone-600 mb-0.5 md:mb-1">合計</p>
                <p className="text-2xl md:text-4xl font-black text-mos-green">
                  ¥{getTotalPrice().toLocaleString()}
                </p>
              </div>

              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 md:py-3 px-3 md:px-4 rounded text-xs md:text-base transition-all mb-1.5 md:mb-2"
                onClick={handleCheckout}
              >
                注文を行う
              </button>

              <Link to="/" className="block text-center text-mos-green hover:text-mos-green-dark font-semibold py-2 md:py-3 px-3 md:px-4 border border-mos-green rounded transition-all text-xs md:text-base">
                買い物を続ける
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Cart;
