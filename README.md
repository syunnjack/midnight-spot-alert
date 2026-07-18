# Midnight Spot Alert

深夜営業・終電後スポット通知

## Repository

Recommended repository name: `midnight-spot-alert`

## Domain candidates

Confirmed domain: `midnightspot.jp`

Other candidates:

- `midnightspot.jp`
- `shinyaalert.jp`
- `yonomachi.jp`
- `lasttrain.jp`

## Concept

終電後、深夜営業、仮眠、食事、喫煙可スポットを通知し、宿泊/休憩/飲食送客へつなげる。

## Technical Selection

- Frontend: Vite + React 19
- Styling: Plain CSS
- Initial data: Static alert seed records in `src/App.jsx`
- Local state: localStorage for MVP saved alerts and UGC requests
- Notification integrations: LINE Messaging API, X API, transactional email provider, Slack Incoming Webhooks
- Future data layer: Supabase or Cloudflare D1
- SEO/AIO/LLMO: structured data, answer block, FAQ, sitemap, robots and `llms.txt`

## Revenue Paths

- ホテル送客
- 漫画喫茶送客
- 飲食店掲載
- タクシー広告
- クーポン

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
```
