// 從艾多美官網抓價格與 PV，回寫 content.json（只動 price / pv / updated）
// 用法：node scripts/fetch-prices.mjs [--dry-run]

import { readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = path.join(ROOT, "content.json");
const BASE = "https://www.atomy.com/tw/Home/Product/ProductView?GdsCode=";
const DELAY = 700;
const DRY = process.argv.includes("--dry-run");

const money = (value) => `NT$ ${value.toLocaleString("en-US")}`;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function readField(html, role) {
  const match = html.match(
    new RegExp(`goods-role="${role}"[^>]*>\\s*<b>([\\d,]+)</b>`)
  );

  return match ? Number(match[1].replace(/,/g, "")) : null;
}

async function fetchProduct(sku) {
  const res = await fetch(BASE + sku, {
    headers: { "user-agent": "Mozilla/5.0 (heart-island price sync)" },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  const price = readField(html, "main-price");
  const pv = readField(html, "main-pv");

  if (price === null) throw new Error("頁面沒有 main-price，格式可能改版");

  return { price, pv };
}

function patch(content, changes) {
  const lines = content.split("\n");

  for (const change of changes) {
    const index = lines.findIndex((line) =>
      line.includes(`"sku": "${change.sku}"`)
    );

    if (index < 0) continue;

    lines[index] = lines[index]
      .replace(/"price": \d+/, `"price": ${change.price}`)
      .replace(/"pv": \d+/, `"pv": ${change.pv}`);
  }

  const today = new Date().toISOString().slice(0, 10);

  return lines
    .join("\n")
    .replace(/"updated": "[^"]*"/, `"updated": "${today}"`);
}

const raw = await readFile(CONTENT, "utf8");
const data = JSON.parse(raw);
const products = data.islands.flatMap((island) => island.products);
const changes = [];
const failures = [];

for (const [index, product] of products.entries()) {
  if (index > 0) await wait(DELAY);

  try {
    const next = await fetchProduct(product.sku);
    const pv = next.pv ?? product.pv;

    if (next.price !== product.price || pv !== product.pv) {
      changes.push({
        sku: product.sku,
        name: product.name,
        price: next.price,
        pv,
        from: `${money(product.price)} / PV ${product.pv}`,
      });
    }
  } catch (err) {
    failures.push({ sku: product.sku, name: product.name, reason: err.message });
  }
}

console.log(
  `檢查 ${products.length} 筆：變更 ${changes.length} 筆、失敗 ${failures.length} 筆`
);

for (const change of changes) {
  console.log(`  ${change.sku} ${change.name}：${change.from} → ${money(change.price)} / PV ${change.pv}`);
}

for (const failure of failures) {
  console.log(`  ✗ ${failure.sku} ${failure.name}：${failure.reason}`);
}

if (DRY) {
  console.log("--dry-run：沒有寫檔");
} else if (changes.length === 0) {
  console.log("沒有變更，content.json 未改動");
} else {
  const backup = path.join(ROOT, `content.backup-${new Date().toISOString().slice(0, 10)}.json`);

  await copyFile(CONTENT, backup);
  await writeFile(CONTENT, patch(raw, changes), "utf8");
  console.log(`已寫入 content.json（備份 ${path.basename(backup)}）`);
}
