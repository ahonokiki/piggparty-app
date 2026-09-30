// ピグパのアイテム名一覧 items.json を作る
// 取得元：PIGG PARTY データベース（https://seesaawiki.jp/piggparty/）のページ一覧。アイテム1つにつき1ページある
// ガチャ・ショップの名前は、ページ名が「○○ガチャ」「○○ショップ」のものから取る（売れ筋ランキングで「ガチャ・セット」を見分けるのに使う）
// 使い方: node tools/build-items.mjs
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
const BASE = 'https://seesaawiki.jp/piggparty';
const UA = { 'User-Agent': 'piggparty-app item list (https://github.com/ahonokiki/piggparty-app)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, { headers: UA }); if (!r.ok) return null; return new TextDecoder('euc-jp').decode(await r.arrayBuffer()); }
    catch (e) { await sleep(5000); }
  }
  return null;
}
const dec = s => s.replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n)).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
const old = existsSync('items.json') ? JSON.parse(readFileSync('items.json', 'utf8')) : {};

// 1) ページ一覧（100件ずつ）
const titles = [];
for (let p = 1; p < 100; p++) {
  const h = await get(`${BASE}/l/?p=${p}`); if (!h) break;
  const t = [...h.matchAll(/<a[^>]+href="https:\/\/seesaawiki\.jp\/piggparty\/d\/[^"]+"[^>]*>([^<]{1,80})<\/a>/g)].map(m => dec(m[1]));
  if (!t.length) break;
  titles.push(...t); await sleep(1000);
}
// 2) ガチャ・ショップのページの名前は、ガチャ／ショップの名前として集める
const gachas = new Set(old.gachas || []);
const isPage = t => /^\d{4}年|ガチャ$|ショップ$|SHOP$|トップページ|MenuBar|Q&A|用語集|リスト$|キャンペーン|セール$|^きたよ$/.test(t);
titles.filter(t => /ガチャ$|ショップ$|SHOP$/i.test(t) && !/^\d{4}年/.test(t)).forEach(t => gachas.add(t.replace(/\s*(ガチャ|ショップ|SHOP)$/i, '').trim()));
// 3) アイテム名：ガチャ・ショップ・まとめのページ以外（前回の分も残す）
const names = new Set(old.names || []);
for (const t of titles) if (!isPage(t) && t.length >= 3) names.add(t);
if (titles.length < 100) { console.error(`ページ一覧が ${titles.length}件しか取れませんでした。サイトの作りが変わったかもしれません`); process.exit(1); }
const list = [...names].sort((a, b) => a.localeCompare(b, 'ja'));
writeFileSync('items.json', JSON.stringify({ _説明: 'ピグパのアイテム名一覧（tools/build-items.mjs で毎日更新）。取得元：https://seesaawiki.jp/piggparty/',
  updated: new Date().toISOString().slice(0, 10), names: list, gachas: [...gachas].filter(Boolean).sort() }, null, 1) + '\n');
console.log(`ページ ${titles.length}件から アイテム名 ${list.length}個・ガチャ/ショップ ${gachas.size}個`);
