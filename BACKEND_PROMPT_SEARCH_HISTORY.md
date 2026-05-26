# 検索履歴API 実装仕様書 

商品検索履歴をユーザー別に管理するためのAPI仕様です。

## ⚠️ 最終確認事項 (2026/05/26)
バックエンド側の強化（503/422エラーの明示化）により、原因が特定されました。

### 現在のステータス
- **エラーコード**: `503 (Service Unavailable)`
- **レスポンス内容**: `{"success":false,"message":"Search history table is not available"}`
- **結論**: バックエンドのプログラム自体はルートに到達していますが、**本番環境のデータベースに `user_search_keywords` テーブルが存在しません。**

### 次のアクション
- **本番DBでマイグレーションを実行してください。**
  （例: `php artisan migrate` など）

## 実装仕様 (合意内容)

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
