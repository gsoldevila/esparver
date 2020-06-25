import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { filter, sortBy, sortedUniq, includes } from 'lodash';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, tap } from 'rxjs/operators';

import { PanoramaService } from '../service/panorama.service';
import { PositionService } from '../service/position.service';
import { DialogService } from '../service/dialog.service';
import { Panorama } from '../model/panorama';
import { POSTAL_CODES, PostalCode } from '../model/postal';
import { GeolocationPositionError, GeolocationPositionErrorCode } from '../model/position';
import { StorageService } from '../service/storage.service';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private _codes: PostalCode[];
  POSTAL_CODES = POSTAL_CODES;
  locationError: GeolocationPositionError = { code: GeolocationPositionErrorCode.NOT_INITIALIZED };

  private _order = 0;

  model$: Observable<{ codes: PostalCode[], panoramas: Panorama[] }>;

  private filters$ = new BehaviorSubject<any>(null);

  constructor(
    private router: Router,
    private panoramaService: PanoramaService,
    private positionService: PositionService,
    private dialogService: DialogService,
    private storageService: StorageService,
  ) {}

  get order(): number {
    return this._order;
  }

  set order(order: number) {
    if (order !== 1 || this.enableGeolocation()) {
      this._order = order;
    }
    this.filters$.next(null);
  }

  ngOnInit() {
    this.model$ = combineLatest(
      this.panoramaService.getPanoramas(true),
      this.filters$.asObservable(),
    ).pipe(
      map(([panos]) => panos),
      this.extractCodes,
      this.filterSortPanoramas,
      this.injectCodes,
    );

    if (this.storageService.get('locationAuthorized')) this.enableGeolocation();
  }

  enableGeolocation() {
    if (!this.locationError) return true;
    switch(this.locationError.code) {
      case GeolocationPositionErrorCode.NOT_INITIALIZED:
        return this.tryEnableGeolocation();
      case GeolocationPositionErrorCode.UNAVAILABLE:
        this.dialogService.message({
          title: 'Informació',
          paragraphs: [ 'Aquest dispositiu no suporta la geolocalització; aquesta funcionalitat no estarà disponible.' ],
        });
        break;
      case GeolocationPositionErrorCode.PERMISSION_DENIED:
        this.storageService.clear('locationAuthorized');
        this.dialogService.message({
          title: 'Atenció',
          paragraphs: [ 'Has denegat el permís per veure la ubicació, aquesta funcionalitat no estarà disponible fins que el tornis a activar.' ],
        });
        break;
      default:
        this.dialogService.message({
          title: 'Atenció',
          paragraphs: [ 'En aquests moments la informació de geolocalització no està disponible. Intenta-ho més tard.' ],
        });
    }
    return false;
  }

  private tryEnableGeolocation() {
    this.positionService.enableGeolocation().then(
      () => {
        this.storageService.set('locationAuthorized', true);
        this.locationError = null;
        this.order = 1;
      },
      (err) => {
        console.error(err);
        this.locationError = err;
        this.enableGeolocation();
      }
    );
    return true;
  }

  showPanorama(panorama: Panorama) {
    this.router.navigateByUrl(`/panorama/${panorama.id}`);
  }

  private extractCodes = tap((panos: Panorama[]) => {
    if (!this._codes) {
      this._codes = sortedUniq(panos.map(p => p.postalCode)).map(code => ({ code, enabled: true }));
    }
  });

  private filterSortPanoramas = map((panos: Panorama[]) => {
    // keep only enabled postal codes
    const enabledCodes = filter(this._codes, 'enabled').map(c => c.code);
    panos = (panos || []).filter(pano => includes(enabledCodes, pano.postalCode));

    // sort panos depending on selected criteria
    switch(this.order) {
      case 0: return sortBy(panos, 'timestamp').reverse();
      case 1: return sortBy(panos, 'distance');
      case 2: return sortBy(panos, 'name');
    }
  });

  private injectCodes = map((panoramas: Panorama[]) => ({ panoramas, codes: this._codes }));

  toggleCode(index: number) {
    this._codes[index].enabled = !this._codes[index].enabled;
    this.filters$.next(null);
  }
}
