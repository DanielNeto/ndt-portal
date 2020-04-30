/// <reference lib="webworker" />

import { NDT7Client } from './NDT7Client';

var rtts: number[] = [];
var lostSegments = 0;
var lastServerResult: any;

addEventListener('message', ({ data }) => {
  startNDT(data);
});

function startNDT(serverUrl: string) {
  var callbacks = {
    'onprogress': function (type: string, data: any) {
      postMessage({
        'cmd': 'onprogress',
        'type': type,
        'data': data,
      });
    },
    'onserverinfo': function (type: string, data: any) {
      rtts.push(data.TCPInfo.RTT);
      lostSegments += data.TCPInfo.Lost;
      lastServerResult = data;
    },
    'onfinish': function (type: string) {
      if (type === 'download') {

        let retransmissions = lastServerResult.TCPInfo.BytesRetrans / lastServerResult.TCPInfo.BytesSent;
        let segmentLoss = lostSegments / lastServerResult.TCPInfo.SegsIn;
        let serverBW = (lastServerResult.TCPInfo.BytesAcked * 8) / lastServerResult.TCPInfo.ElapsedTime;
        let uuidDownload = lastServerResult.ConnectionInfo.UUID;

        postMessage({
          'cmd': 'onfinish',
          'type': type,
          'data': {
            'retransmissions': retransmissions,
            'loss': segmentLoss,
            'BW': serverBW,
            'uuid': uuidDownload
          }
        });

        client.runUploadTest();
      }
      if (type === 'upload') {

        let serverBW = (lastServerResult.TCPInfo.BytesReceived * 8) / lastServerResult.TCPInfo.ElapsedTime;
        let uuidUpload = lastServerResult.ConnectionInfo.UUID;
        let latency = getAverage(rtts) / 1000.0;
        let jitter = calculateJitter(rtts) / 1000.0;

        let clientIpPort = lastServerResult.ConnectionInfo.Client.split(":");
        let clientPort = clientIpPort.pop();
        let clientIp = clientIpPort.join(":");

        let serverIpPort = lastServerResult.ConnectionInfo.Server.split(":");
        serverIpPort.pop();
        let serverIp = serverIpPort.join(":");

        let time = lastServerResult.TCPInfo.ElapsedTime;

        postMessage({
          'cmd': 'onfinish',
          'type': type,
          'data': {
            'BW': serverBW,
            'uuid': uuidUpload,
            'latency': latency,
            'jitter': jitter,
            'clientIp': clientIp,
            'clientPort': clientPort,
            'serverIp': serverIp,
            'time': time
          }
        });

      }
    },
    'onerror': function (type: string) {
      postMessage({
        'cmd': 'onerror',
        'type': type
      });
    }
  };

  var client = new NDT7Client(serverUrl, callbacks);
  client.runDownloadTest();
}

function getAverage(array: number[]) {
  var sum = 0;
  for (var i = 0; i < array.length; i++) {
    sum += array[i];
  }
  return (sum / array.length);
}

function calculateJitter(rtts: number[]) {
  var variances = [];
  for (var i = 1; i < rtts.length; i++) {
    variances.push(Math.abs(rtts[i] - rtts[i - 1]));
  }
  return getAverage(variances);
}