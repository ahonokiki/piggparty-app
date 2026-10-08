// ピグパのアイテム名一覧 items.json を作る
// 取得元：PIGG PARTY データベース（https://seesaawiki.jp/piggparty/）。robots.txt で許可されている /d/ のページだけを見る（ページ一覧の /l/ は Disallow なので使わない）
//  - トップページのメニューにある「○年ガチャ／ショップ／クエスト」「○○リスト」のページと、そこからリンクされたガチャ・ショップのページ（1段だけ）
//  - names：本文のリンク（アイテムのページがある名前）。前回までの名前も残す
//  - more：表・行の文字のうち、アイテムの種類の言葉で終わるもの（ページのないアイテム。アプリでは、一覧と完全に同じ名前のときと、名前を直す画面の候補にだけ使う）
//  - gachas：ガチャ・ショップのページの名前（売れ筋ランキングで「ガチャ・セット」を見分けるのに使う。前回までの分も残す）
//  - gachaDates：「○年ガチャ／ショップ」の表のタイトルと販売開始日（表のタイトルは短い名前も多いので、gachas には入れない）
// wiki は 2023年9月を最後に新しいアイテムのページが増えていないので、週1回で十分。1ページ読むごとに1秒あける（全部で約110ページ・5分ほど）
// 使い方: node tools/build-items.mjs [items.json] [出力先]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const BASE = 'https://seesaawiki.jp/piggparty';
const UA = { 'User-Agent': 'piggparty-app item list (https://github.com/ahonokiki/piggparty-app)' };
const IN = process.argv[2] || 'items.json', OUT = process.argv[3] || IN;
const sleep = ms => new Promise(r => setTimeout(r, process.env.NOSLEEP ? 0 : ms));
async function get(url) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, { headers: UA }); if (r.status === 404) { await sleep(1000); return null; } // 混んでいる・一時的なエラーは少し待ってもう一度（3回まで）
      if (!r.ok) { await sleep(5000); continue; } const h = new TextDecoder('euc-jp').decode(await r.arrayBuffer()); await sleep(1000); return h; }
    catch (e) { await sleep(5000); }
  }
  return null;
}
const dec = s => s.replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(n)).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
const old = existsSync(IN) ? JSON.parse(readFileSync(IN, 'utf8')) : {};
// ページ本文（メニュー・フッターは除く）
const bodyOf = h => { const i = h.indexOf('id="page-body"'); if (i < 0) return ''; const j = h.indexOf('このページを編集する', i); return h.slice(i, j > 0 ? j : undefined); };
const linksIn = b => [...b.matchAll(/<a[^>]+href="(https:\/\/seesaawiki\.jp\/piggparty\/d\/[^"#]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(m => ({ url: m[1], text: dec(m[2].replace(/<[^>]+>/g, '')) }));
const cellsIn = b => dec(b.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<(br|\/td|\/th|\/tr|\/li|\/p|\/div|\/h\d)[^>]*>/gi, '\n').replace(/<[^>]+>/g, '')).split('\n').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
// ガチャ・ショップ・まとめのページ名
const isPage = t => /^\d{4}年|ガチャ$|ショップ$|SHOP$|トップページ|MenuBar|Q&A|用語集|リスト$|キャンペーン|セール$|^きたよ$|はじめに|^https?:/.test(t);
// リンクの文字のうち、アイテムではないもの（ガチャ・ショップ・福袋のページ、「こちら」などの案内）
const NOT_ITEM = /ガチャ|ショップ|SHOP|BAG|新作追加|改訂|^(こちら|ここ|コチラ|詳細|一覧|トップ|戻る)$/i;
// アイテム名らしい語：種類の言葉で終わり、見出し・レア度・日付・説明文ではない
const NOT = /^(激レア|超激レア|レア|ノーマル|ダブリチェンジ|限定クエスト|おまけ|規定回数おまけ|プレミアム|ダブリ|VIP|有料|無料|2モード|幻ガチャ|ガチャチケ|番号|タイトル|販売開始|販売終了|ガチャモード)$|^\d{1,2}\/\d{1,2}|^\d+月|年$|ガチャ$|ショップ$|SHOP$|クエスト$|。|です|ます|でした|ください|（|\(|※|→|⇨|↑|↓|正式名称|もらえる|ログイン|キャンペーン|発掘|リスト$|^[・\-]|^新作|有料顔パーツ$/;
const TYPE = /(アイ|顔パーツ|ヘア|ボブ|ツインテ|ポニー|エクステ|パーカー|セットアップ|ワンピ|ドレス|ボトムス|トップス|スカート|パンツ|ニット|シャツ|ジャケット|コート|アウター|カーデ|スウェット|ローブ|着ぐるみ|きぐるみ|ムード|ピアス|イヤリング|ネックレス|帽|キャップ|ハット|ベレー|フード|カチューシャ|ヘアピン|リボン|ヘッドアクセ|メガネ|サングラス|マスク|口|眉|まゆ|チーク|フェイスペイント|ボディペイント|スキン|耳|しっぽ|尻尾|羽|翼|ブーツ|シューズ|靴|ソックス|タイツ|手持ち|ライド|ぬい|ぬいぐるみ|ポーズ|ふわっと|キブン|バッグ|ポシェット|リュック|ソファ|チェア|テーブル|ベッド|ドア|窓|ラグ|ランプ|クッション|棚|壁|床|\/[^/]{1,6})$/;
const isName = s => s.length >= 4 && s.length <= 40 && /[\p{Script=Katakana}\p{Script=Hiragana}\p{Script=Han}]/u.test(s) && !NOT.test(s) && TYPE.test(s);
// 表の文字の飾り（「☆…☆」）・後ろに付いた数（「…/小 130」）は外す
const tidy = n => n.normalize('NFKC').replace(/\s+/g, ' ').trim().replace(/^[☆★]+|[☆★]+$/g, '').replace(/\s+\d+$/, '').trim();

const top = await get(`${BASE}/d/%a5%c8%a5%c3%a5%d7%a5%da%a1%bc%a5%b8`);
if (!top) { console.error('トップページを取れませんでした'); process.exit(1); }
const queue = [...new Map(linksIn(top).filter(l => /^\d{4}年|リスト$/.test(l.text)).map(l => [l.url, l])).values()];
const seen = new Set(queue.map(l => l.url)), oldNames = new Set((old.names || []).map(n => n.normalize('NFKC')));
const names = new Set(old.names || []), more = new Set(), gachas = new Set(old.gachas || []), dated = { ...(old.gachaDates || {}) };
// 同じ名前の書き方ちがい（「～」と「~」、全角と半角）は増やさない（前からある書き方を残す）
const nkeys = new Set([...names].map(n => n.normalize('NFKC'))), addName = n => { const k = n.normalize('NFKC'); if (!nkeys.has(k)) { nkeys.add(k); names.add(n); } };
let pages = 0;
for (let i = 0; i < queue.length && pages < 200; i++) {
  const l = queue[i], h = await get(l.url); if (!h) continue; pages++;
  const b = bodyOf(h);
  for (const x of linksIn(b)) {
    if (!isPage(x.text) && x.text.length >= 3 && !NOT_ITEM.test(x.text)) addName(x.text); // リンク＝ページのあるアイテム（ガチャ・ショップ・案内のリンクは除く）
    // 一覧のページ（○年・リスト）からリンクされた、まだ知らないページは1段だけ見に行く（ガチャ・ショップのページ）
    if (l.index !== false && !seen.has(x.url) && !oldNames.has(x.text.normalize('NFKC'))) { seen.add(x.url); queue.push({ url: x.url, text: x.text, index: false }); }
  }
  for (const c of cellsIn(b)) for (const part of c.split(/\s{2,}|　/)) { const n = tidy(part); if (!isPage(n) && isName(n)) more.add(n); }
  // 「○年ガチャ／ショップ」の表：番号・タイトル・販売開始…
  const y = (l.text.match(/^(\d{4})年(ガチャ|ショップ)/) || [])[1];
  if (y) for (const r of b.matchAll(/<tr><td>(\d+)<\/td><td>([\s\S]*?)<\/td><td>([^<]*)<\/td>/g)) {
    const g = dec(r[2].replace(/<[^>]+>/g, '')).replace(/\s*(ガチャ|ショップ|SHOP)$/i, '').trim(), d = r[3].match(/(\d+)月(\d+)日/);
    if (g && g !== 'タイトル') dated[g] = d ? `${y}-${d[1].padStart(2, '0')}-${d[2].padStart(2, '0')}` : (dated[g] || '');
  }
  // ガチャ・ショップのページ名（「○○ガチャ」）。短い名前（「福袋」「WHITE」）は出品の題名の中でほかの意味でも出てくるので入れない
  if (/ガチャ$|ショップ$|SHOP$/i.test(l.text) && !/^\d{4}年/.test(l.text)) { const g = l.text.replace(/\s*(ガチャ|ショップ|SHOP)$/i, '').trim(); if (g.replace(/\s/g, '').length >= 6) gachas.add(g); }
}
if (pages < 15) { console.error(`ページが ${pages}件しか取れませんでした。サイトの作りが変わったかもしれません`); process.exit(1); }
const gk = new Set([...gachas, ...Object.keys(dated)].map(g => g.normalize('NFKC'))); // 「Arcana//lord」のようなガチャのページ名はアイテム名から外す
for (const n of [...names]) if (gk.has(n.normalize('NFKC'))) names.delete(n);
for (const n of [...more]) if (gk.has(n)) more.delete(n);
const nk = new Set([...names].map(n => n.normalize('NFKC')));
const list = [...names].sort((a, b) => a.localeCompare(b, 'ja')), extra = [...more].filter(n => !nk.has(n)).sort((a, b) => a.localeCompare(b, 'ja'));
writeFileSync(OUT, JSON.stringify({ _説明: 'ピグパのアイテム名一覧（tools/build-items.mjs で毎週更新）。取得元：https://seesaawiki.jp/piggparty/（names：ページのあるアイテム、more：ガチャ・ショップのページの表にある名前）',
  updated: new Date().toISOString().slice(0, 10), names: list, more: extra, gachas: [...gachas].filter(Boolean).sort(), gachaDates: dated }, null, 1) + '\n');
console.log(`ページ ${pages}件から アイテム名 ${list.length}個（前回 ${(old.names || []).length}個）・表の名前 ${extra.length}個・ガチャ/ショップ ${gachas.size}個（表 ${Object.keys(dated).length}個）`);
