import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, test } from 'node:test';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const product = { id, name: 'Café', sku: 'CF', currentUnitPrice: 1200, stockQuantity: 1, isActive: true };
const order = { orderId: id, clientName: 'Rocío', status: 'PENDING', date: '2026-11-21T18:00:00', totalAmount: 1200 };
const token = [{ alg: 'none' }, { sub: 'admin', role: 'Admin', exp: 4102444800 }]
  .map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.') + '.test';

let respond;
let dom;
const server = createServer((req, res) => {
  const { status = 200, data } = respond(new URL(req.url, 'http://localhost'));
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
after(async () => {
  dom?.window.close();
  await new Promise(resolve => server.close(resolve));
});

const { outputFiles: [{ text: code }] } = await build({
  stdin: { resolveDir: process.cwd(), loader: 'jsx', contents: `
    import { createRoot } from 'react-dom/client';
    import App from './src/App.jsx';
    createRoot(document.getElementById('root')).render(<App />);
  ` },
  bundle: true, write: false, format: 'iife', jsx: 'automatic',
  define: { 'import.meta.env.VITE_BACKEND_URL': JSON.stringify(origin), 'process.env.NODE_ENV': '"test"' },
});

function open(path, handler) {
  dom?.window.close();
  respond = handler;
  dom = new JSDOM('<div id="root"></div>', {
    url: origin + path, runScripts: 'outside-only', pretendToBeVisual: true,
  });
  Object.assign(dom.window, { Request, Response, Headers, AbortController, AbortSignal });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  dom.window.localStorage.setItem('token', token);
  dom.window.eval(code);
}

async function find(selector) {
  for (let attempt = 0; attempt < 150; attempt++) {
    const element = dom.window.document.querySelector(selector);
    if (element) return element;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.fail(`No se encontró ${selector} en ${dom.window.location.href}`);
}

const resources = [
  { name: 'productos', path: 'products', list: '/api/products/admin', status: 'true', items: 'productItems', record: product },
  { name: 'órdenes', path: 'orders', list: '/api/orders', status: '1', items: 'items', record: order },
];

for (const { name, path, list, status, items, record } of resources) {
  const listPath = `/admin/${path}`;
  const detailPath = `${listPath}/${id}`;
  const detailApi = `/api/${path}/${id}`;
  const filters = `?search=caf%C3%A9&status=${status}&pageSize=20`;

  test(`el detalle de ${name} y Volver conservan la consulta del listado`, async () => {
    open(`${listPath}${filters}&page=2`, url => {
      if (url.pathname === detailApi) return { data: record };
      if (url.pathname === list) return { data: { [items]: [record], total: 21 } };
      return { status: 404 };
    });
    const detailLink = await find(`a[href^="${detailPath}?"]`);
    assert.equal(detailLink.getAttribute('href'), `${detailPath}${filters}&page=2`);
    detailLink.click();
    const backLink = await find(`a[href="${listPath}${filters}&page=2"]`);
    if (path === 'orders') {
      const time = await find('time');
      assert.match(time.textContent, /18:00/);
      assert.match(time.parentElement.textContent, /Zona horaria no informada/);
    }
    backLink.click();
    await find(`a[href^="${detailPath}?"]`);
    assert.equal(dom.window.location.search, `${filters}&page=2`);
  });

  test(`Volver a ${name} recupera la primera página si la página guardada quedó vacía`, async () => {
    const requests = [];
    open(`${detailPath}${filters}&page=2`, url => {
      if (url.pathname === detailApi) return { data: record };
      if (url.pathname !== list) return { status: 404 };
      const page = url.searchParams.get('pageNumber');
      requests.push(Object.fromEntries(url.searchParams));
      if (page === '2') return path === 'products' ? { status: 204 } : { data: { items: [], total: 1 } };
      return { data: { [items]: [record], total: 1 } };
    });
    (await find(`a[href="${listPath}${filters}&page=2"]`)).click();
    await find(`a[href^="${detailPath}?"]`);
    assert.equal(dom.window.location.search, filters);
    assert.deepEqual(requests, [
      { pageNumber: '2', pageSize: '20', [path === 'orders' ? 'Search' : 'search']: 'café', [path === 'orders' ? 'Status' : 'status']: status },
      { pageNumber: '1', pageSize: '20', [path === 'orders' ? 'Search' : 'search']: 'café', [path === 'orders' ? 'Status' : 'status']: status },
    ]);
  });
}

test('el detalle directo de una orden reintenta un fallo y reconoce la fecha UTC', async () => {
  const date = '2026-11-21T18:00:00Z';
  let attempts = 0;
  open(`/admin/orders/${id}`, url => {
    if (url.pathname !== `/api/orders/${id}`) return { status: 404 };
    attempts++;
    return attempts === 1 ? { status: 500 } : { data: { ...order, date } };
  });

  assert.match((await find('[role="alert"]')).textContent, /No se pudo cargar la orden/);
  const retry = dom.window.document.querySelector('[role="alert"] + button');
  assert.equal(retry?.textContent, 'Reintentar');
  retry.click();
  const time = await find('time');
  assert.equal(time.dateTime, date);
  assert.doesNotMatch(time.parentElement.textContent, /Zona horaria no informada/);
  assert.equal(attempts, 2);
  await find('a[href="/admin/orders"]');
});
