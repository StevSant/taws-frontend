import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  inject,
  input,
  viewChild,
} from '@angular/core';
import type * as THREE from 'three';

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

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('container');
  private readonly ngZone = inject(NgZone);

  private renderer?: THREE.WebGLRenderer;
  private scene?: THREE.Scene;
  private camera?: THREE.PerspectiveCamera;
  private mesh?: THREE.Mesh;
  private geometry?: THREE.IcosahedronGeometry;
  private material?: THREE.MeshPhongMaterial;
  private resizeObserver?: ResizeObserver;
  private frameId?: number;
  private reducedMotion = false;

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
    });
    this.mesh = new three.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);

    this.addLightRig(three);

    if (this.reducedMotion) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /** Ambient + warm-gold key + subtle fill + faint rim. */
  private addLightRig(three: typeof THREE): void {
    if (!this.scene) return;

    const ambient = new three.AmbientLight(0x2a1f0a, 0.6);

    const key = new three.DirectionalLight(0xf5c842, 1.4);
    key.position.set(3, 4, 5);

    const fill = new three.DirectionalLight(0x8a6a2a, 0.4);
    fill.position.set(-4, -1, 2);

    const rim = new three.DirectionalLight(0xffffff, 0.25);
    rim.position.set(-2, 3, -4);

    this.scene.add(ambient, key, fill, rim);
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

    const tick = (time: number) => {
      const elapsed = time / 1000;
      if (this.mesh) {
        this.mesh.rotation.y = elapsed * 0.35;
        this.mesh.rotation.x = Math.sin(elapsed * 0.6) * 0.15;
      }
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
      this.frameId = requestAnimationFrame(tick);
    };

    this.frameId = requestAnimationFrame(tick);
  }
}
