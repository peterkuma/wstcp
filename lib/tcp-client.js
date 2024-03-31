'use strict'

const EventEmitter = require('events');
const net = require('net');


module.exports = function(mx, port, hostname) {
  let obj = new EventEmitter();
  mx.on('connection', stream => {
    let client = net.connect(port, hostname, socket => {
      obj.emit('connection', socket, stream);
    });
    stream.pipe(client).pipe(stream);
    client.on('error', err => {
      stream.destroy();
      client.destroy();
      obj.emit('error', err);
    });
    stream.on('error', err => {
      stream.destroy();
      client.destroy();
      obj.emit('error', err);
    });
    stream.on('close', () => obj.emit('close'));
  });
  return obj;
};
