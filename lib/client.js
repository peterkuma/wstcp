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
  let ws = websocket(options.url, {
    headers: _.get(options, 'headers')
  });
  ws.on('connect', () => {
    obj.emit('connection');

    if (options.pingInterval !== 0) {
      let timer = setInterval(() => {
        try {ws.socket.ping();} catch (err) {}
      }, options.pingInterval);
      ws.on('close', () => clearInterval(timer));
    }

    let mx = MuxDemux();
    ws.pipe(mx).pipe(ws);
    if (options.remote) {
      let client = tcpClient(mx, options.tcpPort, options.tcpHost);
      client.on('connection', data => obj.emit('tcp-connection', data));
      client.on('close', () => obj.emit('tcp-close'));
      client.on('error', err => obj.emit('error', err));
    } else {
      let server = tcpServer(mx, options.tcpPort, options.tcpHost);
      server.on('connection', data => obj.emit('tcp-connection', data));
      server.on('close', () => obj.emit('tcp-close'));
      server.on('error', err => obj.emit('error', err));
    }
  });
  ws.on('close', () => obj.emit('close'));
  ws.on('error', err => obj.emit('error', err));
  return obj;
};
