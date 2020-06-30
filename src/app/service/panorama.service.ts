import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap, exhaustMap } from 'rxjs/operators';
import { find } from 'lodash';

import { environment } from '../../environments/environment';

import { Panorama, LEVELS } from '../model/panorama';
import { PositionService } from './position.service';
import { GeolocationPosition, GeolocationCoordinates } from '../model/position';


@Injectable({
  providedIn: 'root'
})
export class PanoramaService {
  private panos: Panorama[];

  constructor(private http: HttpClient, private position: PositionService) {}

  getPanoramas(watchDistance: boolean = false): Observable<Panorama[]> {
    const panos$ = this.panos ? of(this.panos) : this.fetchPanoramas();
    return watchDistance ? panos$.pipe(this.watchDistance) : panos$;
  }

  private watchDistance = exhaustMap((panos: Panorama[]) => this.position.getCurrentPosition().pipe(
    map(position => this.calcDistances(panos, position))
  ));

  getPanorama(id: { postalCode: string, slug: string } | string): Observable<Panorama> {
    if (typeof id === 'object') id = `${id.postalCode}/${id.slug}`;
    return this.getPanoramas().pipe(map(refs => find(refs, { id })));
  }

  fetchPanoramas(): Observable<Panorama[]> {
    return this.http.get<any>(environment.dbUrl).pipe(
      map(panos => this.decoratePanoramas(panos)),
      tap(panos => this.panos = panos)
    );
  }

  private decoratePanoramas(panos: Panorama[]): Panorama[] {
    return panos.map(pano => this.decoratePanorama(pano));
  }

  private decoratePanorama(pano: Panorama): Panorama {
    // set the postal code and slug (extracted from the id)
    const id = pano.id.split('/');
    pano.postalCode = id[0];
    pano.slug = id[1];

    // set the label (reshuffling the name)
    if (!pano.label) {
      pano.label = pano.name;
      const lastComma = pano.name.lastIndexOf(',');
      if (lastComma > 0) {
        const prefix = pano.name.substring(lastComma + 1);
        const suffix = pano.name.substring(0, lastComma);
        pano.label = `${prefix} ${suffix}`.trim();
      }
    }

    // set the default faceSize and levels
    pano.faceSize = pano.faceSize || 8192;
    pano.levels = LEVELS[pano.faceSize];

    pano.initialViewParameters = pano.initialViewParameters || { pitch: 0, yaw: 0, fov: 1 };

    return pano;
  }

  private calcDistances(panos: Panorama[], position: GeolocationPosition): Panorama[] {
    if (position) {
      panos.forEach(pano => this.calcDistance(pano, position.coords));
    }
    return panos;
  }

  private calcDistance(pano: Panorama, coords: GeolocationCoordinates): Panorama {
    pano.distance = this.calcCrow(pano.latitude, pano.longitude, coords.latitude, coords.longitude);
    return pano;
  }

  // This function takes in latitude and longitude of two location
  // and returns the distance between them as the crow flies (in km)
  private calcCrow(lat1, lon1, lat2, lon2) {
    var R = 6371; // km
    var dLat = this.toRad(lat2-lat1);
    var dLon = this.toRad(lon2-lon1);
    lat1 = this.toRad(lat1);
    lat2 = this.toRad(lat2);

    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    var d = R * c;
    return d;
   }

  // Converts numeric degrees to radians
  private toRad(Value) {
    return Value * Math.PI / 180;
  }
}
