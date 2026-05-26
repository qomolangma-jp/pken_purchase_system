# 検索履歴API 実装仕様書 

商品検索履歴をユーザー別に管理するためのAPI仕様です。

## ⚠️ 最終確認事項 (2026/05/26)
バックエンド側の保存処理強化後も、本番環境で **500 Internal Server Error** が続いています。

### 現在のステータス
- **POST /api/search-history**: 依然として **500**。
- **結論**: バックエンド側で「Eloquentを介さない直接保存」に切り替えても 500 が出るということは、PHPのコードレベルの問題ではなく、**DBサーバーへの接続不可、またはテーブル構造の致命的な不一致（主キー制約違反やNOT NULL制約など）**が発生している可能性が極めて高いです。

### 依頼：ログの確認とコマンド実行
原因を特定するため、以下のいずれかをお願いします。

1. **Laravel ログの確認**:
   本番サーバーの `storage/logs/laravel.log` の直近1件に、SQLエラーの詳細が出ているはずです。その内容を教えてください。

2. **データベース構造の確認**:
   DB側で以下のコマンド等により、期待されるテーブルとカラムが正しく存在するか確認してください。
   ```sql
   DESCRIBE user_search_keywords;
   ```

3. **原因特定用コマンドの提案**:
   バックエンド側で「確認コマンドもそのまま書きます」とのことでしたので、ぜひそのコマンドを教えていただき、こちらでも確認できるようにしてください。

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
