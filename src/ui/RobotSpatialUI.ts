import * as THREE from 'three';
import * as xb from 'xrblocks';
import { RobotArm } from '../robot/RobotArm.ts';
import { SequenceController } from '../robot/Kinematics.ts';
import { GrabbableManager } from '../scene/GrabbableManager.ts';
import { RobotAudio } from '../audio/RobotAudio.ts';
import { OBJECT_PRESETS } from '../constants.ts';
import { ObjectConfig } from '../types.ts';

export class RobotSpatialUI extends THREE.Group {
  public card: xb.UICard;
  public statusText: xb.UIText;

  // Sliders for manual joints
  private sliderBase!: xb.UISlider;
  private sliderShoulder!: xb.UISlider;
  private sliderElbow!: xb.UISlider;
  private sliderWrist!: xb.UISlider;
  private sliderGripper!: xb.UISlider;

  // Values display
  private textBaseVal!: xb.UIText;
  private textShoulderVal!: xb.UIText;
  private textElbowVal!: xb.UIText;
  private textWristVal!: xb.UIText;
  private textGripperVal!: xb.UIText;

  private selectedShapeIndex: number = 0;
  private currentShapeLabel!: xb.UIText;

  constructor(
    private robot: RobotArm,
    private sequence: SequenceController,
    private grabbables: GrabbableManager,
    private audio: RobotAudio,
    private onRecalibrateTable?: () => void
  ) {
    super();
    this.name = 'RobotSpatialUI_Root';

    this.statusText = new xb.UIText({
      text: 'Listo. Selecciona un modo o mueve las articulaciones.',
      style: {
        fontSize: 14,
        textAlign: 'center',
        color: '#38bdf8',
        backgroundColor: '#0f172a',
        padding: 8,
        borderRadius: 8,
        width: '100%',
      },
    });

    const header = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      },
      children: [
        new xb.UIIcon({
          icon: 'precision_manufacturing',
          style: { width: 36, height: 36, color: '#ff6600' },
        }),
        new xb.UIPanel({
          style: { flexGrow: 1, flexDirection: 'column' },
          children: [
            new xb.UIText({
              text: 'SIMULADOR ROBÓTICO XR',
              style: { fontSize: 22, fontWeight: 'bold', color: '#ffffff' },
            }),
            new xb.UIText({
              text: 'Brazo articulado 5-DOF + Cinemática A ➔ B',
              style: { fontSize: 13, opacity: 0.75, color: '#cbd5e1' },
            }),
          ],
        }),
      ],
    });

    // -------------------------------------------------------------------
    // AUTOMATION PANEL (A -> B, B -> A, Continuous Loop, Home)
    // -------------------------------------------------------------------
    const btnAtoB = new xb.UIButton({
      label: 'A ➔ B',
      icon: 'arrow_forward',
      style: { flexGrow: 1, backgroundColor: '#1e3a8a' },
      onClick: () => {
        this.statusText.text = 'Iniciando transferencia automática A ➔ B...';
        this.sequence.startTransfer('A_to_B', false);
      },
    });

    const btnBtoA = new xb.UIButton({
      label: 'B ➔ A',
      icon: 'arrow_back',
      style: { flexGrow: 1, backgroundColor: '#065f46' },
      onClick: () => {
        this.statusText.text = 'Iniciando transferencia automática B ➔ A...';
        this.sequence.startTransfer('B_to_A', false);
      },
    });

    const btnLoop = new xb.UIButton({
      label: 'Ciclo Continuo',
      icon: 'sync',
      style: { flexGrow: 1, backgroundColor: '#7c2d12' },
      onClick: () => {
        if (this.sequence.isBusy()) {
          this.sequence.stopSequence();
          this.statusText.text = 'Ciclo continuo detenido.';
        } else {
          this.statusText.text = 'Ciclo continuo activado (Cinta transportadora).';
          this.sequence.startTransfer('A_to_B', true);
        }
      },
    });

    const btnStop = new xb.UIButton({
      label: 'Parada / Home',
      icon: 'stop',
      style: { flexGrow: 1, backgroundColor: '#374151' },
      onClick: () => {
        this.sequence.stopSequence();
        this.robot.setTargetJoint('base', 0);
        this.robot.setTargetJoint('shoulder', THREE.MathUtils.degToRad(25));
        this.robot.setTargetJoint('elbow', THREE.MathUtils.degToRad(45));
        this.robot.setTargetJoint('wrist', THREE.MathUtils.degToRad(-70));
        this.robot.setTargetJoint('gripper', 0.8);
        this.updateSlidersFromRobot();
        this.statusText.text = 'Brazo en posición de reposo (Home).';
      },
    });

    const autoControlsRow = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'row', gap: 8 },
      children: [btnAtoB, btnBtoA, btnLoop, btnStop],
    });

    // -------------------------------------------------------------------
    // OBJECT SPAWNER & SHAPES SELECTOR
    // -------------------------------------------------------------------
    this.currentShapeLabel = new xb.UIText({
      text: OBJECT_PRESETS[this.selectedShapeIndex].name,
      style: { fontSize: 15, fontWeight: 'bold', color: '#ff6600', textAlign: 'center', width: 140 },
    });

    const btnPrevShape = new xb.UIButton({
      icon: 'chevron_left',
      ariaLabel: 'Objeto anterior',
      style: { width: 40, height: 36, padding: 0 },
      onClick: () => {
        this.selectedShapeIndex = (this.selectedShapeIndex - 1 + OBJECT_PRESETS.length) % OBJECT_PRESETS.length;
        this.currentShapeLabel.text = OBJECT_PRESETS[this.selectedShapeIndex].name;
      },
    });

    const btnNextShape = new xb.UIButton({
      icon: 'chevron_right',
      ariaLabel: 'Siguiente objeto',
      style: { width: 40, height: 36, padding: 0 },
      onClick: () => {
        this.selectedShapeIndex = (this.selectedShapeIndex + 1) % OBJECT_PRESETS.length;
        this.currentShapeLabel.text = OBJECT_PRESETS[this.selectedShapeIndex].name;
      },
    });

    const btnSpawnA = new xb.UIButton({
      label: 'Crear en A',
      icon: 'add_circle',
      style: { flexGrow: 1 },
      onClick: () => {
        const preset = OBJECT_PRESETS[this.selectedShapeIndex];
        this.grabbables.spawnObject(preset, new THREE.Vector3(-0.24, 0.08, 0.22), 'A');
        this.audio.playGripClick(true);
        this.statusText.text = `Creado ${preset.name} en Punto A.`;
      },
    });

    const btnSpawnB = new xb.UIButton({
      label: 'Crear en B',
      icon: 'add_circle',
      style: { flexGrow: 1 },
      onClick: () => {
        const preset = OBJECT_PRESETS[this.selectedShapeIndex];
        this.grabbables.spawnObject(preset, new THREE.Vector3(0.24, 0.08, 0.22), 'B');
        this.audio.playGripClick(true);
        this.statusText.text = `Creado ${preset.name} en Punto B.`;
      },
    });

    const btnClearAll = new xb.UIButton({
      label: 'Limpiar',
      icon: 'delete_sweep',
      style: { width: 85, backgroundColor: '#451a1a' },
      onClick: () => {
        this.grabbables.clearAll();
        this.statusText.text = 'Escena de objetos despejada.';
      },
    });

    const objectSelectorRow = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 10,
      },
      children: [
        btnPrevShape,
        this.currentShapeLabel,
        btnNextShape,
        btnSpawnA,
        btnSpawnB,
        btnClearAll,
      ],
    });

    // -------------------------------------------------------------------
    // MANUAL JOINT SLIDERS
    // -------------------------------------------------------------------
    const baseRow = this.createJointRow('Base (Giro 360°)', -180, 180, 0, (deg) => {
      this.sequence.stopSequence();
      this.robot.setTargetJoint('base', THREE.MathUtils.degToRad(deg));
      this.textBaseVal.text = `${Math.round(deg)}°`;
    });
    this.sliderBase = baseRow.slider;
    this.textBaseVal = baseRow.valText;

    const shoulderRow = this.createJointRow('Hombro', -50, 80, 25, (deg) => {
      this.sequence.stopSequence();
      this.robot.setTargetJoint('shoulder', THREE.MathUtils.degToRad(deg));
      this.textShoulderVal.text = `${Math.round(deg)}°`;
    });
    this.sliderShoulder = shoulderRow.slider;
    this.textShoulderVal = shoulderRow.valText;

    const elbowRow = this.createJointRow('Codo', -100, 95, 45, (deg) => {
      this.sequence.stopSequence();
      this.robot.setTargetJoint('elbow', THREE.MathUtils.degToRad(deg));
      this.textElbowVal.text = `${Math.round(deg)}°`;
    });
    this.sliderElbow = elbowRow.slider;
    this.textElbowVal = elbowRow.valText;

    const wristRow = this.createJointRow('Muñeca (Pitch)', -90, 90, -70, (deg) => {
      this.sequence.stopSequence();
      this.robot.setTargetJoint('wrist', THREE.MathUtils.degToRad(deg));
      this.textWristVal.text = `${Math.round(deg)}°`;
    });
    this.sliderWrist = wristRow.slider;
    this.textWristVal = wristRow.valText;

    const gripperRow = this.createJointRow('Pinzas (Apertura 0-12cm)', 0, 100, 80, (val) => {
      this.sequence.stopSequence();
      const aperture = val / 100;
      this.robot.setTargetJoint('gripper', aperture);
      this.textGripperVal.text = `${(aperture * 12).toFixed(1)} cm`;

      // Check manual grip / release
      const tipPos = new THREE.Vector3();
      this.robot.getGripperWorldPosition(tipPos);
      if (aperture < 0.35) {
        const grasped = this.grabbables.tryGrip(tipPos, aperture);
        if (grasped) {
          this.audio.playGripClick(true);
        }
      } else {
        this.grabbables.releaseHeld(tipPos);
      }
    });
    this.sliderGripper = gripperRow.slider;
    this.textGripperVal = gripperRow.valText;

    // Extra tools: Audio Mute & XR Surface anchor
    const btnMute = new xb.UIButton({
      label: 'Sonido Servo',
      icon: 'volume_up',
      style: { flexGrow: 1 },
      onClick: () => {
        const isMuted = this.audio.toggleMute();
        btnMute.icon = isMuted ? 'volume_off' : 'volume_up';
        btnMute.label = isMuted ? 'Silenciado' : 'Sonido Servo';
      },
    });

    const btnRecalibrate = new xb.UIButton({
      label: 'Fijar en Mesa XR',
      icon: 'table_restaurant',
      style: { flexGrow: 1 },
      onClick: () => {
        this.onRecalibrateTable?.();
        this.statusText.text = 'Toca una superficie o mesa real para colocar el simulador.';
      },
    });

    const bottomToolsRow = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'row', gap: 8 },
      children: [btnMute, btnRecalibrate],
    });

    // -------------------------------------------------------------------
    // CARD ROOT CONTAINER
    // -------------------------------------------------------------------
    this.card = new xb.UICard({
      size: { width: 0.64, height: 'auto' },
      manipulation: true,
      edge: true,
      style: {
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        backgroundColor: 'rgba(15, 23, 42, 0.92)',
        borderRadius: 18,
      },
      children: [
        header,
        autoControlsRow,
        objectSelectorRow,
        baseRow.panel,
        shoulderRow.panel,
        elbowRow.panel,
        wristRow.panel,
        gripperRow.panel,
        this.statusText,
        bottomToolsRow,
      ],
    });

    // Position floating slightly to the right of the robot
    this.card.position.set(0.52, 1.4, -0.9);
    this.card.rotation.y = -0.35;
    this.add(this.card);
  }

  private createJointRow(
    title: string,
    min: number,
    max: number,
    defaultVal: number,
    onInput: (val: number) => void
  ) {
    const titleText = new xb.UIText({
      text: title,
      style: { fontSize: 14, fontWeight: 'bold', color: '#e2e8f0' },
    });

    const valText = new xb.UIText({
      text: title.includes('cm') ? '9.6 cm' : `${defaultVal}°`,
      style: { fontSize: 14, fontWeight: 'bold', color: '#38bdf8' },
    });

    const header = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      children: [titleText, valText],
    });

    const slider = new xb.UISlider({
      ariaLabel: title,
      min,
      max,
      step: 1,
      value: defaultVal,
      style: { width: '100%', height: 32 },
      onInput: (v) => onInput(v),
    });

    const panel = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'column', gap: 4 },
      children: [header, slider],
    });

    return { panel, slider, valText };
  }

  public updateSlidersFromRobot() {
    this.sliderBase.value = THREE.MathUtils.radToDeg(this.robot.angles.base);
    this.textBaseVal.text = `${Math.round(this.sliderBase.value)}°`;

    this.sliderShoulder.value = THREE.MathUtils.radToDeg(this.robot.angles.shoulder);
    this.textShoulderVal.text = `${Math.round(this.sliderShoulder.value)}°`;

    this.sliderElbow.value = THREE.MathUtils.radToDeg(this.robot.angles.elbow);
    this.textElbowVal.text = `${Math.round(this.sliderElbow.value)}°`;

    this.sliderWrist.value = THREE.MathUtils.radToDeg(this.robot.angles.wrist);
    this.textWristVal.text = `${Math.round(this.sliderWrist.value)}°`;

    const gripAperture = this.robot.angles.gripper;
    this.sliderGripper.value = gripAperture * 100;
    this.textGripperVal.text = `${(gripAperture * 12).toFixed(1)} cm`;
  }
}
