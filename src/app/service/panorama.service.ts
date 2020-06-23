import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { find } from 'lodash';

import { environment } from '../../environments/environment';

import { Panorama, LEVELS } from '../model/panorama';


@Injectable({
  providedIn: 'root'
})
export class PanoramaService {
  private panos: Panorama[];

  constructor(private http: HttpClient) {}

  getPanoramas(): Observable<Panorama[]> {
    return this.panos ? of(this.panos) : this.fetchPanoramas();
  }

  getPanorama({ postalCode, slug }): Observable<Panorama> {
    return this.getPanoramas().pipe(
      map(refs => find(refs, { id: `${postalCode}/${slug}` }))
    );
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

    // set the default faceSize and levels
    pano.faceSize = pano.faceSize || 8192;
    pano.levels = LEVELS[pano.faceSize];

    // TODO calculate the distance to the current point

    // set default empty lists for hotspots
    pano.linkHotspots = pano.linkHotspots || [];
    pano.infoHotspots = pano.infoHotspots || [];

    pano.initialViewParameters = pano.initialViewParameters || { pitch: 0, yaw: 0, fov: 1 };

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
