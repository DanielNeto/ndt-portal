import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClientJsonpModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { UbsComponent } from './ubs/ubs.component';
import { TesterComponent } from './tester/tester.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { GaugeModule } from 'angular-gauge';
import { UbsService } from './ubs.service';

@NgModule({
  declarations: [
    AppComponent,
    UbsComponent,
    TesterComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    HttpClientModule,
    HttpClientJsonpModule,
    MatToolbarModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    GaugeModule.forRoot(),
    FormsModule,
    MatSnackBarModule
  ],
  providers: [UbsService],
  bootstrap: [AppComponent]
})
export class AppModule { }
