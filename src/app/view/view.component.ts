import { Component, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as Marzipano from 'marzipano';
import { Subscription } from 'rxjs';

import { environment } from '../../environments/environment';

import { PanoramaService } from '../service/panorama.service';
import { Panorama, LinkHotspot, InfoHotspot } from '../model/panorama';


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

  private createScene(panorama: Panorama) {
    var source = Marzipano.ImageUrlSource.fromString(
      `${environment.mediaUrl}/${panorama.media || panorama.id}/{z}/{f}/{y}/{x}.jpg`,
      { cubeMapPreviewUrl: `${environment.mediaUrl}/${panorama.id}/preview.jpg` });
    var geometry = new Marzipano.CubeGeometry(panorama.levels);

    var limiter = Marzipano.RectilinearView.limit.traditional(panorama.faceSize, 100*Math.PI/180, 120*Math.PI/180);
    var view = new Marzipano.RectilinearView(panorama.initialViewParameters, limiter);

    var scene = this.viewer.createScene({
      source: source,
      geometry: geometry,
      view: view,
      pinFirstLevel: true
    });

    // Create link hotspots.
    panorama.linkHotspots.forEach((hotspot) => {
      var element = this.createLinkHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    // Create info hotspots.
    panorama.infoHotspots.forEach((hotspot) => {
      var element = this.createInfoHotspotElement(hotspot);
      scene.hotspotContainer().createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
    });

    return {
      data: panorama,
      scene: scene,
      view: view
    };
  }

  createLinkHotspotElement(hotspot: LinkHotspot) {

  }

  createInfoHotspotElement(hotspot: InfoHotspot) {

  }

  ngOnDestroy(): void {
    this._sub && this._sub.unsubscribe();
  }
}
