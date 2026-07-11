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

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('container');
  private readonly ngZone = inject(NgZone);
  private readonly themes = inject(ThemeService);

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private mesh?: THREE.Mesh;
  private geometry?: THREE.IcosahedronGeometry;
  private material?: THREE.MeshPhongMaterial;
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
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.setupScene(three);
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
    this.renderer?.dispose();
  }

  private setupScene(three: typeof THREE): void {
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

    this.geometry = new three.IcosahedronGeometry(1.6, 1);
    this.material = new three.MeshPhongMaterial({
      color: 0xc8920e,
      flatShading: true,
      shininess: 45,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    this.mesh = new three.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    this.addLightRig(three);
    this.sceneReady = true;
    this.applyThemePalette(this.themes.theme());

    if (this.reducedMotion) {
      this.renderer.render(this.scene, this.camera);
    }
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
    if (!this.material || !this.ambientLight || !this.keyLight || !this.fillLight || !this.rimLight) {
      return;
    }

    if (theme === 'light') {
      this.material.color.setHex(0xc8920e);
      this.material.shininess = 82;
      this.material.emissive.setHex(0xe6b422);
      this.material.emissiveIntensity = 0.12;
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
    this.material.shininess = 45;
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
        this.rotationY += delta * profile.rotationSpeed;
        this.mesh.rotation.y = this.rotationY;
        this.mesh.rotation.x = Math.sin(elapsed * profile.pulseHz) * profile.wobble;
        const scale = 1 + Math.sin(elapsed * profile.pulseHz) * profile.pulseAmp;
        this.mesh.scale.setScalar(scale);
        this.material.emissive.setHex(profile.emissive);
        this.material.emissiveIntensity = profile.emissiveIntensity;
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
      this.frameId = requestAnimationFrame(tick);
    };

    this.frameId = requestAnimationFrame(tick);
  }
}
