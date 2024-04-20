import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { trigger, transition, animate, style } from '@angular/animations';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-tester',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './tester.component.html',
  styleUrls: ['./tester.component.scss'],
  animations: [
    trigger('fade', [
      transition('void => *', [
        style({ opacity: 0 }),
        animate(1000)
      ])
    ])
  ]
})
export class TesterComponent implements OnInit {

  //User input parameters
  stateSelected: string = '';
  serverURL: string = '';
  quietMode: boolean = false;
  
  animations: boolean = true;

  displayValues: any = {
    "download": 0,
    "upload": 0,
    "latency": 0,
    "jitter": 0,
    "retransmissions": 0,
    "clientIp": "0.0.0.0",
    "serverIp": "0.0.0.0",
    "testTime": ""
  }

  displayControls: any = {
    'showStats': false,
    'showBasic': false,
    'disabledButton': false
  }

  states: Array<string> = [
    'ac', 'al', 'ap', 'am', 'ba', 'ce', 'df', 'es', 'go',
    'ma', 'mt', 'ms', 'mg', 'pa', 'pb', 'pr', 'pe', 'pi',
    'rj', 'rn', 'rs', 'ro', 'rr', 'sc', 'sp', 'se', 'to'
  ];

  constructor(private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.route.queryParams
      .subscribe(params => {
        if (params['state'] !== undefined) {
          console.log("State defined");
          this.stateSelected = params['state'];
        }
        if (params['quiet'] !== undefined && params['quiet'].toLowerCase() == 'true') {
          console.log("Quiet mode defined");
          this.quietMode = true; 
        }
      });
  }

  startTests() {
    if (this.states.includes(this.stateSelected)) {
      this.serverURL = this.formatServerURL();

      if (typeof Worker !== 'undefined') {
        // Create a new
        const worker = new Worker(new URL('./tester.worker', import.meta.url));
        worker.onmessage = ({ data }) => {

          switch (data.cmd) {
            case 'onstart':
              this.resetStats();
              this.stateStart();
              this.displayValues.testTime = new Date().toLocaleString('pt-BR') + " (UTC-3)";
              break;
            case 'onprogress':
              this.updateTestBW(data.type, data.data.Bytes, data.data.ElapsedTime);
              //do something with bytes and time
              break;
            case 'onfinish':
              this.updateFinalValues(data.type, data.data);
              //do something with final values

              break;
            case 'onerror':
              console.error("ERROR", data.type);
              break;
            default:
              break;
          }
        };
        worker.postMessage(this.serverURL);

      } else {
        // Web Workers are not supported in this environment.
        // You should add a fallback so that your program still executes correctly.
        console.error("Browser does not support Web Workers!");
      }
    } else {
      console.error("Server not found!");
    }
  }

  updateTestBW(test: string, bytes: number, time: number) {

    let bw = (bytes * 8) / (time * 1000); //Mbps (time is in milliseconds)

    if (test === 'download') {
      this.displayValues.download = this.formatNumber(bw);
    }
    if (test === 'upload') {
      this.displayValues.upload = this.formatNumber(bw);
    }
  }

  updateFinalValues(test: string, data: any) {

    if (test === 'download') {
      this.displayValues.retransmissions = this.formatNumber(data.retransmissions * 100);
      console.log("Download", data);
    }
    if (test === 'upload') {
      this.displayValues.latency = this.formatNumber(data.latency);
      this.displayValues.jitter = this.formatNumber(data.jitter);
      this.displayValues.clientIp = data.clientIp;
      this.displayValues.serverIp = data.serverIp + " (" + this.serverURL.split("/")[2].split(":")[0] + ")";
      console.log("Upload", data);

      this.stateEnd();
    }
  }

  stateStart() {
    this.displayControls.showBasic = true;
    this.displayControls.showStats = false;
    this.displayControls.disabledButton = true;
  }

  stateEnd() {
    this.displayControls.showBasic = true;
    if (!this.quietMode) {
      this.displayControls.showStats = true;
    }
    this.displayControls.disabledButton = false;
    var parentWindow = window.parent;
    if (window.parent != window.top) {
      console.log("we are deeper than one down");
    } else {
      console.log("we are not deep");
    }
    parentWindow.postMessage(JSON.stringify({
      banda_download: this.displayValues.download, 
      banda_upload: this.displayValues.upload,
      retransmissao: this.displayValues.retransmissions,
      rtt: this.displayValues.latency,
      jitter: this.displayValues.jitter,
      ip_cliente: this.displayValues.clientIp,
      ip_servidor: this.displayValues.serverIp,
      horario: this.displayValues.testTime}), "*");
  }

  resetStats() {
    this.displayValues.clientIp = "0.0.0.0";
    this.displayValues.serverIp = "0.0.0.0";
    this.displayValues.download = "0";
    this.displayValues.upload = "0";
    this.displayValues.latency = "0";
    this.displayValues.jitter = "0";
    this.displayValues.retransmissions = "0";
    this.displayValues.testTime = "";
  }

  formatServerURL() {
    let protocol: string = "https://";
    let domain: string = ".medidor.rnp.br";
    let port: string = ":4443";
    return protocol.concat(this.stateSelected, domain, port);
  }

  formatNumber(d: number) {
    if (d < 10) return d.toFixed(2);
    if (d < 100) return d.toFixed(1);
    return d.toFixed(0);
  }
}