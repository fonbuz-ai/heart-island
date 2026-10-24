// 從 tw.atomy.com 商品頁抓「產品詳情」圖與連結，寫進 content.json 的 detail 欄位
// 用法：node scripts/fetch-details.mjs [--dry-run]
// 註：官網詳情是圖片（#contentBuilderContents 內的 editor 圖），沒有可用的文字成分／用法

import { readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = path.join(ROOT, "content.json");
const BASE = "https://tw.atomy.com/product/";
const DELAY = 600;
const DRY = process.argv.includes("--dry-run");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readDetail(html) {
  const start = html.indexOf('id="contentBuilderContents"');
  if (start < 0) return [];
  const end = html.indexOf('class="product-detail-more"', start);
  const scope = end > start ? html.slice(start, end) : html.slice(start);

  const images = [...scope.matchAll(/<img[^>]+src="([^"]+)"/g)]
    .map((m) => m[1].trim())
    .map((src) => (src.startsWith("//") ? `https:${src}` : src))
    .filter((src) => /image\.atomy\.com/.test(src) && /\/editor\//.test(src));

  return [...new Set(images)];
}

async function fetchDetail(sku) {
  const res = await fetch(BASE + sku, {
    headers: { "user-agent": "Mozilla/5.0 (heart-island detail sync)" },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();

  return { images: readDetail(html), officialUrl: BASE + sku };
}

function toLine(detail) {
  return JSON.stringify({
    intro: "",
    features: [],
    usage: "",
    notice: "",
    images: detail.images,
    officialUrl: detail.officialUrl,
  });
}

function patch(content, details) {
  const lines = content.split("\n");

  for (const item of details) {
    const index = lines.findIndex((line) => line.includes(`"sku": "${item.sku}"`));
    if (index < 0) continue;

    const original = lines[index];
    const hasComma = /,\s*$/.test(original);

    // 先剝掉既有的 detail（重跑時要覆蓋，不是疊加）
    const body = original
      .replace(/\s*\}\s*,?\s*$/, "")
      .replace(/,\s*"detail":\s*\{[\s\S]*\}\s*$/, "");

    lines[index] = `${body}, "detail": ${toLine(item)} }${hasComma ? "," : ""}`;
  }

  return lines.join("\n");
}

const raw = await readFile(CONTENT, "utf8");
const data = JSON.parse(raw);
const products = data.islands.flatMap((island) => island.products);
const details = [];
const failures = [];

for (const [index, product] of products.entries()) {
  if (index > 0) await wait(DELAY);

  try {
    const detail = await fetchDetail(product.sku);
    details.push({ sku: product.sku, ...detail });
    console.log(`  ${product.sku} ${product.name}：${detail.images.length} 張圖`);
  } catch (err) {
    failures.push({ sku: product.sku, name: product.name, reason: err.message });
    console.log(`  ✗ ${product.sku} ${product.name}：${err.message}`);
  }
}

const withImages = details.filter((d) => d.images.length > 0).length;
const total = details.reduce((sum, d) => sum + d.images.length, 0);

console.log(
  `抓取 ${products.length} 筆：成功 ${details.length}、有圖 ${withImages}、無圖 ${details.length - withImages}、失敗 ${failures.length}、圖片合計 ${total}`
);

if (DRY) {
  console.log("--dry-run：沒有寫檔");
} else if (details.length === 0) {
  console.log("沒有抓到任何資料，content.json 未改動");
} else {
  const today = new Date().toISOString().slice(0, 10);
  const backup = path.join(ROOT, `content.backup-${today}.json`);
  const next = patch(raw, details).replace(
    /"updated": "[^"]*"/,
    `"updated": "${today}"`
  );

  JSON.parse(next);
  await copyFile(CONTENT, backup);
  await writeFile(CONTENT, next, "utf8");
  console.log(`已寫入 content.json（備份 ${path.basename(backup)}）`);
}
