import { Component, EventEmitter, OnInit, Input, Output, OnDestroy } from '@angular/core';
import { trigger, transition, animate, style } from '@angular/animations';

import { environment } from '../../environments/environment';
import { UbsService } from '../ubs.service';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-tester',
  templateUrl: './tester.component.html',
  styleUrls: ['./tester.component.scss'],
  animations: [
    trigger('fadein', [
      transition('void => *', [
        style({ opacity: 0 }),
        animate(500)
      ]),
    ])
  ]
})
export class TesterComponent implements OnInit, OnDestroy {

  @Input() serverUrl: string;
  @Input() ubsId: string;
  @Input() userBw: string;
  @Output() testFinished = new EventEmitter<boolean>();

  private subscription: Subscription;

  showStats: boolean;

  displayValues: any = {
    "download": 0,
    "maxDownload": 100,
    "upload": 0,
    "maxUpload": 100,
    "latency": 0,
    "jitter": 0,
    "retransmissions": 0,
    "clientIp": "0.0.0.0",
    "testTime": ""
  }

  testValues: any = {
    "download": 0,
    "upload": 0,
    "latency": 0,
    "jitter": 0,
    "retransmissions": 0,
    "segmentLoss": 0,
    "clientIp": "",
    "clientPort": "",
    "serverIp": "",
    "startTime": "",
    "endTime": "",
    "timestamp": "",
    "uuidDownload": "",
    "uuidUpload": "",
    "ubsId": "",
    "userBw": ""
  }

  getLabel: (value: number) => string;

  constructor(private ubsService: UbsService) {
    this.getLabel = function (value: number): string {
      return `${value} Mb/s`;
    };
    this.showStats = false;
  }

  ngOnInit(): void {
    this.testFinished.emit(false);
    this.testValues.ubsId = this.ubsId;
    if (this.ubsId == environment.cnescodetest) {
      this.testValues.userBw = this.userBw;
    }
    this.testValues.startTime = Date.now();
    this.displayValues.maxDownload = Number(this.userBw) * 2; //it wont work if it goes beyond 2 times
    this.displayValues.maxUpload = Number(this.userBw) * 2;
    this.startTests();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  startTests() {
    if (typeof Worker !== 'undefined') {
      // Create a new
      const worker = new Worker('./tester.worker', { type: 'module' });
      worker.onmessage = ({ data }) => {

        switch (data.cmd) {
          case 'onprogress':
            this.updateTestBW(data.type, data.data.Bytes, data.data.ElapsedTime);
            break;
          case 'onfinish':
            this.updateFinalValues(data.type, data.data);
            break;
          case 'onerror':
            console.error("ERROR", data.type);
            break;
          default:
            break;
        }
        //console.log(data.cmd);
      };
      worker.postMessage(this.serverUrl);
    } else {
      // Web Workers are not supported in this environment.
      // You should add a fallback so that your program still executes correctly.
      console.error("Browser does not support Web Workers!");
    }
  }

  updateTestBW(test: string, bytes: number, time: number) {

    let bw = (bytes * 8) / (time * 1000); //Mbps
    if (environment.debugging) {
      console.log("banda", test, bw, bytes, time);
    }

    if (test === 'download') {
      this.testValues.download = bw;
      //this.displayValues.maxDownload = (bw > 100) ? this.formatNumber(bw) : 100; //doesnt work
      this.displayValues.download = this.formatNumber(bw);
    }
    if (test === 'upload') {
      this.testValues.upload = bw;
      //this.displayValues.maxUpload = (bw > 100) ? this.formatNumber(bw) : 100; //doesnt work
      this.displayValues.upload = this.formatNumber(bw);
    }
  }

  updateFinalValues(test: string, data: any) {

    if (test === 'download') {
      this.testValues.retransmissions = data.retransmissions;
      this.displayValues.retransmissions = this.formatNumber(data.retransmissions * 100);
      this.testValues.segmentLoss = data.loss;
      this.testValues.uuidDownload = data.uuid;
    }

    if (test === 'upload') {
      if (environment.debugging) {
        console.log("TIME", data.time);
      }
      this.testValues.endTime = Date.now();

      this.testValues.upload = data.BW;
      //this.displayValues.maxUpload = (data.BW > 100) ? this.formatNumber(data.BW) : 100; //doesnt work
      this.displayValues.upload = this.formatNumber(data.BW);

      this.testValues.latency = data.latency;
      this.displayValues.latency = this.formatNumber(data.latency);
      this.testValues.jitter = data.jitter;
      this.displayValues.jitter = this.formatNumber(data.jitter);

      this.testValues.clientIp = data.clientIp;
      this.displayValues.clientIp = data.clientIp;
      this.testValues.clientPort = data.clientPort;
      this.testValues.serverIp = data.serverIp;

      this.displayValues.testTime = new Date().toLocaleString('pt-BR') + " (UTC-3)";

      this.testValues.uuidUpload = data.uuid;

      this.showStats = true;
      this.testFinished.emit(true);

      this.saveResultsDB();
    }
  }

  saveResultsDB() {
    if (environment.debugging) {
      console.log(this.testValues);
    }
    this.subscription = this.ubsService.saveResults(JSON.stringify(this.testValues)).pipe(take(1))
      .subscribe(res => console.log("saved data"), err => console.log("also saved data"));
  }

  formatNumber(d: number) {
    if (d < 10) return d.toFixed(2);
    if (d < 100) return d.toFixed(1);
    return d.toFixed(0);
  }
}