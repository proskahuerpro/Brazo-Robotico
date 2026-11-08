import * as THREE from 'three';
import { ObjectConfig } from './types.ts';

// Robotic arm joint angular limits (in radians)
export const JOINT_LIMITS = {
  base: { min: -Math.PI, max: Math.PI },               // 360 degrees full rotation
  shoulder: { min: -THREE.MathUtils.degToRad(55), max: THREE.MathUtils.degToRad(85) },
  elbow: { min: -THREE.MathUtils.degToRad(110), max: THREE.MathUtils.degToRad(100) },
  wrist: { min: -THREE.MathUtils.degToRad(100), max: THREE.MathUtils.degToRad(100) },
  wristRoll: { min: -Math.PI, max: Math.PI },
  gripper: { min: 0.0, max: 1.0 },                   // 0 = closed, 1 = open (~12cm)
};

// Default home pose
export const HOME_ANGLES = {
  base: 0,
  shoulder: THREE.MathUtils.degToRad(25),
  elbow: THREE.MathUtils.degToRad(45),
  wrist: THREE.MathUtils.degToRad(-70),
  wristRoll: 0,
  gripper: 0.8,
};

// Materials & Aesthetics
export const ROBOT_PALETTE = {
  whiteChassis: 0xf3f4f6,
  darkBushing: 0x22262d,
  darkEdge: 0x111317,
  accentOrange: 0xff6600,
  accentOrangeGlow: 0xff8822,
  metalSilver: 0x9ca3af,
  rubberPad: 0x1e293b,
  pedestalA: 0x0ea5e9, // Cyan-blue indicator
  pedestalB: 0x10b981, // Emerald green indicator
  tableSurface: 0x1e232b,
};

// Preconfigured grabbable objects sized for the gripper (max opening 12 cm = 0.12m)
export const OBJECT_PRESETS: ObjectConfig[] = [
  {
    id: 'cube_orange',
    shape: 'cube',
    name: 'Cubo Industrial',
    color: 0xff7722,
    width: 0.048,
    height: 0.048,
    depth: 0.048,
  },
  {
    id: 'cylinder_cyan',
    shape: 'cylinder',
    name: 'Cilindro Hidráulico',
    color: 0x06b6d4,
    width: 0.046,
    height: 0.065,
    depth: 0.046,
  },
  {
    id: 'sphere_yellow',
    shape: 'sphere',
    name: 'Esfera Calibrada',
    color: 0xeab308,
    width: 0.05,
    height: 0.05,
    depth: 0.05,
  },
  {
    id: 'hexagon_purple',
    shape: 'hexagon',
    name: 'Prisma Hexagonal',
    color: 0xa855f7,
    width: 0.052,
    height: 0.06,
    depth: 0.052,
  },
  {
    id: 'bar_red',
    shape: 'bar',
    name: 'Barra Rectangular',
    color: 0xef4444,
    width: 0.038,
    height: 0.075,
    depth: 0.038,
  },
];
