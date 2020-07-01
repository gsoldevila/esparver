import { Component } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

import { DialogService } from './service/dialog.service';


@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet>',
})
export class AppComponent {
  constructor(private updates: SwUpdate, private dialogService: DialogService) {}

  ngOnInit(): void {
    if (this.updates.isEnabled) {
      this.updates.checkForUpdate();
      this.updates.available.subscribe(version => this.showUpdateDialog(version));
    }
  }

  showUpdateDialog({ current, available }) {
    const ref = this.dialogService.message({
      title: 'Informació',
      paragraphs: [
        'Hi ha una nova versió disponible',
        `Versió actual: ${current}`,
        `Nova versió: ${available}`,
      ],
      buttonText: 'Actualitzar'
    });

    ref.afterClosed().subscribe(() => this.updates.activateUpdate().then(() => document.location.reload()));
  }
}
