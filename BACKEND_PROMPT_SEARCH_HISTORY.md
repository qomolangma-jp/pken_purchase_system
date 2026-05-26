# バックエンドエンジニアへの依頼: 検索履歴APIの実装

フロントエンド側で検索履歴を「デバイス（LocalStorage）単位」から「ユーザー単位」に変更するために、以下のAPIエンドポイントの実装をお願いします。

## 現在発生している問題
フロントエンドから `/api/search-history` を呼び出した際に、**500 Internal Server Error** が発生しています。

### エラー状況
- `GET /api/search-history?search_type=product` -> 500 Error
- `POST /api/search-history` -> 500 Error

### 確認をお願いしたい点
1. **データベースのマイグレーション**: `search_history` テーブル（または相当するもの）は作成されていますか？また `search_type` カラムは存在しますか？
2. **ルーティング**: 新しいエンドポイントが正しく登録されていますか？
3. **バリデーション**: POST時のリクエストボディ `{"keyword": "...", "search_type": "product"}` を正しく処理できていますか？
4. **型エラー**: PHP/Laravel 等であれば、文字列を配列として扱おうとした際などに 500 が出ることがあります。

## 実装が必要なエンドポイント

### 1. 検索履歴の取得
- **URL**: `/api/search-history`
- **Method**: `GET`
- **Query Parameter**: `search_type=product`（商品検索履歴を指定）
- **認証**: 必要 (Bearer Token)
- **レスポンス形式**:
  ```json
  {
    "success": true,
    "data": ["キーワード1", "キーワード2", "キーワード3", "キーワード4", "キーワード5"]
  }
  ```
  ※ 最新の5〜10件程度を返却してください。

### 2. 検索履歴の追加
- **URL**: `/api/search-history`
- **Method**: `POST`
- **認証**: 必要 (Bearer Token)
- **リクエストボディ**:
  ```json
  {
    "keyword": "検索文字列",
    "search_type": "product"
  }
  ```
- **処理内容**:
  - 指定されたキーワードをユーザーの検索履歴に保存または更新（最新にする）。
  - 重複がある場合は、最新のタイムスタンプに更新してください。
  - 古い履歴は適宜削除し、ユーザーごとに一定数（例：10件）のみ保持するようにしてください。

## 補足事項
フロントエンド側では、すでに `src/utils/api.js` に `getSearchHistory` と `saveSearchHistory` 関数を定義し、`${API_BASE_URL}/api/search-history` を呼び出すように変更済みです。
また、`src/components/SearchDrawer.jsx` もこれらのAPIを使用するように修正しています。
