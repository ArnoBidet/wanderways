import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnackBarComponent } from './snack-bar/snack-bar.component';
import { DataTableModule } from './data-table/data-table.module';
import { MaterialModule } from 'src/app/material.module';



@NgModule({
  declarations: [
    SnackBarComponent
  ],
  imports: [
    CommonModule,
    DataTableModule,
    MaterialModule
  ]
})
export class GenericModule { }
