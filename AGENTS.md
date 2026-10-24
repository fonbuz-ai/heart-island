# AGENTS.md — heart-island

## 專案

把艾多美 4 大類產品變成可以點擊的六角島。第一版只做：點島 → 看內容 → 關掉。

## 技術棧

- Vite + Three.js + 原生 JS（ES module）+ 手寫 CSS
- 不用框架、不用 UI 套件、不用 CSS 預處理器

## 禁止事項

- 禁止 React、Vue、Svelte 等任何框架
- 禁止 Tailwind、Bootstrap、任何 CSS 框架
- 禁止 GSAP、anime.js 等動畫套件（用 `MathUtils.damp` 與 `requestAnimationFrame`）
- 禁止任何 3D 模型檔（.glb / .gltf / .fbx / .obj）
- 禁止要求我提供模型、貼圖或美術資產
- 未經同意不得新增任何 npm 套件

## 幾何規則

- 所有物件用 Three.js 內建圖形組合：Box、Cylinder、Cone、Sphere、Icosahedron、Extrude
- 六角島用 `CylinderGeometry(r, r, h, 6)`
- 重複物件（樹、人、石頭）一律用 `InstancedMesh`，總 draw call 壓在 150 以下
- 只用程序化材質與純色，不載入外部圖片貼圖

## 檔案規則

- 一個模組一個檔，單檔不超過 200 行；超過就拆
- 模組之間只透過明確的 export 溝通，不准互相 import 彼此的內部狀態
- 每個模組檔開頭用一行註解說明職責

建議結構：

```
index.html
src/main.js        進入點、渲染迴圈
src/world.js       六角島生成
src/camera.js      相機運動與插值
src/panel.js       HTML 側欄面板
src/data.js        讀 content.json
content.json       4 島 × 6 產品
```

## 資料規則

- `content.json` 是唯一內容來源，程式不得寫死產品名稱
- 島嶼排列不得寫死座標：依 `islands.length` 自動算格線（4 島 2×2、5–6 島 2×3、7–12 島 3×4）
- 產品數量不設上限：面板必須可滾動，島上對應物件用 `InstancedMesh`，新增分類或產品只改 JSON、不改程式
- 結構固定：`islands[] → { id, name, no, color, products[] → { name, tag, zone, sku, price, pv, stock, desc } }`
- `zone` 是分區預留欄位，目前全部空字串；空字串一律視為「未分區」，程式不得因此報錯或隱藏產品
- `price` 是整數新台幣（不含逗號），`pv` 是整數 PV 點數，`sku` 是官網商品編號
- `stock` 只有 `"in"` 與 `"out"` 兩種值，缺貨一律用 `"out"`
- 顯示價格一律格式化成 `NT$ 1,688`；`pv` 只在展開詳情時顯示
- `stock === "out"` 的產品卡：整張卡淡化（`filter: grayscale(1)`、`opacity: .45`）、價格加刪除線、角落顯示「缺貨」標籤，但仍可點開看內容
- 改文案只改 JSON，不改程式

## 每次改動的流程

1. 先說明：要改哪個檔、為什麼、預期看到什麼
2. 再動手寫
3. 寫完告訴我怎麼驗證（要打開哪個網址、該看到什麼）

一次只改一個模組。不要一次重寫多個檔案。

## 完成標準

- 桌機與手機都能操作（手機面板從底部滑入）
- 點島、關面板、回全景，三個動作都順
- 手機中階機穩定 45fps 以上
- `prefers-reduced-motion` 時關閉動畫
- 沒有 console 錯誤
