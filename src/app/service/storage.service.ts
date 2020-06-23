import { Injectable } from '@angular/core';


const LOCAL_STORAGE_PREFIX = 'cat.esparver.';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  get(key: string): any {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_STORAGE_PREFIX + key));
    } catch(err) {
      console.error(`Error retrieving ${LOCAL_STORAGE_PREFIX}${key} from storage`, err);
      return null;
    }
  }

  set(key: string, value: any) {
    if (typeof value === 'undefined' || value === null) this.clear(key);
    else localStorage.setItem(LOCAL_STORAGE_PREFIX + key, JSON.stringify(value));
  }

  clear(key?: string) {
    key ? localStorage.removeItem(LOCAL_STORAGE_PREFIX + key) : localStorage.clear();
  }
}
