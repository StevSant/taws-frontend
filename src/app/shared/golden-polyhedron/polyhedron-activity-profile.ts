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
    rotationSpeed: 0.55,
    wobble: 0.14,
    pulseHz: 1.6,
    pulseAmp: 0.05,
    emissive: 0xf5c842,
    emissiveIntensity: 0.28,
  },
  composing: {
    rotationSpeed: 0.85,
    wobble: 0.18,
    pulseHz: 1.8,
    pulseAmp: 0.06,
    emissive: 0xe6b422,
    emissiveIntensity: 0.22,
  },
  streaming: {
    rotationSpeed: 1.35,
    wobble: 0.24,
    pulseHz: 2.4,
    pulseAmp: 0.09,
    emissive: 0xf5c842,
    emissiveIntensity: 0.48,
  },
  frozen: {
    rotationSpeed: 0,
    wobble: 0,
    pulseHz: 0,
    pulseAmp: 0,
    emissive: 0x000000,
    emissiveIntensity: 0,
  },
};
