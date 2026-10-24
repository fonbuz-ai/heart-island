// 進入點：建立場景、燈光、六角島，處理 hover 與點擊，跑渲染迴圈

import * as THREE from "three";
import { islands } from "./data.js";
import { createWorld } from "./world.js";
import { createRig, ISLAND_DIR } from "./camera.js";
import { createPicker } from "./pick.js";
import { createPanel } from "./panel.js";

const canvas = document.getElementById("scene");
const fpsLabel = document.getElementById("fps");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#e7d9cd");

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(22, 22),
  new THREE.MeshLambertMaterial({ color: "#f4e8de" })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// three 的 Lambert 材質在物理光照下會除以 π，環境光需拉到 ~2 才會呈現原色
scene.add(new THREE.AmbientLight(0xffffff, 1.7));

// 只有環境光的話島的側面與頂面同色，看起來像貼紙，補一顆方向光做出立體感
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(-6, 10, 5);
scene.add(sun);

// ③ 六角島（排列由島數自動決定，不寫死座標）
const world = createWorld(islands);
scene.add(world.group);

const boardBox = new THREE.Box3()
  .setFromObject(world.group)
  .expandByScalar(0.4);

// ④ 相機飛行：全景 ↔ 單一島
const rig = createRig(camera);
const backBtn = document.getElementById("back");
let activeBox = boardBox;
let activeMargin = 1.04;
let activeDir;
let activeOffset = { x: 0, y: 0 };
let activeId = null;

const panel = createPanel({ onClose: () => goOverview() });

rig.snap(boardBox, activeMargin);

function goOverview() {
  activeBox = boardBox;
  activeMargin = 1.04;
  activeDir = undefined;
  activeOffset = { x: 0, y: 0 };
  activeId = null;
  rig.flyTo(activeBox, activeMargin, activeDir, activeOffset);
  world.setFocus(null);
  panel.close();
  backBtn.hidden = true;
}

function goIsland(entry) {
  if (entry.id === activeId) return;

  activeId = entry.id;
  activeBox = new THREE.Box3().setFromObject(entry.group);
  activeMargin = 1.35;
  activeDir = ISLAND_DIR;
  panel.open(entry.id);
  activeOffset = panel.getViewOffset();
  rig.flyTo(activeBox, activeMargin, activeDir, activeOffset);
  world.setFocus(entry.id);
  backBtn.hidden = false;
}

backBtn.addEventListener("click", goOverview);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") goOverview();
});

createPicker({
  camera,
  canvas,
  getPickables: () => world.getPickables(),
  onHover: (id) => world.setHovered(id),
  onClick: (id) => {
    if (!rig.isSettled()) return;

    if (!id) {
      goOverview();
      return;
    }

    const entry = world.islands.find((item) => item.id === id);
    if (!entry) return;

    console.log("island:", id);
    goIsland(entry);  },
});

function onResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  activeOffset = panel.getViewOffset();
  rig.snap(activeBox, activeMargin, activeDir, activeOffset);
}

window.addEventListener("resize", onResize);

let frames = 0;
let fpsWindow = 0;

function updateFps(delta) {
  frames += 1;
  fpsWindow += delta;

  if (fpsWindow >= 0.5) {
    fpsLabel.textContent = `${Math.round(frames / fpsWindow)} FPS`;
    frames = 0;
    fpsWindow = 0;
  }
}

const timer = new THREE.Clock();

function tick() {
  const delta = timer.getDelta();

  rig.update(delta);
  updateFps(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
