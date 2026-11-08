import * as THREE from 'three';
import { ObjectConfig } from '../types.ts';
import { OBJECT_PRESETS } from '../constants.ts';

export interface GrabbableItem {
  id: string;
  config: ObjectConfig;
  mesh: THREE.Mesh;
  isHeld: boolean;
  targetSlot: 'A' | 'B' | 'free';
  velocity: THREE.Vector3;
}

export class GrabbableManager extends THREE.Group {
  public items: GrabbableItem[] = [];
  public currentlyHeld: GrabbableItem | null = null;

  constructor() {
    super();
    this.name = 'GrabbableObjectsManager';
  }

  /**
   * Spawns an object of given shape and config at the specified position
   */
  public spawnObject(
    config: ObjectConfig,
    position: THREE.Vector3,
    slot: 'A' | 'B' | 'free' = 'free'
  ): GrabbableItem {
    // If a piece already occupies this slot, remove it first
    if (slot !== 'free') {
      const existing = this.items.find((it) => it.targetSlot === slot && !it.isHeld);
      if (existing) {
        this.removeItem(existing);
      }
    }

    const geometry = this.createGeometryForShape(config);
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.3,
      metalness: 0.2,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(position);
    mesh.position.y += config.height / 2; // Offset so bottom sits flat on pedestal/table

    this.add(mesh);

    const item: GrabbableItem = {
      id: `${config.id}_${Date.now()}`,
      config,
      mesh,
      isHeld: false,
      targetSlot: slot,
      velocity: new THREE.Vector3(),
    };

    this.items.push(item);
    return item;
  }

  private createGeometryForShape(config: ObjectConfig): THREE.BufferGeometry {
    switch (config.shape) {
      case 'cube':
        return new THREE.BoxGeometry(config.width, config.height, config.depth);
      case 'cylinder':
        return new THREE.CylinderGeometry(config.width / 2, config.width / 2, config.height, 24);
      case 'sphere':
        return new THREE.SphereGeometry(config.width / 2, 24, 24);
      case 'hexagon':
        return new THREE.CylinderGeometry(config.width / 2, config.width / 2, config.height, 6);
      case 'bar':
        return new THREE.BoxGeometry(config.width, config.height, config.depth);
      default:
        return new THREE.BoxGeometry(0.05, 0.05, 0.05);
    }
  }

  public removeItem(item: GrabbableItem) {
    if (this.currentlyHeld === item) {
      this.currentlyHeld = null;
    }
    this.remove(item.mesh);
    item.mesh.geometry.dispose();
    if (Array.isArray(item.mesh.material)) {
      item.mesh.material.forEach((m) => m.dispose());
    } else {
      item.mesh.material.dispose();
    }
    const idx = this.items.indexOf(item);
    if (idx !== -1) {
      this.items.splice(idx, 1);
    }
  }

  public clearAll() {
    [...this.items].forEach((item) => this.removeItem(item));
    this.items = [];
    this.currentlyHeld = null;
  }

  /**
   * Attempts to grasp nearest object if within gripper threshold
   */
  public tryGrip(gripperWorldPos: THREE.Vector3, aperture: number): GrabbableItem | null {
    if (this.currentlyHeld) return this.currentlyHeld;

    // Maximum distance from gripper focal center to object center to grasp
    const gripRadius = 0.055;
    let closestItem: GrabbableItem | null = null;
    let closestDist = Infinity;

    for (const item of this.items) {
      if (item.isHeld) continue;

      const objPos = new THREE.Vector3();
      item.mesh.getWorldPosition(objPos);

      const dist = objPos.distanceTo(gripperWorldPos);
      if (dist < gripRadius && dist < closestDist) {
        // Check if object fits within aperture
        if (item.config.width <= (aperture * 0.12) + 0.02) {
          closestDist = dist;
          closestItem = item;
        }
      }
    }

    if (closestItem) {
      closestItem.isHeld = true;
      this.currentlyHeld = closestItem;
      return closestItem;
    }

    return null;
  }

  /**
   * Releases currently held object and sets drop slot
   */
  public releaseHeld(gripperWorldPos: THREE.Vector3, slot: 'A' | 'B' | 'free' = 'free'): GrabbableItem | null {
    if (!this.currentlyHeld) return null;

    const item = this.currentlyHeld;
    item.isHeld = false;
    item.targetSlot = slot;
    this.currentlyHeld = null;
    return item;
  }

  /**
   * Physics fall simulation for dropped objects towards floor/pedestal height
   */
  public updatePhysics(
    deltaTime: number,
    gripperTipWorldPos: THREE.Vector3,
    pedestalAPos: THREE.Vector3,
    pedestalBPos: THREE.Vector3
  ) {
    for (const item of this.items) {
      if (item.isHeld) {
        // Pin object to gripper tip position
        item.mesh.position.copy(gripperTipWorldPos);
        item.velocity.set(0, 0, 0);
      } else {
        // Find floor level underneath object (pedestal A, pedestal B, or table plane 0)
        let floorY = 0.0;
        const distToA = new THREE.Vector2(item.mesh.position.x, item.mesh.position.z).distanceTo(
          new THREE.Vector2(pedestalAPos.x, pedestalAPos.z)
        );
        const distToB = new THREE.Vector2(item.mesh.position.x, item.mesh.position.z).distanceTo(
          new THREE.Vector2(pedestalBPos.x, pedestalBPos.z)
        );

        if (distToA < 0.08) {
          floorY = pedestalAPos.y + item.config.height / 2;
        } else if (distToB < 0.08) {
          floorY = pedestalBPos.y + item.config.height / 2;
        } else {
          floorY = item.config.height / 2;
        }

        // Apply gravity if in the air
        if (item.mesh.position.y > floorY) {
          item.velocity.y -= 9.8 * deltaTime;
          item.mesh.position.y += item.velocity.y * deltaTime;

          if (item.mesh.position.y <= floorY) {
            item.mesh.position.y = floorY;
            item.velocity.y = 0;
          }
        } else {
          item.mesh.position.y = floorY;
          item.velocity.set(0, 0, 0);
        }
      }
    }
  }

  public getItemAtSlot(slot: 'A' | 'B'): GrabbableItem | undefined {
    return this.items.find((item) => item.targetSlot === slot && !item.isHeld);
  }
}
