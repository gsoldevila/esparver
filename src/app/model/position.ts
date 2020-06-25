export interface GeolocationPosition {
  coords: GeolocationCoordinates;
  timestamp: number;
}

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
  altitudeAccuracy: number;
  heading: number;
  speed: number;
}

export enum GeolocationPositionErrorCode {
  UNAVAILABLE = -1,
  NOT_INITIALIZED = 0,
  PERMISSION_DENIED = 1,
  POSITION_UNAVAILABLE = 2,
  TIMEOUT = 3,
}

export interface GeolocationPositionError {
  code: GeolocationPositionErrorCode;
}
