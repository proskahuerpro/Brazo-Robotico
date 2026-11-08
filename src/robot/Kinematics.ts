import * as THREE from 'three';
import { JointAngles, AutoSequenceState } from '../types.ts';
import { RobotArm } from '../robot/RobotArm.ts';
import { GrabbableManager } from '../scene/GrabbableManager.ts';
import { RobotAudio } from '../audio/RobotAudio.ts';

// Precomputed accurate inverse kinematics waypoints for Pedestal A and Pedestal B
// Pedestal A is around x: -0.24, z: 0.22 (base yaw around +138 deg / 2.4 rad or -2.4 rad depending on orientation)
// Pedestal B is around x: 0.24, z: 0.22 (base yaw around +42 deg / 0.74 rad)
const POSE_PRE_A: JointAngles = {
  base: THREE.MathUtils.degToRad(-42),
  shoulder: THREE.MathUtils.degToRad(32),
  elbow: THREE.MathUtils.degToRad(40),
  wrist: THREE.MathUtils.degToRad(-72),
  wristRoll: 0,
  gripper: 0.85, // Open ready to grasp
};

const POSE_GRAB_A: JointAngles = {
  base: THREE.MathUtils.degToRad(-42),
  shoulder: THREE.MathUtils.degToRad(48),
  elbow: THREE.MathUtils.degToRad(46),
  wrist: THREE.MathUtils.degToRad(-94),
  wristRoll: 0,
  gripper: 0.85,
};

const POSE_LIFT_A: JointAngles = {
  base: THREE.MathUtils.degToRad(-42),
  shoulder: THREE.MathUtils.degToRad(20),
  elbow: THREE.MathUtils.degToRad(30),
  wrist: THREE.MathUtils.degToRad(-50),
  wristRoll: 0,
  gripper: 0.2, // Clamped
};

const POSE_PRE_B: JointAngles = {
  base: THREE.MathUtils.degToRad(42),
  shoulder: THREE.MathUtils.degToRad(20),
  elbow: THREE.MathUtils.degToRad(30),
  wrist: THREE.MathUtils.degToRad(-50),
  wristRoll: 0,
  gripper: 0.2, // Held during transit
};

const POSE_DROP_B: JointAngles = {
  base: THREE.MathUtils.degToRad(42),
  shoulder: THREE.MathUtils.degToRad(48),
  elbow: THREE.MathUtils.degToRad(46),
  wrist: THREE.MathUtils.degToRad(-94),
  wristRoll: 0,
  gripper: 0.2,
};

const POSE_LIFT_B: JointAngles = {
  base: THREE.MathUtils.degToRad(42),
  shoulder: THREE.MathUtils.degToRad(20),
  elbow: THREE.MathUtils.degToRad(30),
  wrist: THREE.MathUtils.degToRad(-50),
  wristRoll: 0,
  gripper: 0.85,
};

export class SequenceController {
  public state: AutoSequenceState = 'IDLE';
  private timer: number = 0;
  private isContinuous: boolean = false;
  private currentDirection: 'A_to_B' | 'B_to_A' = 'A_to_B';
  private gripWorldPos = new THREE.Vector3();

  constructor(
    private robot: RobotArm,
    private grabbables: GrabbableManager,
    private audio: RobotAudio,
    private onStateChange?: (state: string) => void
  ) {}

  public startTransfer(direction: 'A_to_B' | 'B_to_A', continuous: boolean = false) {
    this.currentDirection = direction;
    this.isContinuous = continuous;
    this.timer = 0;

    if (direction === 'A_to_B') {
      this.transitionTo('APPROACH_A');
      this.robot.targetAngles = { ...POSE_PRE_A };
    } else {
      this.transitionTo('SWING_TO_B');
      this.robot.targetAngles = { ...POSE_PRE_B, gripper: 0.85 };
    }
  }

  public stopSequence() {
    this.state = 'IDLE';
    this.isContinuous = false;
    this.onStateChange?.('Secuencia detenida (Modo Manual)');
  }

  private transitionTo(newState: AutoSequenceState) {
    this.state = newState;
    this.timer = 0;
    this.onStateChange?.(`Auto: ${newState}`);
  }

  public update(deltaTime: number) {
    if (this.state === 'IDLE' || this.state === 'FINISHED') return;

    this.timer += deltaTime;

    switch (this.state) {
      // -------------------------------------------------------------
      // TRANSFER SEQUENCE A -> B
      // -------------------------------------------------------------
      case 'APPROACH_A':
        if (this.timer > 1.2) {
          this.transitionTo('DESCEND_A');
          this.robot.targetAngles = { ...POSE_GRAB_A };
        }
        break;

      case 'DESCEND_A':
        if (this.timer > 1.1) {
          this.transitionTo('GRIP_A');
          this.robot.targetAngles.gripper = 0.15; // Close fingers on object
        }
        break;

      case 'GRIP_A':
        if (this.timer > 0.6) {
          this.robot.getGripperWorldPosition(this.gripWorldPos);
          const grasped = this.grabbables.tryGrip(this.gripWorldPos, this.robot.angles.gripper);
          if (grasped) {
            this.audio.playGripClick(true);
            this.audio.playMechanicalSnap();
          }
          this.transitionTo('LIFT_A');
          this.robot.targetAngles = { ...POSE_LIFT_A };
        }
        break;

      case 'LIFT_A':
        if (this.timer > 1.0) {
          this.transitionTo('SWING_TO_B');
          this.robot.targetAngles = { ...POSE_PRE_B, gripper: 0.15 };
        }
        break;

      case 'SWING_TO_B':
        if (this.timer > 1.6) {
          this.transitionTo('DESCEND_B');
          this.robot.targetAngles = { ...POSE_DROP_B, gripper: 0.15 };
        }
        break;

      case 'DESCEND_B':
        if (this.timer > 1.0) {
          this.transitionTo('RELEASE_B');
          this.robot.targetAngles.gripper = 0.85; // Open fingers to drop
        }
        break;

      case 'RELEASE_B':
        if (this.timer > 0.5) {
          this.robot.getGripperWorldPosition(this.gripWorldPos);
          this.grabbables.releaseHeld(this.gripWorldPos, 'B');
          this.audio.playMechanicalSnap();
          this.transitionTo('LIFT_B');
          this.robot.targetAngles = { ...POSE_LIFT_B };
        }
        break;

      case 'LIFT_B':
        if (this.timer > 1.0) {
          if (this.isContinuous) {
            // Loop automatically back to A
            this.transitionTo('SWING_TO_A');
            this.robot.targetAngles = { ...POSE_PRE_A };
          } else {
            this.state = 'FINISHED';
            this.onStateChange?.('Transferencia A → B finalizada con éxito.');
          }
        }
        break;

      case 'SWING_TO_A':
        if (this.timer > 1.6) {
          // Restart pick and place loop
          this.transitionTo('APPROACH_A');
          this.robot.targetAngles = { ...POSE_PRE_A };
        }
        break;
    }
  }

  public isBusy(): boolean {
    return this.state !== 'IDLE' && this.state !== 'FINISHED';
  }
}
