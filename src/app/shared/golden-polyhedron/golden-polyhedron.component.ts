import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import type * as THREE from 'three';
import { Theme, ThemeService } from '../../core';
import { POLYHEDRON_ACTIVITY_PROFILES } from './polyhedron-activity-profile';
import { PolyhedronActivity } from './polyhedron-activity.model';

/**
 * Per-second retention factor for the exponential smoothing that eases motion/glow between
 * activity states — the fraction of the gap to the target profile that REMAINS after one
 * second. Small = quick ease-in (~0.15s time constant), so `composing`→`streaming` transitions
 * ramp instead of snapping. Applied frame-rate-independently via `1 - k^delta`.
 */
const TRANSITION_SMOOTHING = 0.0015;

/** Constructs a transient `Scene` used only to bake the environment map (Three's RoomEnvironment). */
type EnvironmentSceneFactory = new () => THREE.Scene & { dispose?(): void };

/**
 * Three.js gold icosahedron centerpiece. No precedent for a Three.js
 * lifecycle existed in this codebase, so the dynamic-import + outside-Angular
 * render loop + ResizeObserver + prefers-reduced-motion + full-dispose shape
 * is built fresh here (well-known Angular+Three.js pattern).
 */
@Component({
  selector: 'app-golden-polyhedron',
  standalone: true,
  templateUrl: './golden-polyhedron.component.html',
  styleUrl: './golden-polyhedron.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoldenPolyhedronComponent implements AfterViewInit, OnDestroy {
  /** Rendered width/height in px (canvas is square). */
  readonly size = input(300);
  /** Drives motion/glow — listening, composing, streaming, or idle. */
  readonly activity = input<PolyhedronActivity>('idle');
  /** Allows consumers to keep motion while reducing or disabling emissive glow. */
  readonly emissiveIntensityScale = input(1);

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('container');
  private readonly ngZone = inject(NgZone);
  private readonly themes = inject(ThemeService);

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private mesh?: THREE.Mesh;
  private geometry?: THREE.IcosahedronGeometry;
  private material?: THREE.MeshStandardMaterial;
  private environmentMap?: THREE.Texture;
  private targetEmissive?: THREE.Color;
  private ambientLight?: THREE.AmbientLight;
  private keyLight?: THREE.DirectionalLight;
  private fillLight?: THREE.DirectionalLight;
  private rimLight?: THREE.DirectionalLight;
  private resizeObserver?: ResizeObserver;
  private frameId?: number;
  private reducedMotion = false;
  private sceneReady = false;
  private activityState: PolyhedronActivity = 'idle';
  private rotationY = 0;

  // Smoothed motion/glow values eased toward the active profile each frame (see the render loop).
  private smoothRotationSpeed = 0;
  private smoothWobble = 0;
  private smoothPulseHz = 0;
  private smoothPulseAmp = 0;
  private smoothEmissiveIntensity = 0;

  constructor() {
    effect(() => {
      const theme = this.themes.theme();
      if (this.sceneReady) {
        this.applyThemePalette(theme);
      }
    });

    effect(() => {
      this.activityState = this.activity();
    });
  }

  async ngAfterViewInit(): Promise<void> {
    const three = await import('three');
    // Imported alongside the core lib (both dynamic) so the PBR gem reflects a real room
    // environment instead of rendering as flat/black metal.
    const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.setupScene(three, RoomEnvironment as EnvironmentSceneFactory);
    this.observeResize();
    this.ngZone.runOutsideAngular(() => this.startRenderLoop());
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.frameId !== undefined) {
      cancelAnimationFrame(this.frameId);
    }
    this.geometry?.dispose();
    this.material?.dispose();
    this.environmentMap?.dispose();
    // Force the GL context to be released synchronously instead of leaking until GC. Browsers
    // cap ~16 live WebGL contexts; a lingering one would force-lose an older canvas.
    this.renderer?.forceContextLoss();
    this.renderer?.dispose();
  }

  private setupScene(three: typeof THREE, RoomEnvironment: EnvironmentSceneFactory): void {
    const host = this.container().nativeElement;
    const width = host.clientWidth || this.size();
    const height = host.clientHeight || this.size();

    this.scene = new three.Scene();

    this.camera = new three.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    this.renderer = new three.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    host.appendChild(this.renderer.domElement);

    this.bakeEnvironment(three, RoomEnvironment);

    this.geometry = new three.IcosahedronGeometry(1.6, 1);
    // PBR metal: high metalness + low roughness turns the reflected environment into a real
    // gold sheen. `flatShading` keeps the faceted-gem read; the emissive is animated by the
    // render loop (dark theme rests at 0, light theme keeps a faint constant glow).
    this.material = new three.MeshStandardMaterial({
      color: 0xc8920e,
      flatShading: true,
      metalness: 0.9,
      roughness: 0.25,
      envMapIntensity: 1,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    this.targetEmissive = new three.Color(0x000000);
    this.mesh = new three.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    this.addLightRig(three);
    this.sceneReady = true;
    this.applyThemePalette(this.themes.theme());
    this.seedActivitySmoothing();

    if (this.reducedMotion) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Bakes a prefiltered environment map from Three's neutral RoomEnvironment via
   * `PMREMGenerator` and assigns it to `scene.environment`, so every standard material in the
   * scene reflects it. The transient room scene and the generator are disposed immediately;
   * the resulting texture is retained and released in `ngOnDestroy`.
   */
  private bakeEnvironment(three: typeof THREE, RoomEnvironment: EnvironmentSceneFactory): void {
    if (!this.renderer || !this.scene) {
      return;
    }
    const pmrem = new three.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environmentMap = pmrem.fromScene(room, 0.04).texture;
    this.scene.environment = this.environmentMap;
    room.dispose?.();
    pmrem.dispose();
  }

  /** Seeds the eased motion/glow values at the idle profile so the gem doesn't spin up from rest. */
  private seedActivitySmoothing(): void {
    const idle = POLYHEDRON_ACTIVITY_PROFILES.idle;
    this.smoothRotationSpeed = idle.rotationSpeed;
    this.smoothWobble = idle.wobble;
    this.smoothPulseHz = idle.pulseHz;
    this.smoothPulseAmp = idle.pulseAmp;
    this.smoothEmissiveIntensity = idle.emissiveIntensity;
  }

  /** Ambient + warm-gold key + subtle fill + faint rim. */
  private addLightRig(three: typeof THREE): void {
    if (!this.scene) return;

    this.ambientLight = new three.AmbientLight(0x2a1f0a, 0.6);

    this.keyLight = new three.DirectionalLight(0xf5c842, 1.4);
    this.keyLight.position.set(3, 4, 5);

    this.fillLight = new three.DirectionalLight(0x8a6a2a, 0.4);
    this.fillLight.position.set(-4, -1, 2);

    this.rimLight = new three.DirectionalLight(0xffffff, 0.25);
    this.rimLight.position.set(-2, 3, -4);

    this.scene.add(this.ambientLight, this.keyLight, this.fillLight, this.rimLight);
  }

  private applyThemePalette(theme: Theme): void {
    if (
      !this.material ||
      !this.ambientLight ||
      !this.keyLight ||
      !this.fillLight ||
      !this.rimLight
    ) {
      return;
    }

    if (theme === 'light') {
      this.material.color.setHex(0xc8920e);
      this.material.metalness = 0.95;
      this.material.roughness = 0.18;
      this.material.envMapIntensity = 1.3;
      this.material.emissive.setHex(0xe6b422);
      this.material.emissiveIntensity = 0.12 * this.emissiveIntensityScale();
      this.ambientLight.color.setHex(0xfff3d4);
      this.ambientLight.intensity = 0.55;
      this.keyLight.color.setHex(0xffd966);
      this.keyLight.intensity = 2.1;
      this.fillLight.color.setHex(0xb8860b);
      this.fillLight.intensity = 0.75;
      this.rimLight.color.setHex(0xffffff);
      this.rimLight.intensity = 0.65;
      return;
    }

    this.material.emissive.setHex(0x000000);
    this.material.emissiveIntensity = 0;

    this.material.color.setHex(0xc8920e);
    this.material.metalness = 0.9;
    this.material.roughness = 0.25;
    this.material.envMapIntensity = 1;
    this.ambientLight.color.setHex(0x2a1f0a);
    this.ambientLight.intensity = 0.6;
    this.keyLight.color.setHex(0xf5c842);
    this.keyLight.intensity = 1.4;
    this.fillLight.color.setHex(0x8a6a2a);
    this.fillLight.intensity = 0.4;
    this.rimLight.color.setHex(0xffffff);
    this.rimLight.intensity = 0.25;
  }

  private observeResize(): void {
    const host = this.container().nativeElement;
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !this.renderer || !this.camera) return;

      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;

      this.renderer.setSize(width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      if (this.reducedMotion && this.scene) {
        this.renderer.render(this.scene, this.camera);
      }
    });
    this.resizeObserver.observe(host);
  }

  private startRenderLoop(): void {
    if (this.reducedMotion) {
      return;
    }

    let lastTime = performance.now();

    const tick = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      const elapsed = time / 1000;
      const profile = POLYHEDRON_ACTIVITY_PROFILES[this.activityState];

      if (this.mesh && this.material) {
        // Frame-rate-independent ease toward the active profile so a state change
        // (idle → composing → streaming) ramps up instead of snapping.
        const ease = 1 - Math.pow(TRANSITION_SMOOTHING, delta);
        this.smoothRotationSpeed += (profile.rotationSpeed - this.smoothRotationSpeed) * ease;
        this.smoothWobble += (profile.wobble - this.smoothWobble) * ease;
        this.smoothPulseHz += (profile.pulseHz - this.smoothPulseHz) * ease;
        this.smoothPulseAmp += (profile.pulseAmp - this.smoothPulseAmp) * ease;
        this.smoothEmissiveIntensity +=
          (profile.emissiveIntensity - this.smoothEmissiveIntensity) * ease;

        this.rotationY += delta * this.smoothRotationSpeed;
        this.mesh.rotation.y = this.rotationY;
        this.mesh.rotation.x = Math.sin(elapsed * this.smoothPulseHz) * this.smoothWobble;
        const scale = 1 + Math.sin(elapsed * this.smoothPulseHz) * this.smoothPulseAmp;
        this.mesh.scale.setScalar(scale);

        if (this.targetEmissive) {
          this.targetEmissive.setHex(profile.emissive);
          this.material.emissive.lerp(this.targetEmissive, ease);
        }
        this.material.emissiveIntensity =
          this.smoothEmissiveIntensity * this.emissiveIntensityScale();
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
      this.frameId = requestAnimationFrame(tick);
    };

    this.frameId = requestAnimationFrame(tick);
  }
}
