import { OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';


export class ComponentWithSubscriptions implements OnDestroy {
  private _subscriptions: Subscription[] = [];

  registerSubscription(s: Subscription): void {
    this._subscriptions.push(s);
  }

  ngOnDestroy(): void {
    this._subscriptions.forEach(s => s.unsubscribe());
  }
}
