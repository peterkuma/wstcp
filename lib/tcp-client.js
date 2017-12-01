'use strict'

const EventEmitter = require('events');
const net = require('net');


module.exports = function(mx, port, hostname) {
  let obj = new EventEmitter();
  mx.on('connection', stream => {
    let client = net.connect({port: port, hostname: hostname}, socket => {
      obj.emit('connection', socket, stream);
    });
    client.on('error', err => {
      stream.end();
      obj.emit('error', err);
    });
    stream.pipe(client).pipe(stream);
    stream.on('end', () => obj.emit('close'));
  });
  return obj;
};
