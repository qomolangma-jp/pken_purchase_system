# 検索履歴API 実装仕様書 

商品検索履歴をユーザー別に管理するためのAPI仕様です。

## ⚠️ 重要：現在の状況 (2026/05/26)
提示された修正内容に従いフロントエンドを更新しましたが、**本番環境 (Vercel) で依然として 500 Internal Server Error が発生しています。**

### 発生しているエラー
- `GET /api/search-history?search_type=product` -> 500 (Internal Server Error)
- `POST /api/search-history` -> 500 (Internal Server Error)

### バックエンド側で確認をお願いしたい項目
1. **本番環境へのデプロイ・マイグレーション**: 修正コードは本番環境にデプロイされていますか？また、`search_history` テーブル作成や `search_type` カラム追加のマイグレーションは実行済みでしょうか？
2. **ログの確認**: サーバー側のログ（Laravelであれば `storage/logs/laravel.log` 等）にエラー内容が出力されているはずですので、そちらを確認してください。
3. **search_type の扱い**: `search_type=product` という文字列が、コード内で正しくバリデーション・保存されていますか？

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
