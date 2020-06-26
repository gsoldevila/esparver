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
  pristine = true;
  panorama: Panorama;
  private _sub: Subscription;
  private scene: Marzipano.Scene;
  private viewer: Marzipano.Viewer;
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
  }

  async switchScene(params) {
    this.stopAutorotate();

    try {
      this.panorama = await this.panoramaService.getPanorama(params).toPromise();
      this.scene = this.createScene(this.panorama);
    } catch(err) {
      // TODO cannot switch to Panorama
    }

    this.scene.view.setParameters(this.panorama.initialViewParameters);
    this.scene.scene.switchTo();
    this.loading = false;
    this.startAutorotate();
  }

  private createScene(panorama: Panorama) {
    var source = Marzipano.ImageUrlSource.fromString(
      `${environment.mediaUrl}/${panorama.id}/{z}/{f}/{y}/{x}.jpg`,
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

  startAutorotate() {

  }

  stopAutorotate() {

  }

  createLinkHotspotElement(hotspot: LinkHotspot) {

  }

  createInfoHotspotElement(hotspot: InfoHotspot) {

  }

  ngOnDestroy(): void {
    this._sub && this._sub.unsubscribe();
  }
}
