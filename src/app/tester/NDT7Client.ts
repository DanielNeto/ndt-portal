export class NDT7Client {

  private _baseUrl: URL;
  public _callbacks = {
    'onprogress': function (type: string, data: any) { return false; },
    'onserverinfo': function (type: string, data: any) { return false; },
    'onfinish': function (type: string) { return false; },
    'onerror': function (type: string) { return false; },
  };

  private static readonly WEB_SOCKET_PROTOCOL = 'net.measurementlab.ndt.v7';
  private static readonly TEST_MAX_DURATION = 10000; //10 seconds

  // UPLOAD CONSTS

  // MaxMessageSize is the minimum value of the maximum message size
  // that an implementation MAY want to configure. Messages smaller than this
  // threshold MUST always be accepted by an implementation.
  private static readonly MAX_MESSAGE_SIZE = 1 << 24;
  // ScalingFraction sets the threshold for scaling binary messages. When
  // the current binary message size is <= than 1/scalingFactor of the
  // amount of bytes sent so far, we scale the message. This is documented
  // in the appendix of the ndt7 specification.
  private static readonly SCALING_FRACTION = 16;
  private static readonly INITIAL_MESSAGE_SIZE = 1 << 13;


  constructor(serverUrl: string, callbacks: any) {
    this._baseUrl = new URL(serverUrl);
    this._baseUrl.protocol = (this._baseUrl.protocol === 'https:') ? 'wss:' : 'ws:';

    if (callbacks !== undefined) {
      this._callbacks = callbacks;
    }
  }

  runDownloadTest() {

    var testStart: number;
    var totalReceived = 0;
    var updateInterval = 250; //ms
    var nextCallback = updateInterval;

    this._baseUrl.pathname = '/ndt/v7/download';
    const sock = new WebSocket(this._baseUrl.toString(), NDT7Client.WEB_SOCKET_PROTOCOL);

    sock.addEventListener("open", () => {
      testStart = Date.now();
    });

    sock.addEventListener("message", ({ data }) => {
      totalReceived += (data instanceof Blob) ? data.size : data.length;
      var currentTime = Date.now();
      if (currentTime > (testStart + nextCallback)) {
        let elapsedTime = (currentTime - testStart); //ms
        if (elapsedTime <= NDT7Client.TEST_MAX_DURATION) {
          this._callbacks.onprogress('download', {
            'Bytes': totalReceived,
            'ElapsedTime': elapsedTime
          });
          nextCallback += updateInterval;
        }
      }
      if (!(data instanceof Blob)) {
        this._callbacks.onserverinfo('download', JSON.parse(data));
      }
    });

    sock.addEventListener("close", () => {
      this._callbacks.onfinish('download');
    });

    sock.addEventListener("error", () => {
      this._callbacks.onerror('download');
    });
  }

  runUploadTest() {

    var testStart: number;
    var totalSent = 0;
    var updateInterval = 250; //ms
    var nextCallback = updateInterval;

    this._baseUrl.pathname = '/ndt/v7/upload';

    const sock = new WebSocket(this._baseUrl.toString(), NDT7Client.WEB_SOCKET_PROTOCOL);

    var baseData = new Uint8Array(NDT7Client.MAX_MESSAGE_SIZE);  //SEND_BUFFER_SIZE 64KB

    for (var i = 0; i < baseData.length; i += 1) {
      // All the characters must be printable, and the printable range of
      // ASCII is from 32 to 126.  101 is because we need a prime number.
      baseData[i] = 32 + (i * 101) % (126 - 32);
    }
    var dataToSend = baseData.slice(0, NDT7Client.INITIAL_MESSAGE_SIZE);

    function keepSendingData(callbacks: any) {

      // The following block of code implements the scaling of message size
      // as recommended in the spec's appendix. We're not accounting for the
      // size of JSON messages because that is small compared to the bulk
      // message size. The net effect is slightly slowing down the scaling,
      // but this is currently fine. We need to gather data from large
      // scale deployments of this algorithm anyway, so there's no point
      // in engaging in fine grained calibration before knowing.
      if (dataToSend.length < NDT7Client.MAX_MESSAGE_SIZE && dataToSend.length < totalSent / NDT7Client.SCALING_FRACTION) {
        let sizeBefore = dataToSend.length;
        dataToSend = baseData.slice(0, sizeBefore * 2);
      }

      const underbuffered = 7 * dataToSend.length;
      while (sock.bufferedAmount < underbuffered) {
        sock.send(dataToSend);
        totalSent += dataToSend.length;
      }

      var currentTime = Date.now();

      if (currentTime > (testStart + nextCallback)) {

        let bytesSent = (totalSent - sock.bufferedAmount);
        let elapsedTime = (currentTime - testStart); //ms

        callbacks.onprogress('upload', {
          'Bytes': bytesSent,
          'ElapsedTime': elapsedTime
        });

        nextCallback += updateInterval;
      }

      if (currentTime < testStart + NDT7Client.TEST_MAX_DURATION) {
        setTimeout(function () { keepSendingData(callbacks) }, 0);
      } else {
        return;
      }
    };

    sock.addEventListener("open", () => {
      testStart = Date.now();
      keepSendingData(this._callbacks);
    });

    sock.addEventListener("message", ({ data }) => {
      if (!(data instanceof Blob)) {
        this._callbacks.onserverinfo('upload', JSON.parse(data));
      }
    });

    sock.addEventListener("close", () => {
      this._callbacks.onfinish('upload');
    });

    sock.addEventListener("error", () => {
      this._callbacks.onerror('upload');
    });
  }
}