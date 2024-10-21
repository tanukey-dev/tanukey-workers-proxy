import { Hono, Context } from 'hono'
import { cors } from 'hono/cors'
import type { DurableObjectNamespace } from '@cloudflare/workers-types'

type Env = {
  Bindings: {
    WEBSOCKET: DurableObjectNamespace
  }
}

export class WebSocketConnection implements DurableObject {
  private readonly sessions = new Set<WebSocket>()

  async fetch(request: Request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    await this.handleSession(server as WebSocket)

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  private async handleSession(webSocket: WebSocket): Promise<void> {
    (webSocket as any).accept()
    this.sessions.add(webSocket)

    webSocket.addEventListener('message', async (event: MessageEvent) => {
      this.sessions.forEach((session) => session.readyState === WebSocket.OPEN && session.send(event.data))
    })

    webSocket.addEventListener('close', async (event: CloseEvent) => {
      this.sessions.delete(webSocket)
    })
  }
}

const proxy = async (c: Context, url: string) => {
  return fetch(new URL(c.req.path, url), c.req.raw);
};

const apiProxy = async (c: Context) => {
  return proxy(c, apiServerPath);
};

const frontProxy = async (c: Context) => {
  return proxy(c, frontServerPath);
};

const frontServerPath = 'https://front-staging.tarbin.net';
const apiServerPath = 'https://api-staging.tarbin.net';

const app = new Hono<Env>()

app.use('*', cors({
  origin: [frontServerPath, apiServerPath],
}));

app.all('/api/*', apiProxy)

app.post('/transaction/webhook', apiProxy)

app.get('/api-doc', apiProxy)
app.get('/api-json', apiProxy)
app.get('/.nodeinfo', apiProxy)
app.get('/.well-known', apiProxy)
app.get('/manifest.json', apiProxy)
app.get('/robots.txt', apiProxy)
app.get('/opensearch.xml', apiProxy)
app.get('/url', apiProxy)
app.get('/emoji/*', apiProxy)
app.get('/avatar/*', apiProxy)
app.get('/identicon/*', apiProxy)
app.get('/verify-email', apiProxy)
app.get('/sw.js', apiProxy)

// Files
app.get('/files/*', apiProxy)
app.get('/proxy/*', apiProxy)
app.get('/assets/*', apiProxy)
app.get('/static-assets/*', apiProxy)
app.get('/client-assets/*', apiProxy)
app.get('/favicon.ico', apiProxy)
app.get('/apple-touch-icon.png', apiProxy)
app.get('/fluent-emoji/*', apiProxy)
app.get('/twemoji/*', apiProxy)
app.get('/twemoji-badge/*', apiProxy)

// Activity Pub
app.post('/inbox', apiProxy)
app.post('/users/*', apiProxy)
app.get('/notes/*', apiProxy)
app.get('/@*', apiProxy)
app.get('/emojis/*', apiProxy)
app.get('/likes/*', apiProxy)
app.get('/follows/*', apiProxy)

// websocket
// @ts-ignore
app.get('/streaming*', (c) => {
  const upgradeHeader = c.req.header('Upgrade')
  if (upgradeHeader !== 'websocket') {
    return c.text('Expected WebSocket', 426)
  }

  const id = c.env.WEBSOCKET.idFromName('websocket')
  const connection = c.env.WEBSOCKET.get(id)
  // @ts-ignore
  return connection.fetch(c.req.raw)
})

// frontend
app.get('*', frontProxy)

export default app