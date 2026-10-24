// 指標拾取：raycast 判斷指到哪座島，回報 hover 與點擊

import * as THREE from "three";

export function createPicker({ camera, canvas, getPickables, onHover, onClick }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoveredId = null;

  function pick(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);

    const hit = raycaster.intersectObjects(getPickables(), false)[0];
    return hit ? hit.object.userData.islandId : null;
  }

  canvas.addEventListener("pointermove", (event) => {
    const id = pick(event);

    if (id === hoveredId) return;

    hoveredId = id;
    canvas.style.cursor = id ? "pointer" : "default";
    onHover(id);
  });

  canvas.addEventListener("pointerleave", () => {
    if (hoveredId === null) return;

    hoveredId = null;
    canvas.style.cursor = "default";
    onHover(null);
  });

  canvas.addEventListener("click", (event) => onClick(pick(event)));
}
