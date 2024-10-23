import { Hono, Context } from 'hono'

const proxy = async (c: Context, url: string) => {
  const fromUrl = new URL(c.req.url);
  const toUrl = new URL(c.req.path, url);
  return fetch(toUrl.href + fromUrl.search, c.req.raw);
};

const apiProxy = async (c: Context) => {
  return proxy(c, `https://${c.env.API_HOST}`);
};

const app = new Hono<{ Bindings: CloudflareBindings}>()

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
app.all('/streaming', (c) => {
  const url = new URL(c.req.raw.url);
  url.host = c.env.API_HOST;
  return fetch(url, c.req.raw)
})

export default app