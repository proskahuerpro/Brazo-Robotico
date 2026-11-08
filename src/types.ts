export type ObjectShape = 'cube' | 'cylinder' | 'sphere' | 'hexagon' | 'bar';

export interface ObjectConfig {
  id: string;
  shape: ObjectShape;
  name: string;
  color: number;
  width: number;  // in meters (e.g. 0.05 = 5 cm)
  height: number;
  depth: number;
}

export interface JointAngles {
  base: number;     // Yaw: -180 to 180 deg
  shoulder: number; // Pitch: -60 to 90 deg
  elbow: number;    // Pitch: -110 to 110 deg
  wrist: number;    // Pitch: -100 to 100 deg
  wristRoll: number;// Roll: -180 to 180 deg
  gripper: number;  // 0 (fully closed) to 1 (fully open: ~12cm)
}

export type OperationMode = 'manual' | 'auto_A_to_B' | 'auto_B_to_A' | 'continuous';

export type AutoSequenceState =
  | 'IDLE'
  | 'APPROACH_A'
  | 'DESCEND_A'
  | 'GRIP_A'
  | 'LIFT_A'
  | 'SWING_TO_B'
  | 'DESCEND_B'
  | 'RELEASE_B'
  | 'LIFT_B'
  | 'SWING_TO_A'
  | 'FINISHED';
