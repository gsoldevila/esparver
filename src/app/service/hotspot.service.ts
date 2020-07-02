import { Injectable } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';

import { HotspotActionsComponent } from '../hotspot-actions/hotspot-actions.component';
import { Hotspot, Panorama } from '../model/panorama';


@Injectable({
  providedIn: 'root'
})
export class HotspotService {
  constructor(
    private bottomSheet: MatBottomSheet
  ) {}

  hotspotClicked(panorama: Panorama, hotspot: Hotspot) {
    this.bottomSheet.open(HotspotActionsComponent, { data: { panorama, hotspot }});
  }
}
