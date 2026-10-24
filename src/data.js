// 讀取 content.json，整理成程式可用的島嶼資料

import content from "../content.json";

// zone 目前全是空字串，一律視為「未分區」，不讓下游程式遇到 undefined
function normalizeProduct(product) {
  return {
    ...product,
    zone: product.zone ?? "",
  };
}

export const islands = content.islands.map((island) => ({
  ...island,
  products: island.products.map(normalizeProduct),
}));

export const productTotal = islands.reduce(
  (sum, island) => sum + island.products.length,
  0
);
