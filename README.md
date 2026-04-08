# DocuChat AI

**AI-powered PDF chat — Upload any PDF and ask questions in natural language.**
**PDFにAIで質問できるチャットアプリ — ファイルをアップロードして自然言語で質問するだけ。**

🔗 **Live Demo / デモ**: [https://docuchat-ai-xi.vercel.app/](https://docuchat-ai-xi.vercel.app/)

---

## Overview / 概要

**EN**: DocuChat AI lets you upload a PDF and have a conversation with it. Powered by Google Gemini 2.5 Flash, it answers questions strictly based on the document content — no hallucinations, no guessing.

**JP**: PDFをアップロードするだけで、そのドキュメントとAIチャットができるアプリです。Google Gemini 2.5 Flash を使用し、ドキュメントの内容に基づいた回答のみを返します。ハルシネーション（AI の作り話）を防ぎ、信頼性の高い回答を実現しています。

---

## Features / 機能

| Feature | 説明 |
|---------|------|
| 📄 PDF & TXT upload | Drag & drop or click to upload (max 10MB) / ドラッグ＆ドロップまたはクリックでアップロード（最大10MB） |
| 💬 AI chat | Ask anything about your document / ドキュメントについて何でも質問できる |
| 🔄 Conversation history | Multi-turn chat with context awareness / 会話履歴を保持したマルチターンチャット |
| ✨ Markdown rendering | AI responses with syntax highlighting / マークダウン＋シンタックスハイライト対応 |
| 📁 Multiple documents | Switch between documents in the sidebar / サイドバーで複数ドキュメントを切り替え |
| 💡 Suggested questions | Quick-start prompts after upload / アップロード後のクイックスタート質問 |
| 🌙 Dark UI | Clean, professional dark theme / プロフェッショナルなダークテーマ |

---

## Tech Stack / 技術構成

| Layer / レイヤー | Technology / 技術 |
|-----------------|------------------|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| AI Model | Google Gemini 2.5 Flash |
| PDF Parsing | pdf-parse |
| Deployment | Vercel (free tier) |

---

## Engineering Highlights / 工夫したポイント

### 1. Multi-Key API Rotation for Free Tier Stability
### 1. 無料枠での安定稼働のためのマルチキーローテーション

**EN**: One of the key challenges of running this app on the free tier of Google Gemini API is hitting rate limits (RPM/RPD) quickly — especially under concurrent usage or repeated requests.

**JP**: 無料枠の Gemini API では、RPM（1分あたりリクエスト数）や RPD（1日あたりリクエスト数）の上限にすぐ達してしまうことが大きな課題でした。特に連続したリクエストや複数ユーザーの同時利用で頻発していました。

**Solution / 解決策**: Implemented a **multi-key rotation system** in `src/app/api/chat/route.ts`:

- Multiple Gemini API keys are loaded from environment variables (`GEMINI_API_KEY`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`, `GEMINI_API_KEY_4`)
- When a request fails with `429`, `500`, or `503` (quota exceeded / high demand), the system **automatically retries with the next available key**
- If all keys are exhausted, it returns a clear `503` error
- Auth errors (`401`/`403`) short-circuit immediately without retrying

> 複数のAPIキーを環境変数で管理し、`429`（レート制限）・`500`・`503`（高負荷）エラー発生時に**自動的に次のキーへフォールバック**します。全キーが失敗した場合のみ `503` を返します。認証エラー（`401`/`403`）はリトライせず即座にエラーを返します。

```typescript
// Key rotation logic (simplified) / キーローテーションのロジック（簡略版）
const apiKeys = getApiKeys(); // loads GEMINI_API_KEY, _2, _3, _4
for (const key of apiKeys) {
  const res = await callGemini(key, prompt);
    if (res.ok) return res;                          // success — return immediately
      if (res.status === 429 || res.status >= 500) continue; // quota/overload — try next key
        break;                                           // auth error — stop immediately
        }
        ```

        ---

        ### 2. Model Selection: `gemini-2.5-flash` over `gemini-2.0-flash`
        ### 2. モデル選定：`gemini-2.0-flash` から `gemini-2.5-flash` への切り替え

        **EN**: During development, `gemini-2.0-flash` consistently returned `limit: 0` even with fresh API keys on the free tier. After testing available models via the Gemini REST API, `gemini-2.5-flash` was found to be reliably available with higher throughput and better response quality.

        **JP**: 開発中、`gemini-2.0-flash` は新しいAPIキーでも `limit: 0`（クォータ枯渇）を返し続けていました。利用可能なモデルをREST APIで直接テストした結果、**`gemini-2.5-flash` が無料枠でも安定して利用でき、かつレスポンスの品質も高い**ことを確認し採用しました。

        ---

        ### 3. Stateless Architecture — No Database Required
        ### 3. ステートレス設計 — データベース不要

        **EN**: PDF text is extracted on upload and stored in browser state (`React useState`). This means zero backend storage costs, no database setup, and everything runs within Vercel's free serverless functions. Each chat request sends the full document text + conversation history to Gemini, which handles context management.

        **JP**: PDFのテキストはアップロード時に抽出し、**ブラウザの `useState` に保存**します。バックエンドにデータを保存しないため、データベースが不要でコストゼロ。Vercel の無料サーバーレス関数の範囲内で完結します。チャットのたびにドキュメント全文＋会話履歴を Gemini に送ることで、コンテキストを保持しています。

        ---

        ### 4. Strict Grounding — Hallucination Prevention
        ### 4. 厳格なグラウンディング — ハルシネーション防止

        **EN**: The system prompt explicitly instructs Gemini to answer **only based on the provided document content**. If the answer isn't in the document, it says so — preventing AI from fabricating information.

        **JP**: システムプロンプトで Gemini に「**ドキュメントの内容のみを根拠に回答すること**」を明示的に指示しています。ドキュメントに情報がない場合はその旨を正直に答えるよう設定し、AIの作り話（ハルシネーション）を防いでいます。

        ---

        ## How It Works / 動作フロー

        ```
        [EN]                                    [JP]
        User uploads PDF                        PDFをアップロード
            → pdf-parse extracts text               → pdf-parse でテキスト抽出
                → Text stored in React state            → Reactのstateに保存（DBなし）

                User asks a question                    質問を入力
                    → Text + question → /api/chat           → テキスト＋質問を /api/chat へ送信
                        → API tries keys (rotation)             → APIキーをローテーションしながら試行
                            → Gemini answers from doc only          → Geminiがドキュメントのみを根拠に回答
                                → Response rendered with Markdown       → Markdownでレンダリングして表示
                                ```

                                ---

                                ## Getting Started / ローカル開発

                                ### 1. Clone the repository / リポジトリをクローン

                                ```bash
                                git clone https://github.com/Z200-WEB/docuchat-ai.git
                                cd docuchat-ai
                                ```

                                ### 2. Install dependencies / 依存パッケージをインストール

                                ```bash
                                npm install
                                ```

                                ### 3. Set up environment variables / 環境変数を設定

                                ```bash
                                cp .env.example .env.local
                                ```

                                Edit `.env.local` / `.env.local` を編集:

                                ```
                                GEMINI_API_KEY=your_api_key_here
                                GEMINI_API_KEY_2=your_second_key_here   # optional / 任意（ローテーション用）
                                GEMINI_API_KEY_3=your_third_key_here    # optional / 任意
                                GEMINI_API_KEY_4=your_fourth_key_here   # optional / 任意
                                ```

                                Get free API keys / 無料APIキーの取得: [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey)

                                ### 4. Run the development server / 開発サーバーを起動

                                ```bash
                                npm run dev
                                ```

                                Open / アクセス: [http://localhost:3000](http://localhost:3000)

                                ---

                                ## Deploy to Vercel / Vercelへのデプロイ

                                1. Push to GitHub / GitHubにプッシュ
                                2. Import the repository at [vercel.com](https://vercel.com) / Vercelでリポジトリをインポート
                                3. Add `GEMINI_API_KEY` (and optionally `_2`, `_3`, `_4`) in Environment Variables / 環境変数にAPIキーを追加
                                4. Deploy / デプロイ

                                ---

                                ## Project Structure / ディレクトリ構成

                                ```
                                src/
                                  app/
                                      api/
                                            upload/route.ts   # PDF parsing endpoint / PDFテキスト抽出API
                                                  chat/route.ts     # Gemini AI chat (with key rotation) / チャットAPI（キーローテーション付き）
                                                      globals.css         # Global styles / グローバルスタイル
                                                          layout.tsx          # Root layout / ルートレイアウト
                                                              page.tsx            # Main chat UI / メインチャット画面
                                                                lib/
                                                                    utils.ts            # Utility functions / ユーティリティ関数
                                                                    ```

                                                                    ---

                                                                    Built by [Z200-WEB](https://github.com/Z200-WEB)