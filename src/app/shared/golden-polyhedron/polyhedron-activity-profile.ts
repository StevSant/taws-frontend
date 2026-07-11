import { PolyhedronActivity } from './polyhedron-activity.model';

/** Per-activity motion + glow tuning for the Three.js render loop. */
export interface PolyhedronActivityProfile {
  rotationSpeed: number;
  wobble: number;
  pulseHz: number;
  pulseAmp: number;
  emissive: number;
  emissiveIntensity: number;
}

export const POLYHEDRON_ACTIVITY_PROFILES: Record<PolyhedronActivity, PolyhedronActivityProfile> = {
  idle: {
    rotationSpeed: 0.35,
    wobble: 0.15,
    pulseHz: 1.2,
    pulseAmp: 0.03,
    emissive: 0x000000,
    emissiveIntensity: 0,
  },
  listening: {
    rotationSpeed: 0.85,
    wobble: 0.22,
    pulseHz: 3.4,
    pulseAmp: 0.09,
    emissive: 0xf5c842,
    emissiveIntensity: 0.35,
  },
  composing: {
    rotationSpeed: 0.55,
    wobble: 0.18,
    pulseHz: 2.2,
    pulseAmp: 0.05,
    emissive: 0xd4a017,
    emissiveIntensity: 0.18,
  },
  streaming: {
    rotationSpeed: 1.05,
    wobble: 0.28,
    pulseHz: 4.6,
    pulseAmp: 0.11,
    emissive: 0xf0c040,
    emissiveIntensity: 0.42,
  },
};
