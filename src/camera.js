// 相機框景與飛行：依外框反算距離，用指數插值平滑移動

import * as THREE from "three";

const VIEW_DIR = new THREE.Vector3(0, 0.72, 1).normalize();
// 飛到單島時改用更陡的俯角，避免前面的島擋住後面的島
export const ISLAND_DIR = new THREE.Vector3(0, 1.7, 1).normalize();
const DAMP = 6;
const ZERO = { x: 0, y: 0 };

function fitBox(box, camera, margin, dir, offset) {
  const center = box.getCenter(new THREE.Vector3());
  const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const right = new THREE.Vector3()
    .crossVectors(new THREE.Vector3(0, 1, 0), dir)
    .normalize();
  const up = new THREE.Vector3().crossVectors(dir, right).normalize();

  const halfW =
    Math.abs(half.x * right.x) +
    Math.abs(half.y * right.y) +
    Math.abs(half.z * right.z);
  const halfH =
    Math.abs(half.x * up.x) +
    Math.abs(half.y * up.y) +
    Math.abs(half.z * up.z);
  const depth =
    Math.abs(half.x * dir.x) + Math.abs(half.y * dir.y) + Math.abs(half.z * dir.z);

  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const distance =
    Math.max(halfW / Math.tan(hFov / 2), halfH / Math.tan(vFov / 2)) * margin +
    depth;

  // offset 是「畫面內容要往哪邊挪」的比例（x 往左、y 往上），用來避開面板
  const shift = right
    .clone()
    .multiplyScalar(offset.x * distance * Math.tan(hFov / 2))
    .addScaledVector(up, -offset.y * distance * Math.tan(vFov / 2));

  return {
    position: center.clone().addScaledVector(dir, distance).add(shift),
    look: center.clone().add(shift),
  };
}

export function createRig(camera) {
  const goalPos = new THREE.Vector3();
  const goalLook = new THREE.Vector3();
  const look = new THREE.Vector3();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let settled = false;

  function setGoal(box, margin, dir, offset) {
    const target = fitBox(box, camera, margin, dir, offset);
    goalPos.copy(target.position);
    goalLook.copy(target.look);
    settled = false;
  }

  function flyTo(box, margin = 1.04, dir = VIEW_DIR, offset = ZERO) {
    setGoal(box, margin, dir, offset);
  }

  // 視窗尺寸改變時直接到位，不要讓畫面在縮放時持續飄動
  function snap(box, margin = 1.04, dir = VIEW_DIR, offset = ZERO) {
    setGoal(box, margin, dir, offset);
    camera.position.copy(goalPos);
    look.copy(goalLook);
    camera.lookAt(look);
    settled = true;
  }

  function update(dt) {
    const k = reduced ? 1 : 1 - Math.exp(-DAMP * dt);

    camera.position.lerp(goalPos, k);
    look.lerp(goalLook, k);
    camera.lookAt(look);

    if (camera.position.distanceTo(goalPos) < 0.02) settled = true;
  }

  return { flyTo, snap, update, isSettled: () => settled };
}
