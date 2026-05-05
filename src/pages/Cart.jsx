import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

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
          'Content-Type': 'application/json',
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
        items = data.data.items;
      } else if (Array.isArray(data)) {
        console.log('カートアイテム数:', data.length);
        items = data;
      } else if (data.data && Array.isArray(data.data)) {
        // ネストされたdata.dataが配列の場合に対応
        items = data.data;
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
    const adjustedItems = [];
    const notifications = [];

    try {
      for (const item of items) {
        // item.id が正しく存在することを確認するためのログ
        console.log('🔄 同期中のアイテム:', { cartItemId: item.id, productId: item.product?.id || item.product_id });

        const product = item.product || item;
        const productId = product.id;
        
        // 最新の在庫情報を取得
        const prodResponse = await fetch(`${API_BASE_URL}/api/products/${productId}`);
        if (!prodResponse.ok) {
          adjustedItems.push(item);
          continue; // 個別商品取得エラー時はそのまま（またはスキップ）
        }
        
        const prodData = await prodResponse.json();
        const latestProduct = prodData.data || prodData;
        const stock = latestProduct.stock ?? 0;
        const currentQuantity = item.quantity || 1;

        if (stock <= 0) {
          // 在庫切れ: カートから削除
          notifications.push(`「${latestProduct.name}」は在庫切れのためカートから削除されました。`);
          try {
            await fetch(`${API_BASE_URL}/api/cart/${item.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
          } catch (e) {
            console.error('在庫切れ削除エラー:', e);
          }
        } else if (currentQuantity > stock) {
          // 在庫不足: 数量を引き下げ
          notifications.push(`「${latestProduct.name}」の在庫が不足しているため、数量を最大数（${stock}個）に変更しました。`);
          try {
            await fetch(`${API_BASE_URL}/api/cart/${item.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ quantity: stock })
            });
            adjustedItems.push({ ...item, quantity: stock, product: latestProduct });
          } catch (e) {
            console.error('数量調整エラー:', e);
            adjustedItems.push(item);
          }
        } else {
          // 在庫あり: 商品情報を最新に更新
          adjustedItems.push({ ...item, product: latestProduct });
        }
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
      // 通信エラーなどの場合はそのまま表示
      setCartItems(items);
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
    if (newQuantity < 1) return;
    
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
      
      const url = `${API_BASE_URL}/api/cart/${itemId}`;
      console.log('📦 カート更新リクエスト:', { url, method: 'PUT', itemId, newQuantity });
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },        credentials: 'include',        body: JSON.stringify({ quantity: newQuantity }),
      });

      console.log('📦 カート更新レスポンス:', { status: response.status, url });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '数量の更新に失敗しました');
      }

      // カートを再取得
      await fetchCart();
    } catch (err) {
      console.error('Update quantity error:', err);
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
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const url = `${API_BASE_URL}/api/cart/${itemId}`;
      console.log('🗑️ カート削除リクエスト:', { url, method: 'DELETE', itemId });
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      console.log('🗑️ カート削除レスポンス:', { status: response.status, url });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '削除に失敗しました');
      }

      // カートを再取得
      await fetchCart();
    } catch (err) {
      console.error('Remove item error:', err);
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
    return cartItems.reduce((total, item) => {
      const price = item.price || item.product?.price || 0;
      const quantity = item.quantity || 1;
      return total + (price * quantity);
    }, 0);
  };

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center">読み込み中...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed Header */}
      <div className="fixed left-0 right-0 bg-white shadow-sm z-[90]" style={{ top: '56px', height: '48px', backgroundColor: '#ffffff' }}>
        <div className="container px-3 h-full flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-stone-700 text-xl font-light">←</button>
          <h1 className="text-base font-bold text-stone-800">カート</h1>
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
          <div className="w-full max-w-4xl px-2 md:px-4 lg:px-6">
            <div className="text-center py-8 px-3">
              <p className="text-stone-600 mb-3 text-sm font-semibold">カートに商品がありません</p>
              <Link to="/" className="inline-block bg-mos-green hover:bg-mos-green-dark text-white font-bold py-2 px-4 rounded text-sm transition-all">
                商品を見る
              </Link>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto px-2 md:px-4 lg:px-6">
            {/* Cart Summary Line */}
            <div className="bg-white rounded px-2 py-1.5 mb-2 text-xs md:text-sm">
              <p className="text-stone-700 font-semibold">
                小計（アイテム）: <span className="text-mos-green font-bold text-sm md:text-base">¥{getTotalPrice().toLocaleString()}</span>
              </p>
            </div>

            {/* Cart Items */}
            <div className="space-y-2">
              {cartItems.map((item, index) => {
                const product = item.product || item;
                const productName = product.name || 'Unknown Product';
                const productPrice = product.price || 0;
                const productImage = product.image_url || '';
                const quantity = item.quantity || 1;

                return (
                  <React.Fragment key={item.id}>
                    <div className="bg-white rounded-lg shadow-sm p-2 md:p-4">
                      {/* Top Row: Image + Product Info + Price */}
                      <div className="flex gap-2 md:gap-4 items-start">
                        {/* Product Image - Thumbnail (70px → md:128px) */}
                        <Link to={`/products/${product.id}`} className="w-[70px] h-[70px] md:w-32 md:h-32 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity" style={{ maxWidth: '70px', maxHeight: '70px' }}>
                          {productImage ? (
                            <img src={productImage} alt={productName} className="w-full h-full object-contain" style={{ width: '70px', height: 'auto' }} />
                          ) : (
                            <span className="text-xs text-stone-400">No Image</span>
                          )}
                        </Link>

                        {/* Product Info and Controls - Center Section */}
                        <div className="flex-1 min-w-0">
                          <Link to={`/products/${product.id}`} className="font-bold text-lg md:text-3xl text-stone-800 hover:text-mos-green line-clamp-2 block mb-2 md:mb-4">
                            {productName}
                          </Link>
                          
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2 md:gap-3 mt-1 md:mt-2">
                            <span className="text-xs md:text-sm text-stone-600">数量:</span>
                            <div className="flex items-center gap-1 md:gap-1.5 bg-stone-100 rounded">
                              <button
                                onClick={() => updateQuantity(item.id, Math.max(1, quantity - 1), product.stock || 0)}
                                disabled={quantity <= 1 || (product.stock ?? 0) <= 0}
                                className="w-8 h-8 md:w-10 md:h-10 text-base md:text-lg font-bold text-mos-green flex items-center justify-center hover:bg-green-200 active:bg-green-300 transition-colors rounded-l disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-200"
                              >
                                −
                              </button>
                              <span className="w-6 md:w-8 text-center text-sm md:text-base font-semibold">{quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, quantity + 1, product.stock || 0)}
                                disabled={(product.stock ?? 0) <= 0 || quantity >= (product.stock ?? 0)}
                                className="w-8 h-8 md:w-10 md:h-10 text-base md:text-lg font-bold text-mos-green flex items-center justify-center hover:bg-green-200 active:bg-green-300 transition-colors rounded-r disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-200"
                              >
                                +
                              </button>
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-red-500 hover:text-red-700 text-xl md:text-2xl leading-none ml-1 md:ml-2 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center"
                            >
                              ✕
                            </button>
                          </div>
                          <div className="mt-1 md:mt-2">
                            { (product.stock ?? 0) > 0 ? (
                                <p className="text-xs md:text-sm text-stone-500">在庫: {product.stock}個</p>
                              ) : (
                                <p className="text-xs md:text-sm text-red-600 font-bold bg-red-50 inline-block px-1.5 py-0.5 rounded">本日分終了（入荷待ち）</p>
                              )
                            }
                          </div>
                        </div>

                        {/* Price - Right Side */}
                        <div className="flex flex-col items-end gap-1 md:gap-1.5 flex-shrink-0 pr-2 md:pr-3">
                          <p className="text-xl md:text-4xl font-black text-mos-green whitespace-nowrap">
                            ¥{productPrice.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Subtotal Line */}
                      <div className="mt-2 md:mt-4 text-right pr-2 md:pr-3">
                        <p className="text-xl md:text-4xl text-mos-green font-black">
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
                onClick={() => navigate('/checkout')}
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
