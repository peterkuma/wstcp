wstcp
=====

wstcp is a node.js client and server implementation of TCP forwarding
over WebSocket. wstcp supports local and remote port forwarding,
similar to OpenSSH.

wstcp server is limited to a single WebSocket client connection at a time,
but it can forward any number of simultaneous TCP connections over the
WebSocket link by multiplexing.

wstcp can be used for exposing a client-side TCP server on the
server-side (*local forwarding*) or a server-side TCP server on
the client side (*remote forwarding*) when the client is behind a firewall,
NAT, or has a dynamic IP address.

wstcp relies on [MuxDemux](https://github.com/dominictarr/mux-demux)
and [websocket-stream](https://github.com/maxogden/websocket-stream),
and it has a very compact implementation (less than 200 lines of code).

In contrast to OpenSSH, the client and server decide which TCP port
to use on their side.

For security (wss) use an SSL-capable HTTP proxy server such as
nginx in front of the wstcp server. The client supports connecting 
to `wss://` URLs.

<!-- Also see [wstcp-server](https://github.com/peterkuma/wstcp-server) and
[wstcp-client](https://github.com/peterkuma/wstcp-client). -->

Examples
--------

### Remote port forwarding

**Server:**

```js
const wstcpServer = require('wstcp').server;

let server = wstcpServer({
  port: 8000,
  tcpPort: 10000,
  remote: true
});

server.on('connection', () => console.log('server: connection'));
server.on('error', err => {
  console.error(`server: error: ${err.message}`);
});
```

Start a WebSocket server on port 8000 (HTTP) and listen on port 10000 for incoming
TCP connections. TCP connections are forwarded to the client.

**Client:**

```js
const wstcpClient = require('wstcp').client;

let client = wstcpClient({
  url: 'ws://localhost:8000',
  tcpPort: 22,
  remote: true
});

client.on('connection', () => console.log('client: connection'))
client.on('close', () => console.log('client: close'))
client.on('error', err => {
  console.error(`client: error: ${err.message}`);
});
```

Connect to a WebSocket server on `ws://localhost:8000` and forward incoming
TCP connections from the server to port 22 on `localhost`.

### Multiple clients with authentication

**Server:**

```js
const http = require('http');
const wstcpServer = require('wstcp').server;

let clients = {
  'client-1': {
    port: 10001,
    key: '1234'
  },
  'client-2': {
    port: 10002,
    key: '1234'
  }
}

const httpServer = http.createServer();

for (let name of Object.keys(clients)) {
  let opts = clients[name];
  function verify(info, cb) {
    let key = info.req.headers['x-key'];
    if (opts.key && key === opts.key) {
      return cb(true);
    }
    return cb(false);
  }
  let server = wstcpServer({
    server: httpServer,
    path: '/' + name,
    tcpPort: opts.port,
    remote: true,
    verifyClient: verify
  });
  server.on('connection', () => console.log('server: connection'));
  server.on('error', err => console.error(`server: error: ${err}`));
}

httpServer.listen(8000);
```

Listen on port 8000 for WebSocket connections on two paths: `/client-1`
and `/client-2`. Clients are authenticated by `X-Key` HTTP header.

**Client:**

```js
const wstcpClient = require('wstcp').client;

const client = wstcpClient({
  url: 'ws://localhost:8000/client-1',
  tcpPort: 22,
  remote: true,
  headers: {
    'X-Key': '1234'
  }
});

client.on('connection', () => console.log('client: connection'))
client.on('close', () => console.log('client: close'))
client.on('error', err => console.error(`client: error: ${err.message}`));
```

Connect to `ws://localhost:8000/client-1`, authenticating with a key
passed in HTTP header `X-Key`. Listen on the TCP port 22 and forward
connections to the server.

API
---

### server(options)

Create a wstcp server.

`options`:

- `port`: WebSocket port (required).
- `hostname`: WebSocket hostname.
- `tcpPort`: TCP port to connect to/listen on (required).
- `tcpHostname`: TCP host to connect to/listen on.
- `remote`: Remote port forwarding (default: `false`).
- `pingInterval`: WebSocket ping interval in ms or 0 to disable
  (default: 10000).

Additional options are passed to
[ws](https://github.com/websockets/ws/blob/master/doc/ws.md#new-wsserveroptions-callback).

#### Events

- `error` (`err`)

    Emitted on error.

- `connection`

    Emitted when client connection has been established.

- `tcp-connection`

    Emitted when TCP forwarding connection has been established.

- `tcp-close`

    Emitted when TCP forwarding connection has been closed.

- `close`

    Emitted when client connection has been closed.

### client(options)

Connect to a wstcp server.

`options`:

- `url`: WebSocket URL to connect to (required).
- `tcpPort`: TCP port to connect to/listen on (required).
- `tcpHostname`: TCP host to connect to/listen on.
- `remote`: Remote port forwarding (default: `false`).
- `pingInterval`: WebSocket ping interval in ms or 0 to disable
  (default: 10000).

#### Events

- `error` (`err`)

    Emitted on error.

- `connection`

    Emitted when connection to the server has been established.

- `tcp-connection`

    Emitted when TCP forwarding connection has been established.

- `tcp-close`

    Emitted when TCP forwarding connection has been closed.

- `close`

    Emitted when connection to the server has been closed.

Changelog
---------

### 1.0.2 (2017-12-03)

- Improved documentation.

### 1.0.1 (2017-12-02)

- Initial release.

License
-------

[MIT](LICENSE.md)
