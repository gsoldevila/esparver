import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy, HostBinding } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as Marzipano from 'marzipano';
import { distinctUntilChanged, tap } from 'rxjs/operators';
import { Subscription } from 'rxjs';

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
  }

  async switchScene(params) {
    this._params = params;
    this._showHotspots = this.showHotspots;
    this.showHotspots = false;

    console.debug('[ViewComponent] Switching to scene', params);
    this.viewer.stopMovement();

    try {
      this.panorama = await this.panoramaService.getPanorama(params).toPromise();
      this.scene = this.createScene(this.panorama);
    } catch(err) {
      // TODO cannot switch to Panorama
    }

    this.scene.view.setParameters(this.panorama.initialViewParameters);
    this.scene.scene.switchTo();
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
        console.log('[ViewComponent] Current crosshair', p);
        console.log(`{
            "type": "PANORAMA",
            "position": { "yaw": ${p.yaw}, "pitch": ${p.pitch} },
            "data": "${this._params.postalCode}/slug"
          }`);
      }
      setTimeout(() => this._firstClick = false, 250);
    } else {
      if (this._zoom === null) {
        const currentFov = this.viewer.scene().view().fov();
        this._zoom = ZOOM_LEVELS.findIndex(fov => fov < currentFov - 0.2);
        if (this._zoom === -1) this._zoom = 1;
      } else {
        this._zoom = (this._zoom + 1) % ZOOM_LEVELS.length;
      }
      this.viewer.lookTo({ fov: ZOOM_LEVELS[this._zoom] });
    }
  }

  private createScene(data: Panorama) {
    const basePath = `${environment.mediaUrl}/${data.media || data.id}`;
    const source = Marzipano.ImageUrlSource.fromString(
      `${basePath}/{z}/{f}/{y}/{x}.jpg`,
      { cubeMapPreviewUrl: `${basePath}/preview.jpg` }
    );
    const geometry = new Marzipano.CubeGeometry(data.levels);

    const limiter = Marzipano.RectilinearView.limit.traditional(
      data.faceSize,
      100 * Math.PI/180,
      120 * Math.PI/180,
    );

    const view = new Marzipano.RectilinearView(
      data.initialViewParameters,
      limiter,
    );

    const scene = this.viewer.createScene({
      source,
      geometry,
      view,
      pinFirstLevel: true,
    });

    this.addHotspots(scene, data);

    return { data, scene, view };
  }

  private addHotspots(scene: any, panorama: Panorama) {
    if (!panorama.hotspots || !panorama.hotspots.length) return;

    panorama.hotspots.forEach((hotspot) => {
      var imgHotspot = document.createElement('img');
      imgHotspot.src = `/assets/icons/info.png`;
      imgHotspot.classList.add('hotspot');
      imgHotspot.addEventListener('click', () => this.hotspotService.hotspotClicked(panorama, hotspot));
      scene.hotspotContainer().createHotspot(imgHotspot, hotspot.position);
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
