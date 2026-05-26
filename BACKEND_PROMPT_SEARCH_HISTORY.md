# 検索履歴API 実装仕様書 (合意済み)

商品検索履歴をユーザー別に管理するためのAPI仕様です。

## ステータス
- フロントエンド実装済み
- バックエンド修正完了

## 実装仕様

### 1. 検索履歴の取得
- **URL**: `/api/search-history`
- **Method**: `GET`
- **Query Parameter**: `search_type=product`（商品検索履歴を指定）
- **認証**: 必要 (Bearer Token)
- **レスポンス形式**:
  ```json
  {
    "success": true,
    "data": ["キーワード1", "キーワード2", "キーワード3"]
  }
  ```

### 2. 検索履歴の追加・更新
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
- **処理ロジック**:
  - 同じキーワード（search_type含む）が存在する場合、一旦削除して新規作成し、最新のタイムスタンプにする。
  - ユーザーごとに最大10件（MAX_KEYWORDS_PER_USER）まで保持し、超過分は古い順に削除する。
- **レスポンス形式**:
  ```json
  {
    "success": true,
    "message": "Keyword saved successfully"
  }
  ```

### 3. 検索履歴の全削除
- **URL**: `/api/search-history`
- **Method**: `DELETE`
- **認証**: 必要 (Bearer Token)
- **レスポンス形式**:
  ```json
  {
    "success": true,
    "message": "Search history cleared"
  }
  ```

## 補足事項
フロントエンド側 ([src/utils/api.js](src/utils/api.js)) はこの仕様に基づいて実装されています。
500エラー等の不具合が発生した場合は、DBのマイグレーションやバリデーションロジックを再度ご確認ください。
