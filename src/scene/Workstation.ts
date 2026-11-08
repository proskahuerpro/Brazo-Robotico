import * as THREE from 'three';
import { ROBOT_PALETTE } from '../constants.ts';

export class Workstation extends THREE.Group {
  public tableSurface: THREE.Mesh;
  public pedestalA: THREE.Group;
  public pedestalB: THREE.Group;
  public conveyorBelt: THREE.Group;
  private beltTexture: THREE.CanvasTexture | null = null;

  // World coordinates of Pedestals A and B (relative to workstation origin)
  public readonly positionA = new THREE.Vector3(-0.24, 0.08, 0.22);
  public readonly positionB = new THREE.Vector3(0.24, 0.08, 0.22);

  constructor() {
    super();
    this.name = 'WorkstationBase';

    // 1. Sleek tabletop workbench with chamfered edge
    const tableMat = new THREE.MeshStandardMaterial({
      color: ROBOT_PALETTE.tableSurface,
      roughness: 0.7,
      metalness: 0.2,
    });
    const tableGeom = new THREE.BoxGeometry(1.0, 0.04, 0.75);
    this.tableSurface = new THREE.Mesh(tableGeom, tableMat);
    this.tableSurface.position.set(0, -0.02, 0.1);
    this.tableSurface.receiveShadow = true;
    this.add(this.tableSurface);

    // Decorative grid lines on work surface
    const gridHelper = new THREE.GridHelper(0.9, 18, 0xff6600, 0x334155);
    gridHelper.position.set(0, 0.001, 0.1);
    this.add(gridHelper);

    // 2. Pedestal A (Origin / Pick-up)
    this.pedestalA = this.createPedestal('A', ROBOT_PALETTE.pedestalA);
    this.pedestalA.position.copy(this.positionA);
    this.add(this.pedestalA);

    // 3. Pedestal B (Destination / Drop-off)
    this.pedestalB = this.createPedestal('B', ROBOT_PALETTE.pedestalB);
    this.pedestalB.position.copy(this.positionB);
    this.add(this.pedestalB);

    // 4. Animated Conveyor Belt linking between A and B
    this.conveyorBelt = this.createConveyorBelt();
    this.conveyorBelt.position.set(0, 0.02, 0.32);
    this.add(this.conveyorBelt);
  }

  private createPedestal(label: string, colorHex: number): THREE.Group {
    const group = new THREE.Group();

    // Base cylinder
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.4,
      metalness: 0.5,
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.07, 24), baseMat);
    base.position.y = 0.035;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Glowing rim
    const glowMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: new THREE.Color(colorHex),
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.004, 12, 24), glowMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.07;
    group.add(rim);

    // Target pad surface
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.8,
    });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.005, 24), padMat);
    pad.position.y = 0.072;
    pad.receiveShadow = true;
    group.add(pad);

    // Label on pedestal
    const labelMesh = this.createLabelPlate(`PUNTO ${label}`, colorHex);
    labelMesh.position.set(0, 0.035, 0.082);
    group.add(labelMesh);

    return group;
  }

  private createLabelPlate(text: string, colorHex: number): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0f172a';
    ctx.roundRect(8, 8, 240, 112, 20);
    ctx.fill();

    ctx.strokeStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 6;
    ctx.roundRect(8, 8, 240, 112, 20);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const geom = new THREE.PlaneGeometry(0.07, 0.035);
    return new THREE.Mesh(geom, mat);
  }

  private createConveyorBelt(): THREE.Group {
    const group = new THREE.Group();

    // Belt frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.03, 0.12), frameMat);
    frame.castShadow = true;
    group.add(frame);

    // Belt surface texture with striped pattern
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#38bdf8';
    for (let x = 0; x < 256; x += 32) {
      ctx.fillRect(x, 0, 6, 64);
    }

    this.beltTexture = new THREE.CanvasTexture(canvas);
    this.beltTexture.wrapS = THREE.RepeatWrapping;
    this.beltTexture.wrapT = THREE.RepeatWrapping;
    this.beltTexture.repeat.set(4, 1);

    const beltMat = new THREE.MeshStandardMaterial({
      map: this.beltTexture,
      roughness: 0.6,
    });
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.63, 0.005, 0.1), beltMat);
    belt.position.y = 0.017;
    group.add(belt);

    return group;
  }

  public updateBeltAnimation(deltaTime: number, speed: number = 0.4) {
    if (this.beltTexture) {
      this.beltTexture.offset.x -= deltaTime * speed;
    }
  }
}
