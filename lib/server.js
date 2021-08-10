'use strict'

const _ = require('lodash');
const websocket = require('websocket-stream');
const EventEmitter = require('events');
const MuxDemux = require('mux-demux/msgpack');

const tcpServer = require('./tcp-server.js');
const tcpClient = require('./tcp-client.js');


module.exports = function(options) {
  options = _.defaults(options, {
    pingInterval: 10e3
  });
  let obj = new EventEmitter();
  let wssOptions = _.omit(options, [
    'tcpServer',
    'tcpHostname',
    'remote'
  ]);
  const wss = websocket.createServer(wssOptions, stream => {
    obj.emit('connection', stream);

    let mx = MuxDemux({error: true, allowHalfOpen: true});
    mx.on('error', err => obj.emit('error', err));

    if (options.pingInterval !== 0) {
      let timeout = setTimeout(stream.end.bind(stream), options.pingInterval*2);
      let timer = setInterval(() => {
        try {stream.socket.ping();} catch (err) {}
      }, options.pingInterval);
      stream.socket.on('pong', () => {
        clearTimeout(timeout);
        timeout = setTimeout(stream.end.bind(stream), options.pingInterval*2);
      });
      stream.on('end', () => clearInterval(timer));
    }

    stream.pipe(mx).pipe(stream);
    if (options.remote) {
      let server = tcpServer(mx, options.tcpPort, options.tcpHostname);
      server.on('connection', data => obj.emit('tcp-connection', data, stream));
      server.on('close', () => obj.emit('tcp-close'));
      server.on('error', err => {
        mx.destroy();
        stream.destroy();
        obj.emit('error', err);
      });
      stream.on('end', () => server.close());
    } else {
      let client = tcpClient(mx, options.tcpPort, options.tcpHostname);
      client.on('connection', data => obj.emit('tcp-connection', data, stream));
      client.on('close', () => obj.emit('tcp-close'));
      client.on('error', err => {
        mx.destroy();
        stream.destroy();
        obj.emit('error', err);
      });
    }
    stream.on('end', () => {
      mx.destroy();
      obj.emit('end', stream);
    });
    stream.on('error', err => {
      mx.destroy();
      stream.destroy();
      obj.emit('error', err);
    });
  });
  wss.on('close', () => obj.emit('close'));
  wss.on('error', err => obj.emit('error', err));
  obj.wss = wss;
  return obj;
};
