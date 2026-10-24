// 產品面板：桌機右側滑入、手機底部滑入，內容全部來自 content.json

import { islands } from "./data.js";

function money(value) {
  return `NT$ ${value.toLocaleString("en-US")}`;
}

function card(product) {
  const out = product.stock === "out";
  const price = out
    ? `<s>${money(product.price)}</s>`
    : money(product.price);

  return `
    <article class="card${out ? " is-out" : ""}">
      ${out ? '<span class="sold-out">缺貨</span>' : ""}
      <h3>${product.name}</h3>
      <span class="tag">${product.tag}</span>
      <div class="price">${price}</div>
      <details>
        <summary>詳情</summary>
        <dl>
          <div><dt>PV</dt><dd>${product.pv.toLocaleString("en-US")}</dd></div>
          <div><dt>商品編號</dt><dd>${product.sku}</dd></div>
        </dl>
        <p>${product.desc}</p>
      </details>
    </article>
  `;
}

export function createPanel({ onClose }) {
  const panel = document.createElement("aside");
  panel.id = "panel";
  panel.setAttribute("aria-hidden", "true");
  panel.innerHTML = `
    <header>
      <div class="head-text">
        <span class="island-no"></span>
        <h2></h2>
      </div>
      <button class="close" type="button" aria-label="關閉">×</button>
    </header>
    <div class="list"></div>
  `;

  const headNo = panel.querySelector(".island-no");
  const headName = panel.querySelector("h2");
  const list = panel.querySelector(".list");
  document.body.append(panel);

  let openId = null;

  function close() {
    if (!openId) return;

    openId = null;
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
  }

  function open(id) {
    const island = islands.find((item) => item.id === id);
    if (!island) return;

    openId = id;
    headNo.textContent = island.no;
    headName.textContent = island.name;
    panel.style.setProperty("--accent", island.color);
    list.innerHTML = island.products.map(card).join("");
    list.scrollTop = 0;

    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
  }

  panel.querySelector(".close").addEventListener("click", onClose);

  // 相機要把島推到面板以外的地方，避免被面板蓋住
  function getViewOffset() {
    if (!openId) return { x: 0, y: 0 };

    return window.matchMedia("(max-width: 720px)").matches
      ? { x: 0, y: 0.55 }
      : { x: 0.22, y: 0 };
  }

  return { open, close, getViewOffset, isOpen: () => !!openId };
}
