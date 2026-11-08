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
  originalColor: number;
}

export class GrabbableManager extends THREE.Group {
  public items: GrabbableItem[] = [];
  public currentlyHeld: GrabbableItem | null = null;
  public highlightedItem: GrabbableItem | null = null;

  constructor() {
    super();
    this.name = 'GrabbableObjectsManager';
  }

  /**
   * Spawns an object of given shape and config directly on the target position.
   */
  public spawnObject(
    config: ObjectConfig,
    position: THREE.Vector3,
    slot: 'A' | 'B' | 'free' = 'free'
  ): GrabbableItem {
    // Clear any existing object in the same slot to avoid cluttering
    if (slot !== 'free') {
      const existing = this.items.find((it) => it.targetSlot === slot && !it.isHeld);
      if (existing) {
        this.removeItem(existing);
      }
    }

    const geometry = this.createGeometryForShape(config);
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.25,
      metalness: 0.25,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Place object with its bottom resting flat on the pedestal surface (y = position.y + height/2)
    mesh.position.set(position.x, position.y + config.height / 2, position.z);

    this.add(mesh);

    const item: GrabbableItem = {
      id: `${config.id}_${Date.now()}`,
      config,
      mesh,
      isHeld: false,
      targetSlot: slot,
      velocity: new THREE.Vector3(),
      originalColor: config.color,
    };

    this.items.push(item);
    return item;
  }

  private createGeometryForShape(config: ObjectConfig): THREE.BufferGeometry {
    switch (config.shape) {
      case 'cube':
        return new THREE.BoxGeometry(config.width, config.height, config.depth);
      case 'cylinder':
        return new THREE.CylinderGeometry(config.width / 2, config.width / 2, config.height, 32);
      case 'sphere':
        return new THREE.SphereGeometry(config.width / 2, 32, 32);
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
    if (this.highlightedItem === item) {
      this.highlightedItem = null;
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
    this.highlightedItem = null;
  }

  /**
   * Proximity highlight check: highlights the closest object within grip distance
   */
  public updateProximityHighlight(gripperWorldPos: THREE.Vector3, aperture: number) {
    const detectionRadius = 0.085; // 8.5 cm
    let closestItem: GrabbableItem | null = null;
    let closestDist = Infinity;

    for (const item of this.items) {
      if (item.isHeld) continue;

      const objPos = new THREE.Vector3();
      item.mesh.getWorldPosition(objPos);
      const dist = objPos.distanceTo(gripperWorldPos);

      if (dist < detectionRadius && dist < closestDist) {
        closestDist = dist;
        closestItem = item;
      }
    }

    if (this.highlightedItem && this.highlightedItem !== closestItem && !this.highlightedItem.isHeld) {
      // Clear highlight on previously highlighted
      const mat = this.highlightedItem.mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0.0;
    }

    this.highlightedItem = closestItem;

    if (this.highlightedItem && !this.highlightedItem.isHeld) {
      // Active glow highlight in bright robotic orange/amber
      const mat = this.highlightedItem.mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(0xff7700);
      mat.emissiveIntensity = 0.55;
    }
  }

  /**
   * Attempts to grasp nearest object if within gripper threshold
   */
  public tryGrip(gripperWorldPos: THREE.Vector3, aperture: number): GrabbableItem | null {
    if (this.currentlyHeld) return this.currentlyHeld;

    const gripRadius = 0.065; // 6.5 cm reach
    let closestItem: GrabbableItem | null = null;
    let closestDist = Infinity;

    for (const item of this.items) {
      if (item.isHeld) continue;

      const objPos = new THREE.Vector3();
      item.mesh.getWorldPosition(objPos);

      const dist = objPos.distanceTo(gripperWorldPos);
      if (dist < gripRadius && dist < closestDist) {
        closestDist = dist;
        closestItem = item;
      }
    }

    if (closestItem) {
      closestItem.isHeld = true;
      this.currentlyHeld = closestItem;

      // Glow cyan when firmly gripped
      const mat = closestItem.mesh.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(0x00d8ff);
      mat.emissiveIntensity = 0.4;

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

    // Reset emissive
    const mat = item.mesh.material as THREE.MeshStandardMaterial;
    mat.emissive.setHex(0x000000);
    mat.emissiveIntensity = 0.0;

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
        item.mesh.position.copy(gripperTipWorldPos);
        item.velocity.set(0, 0, 0);
      } else {
        // Pedestal surface height is 0.075m, table surface is 0.0m
        let floorY = 0.0;
        const distToA = new THREE.Vector2(item.mesh.position.x, item.mesh.position.z).distanceTo(
          new THREE.Vector2(pedestalAPos.x, pedestalAPos.z)
        );
        const distToB = new THREE.Vector2(item.mesh.position.x, item.mesh.position.z).distanceTo(
          new THREE.Vector2(pedestalBPos.x, pedestalBPos.z)
        );

        if (distToA < 0.09) {
          floorY = pedestalAPos.y + item.config.height / 2;
        } else if (distToB < 0.09) {
          floorY = pedestalBPos.y + item.config.height / 2;
        } else {
          floorY = item.config.height / 2;
        }

        // Apply smooth gravity if above resting surface
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
