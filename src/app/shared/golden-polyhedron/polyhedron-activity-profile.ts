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
  // "Thinking": routing/tools are active but no tokens have arrived yet — deliberate and
  // steady, a warm amber glow that reads as focus rather than the brighter generating burst.
  composing: {
    rotationSpeed: 1.0,
    wobble: 0.2,
    pulseHz: 2.0,
    pulseAmp: 0.07,
    emissive: 0xe0a020,
    emissiveIntensity: 0.42,
  },
  // "Generating": tokens are streaming — the gem comes alive with the fastest spin, the
  // strongest pulse and a bright, distinct generating gold so the moment reads as creation.
  streaming: {
    rotationSpeed: 1.7,
    wobble: 0.28,
    pulseHz: 2.8,
    pulseAmp: 0.11,
    emissive: 0xffd34d,
    emissiveIntensity: 0.85,
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
