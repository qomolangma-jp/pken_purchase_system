# pken_purchase_system（komapay フロントエンド）

生徒が **注文・購入・ポイントチャージ** を行うためのフロントエンド（SPA）です。LINE の LIFF アプリとして動作します。

> **AI／開発者向け要点**
> - このリポジトリは **フロントエンドのみ**。バックエンド（Laravel）は **別リポジトリ**で、ここには含まれません。
> - フロントエンドは **認証・権限の最終判定を一切行わない**。すべてバックエンドが判定する。
> - ログインは **LINE のみ**（LIFF の IDトークンをバックエンドで検証）。ID・パスワードでのログインは存在しない。
> - フロントから `line_id` / LINEユーザーID / `X-Line-Id` ヘッダーを本人確認情報として送ってはいけない。

## システム構成

```
生徒のスマホ (LINEアプリ内ブラウザ / LIFF)
        │
        ▼
Vercel: https://pken-purchase-system.vercel.app   ← このリポジトリ (React SPA)
        │   /api/*     → rewrite → https://komapay.p-kmt.com/api/*
        │   /storage/* → rewrite → https://komapay.p-kmt.com/storage/*
        │   /api/payments/paypay → Vercel Serverless Function (api/payments/paypay.js) がバックエンドへ中継
        ▼
バックエンド: https://komapay.p-kmt.com   ← Laravel（別リポジトリ・VPS）
        └─ DB / LINE IDトークン検証 / PayPay 連携 / マスター管理API
```

| 項目 | 内容 |
|---|---|
| フロントエンド | React 19 + Vite 7 + React Router v7 + Tailwind CSS 4 + `@line/liff` |
| ホスティング | Vercel（[vercel.json](./vercel.json) で API を rewrite） |
| バックエンド | Laravel（別リポジトリ）`https://komapay.p-kmt.com` |
| 認証 | LINE LIFF IDトークン → バックエンドで検証 → `token`（Bearer）を返却 |
| テスト | Vitest（`npm test`） |

## 認証仕様

### 方針
- ログイン手段は **LINEログインのみ**。学生番号＋パスワード入力のログイン画面・処理は削除済み。
- 本人確認は LIFF が発行した **IDトークン**（`liff.getIDToken()`）のみ。検証（Channel ID 照合など）は **バックエンドが行う**。LINE の Channel ID／Secret はフロントに置かない。
- 認証トークンは `localStorage.authToken` に保存し、認証が必要な API に `Authorization: Bearer <token>` を付与。ユーザー情報は `sessionStorage.user` / `localStorage.authUser`。
- トークンが無い・LINE認証失敗・API エラーの場合は **ログイン成功扱いにしない**。

### フロー
1. アプリ起動時に [AuthContext.jsx](./src/contexts/AuthContext.jsx) が `liff.init({ liffId })` を実行。
2. 保存済み `authToken` とユーザー情報があれば復元。
3. なければ LIFF ログイン済みの場合、IDトークンを `POST /api/auth/line-login`（404 の場合は `POST /api/auth/check`）へ `{ "id_token": "..." }` で送信。
4. 成功レスポンスの `token` と `user` を保存して認証済みにする。ユーザーが未登録なら `/login` → `/register`。
5. 新規登録は [Register.jsx](./src/pages/Register.jsx) が IDトークン＋プロフィールを `POST /api/auth/register` へ送信。**`status` / `is_admin` は送らない**（バックエンドが `student` を設定）。成功レスポンスの `token` / `user` で通常ログインと同様に認証状態を更新。

### エラー処理
- 401: 未認証。保存済み認証情報を破棄し再ログインを促す。
- 403: 権限不足。メッセージ表示（ログイン状態は維持）。
- 422 / 400: バリデーションエラー（`message` と `errors` を表示）。
- 502 / 503: LINE認証サービス未設定・利用不可として表示。
- 共通処理は [src/utils/api.js](./src/utils/api.js)（`ApiError`, `buildErrorMessage`, `authFetch`, `masterRequest`）。

## 画面・ルーティング（[App.jsx](./src/App.jsx)）

| パス | ページ | 認証 |
|---|---|---|
| `/` | ProductList（商品一覧） | 必要 |
| `/products/:id` | ProductDetail | 必要 |
| `/cart` / `/checkout` / `/order-complete` | カート／決済／注文完了 | 必要 |
| `/purchase-history` | 購入履歴 | 必要 |
| `/charge` / `/charge/paypay/return` | ポイントチャージ／PayPay戻り | 必要 |
| `/point-history` | ポイント履歴 | 必要 |
| `/news` / `/news/:id` | お知らせ | 必要 |
| `/login` | **「LINEでログイン」ボタンと新規登録リンクのみ** | 不要 |
| `/register` | 新規登録（LINE連携必須） | 不要 |
| `/paypay/return` | PayPay決済戻り | 不要 |
| `/forgot-password`, `/auth/callback` | **旧方式の名残（パスワード再発行／認可コード方式）。現在ログイン画面からは到達しない。削除候補** | 不要 |

`ProtectedRoute` は表示制御のみ。権限の最終判定はバックエンド。

**マスター管理画面は、このフロントエンドにはまだありません。** `/api/master/*` は [api.js](./src/utils/api.js) の `masterRequest()` を使って呼ぶ設計（Bearer 付与、401/403 処理済み）。`master` 権限のユーザーのみバックエンドが許可します。

## 利用しているバックエンドAPI

ベース URL は `VITE_API_BASE_URL`（本番は Vercel の rewrite で `https://komapay.p-kmt.com`）。認証必須の API は `Authorization: Bearer <token>`。

| 分類 | メソッド・パス |
|---|---|
| 認証 | `POST /api/auth/login`（`{id_token}`）、`POST /api/auth/line-login`（`{id_token}`）、`POST /api/auth/check`（`{id_token}`）、`POST /api/auth/register` |
| ユーザー | `GET /api/user/status`（ポイント残高・申請中の有無） |
| 商品 | `GET /api/products`、`GET /api/products/:id` |
| カート | `GET/POST /api/cart`、`POST /api/cart/add`、`PUT/DELETE /api/cart/:id` |
| 注文 | `POST /api/orders`、`GET /api/orders/:id`、`GET /api/orders/my/list` |
| 決済 | `POST /api/payments/paypay`（Vercel Function 経由）、`POST /api/payments/paypay/confirm` |
| ポイント | `POST /api/charge/paypay`、`POST /api/charge/paypay/confirm`、`POST /api/charge/apply`、`GET /api/points/history` |
| お知らせ | `GET /api/news`、`GET /api/news/:id` |
| 検索履歴 | `GET/POST/DELETE /api/search-history`（[BACKEND_PROMPT_SEARCH_HISTORY.md](./BACKEND_PROMPT_SEARCH_HISTORY.md)） |
| マスター | `/api/master/*`（`master` 権限のみ。未実装画面） |

### 認証APIのリクエスト／レスポンス

```jsonc
// POST /api/auth/login, /api/auth/line-login, /api/auth/check
{ "id_token": "<LINE IDトークン>" }

// POST /api/auth/register
{ "id_token": "...", "name_2nd": "山田", "name_1st": "太郎", "username": "...", "student_id": "..." }

// 成功レスポンス（実装が前提としている形）
{ "token": "<bearer token>", "user": { "id": 1, "student_id": "...", "name_1st": "...", "name_2nd": "...", "status": "student" } }
```

> 実際のレスポンス形式はバックエンド側が正です。差異がある場合はバックエンドのコードを確認してください。

## ディレクトリ構成

```
api/payments/paypay.js     # Vercel Serverless Function（PayPay API 中継）
vercel.json                # /api, /storage を komapay.p-kmt.com へ rewrite、SPA フォールバック
vite.config.js             # 開発時 /api を komapay.p-kmt.com へ proxy
src/
├── main.jsx / App.jsx     # エントリ／ルーティング
├── contexts/
│   ├── AuthContext.jsx    # LIFF 初期化・IDトークン認証・トークン保持・ポイント更新
│   └── ModalContext.jsx
├── components/            # Header, ProtectedRoute, Modal, SearchDrawer, DebugLogger ほか
├── pages/                 # 各画面（上記ルーティング表参照）
├── services/lineAuth.js   # getLineProfile()（表示用）/ getLineIdToken()（認証用）
└── utils/
    ├── api.js             # 認証API・authFetch・masterRequest・エラー整形
    ├── api.test.js        # Vitest
    ├── favorites.js, sizePricing.js
```

## 環境変数

| 変数 | 用途 |
|---|---|
| `VITE_LIFF_ID` | LIFF ID（必須） |
| `VITE_API_BASE_URL` | バックエンド API の URL。本番は空文字（同一オリジン＋Vercel rewrite）または `https://komapay.p-kmt.com` |
| `VITE_API_URL` | 一部画面で使う `VITE_API_BASE_URL` の代替 |
| `VITE_FORCE_DEBUG` | `true` で DebugLogger を表示 |
| `VITE_LINE_LOGIN_CALLBACK_URL` | 旧認可コード方式（`/auth/callback`）用。現在未使用 |

秘密情報（LINE Channel Secret 等）はフロントに置かないこと。

## セットアップ

```bash
npm install
npm run dev      # http://localhost:5173（/api は komapay.p-kmt.com へ proxy）
npm test         # Vitest
npm run lint
npm run build
```

LIFF の設定（LINE Developers Console）：エンドポイント URL を `http://localhost:5173`（開発）／`https://pken-purchase-system.vercel.app`（本番）、Scope に `profile` と **`openid`**（IDトークン取得に必須）を設定。LIFF は LINE アプリ内、または LIFF ログイン経由のブラウザで動作します。

## バックエンド（Laravel）側への要求

- `POST /api/auth/*`: IDトークンを LINE の検証 API で検証し、`line_id` を内部で解決。Channel ID 等はバックエンドの環境設定。
- 登録時の権限は常に `student`。リクエスト内の `status` / `is_admin` は無視。
- `/api/master/*` は認証＋`master` 権限必須（未認証 401、権限不足 403）。
- CORS／Cookie 設定、LINE 認証サービス未設定・障害時は 502/503 等の明確なエラーを返す。

## 関連ドキュメント

- [BACKEND_PROMPT_POINT_CHARGE.md](./BACKEND_PROMPT_POINT_CHARGE.md): ポイントチャージのバックエンド仕様
- [BACKEND_PROMPT_SEARCH_HISTORY.md](./BACKEND_PROMPT_SEARCH_HISTORY.md): 検索履歴のバックエンド仕様
