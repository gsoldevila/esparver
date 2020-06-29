import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as Marzipano from 'marzipano';
import { Subscription } from 'rxjs';

import { environment } from '../../environments/environment';

import { PanoramaService } from '../service/panorama.service';
import { Panorama, LinkHotspot, InfoHotspot } from '../model/panorama';


const ZOOM_LEVELS = [1, 2, 1, 0];

@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss']
})
export class ViewComponent implements AfterViewInit, OnDestroy {
  loading = true;
  panorama: Panorama;
  private _sub: Subscription;
  private scene: Marzipano.Scene;
  private viewer: Marzipano.Viewer;
  private autorotate;
  private _zoom: number = null;
  private _firstClick: boolean;
  @ViewChild('pano') view: ElementRef;

  constructor(
    private route: ActivatedRoute,
    private panoramaService: PanoramaService
  ) {}

  ngAfterViewInit(): void {
    this.initMarzipano();
    this._sub = this.route.params.subscribe((params: any) => this.switchScene(params));
  }

  private initMarzipano() {
    // Initialize viewer.
    this.viewer = new Marzipano.Viewer(this.view.nativeElement, { controls: { mouseViewMode: 'drag' } });
    this.autorotate = Marzipano.autorotate({
      yawSpeed: 0.1,         // Yaw rotation speed
      targetPitch: 0,        // Pitch value to converge to
      targetFov: Math.PI/2   // Fov value to converge to
    });
  }

  async switchScene(params) {
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
      this.viewer.startMovement(this.autorotate);
      this.viewer.setIdleMovement(3000, this.autorotate);
    }, 3000);
  }

  private createScene(data: Panorama) {
    const source = Marzipano.ImageUrlSource.fromString(
      `${environment.mediaUrl}/${data.media || data.id}/{z}/{f}/{y}/{x}.jpg`,
      { cubeMapPreviewUrl: `${environment.mediaUrl}/${data.id}/preview.jpg` });
    const geometry = new Marzipano.CubeGeometry(data.levels);

    const limiter = Marzipano.RectilinearView.limit.traditional(data.faceSize, 100*Math.PI/180, 120*Math.PI/180);
    const view = new Marzipano.RectilinearView(data.initialViewParameters, limiter);

    const scene = this.viewer.createScene({ source, geometry, view, pinFirstLevel: true });

    // Create link hotspots.
    data.linkHotspots.forEach((hotspot) => {
      const element = this.createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create info hotspots.
    data.infoHotspots.forEach((hotspot) => {
      const element = this.createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    return { data, scene, view };
  }

  toggleZoom() {
    if (!this._firstClick) {
      this._firstClick = true;
      setTimeout(() => this._firstClick = false, 250);
    } else {
      if (this._zoom === null) {
        this._zoom = ZOOM_LEVELS.findIndex(fov => fov + 0.2 < this.viewer.scene().view().parameters().fov);
        if (this._zoom === -1) this._zoom = 1;
      } else {
        this._zoom = (this._zoom + 1) % ZOOM_LEVELS.length;
      }
      this.viewer.lookTo({ fov: ZOOM_LEVELS[this._zoom] });
    }
  }

  createLinkHotspotElement(hotspot: LinkHotspot) {

  }

  createInfoHotspotElement(hotspot: InfoHotspot) {

  }

  ngOnDestroy(): void {
    this.viewer.destroy();
    this._sub && this._sub.unsubscribe();
  }
}
