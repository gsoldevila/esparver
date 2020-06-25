import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { DialogComponent } from '../dialog/dialog.component';


export const ERROR_HOSPITAL_OR_TERMINAL_NOT_FOUND = 'ERROR.HOSPITAL_OR_TERMINAL_NOT_FOUND';
export const ERROR_FETCH_INCOME_DATA = 'ERROR.FETCH_INCOME_DATA';

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  constructor(private matDialog: MatDialog) {}

  message(data: any) {
    return this.matDialog.open(DialogComponent, { data });
  }
}
