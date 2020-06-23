import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { sortBy } from 'lodash';

import { PanoramaService } from '../service/panorama.service';
import { Panorama } from '../model/panorama';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private _order;
  orders = [ 'Les més recents', 'Les més properes', 'Alfabèticament' ];
  panoramas: Panorama[];

  constructor(
    private router: Router,
    private panoramaService: PanoramaService,
  ) {}

  async ngOnInit() {
    this.panoramas = await this.panoramaService.getPanoramas().toPromise();
    this.order = 0;
  }

  get order(): number {
    return this._order;
  }

  set order(order: number) {
    if (order === this._order) return;

    switch(order) {
      case 0:
        this.panoramas = sortBy(this.panoramas, 'timestamp').reverse();
        break;
      case 1:
        this.panoramas = sortBy(this.panoramas, 'distance');
        break;
      case 2:
        this.panoramas = sortBy(this.panoramas, 'name');
        break;
    }

    this._order = order;
  }

  showPanorama(panorama: Panorama) {
    this.router.navigateByUrl(`/panorama/${panorama.id}`);
  }
}
