import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

import { GeolocationPosition, GeolocationPositionError, GeolocationPositionErrorCode } from '../model/position';


@Injectable({
  providedIn: 'root'
})
export class PositionService {
  private enabled: boolean;
  private position: BehaviorSubject<GeolocationPosition>;
  private position$: Observable<GeolocationPosition>;

  constructor() {
    this.position = new BehaviorSubject(null);
    this.position$ = this.position.asObservable().pipe(shareReplay());
  }

  async enableGeolocation(): Promise<boolean> {
    if (this.enabled) return true;

    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) reject({ code: GeolocationPositionErrorCode.UNAVAILABLE });
      else navigator.geolocation.getCurrentPosition(resolve, reject);
    }).then(
      (position) => {
        this.enabled = true;
        this.position.next(position);
        this.watchPosition();
        return true;
      }
    );
  }

  getCurrentPosition(): Observable<Position> {
    return this.position$;
  }

  private watchPosition() {
    navigator.geolocation.watchPosition(
      (position: GeolocationPosition) => {
        console.log('[PositionService] Position changed:', position);
        this.position.next(position);
      },
      (error: GeolocationPositionError) => {
        console.error('[PositionService] Position failed:', error);
        // TODO print toast errors
      }
    );
  }
}
