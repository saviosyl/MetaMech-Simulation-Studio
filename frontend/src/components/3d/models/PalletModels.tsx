/**
 * Pallet 3D Models — EUR, Standard, and Custom Pallets
 *
 * Realistic wood pallet geometry with proper deck boards, stringers, and blocks.
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';

const matWoodLight = new THREE.MeshStandardMaterial({ color: 0xc4a574, metalness: 0.05, roughness: 0.85 });
const matWoodDark = new THREE.MeshStandardMaterial({ color: 0x8b6f47, metalness: 0.05, roughness: 0.9 });
const matNail = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.85, roughness: 0.2 });

interface PalletProps {
  parameters: Record<string, any>;
  isSelected: boolean;
}

export const PalletModel: React.FC<PalletProps> = ({ parameters, isSelected: _isSelected }) => {
  const pL = (parameters.length || 1200) / 1000;
  const pW = (parameters.width || 800) / 1000;
  const pH = (parameters.height || 144) / 1000;
  const deckStyle = parameters.deckStyle || 'standard';

  const geometry = useMemo(() => {
    const group = new THREE.Group();
    group.name = 'pallet';

    const boardThick = 0.022; // 22mm
    const blockH = pH - boardThick * 2; // blocks fill between top and bottom deck
    const blockW = 0.1;
    const blockD = 0.1;

    // ─── Top deck boards ───
    const topBoardCount = deckStyle === 'full-deck' ? Math.floor(pW / 0.08) : 5;
    const topBoardWidth = deckStyle === 'full-deck' ? pW / topBoardCount - 0.003 : 0.1;
    const topBoardSpacing = pW / topBoardCount;

    for (let i = 0; i < topBoardCount; i++) {
      const z = -pW / 2 + topBoardSpacing * (i + 0.5);
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(pL - 0.01, boardThick, topBoardWidth),
        matWoodLight,
      );
      board.position.set(0, pH - boardThick / 2, z);
      board.castShadow = true;
      board.receiveShadow = true;
      group.add(board);
    }

    // ─── Bottom deck boards (3 boards running along length) ───
    const bottomPositions = [-pW / 2 + 0.05, 0, pW / 2 - 0.05];
    for (const z of bottomPositions) {
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(pL - 0.01, boardThick, 0.1),
        matWoodDark,
      );
      board.position.set(0, boardThick / 2, z);
      board.castShadow = true;
      group.add(board);
    }

    // ─── Support blocks (3×3 grid) ───
    const blockXPositions = [-pL / 2 + blockW / 2 + 0.02, 0, pL / 2 - blockW / 2 - 0.02];
    const blockZPositions = [-pW / 2 + blockD / 2 + 0.02, 0, pW / 2 - blockD / 2 - 0.02];

    for (const bx of blockXPositions) {
      for (const bz of blockZPositions) {
        const block = new THREE.Mesh(
          new THREE.BoxGeometry(blockW, blockH, blockD),
          matWoodDark,
        );
        block.position.set(bx, boardThick + blockH / 2, bz);
        block.castShadow = true;
        group.add(block);

        // Nail head (top)
        const nail = new THREE.Mesh(
          new THREE.CylinderGeometry(0.003, 0.003, 0.004, 6),
          matNail,
        );
        nail.position.set(bx, pH - 0.001, bz);
        group.add(nail);
      }
    }

    // ─── Stringers (3 longitudinal boards between blocks) ───
    for (const bz of blockZPositions) {
      const stringer = new THREE.Mesh(
        new THREE.BoxGeometry(pL - 0.04, blockH * 0.6, 0.04),
        matWoodLight,
      );
      stringer.position.set(0, boardThick + blockH * 0.3, bz);
      group.add(stringer);
    }

    return group;
  }, [pL, pW, pH, deckStyle]);

  return <primitive object={geometry} />;
};
