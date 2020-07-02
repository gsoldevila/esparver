import { Component, OnInit, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MarkdownService, MarkedOptions } from 'ngx-markdown';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';

import { PanoramaService } from '../service/panorama.service';
import { HotspotType, Panorama, DescriptionType, PANORAMA_ICONS } from '../model/panorama';
import { POSTAL_CODES } from '../model/postal';

interface HotspotActionsModel {
  title: string;
  subtitle?: string;
  actions: HotspotAction[];
}

interface HotspotAction {
  type: HotspotActionType;
  data: Panorama | string;
  icon: string;
}

enum HotspotActionType {
  SHOW_PANORAMA = 'SHOW_PANORAMA',
  SHOW_MARKDOWN = 'SHOW_MARKDOWN',
  OPEN_EXTERNAL_LINK = 'OPEN_EXTERNAL_LINK',
}

@Component({
  selector: 'app-hotspot-actions',
  templateUrl: './hotspot-actions.component.html',
  styleUrls: ['./hotspot-actions.component.scss']
})
export class HotspotActionsComponent implements OnInit {
  model$: Observable<HotspotActionsModel>;
  markdown: string;
  markedOptions: MarkedOptions;

  ACTION_LABELS = {
    SHOW_PANORAMA: 'Veure a vista d\'ocell',
    SHOW_MARKDOWN: 'Mostrar informació',
    OPEN_EXTERNAL_LINK: 'Obrir l\'enllaç',
  };

  constructor(
    private router: Router,
    @Inject(MAT_BOTTOM_SHEET_DATA) private params: any,
    private _bottomSheetRef: MatBottomSheetRef<HotspotActionsComponent>,
    private panoramaService: PanoramaService,
    private markdownService: MarkdownService,
  ) { }

  ngOnInit(): void {
    if (this.params.hotspot) {
      this.model$ = this.hotspotActions();
    } else {
      this._bottomSheetRef.dismiss();
    }
  }

  private hotspotActions(): Observable<HotspotActionsModel> {
    switch(this.params.hotspot.type) {
      case HotspotType.PANORAMA:
        return this.panoramaService.getPanorama(this.params.hotspot.data).pipe(
          map(data => {
            const title = data.label;
            const subtitle = `${POSTAL_CODES[data.postalCode]} (${data.postalCode})`;
            const actions = [];

            if (data.id !== this.params.panorama.id) {
              actions.push({
                type: HotspotActionType.SHOW_PANORAMA,
                icon: PANORAMA_ICONS[data.type] || 'photo_camera',
                data,
              });
            }

            if (data.description && data.description.type === DescriptionType.EMBEDDED_MARKDOWN) {
              actions.push({
                type: HotspotActionType.SHOW_MARKDOWN,
                icon: 'description',
                data,
              });
            }

            return { title, subtitle, actions };
          })
        );
      case HotspotType.LINK:
        return of({
          title: this.params.hotspot.data.title,
          actions: [{
            type: HotspotActionType.OPEN_EXTERNAL_LINK,
            icon: 'link',
            data: this.params.hotspot.data.url
          }]
        });
    }
  }

  doAction(action: HotspotAction) {
    switch(action.type) {
      case HotspotActionType.SHOW_PANORAMA:
        const pano = action.data as Panorama;
        this.router.navigateByUrl(`/panorama/${pano.id}`, { replaceUrl: true });
        this._bottomSheetRef.dismiss();
        break;
      case HotspotActionType.SHOW_MARKDOWN:
        const { id } = action.data as Panorama;
        const baseUrl = `${environment.mediaUrl}/${id}/`;

        this.markdownService.options = { baseUrl };
        this.markdown = `${baseUrl}README.md`;
        break;
      case HotspotActionType.OPEN_EXTERNAL_LINK:
        const url = action.data as string;
        window.open(url, '_blank');
        this._bottomSheetRef.dismiss();
        break;
    }
  }

  onLoad($event) {
    console.log($event);
  }

  onError($event) {
    console.log($event);
  }
}
