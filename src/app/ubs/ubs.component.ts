import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { trigger, transition, animate, style } from '@angular/animations';
import { MatSnackBar } from '@angular/material/snack-bar';

import { UBS } from './ubs.model';
import { UbsService } from '../ubs.service';

import { environment } from '../../environments/environment';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

interface State {
  value: string;
  viewValue: string;
}

@Component({
  selector: 'app-ubs',
  templateUrl: './ubs.component.html',
  styleUrls: ['./ubs.component.scss'],
  animations: [
    trigger('fadein', [
      transition('void => *', [
        style({ opacity: 0 }),
        animate(500)
      ]),
    ])
  ]
})
export class UbsComponent implements OnInit, OnDestroy {

  displayControls: any = {
    'displayUBS': false,
    'displayDebug': false,
    'displayTest': false,
    'disabledInput': false
  }

  private subscription: Subscription;

  //User input parameters
  cnes: string;
  stateSelected: string;
  bwSelected: string;

  //Send to tester component
  serverUrl: string;
  ubsId: string;
  userBw: string;

  ubsSelected: UBS;

  states: State[] = [
    { value: 'ac', viewValue: 'Acre' },
    { value: 'al', viewValue: 'Alagoas' },
    { value: 'ap', viewValue: 'Amapá' },
    { value: 'am', viewValue: 'Amazonas' },
    { value: 'ba', viewValue: 'Bahia' },
    { value: 'ce', viewValue: 'Ceará' },
    { value: 'df', viewValue: 'Distrito Federal' },
    { value: 'es', viewValue: 'Espírito Santo' },
    { value: 'go', viewValue: 'Goiás' },
    { value: 'ma', viewValue: 'Maranhão' },
    { value: 'mt', viewValue: 'Mato Grosso' },
    { value: 'ms', viewValue: 'Mato Grosso do Sul' },
    { value: 'mg', viewValue: 'Minas Gerais' },
    { value: 'pa', viewValue: 'Pará' },
    { value: 'pb', viewValue: 'Paraíba' },
    { value: 'pr', viewValue: 'Paraná' },
    { value: 'pe', viewValue: 'Pernambuco' },
    { value: 'pi', viewValue: 'Piauí' },
    { value: 'rj', viewValue: 'Rio de Janeiro' },
    { value: 'rn', viewValue: 'Rio Grande do Norte' },
    { value: 'rs', viewValue: 'Rio Grande do Sul' },
    { value: 'ro', viewValue: 'Rondônia' },
    { value: 'rr', viewValue: 'Roraima' },
    { value: 'sc', viewValue: 'Santa Catarina' },
    { value: 'sp', viewValue: 'São Paulo' },
    { value: 'se', viewValue: 'Sergipe' },
    { value: 'to', viewValue: 'Tocantins' }
  ];

  constructor(private changeDetector: ChangeDetectorRef, private _snackBar: MatSnackBar, private ubsService: UbsService) {
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  searchUbsOnEnter(value: string) {
    if (environment.debugging) {
      console.log(value);
    }
    this.searchUbs(value);
  }

  searchUbsOnClick() {
    if (environment.debugging) {
      console.log(this.cnes);
    }
    this.searchUbs(this.cnes);
  }

  searchUbs(ubscode: string) {
    if (!this.isNumber(ubscode)) {
      this.showErrorMsg("Código CNES inválido!");
    }
    if (ubscode == '7654321') {
      this.stateDebug();
      this.ubsId = ubscode;
    } else {
      this.getUbsFromDB(ubscode);
    }
  }

  startTest() {
    if (this.debugMode()) {
      if (this.bwSelected === undefined || this.stateSelected === undefined) {
        this.showErrorMsg("Estado e/ou Banda Contratada inválido!");
      } else {
        this.serverUrl = this.formatServerURL(this.stateSelected);
        this.userBw = this.bwSelected;
        this.stateTest();
      }
    }
    if (this.ubsMode()) {
      this.serverUrl = this.formatServerURL(this.ubsSelected.state.toLowerCase());
      this.stateTest();
    }
  }

  getUbsFromDB(ubsId: string) {
    this.subscription = this.ubsService.getUbs(ubsId).pipe(take(1)).subscribe(response => {
      if (response.status == 200) {
        if (environment.debugging) {
          console.log(response.status);
          console.log(response.body);
        }
        this.ubsSelected = { ...response.body };
        this.ubsSelected.description = this.toUpper(this.ubsSelected.description);
        this.ubsSelected.city = this.toUpper(this.ubsSelected.city);
        this.stateUbs();
        this.ubsId = ubsId;
        this.userBw = this.ubsSelected.download;
      } else {
        if (environment.debugging) {
          console.log(response.status);
        }
        this.stateInit();
        this.showErrorMsg("UBS não encontrada!");
      }
    },
      error => {
        if (environment.debugging) {
          console.log(error);
        }
        if (error.status == 404) {
          this.stateInit();
          this.showErrorMsg("UBS não encontrada!");
        }
      });
  }

  stateInit() {
    this.displayControls.displayUBS = false;
    this.displayControls.displayDebug = false;
    this.displayControls.displayTest = false;
    this.displayControls.disabledInput = false;
  }
  stateUbs() {
    this.displayControls.displayUBS = true;
    this.displayControls.displayDebug = false;
    this.displayControls.displayTest = false;
    this.displayControls.disabledInput = false;
  }
  stateDebug() {
    this.displayControls.displayUBS = false;
    this.displayControls.displayDebug = true;
    this.displayControls.displayTest = false;
    this.displayControls.disabledInput = false;
  }
  stateTest() {
    if (this.displayControls.displayTest) {
      this.displayControls.displayTest = false;
      this.changeDetector.detectChanges();
    }
    this.displayControls.displayTest = true;
    this.displayControls.disabledInput = true;
  }
  stateTestEnded() {
    this.displayControls.disabledInput = false;
  }

  ubsMode() {
    return this.displayControls.displayUBS;
  }

  debugMode() {
    return this.displayControls.displayDebug;
  }

  formatServerURL(server: string) {
    let protocol: string = "https://";
    let domain: string = ".medidor.rnp.br";
    let port: string = ":4443";
    return protocol.concat(server, domain, port);
  }

  isNumber(n: any) { return !isNaN(parseFloat(n)) && !isNaN(n - 0) }

  toUpper(str: string) {
    return str
      .toLowerCase()
      .split(' ')
      .map(function (word) {
        return word[0].toUpperCase() + word.substr(1);
      })
      .join(' ');
  }

  onTestFinished(finished: boolean) {
    if (environment.debugging) {
      console.log("TESTE ACABOU", finished);
    }
    if (finished) {
      this.stateTestEnded();
    }
  }

  showErrorMsg(msg: string) {
    this._snackBar.open(msg, "", {
      duration: 1500,
      verticalPosition: 'top',
      panelClass: 'error-snack-bar'
    });
  }
}