import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostBinding } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as Marzipano from 'marzipano';
import { distinctUntilChanged, tap, debounceTime, map, filter } from 'rxjs/operators';
import { Subscription, Subject, fromEvent } from 'rxjs';

import { environment } from '../../environments/environment';

import { PanoramaService } from '../service/panorama.service';
import { HotspotService } from '../service/hotspot.service';
import { Panorama } from '../model/panorama';


const ZOOM_LEVELS = [2, 1, 0, 1];

@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss']
})
export class ViewComponent implements AfterViewInit, OnDestroy {
  private _subscriptions: Subscription[] = [];

  loading = true;
  private _params: { postalCode: string, slug: string };
  panorama: Panorama;
  private scene: Marzipano.Scene;
  private viewer: Marzipano.Viewer;
  private autorotate;
  private _zoom: number = null;
  private _firstClick: boolean;
  @ViewChild('pano') view: ElementRef;
  crosshair: boolean = !environment.production;
  private _showHotspots: boolean;
  @HostBinding('class.hotspots') showHotspots: boolean;

  constructor(
    private route: ActivatedRoute,
    private panoramaService: PanoramaService,
    private hotspotService: HotspotService,
  ) {}

  zoomChanged$: Subject<void>;

  ngAfterViewInit(): void {
    this.initMarzipano();
    this._registerSubscription(this.route.params
      .pipe(
        distinctUntilChanged(),
        tap((params: any) => this.switchScene(params)),
      ).subscribe());
  }

  private initMarzipano() {
    // Initialize viewer.
    this.viewer = new Marzipano.Viewer(
      this.view.nativeElement,
      { controls: { mouseViewMode: 'drag' } }
    );

    // Create an autorotate motion
    this.autorotate = Marzipano.autorotate({
      yawSpeed: 0.1,         // Yaw rotation speed
      targetPitch: 0,        // Pitch value to converge to
      targetFov: Math.PI/2   // Fov value to converge to
    });

    // watch changes in zoom
    this.watchZoom();
  }

  async switchScene(params) {
    this._params = params;
    this._showHotspots = this.showHotspots;
    if (typeof this.showHotspots === 'boolean') this.showHotspots = false;

    console.debug('[ViewComponent] Switching to scene', params);
    this.viewer.stopMovement();

    try {
      this.panorama = await this.panoramaService.getPanorama(params).toPromise();
      this.scene = this.createScene();
    } catch(err) {
      // TODO cannot switch to Panorama
    }

    this.scene.view.setParameters(this.panorama.initialViewParameters);
    this.scene.scene.switchTo();
    this.updateHotspotVisibility();

    setTimeout(() => {
      this.loading = false;
      this.showHotspots = typeof this._showHotspots === 'boolean' ? this._showHotspots : true;
      if (environment.production) {
        this.viewer.startMovement(this.autorotate);
        this.viewer.setIdleMovement(3000, this.autorotate);
      }
    }, 3000);
  }

  toggleZoom() {
    if (!this._firstClick) {
      this._firstClick = true;
      if (!environment.production) {
        const p = this.viewer.scene().view().parameters();
        console.log(`{
            "type": "PANORAMA",
            "position": { "yaw": ${+p.yaw.toFixed(2)}, "pitch": ${+p.pitch.toFixed(2)} },
            "fovThreshold": ${+p.fov.toFixed(1)},
            "data": "${this._params.postalCode}/slug"
          }`);
      }
      setTimeout(() => this._firstClick = false, 250);
    } else {
      if (this._zoom === null) {
        this._zoom = ZOOM_LEVELS.findIndex(fov => fov < this.getCurrentFov() - 0.2);
        if (this._zoom === -1) this._zoom = 1;
      } else {
        this._zoom = (this._zoom + 1) % ZOOM_LEVELS.length;
      }
      this.viewer.lookTo({ fov: ZOOM_LEVELS[this._zoom] });
      setTimeout(() => this.zoomChanged$.next(), 1000);
    }
  }

  private getCurrentFov(): number {
    return this.viewer.scene().view().fov();
  }

  private createScene() {
    const basePath = `${environment.mediaUrl}/${this.panorama.media || this.panorama.id}`;
    const source = Marzipano.ImageUrlSource.fromString(
      `${basePath}/{z}/{f}/{y}/{x}.jpg`,
      { cubeMapPreviewUrl: `${basePath}/preview.jpg` }
    );
    const geometry = new Marzipano.CubeGeometry(this.panorama.levels);

    const limiter = Marzipano.RectilinearView.limit.traditional(
      this.panorama.faceSize,
      100 * Math.PI/180,
      120 * Math.PI/180,
    );

    const view = new Marzipano.RectilinearView(
      this.panorama.initialViewParameters,
      limiter,
    );

    const scene = this.viewer.createScene({
      source,
      geometry,
      view,
      pinFirstLevel: true,
    });

    this.addHotspots(scene);

    return { data: this.panorama, scene, view };
  }

  private addHotspots(scene: any) {
    if (!this.panorama.hotspots || !this.panorama.hotspots.length) return;

    this.panorama.hotspots.forEach((hotspot) => {
      var img = document.createElement('img');
      img.src = `/assets/icons/info.png`;
      img.classList.add('hotspot');
      img.addEventListener('click', () => this.hotspotService.hotspotClicked(this.panorama, hotspot));
      hotspot['img'] = img;
      scene.hotspotContainer().createHotspot(img, hotspot.position);
    });
  }

  private watchZoom() {
    this.zoomChanged$ = new Subject<void>();

    // observe zoom events from Marzipano and propagate them
    this._registerSubscription(fromEvent(
      this.viewer._controls._composer, 'change').pipe(
        filter(([parameter]) => parameter === 'zoom'),
        debounceTime(250),
        tap(() => this.zoomChanged$.next()),
      ).subscribe()
    );

    // observe zoom events and process them
    this._registerSubscription(
      this.zoomChanged$.asObservable().pipe(
        filter(() => this.showHotspots),
        map(() => +this.getCurrentFov().toFixed(1)),
        distinctUntilChanged(),
        tap(fov => this.updateHotspotVisibility(fov)),
      ).subscribe()
    );
  }

  private updateHotspotVisibility(fov: number = this.getCurrentFov()) {
    if (!this.panorama.hotspots || !this.panorama.hotspots.length) return;

    this.panorama.hotspots.forEach((hotspot) => {
      if (typeof hotspot.fovThreshold !== 'number') return;
      const img = hotspot['img'] as Element;
      const hidden = fov > hotspot.fovThreshold;
      if (hidden && !hotspot['hidden']) {
        img.setAttribute('hidden', 'true');
        hotspot['hidden'] = true;
      } else if (!hidden && hotspot['hidden']) {
        img.removeAttribute('hidden');
        hotspot['hidden'] = false;
      }
    });
  }

  private _registerSubscription(s: Subscription): void {
    this._subscriptions.push(s);
  }

  ngOnDestroy(): void {
    this._subscriptions.forEach(s => s.unsubscribe());
    this.viewer.destroy();
  }
}
