import * as THREE from 'three';
import { ROBOT_PALETTE, JOINT_LIMITS, HOME_ANGLES } from '../constants.ts';
import { JointAngles } from '../types.ts';
import { Gripper } from './Gripper.ts';

export class RobotArm extends THREE.Group {
  // Joint Groups for forward kinematics hierarchy
  public baseGroup: THREE.Group;         // Joint 1: Yaw (Base rotation 360°)
  public shoulderGroup: THREE.Group;     // Joint 2: Pitch (Shoulder joint)
  public upperArmMesh: THREE.Group;
  public elbowGroup: THREE.Group;        // Joint 3: Pitch (Elbow joint)
  public forearmMesh: THREE.Group;
  public wristPitchGroup: THREE.Group;   // Joint 4: Pitch (Wrist tilt up/down)
  public wristRollGroup: THREE.Group;    // Joint 5: Roll (Wrist 360° axial rotation)
  public gripper: Gripper;               // End-effector

  // Current and target joint angles (in radians/values)
  public angles: JointAngles = { ...HOME_ANGLES };
  public targetAngles: JointAngles = { ...HOME_ANGLES };

  // Selectable parts for interactive touch/manipulation
  public selectableMeshes: THREE.Mesh[] = [];

  constructor() {
    super();
    this.name = 'RoboticArmAssembly';

    // Shared materials
    const whiteChassisMat = new THREE.MeshStandardMaterial({
      color: ROBOT_PALETTE.whiteChassis,
      roughness: 0.3,
      metalness: 0.15,
    });
    const darkBushingMat = new THREE.MeshStandardMaterial({
      color: ROBOT_PALETTE.darkBushing,
      roughness: 0.45,
      metalness: 0.35,
    });
    const orangeAccentMat = new THREE.MeshStandardMaterial({
      color: ROBOT_PALETTE.accentOrange,
      roughness: 0.25,
      metalness: 0.2,
      emissive: new THREE.Color(ROBOT_PALETTE.accentOrange),
      emissiveIntensity: 0.25,
    });
    const silverSteelMat = new THREE.MeshStandardMaterial({
      color: ROBOT_PALETTE.metalSilver,
      roughness: 0.2,
      metalness: 0.8,
    });

    // ==========================================
    // 1. PEDESTAL & FIXED BASE
    // ==========================================
    const staticBase = new THREE.Group();
    const basePlate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.16, 0.04, 32),
      darkBushingMat
    );
    basePlate.position.y = 0.02;
    basePlate.castShadow = true;
    basePlate.receiveShadow = true;
    staticBase.add(basePlate);

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.045, 12), silverSteelMat);
      bolt.position.set(Math.cos(angle) * 0.13, 0.023, Math.sin(angle) * 0.13);
      staticBase.add(bolt);
    }

    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.13, 0.04, 32),
      whiteChassisMat
    );
    collar.position.y = 0.06;
    collar.castShadow = true;
    staticBase.add(collar);
    this.add(staticBase);

    // ==========================================
    // 2. JOINT 1: TURNTABLE BASE (YAW - 360°)
    // ==========================================
    this.baseGroup = new THREE.Group();
    this.baseGroup.position.set(0, 0.08, 0);

    const rotatingHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.105, 0.105, 0.07, 32),
      whiteChassisMat
    );
    rotatingHub.position.y = 0.035;
    rotatingHub.castShadow = true;
    this.baseGroup.add(rotatingHub);
    this.registerSelectable(rotatingHub, 'base');

    const orangeTurntableRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.106, 0.005, 16, 32),
      orangeAccentMat
    );
    orangeTurntableRing.rotation.x = Math.PI / 2;
    orangeTurntableRing.position.y = 0.035;
    this.baseGroup.add(orangeTurntableRing);

    const bracket = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.12, 0.12),
      whiteChassisMat
    );
    bracket.position.set(0, 0.11, 0);
    bracket.castShadow = true;
    this.baseGroup.add(bracket);
    this.registerSelectable(bracket, 'shoulder');

    const shoulderCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.145, 32),
      darkBushingMat
    );
    shoulderCap.rotation.z = Math.PI / 2;
    shoulderCap.position.set(0, 0.12, 0);
    shoulderCap.castShadow = true;
    this.baseGroup.add(shoulderCap);

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const hubBoltL = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.01, 10), silverSteelMat);
      hubBoltL.rotation.z = Math.PI / 2;
      hubBoltL.position.set(0.073, 0.12 + Math.sin(angle) * 0.032, Math.cos(angle) * 0.032);
      this.baseGroup.add(hubBoltL);

      const hubBoltR = hubBoltL.clone();
      hubBoltR.position.x = -0.073;
      this.baseGroup.add(hubBoltR);
    }

    // ==========================================
    // 3. JOINT 2: SHOULDER & UPPER ARM (PITCH)
    // ==========================================
    this.shoulderGroup = new THREE.Group();
    this.shoulderGroup.position.set(0, 0.12, 0);

    this.upperArmMesh = new THREE.Group();
    const armBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.32, 0.09),
      whiteChassisMat
    );
    armBox.position.set(0, 0.16, 0);
    armBox.castShadow = true;
    this.upperArmMesh.add(armBox);
    this.registerSelectable(armBox, 'shoulder');

    const counterWeight = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.1, 0.08),
      darkBushingMat
    );
    counterWeight.position.set(0, 0.02, -0.085);
    counterWeight.castShadow = true;
    this.upperArmMesh.add(counterWeight);

    const upperStripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.082, 0.03, 0.092),
      orangeAccentMat
    );
    upperStripe.position.set(0, 0.22, 0);
    this.upperArmMesh.add(upperStripe);

    this.shoulderGroup.add(this.upperArmMesh);

    // ==========================================
    // 4. JOINT 3: ELBOW JOINT (PITCH)
    // ==========================================
    this.elbowGroup = new THREE.Group();
    this.elbowGroup.position.set(0, 0.32, 0);

    const elbowHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.11, 24),
      darkBushingMat
    );
    elbowHub.rotation.z = Math.PI / 2;
    elbowHub.castShadow = true;
    this.elbowGroup.add(elbowHub);

    this.forearmMesh = new THREE.Group();
    const forearmMain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.042, 0.22, 24),
      whiteChassisMat
    );
    forearmMain.position.set(0, 0.11, 0);
    forearmMain.castShadow = true;
    this.forearmMesh.add(forearmMain);
    this.registerSelectable(forearmMain, 'elbow');

    const electronicsBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.12, 0.045),
      whiteChassisMat
    );
    electronicsBox.position.set(0, 0.11, 0.045);
    electronicsBox.castShadow = true;
    this.forearmMesh.add(electronicsBox);

    const accentForearmStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.078, 0.015, 0.048),
      orangeAccentMat
    );
    accentForearmStrip.position.set(0, 0.14, 0.045);
    this.forearmMesh.add(accentForearmStrip);

    this.elbowGroup.add(this.forearmMesh);
    this.upperArmMesh.add(this.elbowGroup);

    // ==========================================
    // 5. JOINT 4 & 5: WRIST ASSEMBLY (PITCH & ROLL 360°)
    // ==========================================
    this.wristPitchGroup = new THREE.Group();
    this.wristPitchGroup.position.set(0, 0.22, 0); // At tip of forearm

    const wristPitchHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.075, 20),
      darkBushingMat
    );
    wristPitchHub.rotation.z = Math.PI / 2;
    wristPitchHub.castShadow = true;
    this.wristPitchGroup.add(wristPitchHub);

    // Wrist roll group spins around its local longitudinal axis (Y-axis)
    this.wristRollGroup = new THREE.Group();
    this.wristRollGroup.position.set(0, 0.035, 0);

    const wristRotator = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.045, 24),
      whiteChassisMat
    );
    wristRotator.position.set(0, 0.022, 0);
    wristRotator.castShadow = true;
    this.wristRollGroup.add(wristRotator);
    this.registerSelectable(wristRotator, 'wristRoll');

    // Visual pointer notch / orange indicator on wrist ring to easily observe 360° roll
    const wristOrangeBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.031, 0.003, 12, 24),
      orangeAccentMat
    );
    wristOrangeBand.rotation.x = Math.PI / 2;
    wristOrangeBand.position.y = 0.022;
    this.wristRollGroup.add(wristOrangeBand);

    const rollIndicatorNotch = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.012, 0.01),
      orangeAccentMat
    );
    rollIndicatorNotch.position.set(0, 0.022, 0.032);
    this.wristRollGroup.add(rollIndicatorNotch);

    // ==========================================
    // 6. END-EFFECTOR GRIPPER
    // ==========================================
    this.gripper = new Gripper();
    this.gripper.position.set(0, 0.045, 0);
    this.gripper.rotation.x = Math.PI; // Face outwards/downwards
    this.wristRollGroup.add(this.gripper);

    this.wristPitchGroup.add(this.wristRollGroup);
    this.forearmMesh.add(this.wristPitchGroup);

    this.baseGroup.add(this.shoulderGroup);
    this.add(this.baseGroup);

    this.applyAnglesImmediately(this.angles);
  }

  private registerSelectable(mesh: THREE.Mesh, jointName: string) {
    mesh.userData.jointName = jointName;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.selectableMeshes.push(mesh);
  }

  public applyAnglesImmediately(angles: JointAngles) {
    this.angles = { ...angles };
    this.targetAngles = { ...angles };

    this.baseGroup.rotation.y = this.angles.base;
    this.shoulderGroup.rotation.x = this.angles.shoulder;
    this.elbowGroup.rotation.x = this.angles.elbow;
    this.wristPitchGroup.rotation.x = this.angles.wrist;
    this.wristRollGroup.rotation.y = this.angles.wristRoll;
    this.gripper.setAperture(this.angles.gripper);
  }

  public updateInterpolation(deltaTime: number, speedMultiplier: number = 4.0): number {
    const t = Math.min(1.0, deltaTime * speedMultiplier);
    let totalDelta = 0;

    const lerpAngle = (current: number, target: number) => {
      const diff = target - current;
      totalDelta += Math.abs(diff);
      return current + diff * t;
    };

    this.angles.base = lerpAngle(this.angles.base, this.targetAngles.base);
    this.angles.shoulder = lerpAngle(this.angles.shoulder, this.targetAngles.shoulder);
    this.angles.elbow = lerpAngle(this.angles.elbow, this.targetAngles.elbow);
    this.angles.wrist = lerpAngle(this.angles.wrist, this.targetAngles.wrist);
    this.angles.wristRoll = lerpAngle(this.angles.wristRoll, this.targetAngles.wristRoll);

    const gripDiff = this.targetAngles.gripper - this.angles.gripper;
    totalDelta += Math.abs(gripDiff) * 0.5;
    this.angles.gripper += gripDiff * Math.min(1.0, deltaTime * 8.0);

    // Apply rotation transforms
    this.baseGroup.rotation.y = this.angles.base;
    this.shoulderGroup.rotation.x = this.angles.shoulder;
    this.elbowGroup.rotation.x = this.angles.elbow;
    this.wristPitchGroup.rotation.x = this.angles.wrist;
    this.wristRollGroup.rotation.y = this.angles.wristRoll; // Full 360° axial spin
    this.gripper.setAperture(this.angles.gripper);

    return totalDelta * speedMultiplier;
  }

  public setTargetJoint(joint: keyof JointAngles, value: number) {
    const limits = JOINT_LIMITS[joint];
    if (limits) {
      this.targetAngles[joint] = Math.max(limits.min, Math.min(limits.max, value));
    }
  }

  public getGripperWorldPosition(vec: THREE.Vector3): THREE.Vector3 {
    return this.gripper.getGripWorldPosition(vec);
  }
}
