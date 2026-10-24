// 依島嶼資料生成六角島：排列、配色、hover 狀態

import * as THREE from "three";

const RADIUS = 3.2;
const SLAB_HEIGHT = 1.1;

// 依數量自動算格線，不寫死座標
function layoutPositions(count) {
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const xStep = RADIUS * 2.2;
  const zStep = RADIUS * 1.95;
  const positions = [];

  for (let i = 0; i < count; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions.push(
      new THREE.Vector3(
        (col - (cols - 1) / 2) * xStep,
        0,
        (row - (rows - 1) / 2) * zStep
      )
    );
  }

  return positions;
}

function buildIsland(island, position) {
  const group = new THREE.Group();
  group.position.copy(position);

  const topColor = new THREE.Color(island.color);

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(RADIUS, RADIUS, SLAB_HEIGHT, 6),
    new THREE.MeshLambertMaterial({ color: topColor, transparent: true })
  );
  top.position.y = SLAB_HEIGHT / 2;

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(RADIUS, RADIUS * 0.86, 0.5, 6),
    new THREE.MeshLambertMaterial({
      color: topColor.clone().multiplyScalar(0.72),
      transparent: true,
    })
  );
  rim.position.y = -0.05;

  top.userData.islandId = island.id;
  top.userData.baseColor = topColor;
  group.add(top, rim);

  return { group, top, rim };
}

export function createWorld(islands) {
  const group = new THREE.Group();
  const positions = layoutPositions(islands.length);
  const pickables = [];
  const entries = [];
  let focusId = null;

  islands.forEach((island, index) => {
    const built = buildIsland(island, positions[index]);
    group.add(built.group);
    pickables.push(built.top);
    entries.push({
      id: island.id,
      group: built.group,
      meshes: [built.top, built.rim],
    });
  });

  function setHovered(id) {
    pickables.forEach((mesh) => {
      const lit = mesh.userData.islandId === id && !!id;
      const active = !focusId || mesh.userData.islandId === focusId;

      if (lit && active) {
        mesh.material.emissive
          .copy(mesh.userData.baseColor)
          .multiplyScalar(0.34);
      } else {
        mesh.material.emissive.setRGB(0, 0, 0);
      }
    });
  }

  // 飛到單一島時把其他島淡出，讓被選中的島一眼看得出來
  function setFocus(id) {
    focusId = id;

    entries.forEach((entry) => {
      const opacity = !id || entry.id === id ? 1 : 0.18;

      entry.meshes.forEach((mesh) => {
        mesh.material.opacity = opacity;
      });
    });

    setHovered(null);
  }

  // 飛到單一島時只讓那一座島可以被點，其他島淡出也不擋操作
  function getPickables() {
    return focusId
      ? pickables.filter((mesh) => mesh.userData.islandId === focusId)
      : pickables;
  }

  return { group, pickables, setHovered, setFocus, getPickables, islands: entries };
}
