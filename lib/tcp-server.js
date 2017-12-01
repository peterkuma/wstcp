'use strict'

const EventEmitter = require('events');
const net = require('net');


module.exports = function(mx, port, hostname) {
  let obj = new EventEmitter();
  mx.seq = mx.seq !== undefined ? mx.seq : 0;
  let server = net.createServer(client => {
    obj.emit('connection', client);
    let stream = mx.createStream(mx.seq++);
    client.pipe(stream).pipe(client);
  });
  mx.on('end', () => {
    server.close();
    obj.emit('close');
  });
  server.on('error', err => obj.emit('error', err));
  server.listen(port, hostname);
  return obj;
};
