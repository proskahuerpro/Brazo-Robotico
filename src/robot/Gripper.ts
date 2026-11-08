import * as THREE from 'three';
import { ROBOT_PALETTE } from '../constants.ts';

export class Gripper extends THREE.Group {
  public leftFinger: THREE.Group;
  public rightFinger: THREE.Group;
  public leftPad: THREE.Mesh;
  public rightPad: THREE.Mesh;
  public tipTarget: THREE.Group; // Position where objects are held

  private currentAperture: number = 0.8; // 0 (closed) to 1 (max open ~ 12cm)
  private maxFingerSpread: number = 0.058; // 5.8cm each side = 11.6cm total

  constructor() {
    super();
    this.name = 'RobotGripper';

    const bodyMat = new THREE.MeshStandardMaterial({
      color: ROBOT_PALETTE.whiteChassis,
      roughness: 0.25,
      metalness: 0.15,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: ROBOT_PALETTE.darkBushing,
      roughness: 0.4,
      metalness: 0.4,
    });
    const orangeMat = new THREE.MeshStandardMaterial({
      color: ROBOT_PALETTE.accentOrange,
      roughness: 0.2,
      metalness: 0.1,
      emissive: new THREE.Color(ROBOT_PALETTE.accentOrange),
      emissiveIntensity: 0.25,
    });
    const rubberMat = new THREE.MeshStandardMaterial({
      color: ROBOT_PALETTE.rubberPad,
      roughness: 0.9,
    });

    // 1. Palm / Gripper base block
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.03, 0.06), bodyMat);
    palm.castShadow = true;
    this.add(palm);

    // Indicator light on gripper
    const statusLight = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 16), orangeMat);
    statusLight.rotation.x = Math.PI / 2;
    statusLight.position.set(0, 0, 0.031);
    this.add(statusLight);

    // 2. Left finger assembly (Two articulated segments matching the reference drawing)
    this.leftFinger = new THREE.Group();
    this.leftFinger.position.set(-0.022, -0.015, 0);

    // Proximal segment
    const leftProx = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.045, 0.016), darkMat);
    leftProx.position.set(0, -0.022, 0);
    leftProx.rotation.z = THREE.MathUtils.degToRad(-15);
    leftProx.castShadow = true;
    this.leftFinger.add(leftProx);

    // Distal claw segment angled inwards
    const leftDistal = new THREE.Group();
    leftDistal.position.set(-0.006, -0.042, 0);
    leftDistal.rotation.z = THREE.MathUtils.degToRad(35);

    const leftClaw = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.042, 0.014), bodyMat);
    leftClaw.position.set(0, -0.02, 0);
    leftClaw.castShadow = true;
    leftDistal.add(leftClaw);

    // Rubber friction pad (facing the center)
    this.leftPad = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.034, 0.012), rubberMat);
    this.leftPad.position.set(0.006, -0.02, 0);
    leftDistal.add(this.leftPad);

    this.leftFinger.add(leftDistal);
    this.add(this.leftFinger);

    // 3. Right finger assembly (Mirrored)
    this.rightFinger = new THREE.Group();
    this.rightFinger.position.set(0.022, -0.015, 0);

    const rightProx = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.045, 0.016), darkMat);
    rightProx.position.set(0, -0.022, 0);
    rightProx.rotation.z = THREE.MathUtils.degToRad(15);
    rightProx.castShadow = true;
    this.rightFinger.add(rightProx);

    const rightDistal = new THREE.Group();
    rightDistal.position.set(0.006, -0.042, 0);
    rightDistal.rotation.z = THREE.MathUtils.degToRad(-35);

    const rightClaw = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.042, 0.014), bodyMat);
    rightClaw.position.set(0, -0.02, 0);
    rightClaw.castShadow = true;
    rightDistal.add(rightClaw);

    this.rightPad = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.034, 0.012), rubberMat);
    this.rightPad.position.set(-0.006, -0.02, 0);
    rightDistal.add(this.rightPad);

    this.rightFinger.add(rightDistal);
    this.add(this.rightFinger);

    // 4. Focal point for grasped objects
    this.tipTarget = new THREE.Group();
    this.tipTarget.position.set(0, -0.065, 0);
    this.add(this.tipTarget);

    // Initialize aperture
    this.setAperture(this.currentAperture);
  }

  /**
   * Sets gripper opening from 0 (closed) to 1 (full open)
   */
  public setAperture(value: number) {
    this.currentAperture = Math.min(1.0, Math.max(0.0, value));
    const offset = (this.currentAperture - 0.5) * this.maxFingerSpread;
    this.leftFinger.position.x = -0.018 - offset;
    this.rightFinger.position.x = 0.018 + offset;

    // Angle rotation subtly adjusts as it opens/closes
    this.leftFinger.rotation.z = THREE.MathUtils.degToRad(-10 * (1 - this.currentAperture));
    this.rightFinger.rotation.z = THREE.MathUtils.degToRad(10 * (1 - this.currentAperture));
  }

  public getAperture(): number {
    return this.currentAperture;
  }

  /**
   * Gets world coordinates of grip center
   */
  public getGripWorldPosition(targetVec: THREE.Vector3): THREE.Vector3 {
    return this.tipTarget.getWorldPosition(targetVec);
  }
}
