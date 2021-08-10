'use strict'

const EventEmitter = require('events');
const net = require('net');


module.exports = function(mx, port, hostname) {
  let obj = new EventEmitter();
  mx.seq = mx.seq !== undefined ? mx.seq : 0;
  let server = net.createServer({allowHalfOpen: true}, client => {
    obj.emit('connection', client);
    let stream = mx.createStream(mx.seq++, {allowHalfOpen: true});
    client.pipe(stream).pipe(client);
    client.on('error', err => {
      stream.destroy();
      client.destroy();
    });
    stream.on('error', err => {
      stream.destroy();
      client.destroy();
    });
  });
  mx.on('end', () => {
    server.close();
    obj.emit('close');
  });
  mx.on('error', err => {
    server.close();
    obj.emit('close');
  });
  server.on('error', err => obj.emit('error', err));
  server.listen(port, hostname);
  obj.close = function() { server.close() };
  return obj;
};
