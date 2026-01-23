# pken_purchase_system

LIFF（LINE Front-end Framework）を使用した購入システムです。

## 機能

- LINE認証による自動ログイン
- すべてのページでログイン必須
- LIFFからLINE IDを取得してユーザー認証
- 商品一覧、詳細、カート機能
- ユーザー登録・ログイン

## 認証フロー

1. ユーザーがアプリにアクセス
2. ログイン状態をチェック
   - **ログイン済み**: TOPページを表示、すべてのページにアクセス可能
   - **未ログイン**: 
     - LIFFからLINE IDを取得
     - バックエンドDBの`users.line_id`を検索
     - 一致すれば自動ログイン
     - 見つからない場合はログインページへリダイレクト

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`をコピーして`.env`ファイルを作成します：

```bash
cp .env.example .env
```

`.env`ファイルを編集して、以下の値を設定してください：

```env
# LINE Developers コンソールで取得したLIFF ID
VITE_LIFF_ID=your-liff-id-here

# バックエンドAPI URL
VITE_API_BASE_URL=http://localhost:3000
```

### 3. LIFF IDの取得方法

1. [LINE Developers Console](https://developers.line.biz/console/)にログイン
2. プロバイダーを選択またはり作成
3. チャネルを作成（Messaging APIまたはLINE Login）
4. チャネル設定画面の「LIFF」タブを開く
5. 「追加」ボタンをクリック
6. LIFF アプリ情報を入力：
   - **LIFFアプリ名**: アプリの名前
   - **サイズ**: Full（推奨）
   - **エンドポイントURL**: 開発環境の場合は `http://localhost:5173`
   - **Scope**: `profile` と `openid` を選択
   - **ボットリンク機能**: オプション
7. 作成されたLIFF IDをコピーして`.env`に設定

### 4. 開発サーバーの起動

```bash
npm run dev
```

### 5. ビルド

```bash
npm run build
```

## 必要なバックエンドAPI

以下のAPIエンドポイントをバックエンドで実装する必要があります：

### POST `/api/auth/check`

LINE IDでユーザーが存在するかチェック

**リクエスト:**
```json
{
  "line_id": "U1234567890abcdef"
}
```

**レスポンス（ユーザーが存在する場合）:**
```json
{
  "user": {
    "id": 1,
    "student_id": "1234567",
    "name_1st": "太郎",
    "name_2nd": "山田",
    "line_id": "U1234567890abcdef"
  }
}
```

**レスポンス（ユーザーが存在しない場合）:**
```json
{
  "user": null
}
```

### POST `/api/auth/login`

ユーザーログイン

**リクエスト:**
```json
{
  "student_id": "1234567",
  "password": "password123",
  "line_id": "U1234567890abcdef"
}
```

**レスポンス:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "student_id": "1234567",
    "name_1st": "太郎",
    "name_2nd": "山田",
    "line_id": "U1234567890abcdef"
  }
}
```

### POST `/api/auth/register`

新規ユーザー登録

**リクエスト:**
```json
{
  "name_2nd": "山田",
  "name_1st": "太郎",
  "line_id": "U1234567890abcdef"
}
```

**レスポンス:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "student_id": "1234567",
    "name_1st": "太郎",
    "name_2nd": "山田",
    "line_id": "U1234567890abcdef"
  }
}
```

## プロジェクト構造

```
src/
├── contexts/
│   └── AuthContext.jsx       # 認証コンテキスト（LIFF統合）
├── components/
│   └── ProtectedRoute.jsx    # ルート保護コンポーネント
├── pages/
│   ├── Login.jsx            # ログインページ
│   ├── Register.jsx         # 登録ページ
│   ├── ProductList.jsx      # 商品一覧
│   ├── ProductDetail.jsx    # 商品詳細
│   └── Cart.jsx            # カート
├── utils/
│   └── api.js              # API呼び出し関数
├── App.jsx                 # メインアプリ（ルート定義）
└── main.jsx               # エントリーポイント
```

## 技術スタック

- **React 19**: UIライブラリ
- **React Router v7**: ルーティング
- **Vite 7**: ビルドツール
- **Tailwind CSS 4**: スタイリング
- **@line/liff**: LINE Front-end Framework SDK

## 注意事項

- LIFFアプリは必ずHTTPS環境で動作させる必要があります（開発環境を除く）
- LINE Developersコンソールでエンドポイントの許可設定を正しく行ってください
- 本番環境では適切なCORS設定を行ってください

---

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
