import { readFile } from 'node:fs/promises';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { JSDOM, VirtualConsole } from 'jsdom';
import { build } from 'esbuild';

const server = createServer(async (req, res) => {
  let body = '';
  for await (const chunk of req) body += chunk;
  const request = { path: req.url, method: req.method, body: body ? JSON.parse(body) : null };
  requests.push(request);
  const response = handler(request);
  res.writeHead(response.status ?? 200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(response.data));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const token = claims => [{ alg: 'none' }, { sub: 'customer-1', exp: 4102444800, role: 'User', ...claims }]
  .map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.') + '.test';
const cart = JSON.stringify([{ productId: 'product-1', name: 'Producto', price: 10, quantity: 1 }]);
let requests = [], handler, dom;
const bundle = await build({
  stdin: { resolveDir: process.cwd(), loader: 'jsx', contents: `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { MemoryRouter, Routes, Route } from 'react-router-dom';
    import { AuthProvider } from './src/modules/auth/context/AuthProvider';
    import useAuth from './src/modules/auth/hook/useAuth';
    import ProtectedRoute from './src/modules/auth/components/ProtectedRoute';
    import CartPage from './src/modules/orders/pages/CartPage';
    import ClientProductsPage from './src/modules/products/pages/ClientProductsPage';
    function Probe() {
      const auth = useAuth();
      return <><output id="session">{JSON.stringify({isAuthenticated:auth.isAuthenticated,user:auth.user,role:auth.role,customerId:auth.customerId})}</output>
        <button id="logout" onClick={auth.singout}>logout</button></>;
    }
    createRoot(document.getElementById('root')).render(<AuthProvider><MemoryRouter initialEntries={[window.location.pathname]}>
      <Probe/><Routes><Route path="/" element={<ClientProductsPage/>}/><Route path="/cart" element={<CartPage/>}/>
      <Route path="/admin/home" element={<ProtectedRoute allowedRoles={['Admin']}><p>ADMIN OK</p></ProtectedRoute>}/>
      <Route path="/login" element={<p>LOGIN ROUTE</p>}/></Routes></MemoryRouter></AuthProvider>);
  ` },
  bundle: true, write: false, format: 'iife', jsx: 'automatic',
  define: { 'import.meta.env.VITE_BACKEND_URL': JSON.stringify(origin), 'process.env.NODE_ENV': '"test"' },
});
const code = bundle.outputFiles[0].text;
async function wait(predicate) {
  for (let i = 0; i < 150; i++) {
    if (predicate()) return;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error('Timeout: ' + predicate + ' TEXT=' + text() + ' REQUESTS=' + JSON.stringify(requests));
}
async function setup(path = '/', seed = {}, respond) {
  dom?.window.close(); requests = [];
  handler = respond ?? (request => ({ data: request.path.includes('/auth/') ? { token: token({}) } : request.path.includes('/products') ? { total: 0, productItems: [] } : {} }));
  dom = new JSDOM('<div id="root"></div>', { url: origin + path, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  Object.assign(dom.window, { Request, Response, Headers, AbortController, AbortSignal });
  dom.window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  for (const [key, value] of Object.entries(seed)) dom.window.localStorage.setItem(key, value);
  dom.window.eval(code);
  await wait(() => dom.window.document.querySelector('#session'));
  await new Promise(resolve => setTimeout(resolve, 30));
}
const session = () => JSON.parse(dom.window.document.querySelector('#session').textContent);
const text = () => dom.window.document.body.textContent;
function click(label) {
  const button = [...dom.window.document.querySelectorAll('button')].find(element => element.textContent.trim() === label);
  assert.ok(button, label); button.click();
}
function input(selector, value) {
  const element = dom.window.document.querySelector(selector);
  assert.ok(element, selector);
  Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(element, value);
  element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
}
async function submitLogin(register = false) {
  await wait(() => dom.window.document.querySelector('form'));
  input('form input[type="text"]', 'cliente');
  if (register) input('input[type="email"]', 'test@example.com');
  for (const element of dom.window.document.querySelectorAll('input[type="password"]')) {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(element, 'clave-ficticia');
    element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  }
  await new Promise(resolve => setTimeout(resolve, 0));
  dom.window.document.querySelector('form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
}
after(async () => { dom?.window.close(); await new Promise(resolve => server.close(resolve)); });

for (const [name, stored] of [['ausente', null], ['malformado', 'invalid'], ['expirado', token({ exp: 1 })], ['sin exp', token({ exp: undefined })], ['exp string', token({ exp: '4102444800' })]]) {
  test(`CA1/CA4: token ${name} deja sesión anónima y conserva carrito`, async () => {
    await setup('/', { cart, ...(stored ? { token: stored } : {}) });
    assert.deepEqual(session(), { isAuthenticated: false, user: null, role: null, customerId: null });
    assert.equal(dom.window.localStorage.getItem('token'), null);
    assert.equal(dom.window.localStorage.getItem('cart'), cart);
  });
}
for (const claims of [{ role: ' ADMIN ', customerId: 'id-customer' }, { role: undefined, Role: 'Admin', id: 'id-fallback' }, { role: undefined, 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'Admin' }]) {
  test(`CA3: normaliza rol ${JSON.stringify(claims)} y permite administración`, async () => {
    await setup('/admin/home', { token: token(claims) });
    await wait(() => text().includes('ADMIN OK'));
    assert.equal(session().role, 'admin');
    assert.equal(session().customerId, claims.customerId ?? claims.id ?? 'customer-1');
  });
}
test('CA3: cliente no entra al panel admin', async () => {
  await setup('/admin/home', { token: token({}) });
  await wait(() => text().includes('Store'));
  assert.ok(!text().includes('ADMIN OK'));
});
test('CA3: visitante se redirige a login', async () => {
  await setup('/admin/home'); await wait(() => text().includes('LOGIN ROUTE'));
});
test('CA5: logout elimina únicamente token', async () => {
  await setup('/', { token: token({}), cart, theme: 'dark' });
  dom.window.document.querySelector('#logout').click();
  await wait(() => !session().isAuthenticated);
  assert.equal(dom.window.localStorage.getItem('token'), null);
  assert.equal(dom.window.localStorage.getItem('cart'), cart);
  assert.equal(dom.window.localStorage.getItem('theme'), 'dark');
});
test('CA4: 401 autenticado invalida también el contexto', async () => {
  await setup('/', { token: token({}), cart }, () => ({ status: 401, data: {} }));
  await wait(() => !session().isAuthenticated);
  assert.equal(dom.window.localStorage.getItem('token'), null);
  assert.equal(dom.window.localStorage.getItem('cart'), cart);
});
test('CA5: login desde header del carrito no crea orden', async () => {
  await setup('/cart', { cart }); await wait(() => text().includes('Datos de Envío'));
  input('input[placeholder="Dirección de Envío"]', 'Calle 123');
  input('input[placeholder="Dirección de Facturación"]', 'Calle 123');
  click('Iniciar Sesión'); await submitLogin(); await wait(() => session().isAuthenticated);
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(requests.filter(request => request.method === 'POST' && request.path === '/api/orders').length, 0);
  assert.equal(dom.window.localStorage.getItem('cart'), cart);
});
test('CA5: confirmar compra como visitante continúa con customerId del login', async () => {
  await setup('/cart', { cart }); await wait(() => text().includes('Datos de Envío'));
  input('input[placeholder="Dirección de Envío"]', 'Calle 123');
  input('input[placeholder="Dirección de Facturación"]', 'Calle 123');
  await new Promise(resolve => setTimeout(resolve, 0));
  click('Confirmar Compra'); await submitLogin();
  await wait(() => requests.some(request => request.path === '/api/orders'));
  const orders = requests.filter(request => request.path === '/api/orders');
  assert.equal(orders.length, 1); assert.equal(orders[0].body.customerId, 'customer-1');
  await wait(() => dom.window.localStorage.getItem('cart') === null);
});
test('CA5: admin que inicia sesión en catálogo llega al panel', async () => {
  await setup('/', {}, request => ({ data: request.path.includes('/auth/') ? { token: token({ role: 'Admin' }) } : { total: 0, productItems: [] } }));
  click('Iniciar Sesión'); await submitLogin(); await wait(() => text().includes('ADMIN OK'));
});
test('CA4: login con token inválido no persiste sesión', async () => {
  await setup('/', {}, request => ({ data: request.path.includes('/auth/') ? { token: 'bad' } : { total: 0, productItems: [] } }));
  click('Iniciar Sesión'); await submitLogin(); await wait(() => text().includes('Usuario o contraseña incorrectos'));
  assert.equal(session().isAuthenticated, false); assert.equal(dom.window.localStorage.getItem('token'), null);
});
test('CA5: registro exitoso con login fallido no comunica éxito ni almacena token', async () => {
  await setup('/', {}, request => request.path.includes('/auth/login') ? { status: 401, data: {} } : { data: request.path.includes('/auth/register') ? { token: token({}) } : { total: 0, productItems: [] } });
  click('Registrarse'); await submitLogin(true); await wait(() => text().includes('Cuenta creada, pero no se pudo iniciar sesión'));
  assert.equal(session().isAuthenticated, false); assert.equal(dom.window.localStorage.getItem('token'), null);
});
test('CA5: persistencia reconstruye sesión tras recargar', async () => {
  await setup('/', { token: token({ customerId: 'persisted' }) });
  const stored = dom.window.localStorage.getItem('token');
  await setup('/', { token: stored }); assert.equal(session().customerId, 'persisted');
});
test('CA4: expirar durante uso invalida contexto y token', async () => {
  await setup('/', { token: token({ exp: Date.now() / 1000 + 0.3 }) });
  assert.equal(session().isAuthenticated, true); await wait(() => !session().isAuthenticated);
  assert.equal(dom.window.localStorage.getItem('token'), null);
});
test('CA5: cambio de sesión en otra pestaña sincroniza contexto', async () => {
  await setup('/', { token: token({}) });
  dom.window.localStorage.removeItem('token');
  dom.window.dispatchEvent(new dom.window.StorageEvent('storage', { key: 'token' }));
  await wait(() => !session().isAuthenticated);
});

test('CA2: consumidores no leen token ni decodifican JWT', async () => {
  for (const path of ['src/modules/orders/pages/CartPage.jsx', 'src/modules/products/pages/ClientProductsPage.jsx', 'src/modules/auth/components/ProtectedRoute.jsx', 'src/modules/auth/components/LoginForm.jsx']) {
    const source = await readFile(path, 'utf8');
    assert.doesNotMatch(source, /jwtDecode|localStorage\.(?:getItem|setItem)\(['"]token['"]/);
  }
});
