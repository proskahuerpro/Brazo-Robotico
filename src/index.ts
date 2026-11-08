import * as THREE from 'three';
import * as xb from 'xrblocks';

import { RobotArm } from './robot/RobotArm.ts';
import { Workstation } from './scene/Workstation.ts';
import { GrabbableManager } from './scene/GrabbableManager.ts';
import { SequenceController } from './robot/Kinematics.ts';
import { RobotSpatialUI } from './ui/RobotSpatialUI.ts';
import { RobotAudio } from './audio/RobotAudio.ts';
import { OBJECT_PRESETS } from './constants.ts';

/**
 * Main WebXR Scene integrating the robotic arm simulator, spatial workstation,
 * grabbable objects, procedural audio, and spatial UI card.
 */
class RoboticArmScene extends xb.Script {
  private workstation!: Workstation;
  private robot!: RobotArm;
  private grabbables!: GrabbableManager;
  private sequence!: SequenceController;
  private spatialUI!: RobotSpatialUI;
  private audio!: RobotAudio;

  // Scene root container that can be placed on a table in Mixed Reality
  private stageRoot!: THREE.Group;
  private isPlacingOnTable: boolean = false;
  private tempTipPos = new THREE.Vector3();

  init() {
    this.audio = new RobotAudio();

    // 1. Scene Lighting
    this.add(new THREE.HemisphereLight(0xffffff, 0x334155, 2.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(2, 4, 3);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 10;
    this.add(dirLight);

    // Subtle blue fill light from rear
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    rimLight.position.set(-2, 2, -2);
    this.add(rimLight);

    // 2. Stage Root Setup (placed at comfortable table height: y ~ 0.95m, z ~ -1.1m)
    this.stageRoot = new THREE.Group();
    this.stageRoot.position.set(0, 0.95, -1.05);
    this.stageRoot.name = 'RoboticStageRoot';
    this.add(this.stageRoot);

    // 3. Workstation with table & pedestals
    this.workstation = new Workstation();
    this.stageRoot.add(this.workstation);

    // 4. Robotic Arm
    this.robot = new RobotArm();
    this.robot.position.set(0, 0, 0); // At the center of the workstation
    this.stageRoot.add(this.robot);

    // 5. Grabbables Manager
    this.grabbables = new GrabbableManager();
    this.stageRoot.add(this.grabbables);

    // Seed initial objects on Pedestal A (Cylinder) and Pedestal B (Cube)
    this.grabbables.spawnObject(OBJECT_PRESETS[1], this.workstation.positionA, 'A');
    this.grabbables.spawnObject(OBJECT_PRESETS[0], this.workstation.positionB, 'B');

    // 6. Kinematics Sequencer
    this.sequence = new SequenceController(
      this.robot,
      this.grabbables,
      this.audio,
      (status) => {
        if (this.spatialUI) {
          this.spatialUI.statusText.text = status;
        }
      }
    );

    // 7. Spatial UI Panel
    this.spatialUI = new RobotSpatialUI(
      this.robot,
      this.sequence,
      this.grabbables,
      this.audio,
      () => {
        this.isPlacingOnTable = true;
      }
    );
    this.add(this.spatialUI);

    // Listen to direct clicks/touches on robot parts for interactive feedback
    this.setupInteractivity();
  }

  private setupInteractivity() {
    // Enable manipulation on the UI Card so users can reposition or rotate it anywhere in space
    this.spatialUI.card.xb = { manipulation: true };
  }

  update() {
    const deltaTime = xb.getDeltaTime();

    // 1. Advance automatic pick-and-place sequence if active
    this.sequence.update(deltaTime);

    // 2. Interpolate robot joints towards targets & calculate speed for servo audio
    const speed = this.robot.updateInterpolation(deltaTime);
    this.audio.setServoSpeed(speed);

    // 3. Keep UI sliders in sync during automated movements
    if (this.sequence.isBusy()) {
      this.spatialUI.updateSlidersFromRobot();
    }

    // 4. Update conveyor belt texture animation when active
    this.workstation.updateBeltAnimation(deltaTime);

    // 5. Update object physics (gravity fall to table/pedestals)
    this.robot.getGripperWorldPosition(this.tempTipPos);

    // Transform tip position to local coordinates of stageRoot for consistent object physics
    const localTipPos = this.tempTipPos.clone();
    this.stageRoot.worldToLocal(localTipPos);

    this.grabbables.updatePhysics(
      deltaTime,
      localTipPos,
      this.workstation.positionA,
      this.workstation.positionB
    );
  }

  /**
   * Surface placement on real-world table / depth mesh in WebXR
   */
  onSelectStart(event: any) {
    if (this.isPlacingOnTable && event.intersection) {
      this.stageRoot.position.copy(event.intersection.point);
      this.stageRoot.lookAt(xb.core.camera.position.x, this.stageRoot.position.y, xb.core.camera.position.z);
      this.isPlacingOnTable = false;
      this.spatialUI.statusText.text = '¡Simulador anclado en la superficie seleccionada!';
      this.audio.playMechanicalSnap();
    }
  }

  dispose() {
    this.grabbables.clearAll();
  }
}

// -----------------------------------------------------------------------
// Application Bootstrap & XR Configuration
// -----------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  const options = new xb.Options();
  options.setAppTitle('XR Robotic Arm Simulator');
  options.setAppDescription(
    'Interactive 5-DOF robotic arm simulator with pick-and-place automation, customizable grabbable objects, manual joint controls, and spatial mixed-reality placement.'
  );

  // Enable hand tracking and controller support for Meta Quest and simulated environments
  options.enableHands();
  options.hands.visualization = true;
  options.enableReticles();
  options.reticles.enabled = true;

  // Mixed Reality surface detection
  options.enableDepth();
  options.reticles.projectOnDepthMesh = true;

  // Simulator defaults for desktop testing
  options.simulator.defaultMode = xb.SimulatorMode.CONTROLLER;
  options.xrButton.showEnterSimulatorButton = true;

  xb.add(new RoboticArmScene());
  await xb.init(options);
});
