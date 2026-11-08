import * as THREE from 'three';
import { ROBOT_PALETTE } from '../constants.ts';

export class Workstation extends THREE.Group {
  public tableSurface: THREE.Mesh;
  public pedestalA: THREE.Group;
  public pedestalB: THREE.Group;

  // Exact coordinates of Pedestals A and B
  // Pedestal A (Left / Origin): x: -0.25, y: 0.075, z: 0.22
  // Pedestal B (Right / Destination): x: 0.25, y: 0.075, z: 0.22
  public readonly positionA = new THREE.Vector3(-0.25, 0.075, 0.22);
  public readonly positionB = new THREE.Vector3(0.25, 0.075, 0.22);

  constructor() {
    super();
    this.name = 'WorkstationBase';

    // 1. Sleek tabletop workbench with chamfered edge
    const tableMat = new THREE.MeshStandardMaterial({
      color: ROBOT_PALETTE.tableSurface,
      roughness: 0.7,
      metalness: 0.2,
    });
    const tableGeom = new THREE.BoxGeometry(0.95, 0.04, 0.65);
    this.tableSurface = new THREE.Mesh(tableGeom, tableMat);
    this.tableSurface.position.set(0, -0.02, 0.08);
    this.tableSurface.receiveShadow = true;
    this.add(this.tableSurface);

    // Decorative grid lines on work surface
    const gridHelper = new THREE.GridHelper(0.85, 14, 0xff6600, 0x334155);
    gridHelper.position.set(0, 0.001, 0.08);
    this.add(gridHelper);

    // 2. Pedestal A (Origin / Pick-up)
    this.pedestalA = this.createPedestal('A', ROBOT_PALETTE.pedestalA);
    this.pedestalA.position.set(this.positionA.x, 0, this.positionA.z);
    this.add(this.pedestalA);

    // 3. Pedestal B (Destination / Drop-off)
    this.pedestalB = this.createPedestal('B', ROBOT_PALETTE.pedestalB);
    this.pedestalB.position.set(this.positionB.x, 0, this.positionB.z);
    this.add(this.pedestalB);
  }

  private createPedestal(label: string, colorHex: number): THREE.Group {
    const group = new THREE.Group();

    // Base cylinder
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.4,
      metalness: 0.5,
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.07, 32), baseMat);
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
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.074, 0.004, 12, 32), glowMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.07;
    group.add(rim);

    // Target pad landing surface (height = 0.075m)
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.8,
    });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.006, 32), padMat);
    pad.position.y = 0.073;
    pad.receiveShadow = true;
    group.add(pad);

    // Label plate on pedestal
    const labelMesh = this.createLabelPlate(`PUNTO ${label}`, colorHex);
    labelMesh.position.set(0, 0.035, 0.087);
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
    const geom = new THREE.PlaneGeometry(0.075, 0.038);
    return new THREE.Mesh(geom, mat);
  }
}
