// ピグパの新しいガチャ（公式サイトのお知らせに載るコラボガチャなど）の画像を取って、背景用の小さな画像を bg-auto/ に残す（history.json に追記）
// 取得元：公式サイト https://lp.pigg-party.com/news/… （サイトマップから記事を探し、本文の「〜ガチャ」見出しのすぐ下の画像を使う）
// 公式サイトに載るのはコラボなど月1〜2件だけ。毎週の普通のガチャは載らないので、アプリの「＋ガチャ画像を追加」か tools/gacha-bg/add.mjs で入れる
// 使い方: node tools/gacha-bg/update-piggparty.mjs   GitHub Actions で毎週実行（.github/workflows/gacha-bg.yml）
import { loadHistory, saveHistory, saveThumb, fetchImage, safe, jstDate, UA } from './lib.mjs';
const DIR = 'bg-auto', SITE = 'https://lp.pigg-party.com';
const MAX_PAGES = 10; // 1回に読む記事の数の上限
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async u => { const r = await fetch(u, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error(`取得できません ${r.status} ${u}`); return r.text(); };

const hist = loadHistory(DIR), have = new Set(hist.map(x => x.id));
// 同じ記事の同じ名前のガチャは1つだけ（公式が画像を差し替えると id の画像番号が変わるので、名前でも見る）
const slugName = new Set(hist.map(x => x.id.replace(/-[^-]+$/, '') + '|' + x.name));
// ふだんは最近3週間に更新された記事だけ。はじめの1回は4か月さかのぼる
const days = hist.some(x => x.from === '公式LP') ? 21 : 120, since = Date.now() - days * 864e5;

// 1) サイトマップからお知らせ記事を集める（取れないときは警告だけ出して「変更なし」で終わる。Actions を失敗にしない）
const pages = [];
try {
  const idx = await get(SITE + '/sitemap.xml');
  for (const sm of [...idx.matchAll(/<loc>([^<]*sitemap-dynamic[^<]*)<\/loc>/g)].map(m => m[1])) {
    const x = await get(sm); await sleep(500);
    for (const m of x.matchAll(/<url>\s*<loc>([^<]*\/news\/[^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g))
      if (Date.parse(m[2]) >= since) pages.push({ url: m[1], mod: Date.parse(m[2]) });
  }
} catch (e) { console.log('::warning::' + e.message); pages.length = 0; }
pages.sort((a, b) => b.mod - a.mod);

// 2) 記事の本文から「〜ガチャ」の見出しと、そのすぐ下の画像を拾う
const unesc = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const add = [];
for (const p of pages.slice(0, MAX_PAGES)) {
  let d;
  try { const h = await get(p.url); await sleep(500);
    d = JSON.parse(h.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)[1]);
  } catch (e) { console.log('読めません', p.url, e.message); continue; }
  // __NUXT_DATA__ は番号で参照しあう配列。記事は {slug, title, body, _meta:{publishedAt}} の形
  const at = i => d[i], post = d.find(v => v && typeof v === 'object' && !Array.isArray(v) && 'slug' in v && 'body' in v && 'title' in v);
  if (!post) continue;
  const slug = at(post.slug), title = at(post.title), body = String(at(post.body) || ''), meta = at(post._meta) || {};
  const pub = at(meta.publishedAt), date = jstDate(Array.isArray(pub) ? pub[1] : p.mod);
  if (!/ガチャ/.test(title + body)) continue;
  const seen = new Set();
  for (const m of body.matchAll(/<h([2-6])[^>]*>([\s\S]*?)<\/h\1>/g)) {
    const name = unesc(m[2].replace(/<[^>]+>/g, '')).replace(/^[\s◼︎■◆◇●⚫︎・]+/, '').trim().replace(/^「(.+?)」\s*(について)?$/, '$1');
    if (!/ガチャ/.test(name) || /登場|開催|プレゼント|キャンペーン|おまけ|[！!]/.test(name) || name.length > 40) continue;
    const rest = body.slice(m.index + m[0].length), next = rest.search(/<h[2-6][\s>]/);
    const img = (rest.slice(0, next < 0 ? 3000 : next).match(/<img[^>]+src="([^"]+)"/) || [])[1];
    if (!img || seen.has(img)) continue; seen.add(img);
    const key = (img.match(/([0-9a-f]{8})-[0-9a-f]{4}-/) || [])[1] || safe(name).slice(0, 12), id = `pp-${slug}-${key}`;
    const sn = `pp-${slug}|${name}`;
    if (!have.has(id) && !slugName.has(sn)) { slugName.add(sn); add.push({ id, date, name, kind: /コラボ/.test(name) ? 'コラボ' : 'ガチャ', url: unesc(img) }); }
  }
}

// 3) 画像を取って縮小を残す
let n = 0;
for (const a of add) {
  const raw = await fetchImage(a.url); await sleep(500);
  if (!raw) continue;
  const src = await saveThumb(DIR, `${a.date}_${safe(a.id)}.jpg`, raw);
  hist.push({ id: a.id, date: a.date, name: a.name, src, from: '公式LP', kind: a.kind, url: a.url });
  console.log('追加', a.date, a.name); n++;
}
console.log(`記事${Math.min(pages.length, MAX_PAGES)}件を確認。` + (saveHistory(DIR, hist) ? `history.json を更新（${n}件追加）` : '変更なし'));
