// midnightspot.jp を組み立てる。
//
// 24時間営業と地図データに書かれている店舗だけを載せる。
// 「深夜も開いていそう」という推測では載せない。
//
// 使い方: node scripts/build-site.mjs

import { mkdir, writeFile, readFile, copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'dist')
const site = 'https://midnightspot.jp'
const siteName = '24時間営業マップ'

const data = JSON.parse(await readFile(join(root, 'src/spots.json'), 'utf8'))
const { spots, confirmedOn, sourceLabel, sourceUrl } = data

const AREA_SLUGS = {
  北海道: 'hokkaido', 青森県: 'aomori', 岩手県: 'iwate', 宮城県: 'miyagi', 秋田県: 'akita',
  山形県: 'yamagata', 福島県: 'fukushima', 茨城県: 'ibaraki', 栃木県: 'tochigi', 群馬県: 'gunma',
  埼玉県: 'saitama', 千葉県: 'chiba', 東京都: 'tokyo', 神奈川県: 'kanagawa', 新潟県: 'niigata',
  富山県: 'toyama', 石川県: 'ishikawa', 福井県: 'fukui', 山梨県: 'yamanashi', 長野県: 'nagano',
  岐阜県: 'gifu', 静岡県: 'shizuoka', 愛知県: 'aichi', 三重県: 'mie', 滋賀県: 'shiga',
  京都府: 'kyoto', 大阪府: 'osaka', 兵庫県: 'hyogo', 奈良県: 'nara', 和歌山県: 'wakayama',
  鳥取県: 'tottori', 島根県: 'shimane', 岡山県: 'okayama', 広島県: 'hiroshima', 山口県: 'yamaguchi',
  徳島県: 'tokushima', 香川県: 'kagawa', 愛媛県: 'ehime', 高知県: 'kochi', 福岡県: 'fukuoka',
  佐賀県: 'saga', 長崎県: 'nagasaki', 熊本県: 'kumamoto', 大分県: 'oita', 宮崎県: 'miyazaki',
  鹿児島県: 'kagoshima', 沖縄県: 'okinawa',
}

const KIND_SLUGS = {
  '銭湯・サウナ': 'bath',
  'ネットカフェ': 'internet-cafe',
  '飲食店': 'restaurant',
  'カフェ': 'cafe',
  'スーパー': 'supermarket',
  'ドラッグストア': 'drugstore',
  'コインランドリー': 'laundry',
  'ガソリンスタンド': 'fuel',
  'ジム': 'gym',
  'カラオケ': 'karaoke',
}

const escape = (value) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const style = `
  :root { --bg:#12141a; --surface:#1b1f27; --text:#e9ecf2; --muted:#98a1b0; --line:#2a3038; --accent:#ffc46b; }
  @media (prefers-color-scheme: light) {
    :root { --bg:#f6f7f9; --surface:#fff; --text:#1b2028; --muted:#5f6875; --line:#e1e5ea; --accent:#a06a10; }
  }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--text); line-height:1.8;
         font-family: system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif; }
  a { color: var(--accent); }
  header, footer { background:var(--surface); border-bottom:1px solid var(--line); }
  footer { border-bottom:0; border-top:1px solid var(--line); margin-top:3rem; }
  .wrap { max-width: 900px; margin:0 auto; padding:1rem 1.1rem; }
  h1 { font-size:1.55rem; line-height:1.5; }
  h2 { font-size:1.12rem; margin-top:2rem; }
  .grid { display:grid; gap:.7rem; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
  .card { display:block; background:var(--surface); border:1px solid var(--line); border-radius:.5rem;
          padding:.8rem .9rem; text-decoration:none; color:inherit; }
  .card:hover { border-color: var(--accent); }
  .muted { color:var(--muted); font-size:.87rem; }
  .pill { display:inline-block; border:1px solid var(--line); border-radius:999px;
          padding:.1rem .6rem; font-size:.8rem; color:var(--muted); }
  .note { background:var(--surface); border:1px solid var(--line); border-left:4px solid var(--accent);
          border-radius:.4rem; padding:.8rem 1rem; font-size:.92rem; }
  nav.crumbs { font-size:.85rem; margin:.6rem 0 1rem; }
  ul.spots { list-style:none; padding:0; }
  ul.spots li { background:var(--surface); border:1px solid var(--line); border-radius:.45rem;
                padding:.6rem .8rem; margin-bottom:.5rem; }
`

function page({ title, description, path, body }) {
  const url = `${site}${path}`

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${escape(title)}" />
<meta property="og:description" content="${escape(description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:locale" content="ja_JP" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<style>${style}</style>
</head>
<body>
<header><div class="wrap"><strong><a href="/" style="text-decoration:none">🌙 ${siteName}</a></strong></div></header>
<main class="wrap">
${body}
</main>
<footer><div class="wrap muted">
  <p><a href="/about/">このサイトについて</a></p>
  <p>店舗の情報は <a href="${sourceUrl}" rel="nofollow noopener" target="_blank">${escape(sourceLabel)}</a> のデータ（${confirmedOn}取得）をもとにしています。</p>
  <p>© ${new Date(confirmedOn).getFullYear()} ${siteName}</p>
</div></footer>
</body>
</html>
`
}

// データがまだ無いうちは、空の一覧を公開せずに準備中のページを出す。
// 中身の無いページを検索結果に載せても、探している人の役に立たない。
if (spots.length === 0) {
  const holding = page({
    title: `${siteName}｜準備中です`,
    description: `${siteName} は現在準備中です。掲載できるデータが揃うまで、内容の公開を見合わせています。`,
    path: '/',
    body: `
<h1>準備中です</h1>
<p>掲載できるデータがまだ揃っていません。24時間営業と確認できた店舗だけを載せる方針のため、
データが用意できるまで内容の公開を見合わせています。</p>
<p class="muted">出典に使う予定のデータ: <a href="${sourceUrl}" rel="nofollow noopener" target="_blank">${sourceLabel}</a></p>
`,
  }).replace('<link rel="canonical"', '<meta name="robots" content="noindex, follow" />\n<link rel="canonical"')

  await mkdir(out, { recursive: true })
  await writeFile(join(out, 'index.html'), holding, 'utf8')
  await writeFile(join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8')
  await writeFile(join(out, 'CNAME'), 'midnightspot.jp\n', 'utf8')
  await copyFile(join(root, 'public/favicon.svg'), join(out, 'favicon.svg')).catch(() => {})
  console.log('データが空のため、準備中のページだけを書き出しました')
  process.exit(0)
}

const byArea = new Map()
const byKind = new Map()

for (const spot of spots) {
  if (!byArea.has(spot.area)) byArea.set(spot.area, [])
  if (!byKind.has(spot.kind)) byKind.set(spot.kind, [])
  byArea.get(spot.area).push(spot)
  byKind.get(spot.kind).push(spot)
}

function spotItem(spot) {
  return `<li>
  <strong>${escape(spot.name)}</strong> <span class="pill">${escape(spot.kind)}</span>
  <div class="muted">${escape(spot.area)}${spot.city ? escape(spot.city) : ''}${spot.brand ? '・' + escape(spot.brand) : ''}</div>
  <div class="muted">
    ${spot.phone ? escape(spot.phone) + '　' : ''}
    ${spot.website ? `<a href="${escape(spot.website)}" rel="nofollow noopener" target="_blank">公式サイト</a>　` : ''}
    <a href="https://www.openstreetmap.org/${escape(spot.sourceRef)}" rel="nofollow noopener" target="_blank">地図</a>
  </div>
</li>`
}

// ---------------------------------------------------------------- トップ
const home = page({
  title: `${siteName}｜24時間営業の店舗${spots.length.toLocaleString()}件`,
  description: `地図データに「24時間営業」と登録されている店舗${spots.length.toLocaleString()}件を、都道府県と種類から探せます。銭湯・ネットカフェ・飲食店・スーパーなど。`,
  path: '/',
  body: `
<h1>夜中に開いている場所を探す</h1>
<p>地図データに<strong>「24時間営業」と明記されている</strong>店舗だけを集めました。${spots.length.toLocaleString()}件を掲載しています。</p>

<h2>種類から探す</h2>
<div class="grid">
${[...byKind.entries()].sort((a, b) => b[1].length - a[1].length).map(([kind, list]) =>
  `<a class="card" href="/kinds/${KIND_SLUGS[kind]}/"><strong>${escape(kind)}</strong><div class="muted">${list.length.toLocaleString()}件</div></a>`
).join('\n')}
</div>

<h2>都道府県から探す</h2>
<p>
${[...byArea.entries()].sort((a, b) => b[1].length - a[1].length).map(([area, list]) =>
  `<a class="pill" style="text-decoration:none" href="/areas/${AREA_SLUGS[area]}/">${escape(area)} ${list.length}</a>`
).join(' ')}
</p>

<div class="note">
  <p>掲載しているのは、地図データの営業時間欄に <code>24/7</code>（年中無休24時間）と書かれている店舗です。
  「深夜まで営業」「たぶん開いている」という推測では載せていません。</p>
  <p>営業時間は変わります。臨時休業や時短営業もあります。<strong>行く前に店舗へご確認ください。</strong></p>
</div>
`,
})

// ---------------------------------------------------------------- 都道府県
const areaPages = [...byArea.entries()].map(([area, list]) => ({
  path: `/areas/${AREA_SLUGS[area]}/`,
  html: page({
    title: `${area}の24時間営業の店舗${list.length}件 | ${siteName}`,
    description: `${area}で「24時間営業」と地図データに登録されている店舗${list.length}件を、種類ごとに一覧にしました。`,
    path: `/areas/${AREA_SLUGS[area]}/`,
    body: `
<nav class="crumbs"><a href="/">トップ</a> / ${escape(area)}</nav>
<h1>${escape(area)}の24時間営業の店舗</h1>
<p class="muted">${list.length}件</p>
${[...new Set(list.map((spot) => spot.kind))].map((kind) => `
<h2>${escape(kind)}（${list.filter((spot) => spot.kind === kind).length}件）</h2>
<ul class="spots">${list.filter((spot) => spot.kind === kind).map(spotItem).join('\n')}</ul>`).join('\n')}
`,
  }),
}))

// ---------------------------------------------------------------- 種類
const kindPages = [...byKind.entries()].map(([kind, list]) => ({
  path: `/kinds/${KIND_SLUGS[kind]}/`,
  html: page({
    title: `24時間営業の${kind}${list.length}件 | ${siteName}`,
    description: `全国で「24時間営業」と地図データに登録されている${kind}${list.length}件を、都道府県ごとに一覧にしました。`,
    path: `/kinds/${KIND_SLUGS[kind]}/`,
    body: `
<nav class="crumbs"><a href="/">トップ</a> / ${escape(kind)}</nav>
<h1>24時間営業の${escape(kind)}</h1>
<p class="muted">全国${list.length}件</p>
${[...new Set(list.map((spot) => spot.area))].map((area) => `
<h2><a href="/areas/${AREA_SLUGS[area]}/">${escape(area)}</a>（${list.filter((spot) => spot.area === area).length}件）</h2>
<ul class="spots">${list.filter((spot) => spot.area === area).map(spotItem).join('\n')}</ul>`).join('\n')}
`,
  }),
}))

// ---------------------------------------------------------------- このサイトについて
const about = page({
  title: `このサイトについて | ${siteName}`,
  description: `${siteName}が掲載しているデータの出所と、載せていないものについて説明しています。`,
  path: '/about/',
  body: `
<nav class="crumbs"><a href="/">トップ</a> / このサイトについて</nav>
<h1>このサイトについて</h1>

<h2>載せているもの</h2>
<p>OpenStreetMap の営業時間欄に <code>24/7</code>（年中無休24時間）と登録されている店舗だけです。
名称・場所・種類・電話番号・公式サイトは、その地図データに書かれている内容をそのまま載せています。</p>
<p class="muted">出典: <a href="${sourceUrl}" rel="nofollow noopener" target="_blank">${escape(sourceLabel)}</a>（${confirmedOn}取得）</p>

<h2>載せていないもの</h2>
<ul>
  <li><strong>コンビニエンスストア</strong>。数が多く、深夜に開いているのが当たり前のため対象から外しています。</li>
  <li>「深夜◯時まで」の店舗。24時間営業かどうかがはっきりしないためです。</li>
  <li>混雑状況・在庫・空席。これらは公開されているデータがありません。</li>
</ul>

<h2>注意していただきたいこと</h2>
<div class="note">
  <p>営業時間は変わります。臨時休業、時短営業、閉店もあります。
  地図データの更新が追いついていないこともあります。<strong>出かける前に、店舗へ直接ご確認ください。</strong></p>
  <p>掲載内容に誤りを見つけた場合は、OpenStreetMap 側を直していただくと、次回の取り込みで反映されます。</p>
</div>
`,
})

// ---------------------------------------------------------------- 書き出し
async function write(path, html) {
  const file = join(out, path.replace(/^\//, ''), 'index.html')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, html, 'utf8')
}

await mkdir(out, { recursive: true })
await write('/', home)
await write('/about/', about)

for (const item of [...areaPages, ...kindPages]) {
  await write(item.path, item.html)
}

const urls = ['/', '/about/', ...kindPages.map((item) => item.path), ...areaPages.map((item) => item.path)]

await writeFile(join(out, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
  + urls.map((path) => `  <url><loc>${site}${path}</loc></url>`).join('\n')
  + `\n</urlset>\n`, 'utf8')

await writeFile(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`, 'utf8')
await copyFile(join(root, 'public/favicon.svg'), join(out, 'favicon.svg')).catch(() => {})
await writeFile(join(out, 'CNAME'), 'midnightspot.jp\n', 'utf8')

console.log(`${urls.length}ページを書き出しました（店舗 ${spots.length}件）`)
