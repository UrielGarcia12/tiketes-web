# Panel web Fase 1 (Login + Inventario) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar al dueño un panel web de escritorio para gestionar su inventario, con login por correo/contraseña + Google, sobre el sitio estático actual y el Supabase existente.

**Architecture:** Sitio estático (GitHub Pages) en HTML/CSS/JS puro, hablando directo con Supabase vía `@supabase/supabase-js` (CDN). Sin servidor propio. Un módulo compartido (`panel/common.js`) da el cliente Supabase, el guard de sesión y helpers; cada página del panel lo importa. La seguridad la impone RLS (verificado: `products`/`profiles` tienen políticas por `auth.uid()`).

**Tech Stack:** HTML5, CSS (reusa `colors_and_type.css`), JavaScript ES6, `@supabase/supabase-js@2` (CDN jsDelivr), `papaparse` + `xlsx` (CDN) para importar. Cloudflare Web Analytics beacon.

## Global Constraints

- Solo la **llave pública (anon)** en el cliente: `SUPABASE_URL='https://wwukfbadzhowpvruumrp.supabase.co'`, `SUPABASE_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dWtmYmFkemhvd3B2cnV1bXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDk1MjksImV4cCI6MjA5NDcyNTUyOX0.2-cPfqjoEkFkzVcWEvIzQHL4SWbvdJnNlCeUSEyzXk8'`. **Ninguna llave secreta (service_role, webhooks, Resend, Polar) jamás.**
- **Guard de sesión** al inicio de cada página de `panel/`: sin sesión → `location.replace('../login.html')` antes de pintar.
- **XSS:** todo dato del usuario se pinta con `textContent` o escapado; nunca `innerHTML` con datos crudos.
- **RLS impone el scope:** el cliente nunca filtra por `user_id` en el `select`; RLS lo hace. No confiar en el cliente.
- Estilo: reusar `colors_and_type.css` y los tokens del sitio (fondo oscuro, violeta `#6B4BFF`/`#8B70FF`, oro `#F5C518`, fuentes Sora/Inter). Copys en español.
- Cada página nueva incluye el beacon de Cloudflare antes de `</body>`: `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "3535288e08fe4b08ac9c4b4633385ee7"}'></script>`.
- Columnas de `products` que usa el panel: `name, price, cost_price, stock, min_stock, category, unit, brand, barcode, sku, description, thumb, color, text_color, user_id`. Categorías válidas: `abarrotes, bebidas, lacteos, snacks, panaderia, dulces, limpieza, cuidado, mascotas, galletas, papas, otros`.
- El trigger `check_product_limit_global` rechaza inserts que pasan el límite con el mensaje `PRODUCT_LIMIT_REACHED:<plan>:<limit>`. Límites: free 50, essential 500, pro 2500, premium 25000.
- Verificación SIN framework de tests (sitio estático): se hace con Chrome headless (DOM dump / screenshot) y `curl` contra el sitio en vivo. Cada task termina con una verificación observable.

## File Structure

- `index.html` (modificar): añadir botón "Iniciar sesión" en `.nav-actions`.
- `login.html` (crear): login correo/contraseña + Google.
- `panel/common.js` (crear): cliente Supabase, `requireSession()`, `escapeHtml()`, `signOut()`, constantes (categorías, límites).
- `panel/panel.css` (crear): estilos del shell (sidebar, topbar, tabla, modal).
- `panel/index.html` (crear): página de inventario (shell + tabla + modales).
- `panel/inventory.js` (crear): lógica de inventario (fetch/render/search/filter/CRUD/import).
- `docs/superpowers/specs/2026-07-16-panel-web-inventario-design.md` (existe): spec.

---

### Task 1: Botón "Iniciar sesión" + login por correo/contraseña

**Files:**
- Modify: `index.html` (bloque `.nav-actions`)
- Create: `login.html`

**Interfaces:**
- Produces: `login.html` que, al autenticar, hace `location.replace('panel/')`.

- [ ] **Step 1: Añadir el botón en la barra de `index.html`**

Localizar `.nav-actions` (contiene "Ver planes" y "Crear cuenta") y dejarlo así:

```html
<div class="nav-actions">
  <button class="btn-nav-ghost" onclick="location.href='login.html'">Iniciar sesión</button>
  <button class="btn-nav-primary" onclick="location.href='crear-cuenta.html'">Crear cuenta</button>
</div>
```

(Se reemplaza el botón "Ver planes" por "Iniciar sesión"; si se quiere conservar "Ver planes", añadir el nuevo botón antes de "Crear cuenta" sin quitar los otros. Mantener las clases existentes para heredar el estilo.)

- [ ] **Step 2: Crear `login.html`**

Página con el mismo `<head>` que `crear-cuenta.html` (favicons, theme-color, `colors_and_type.css`, mismos `:root` tokens, orbes). Cuerpo:

```html
<main class="card" style="max-width:420px;margin:0 auto">
  <div class="eyebrow">Panel</div>
  <h1>Inicia <span class="ac">sesión</span></h1>
  <p class="sub">Entra con el mismo correo y contraseña de tu app.</p>
  <div class="field">
    <label class="lb" for="email">Correo</label>
    <input id="email" type="email" autocomplete="email" placeholder="tucorreo@ejemplo.com" maxlength="120">
  </div>
  <div class="field">
    <label class="lb" for="pwd">Contraseña</label>
    <div class="pwd-wrap">
      <input id="pwd" type="password" autocomplete="current-password" placeholder="Tu contraseña" maxlength="72">
      <button type="button" class="pwd-eye" id="eye" aria-label="Ver contraseña"></button>
    </div>
  </div>
  <div id="msg"></div>
  <div class="actions"><button class="btn btn-primary" id="submit">Entrar</button></div>
  <button class="btn btn-ghost" id="google" style="margin-top:10px;width:100%">Entrar con Google</button>
  <p class="foot">¿No tienes cuenta? <a href="crear-cuenta.html">Crear una</a></p>
</main>
```

Estilos `.pwd-wrap/.pwd-eye/.field/.lb/.btn` copiados de `crear-cuenta.html` (mismos valores). Script inline:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
<script>
var SUPABASE_URL='https://wwukfbadzhowpvruumrp.supabase.co';
var SUPABASE_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dWtmYmFkemhvd3B2cnV1bXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDk1MjksImV4cCI6MjA5NDcyNTUyOX0.2-cPfqjoEkFkzVcWEvIzQHL4SWbvdJnNlCeUSEyzXk8';
var sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON);
var $=function(id){return document.getElementById(id)};
function showErr(t){$('msg').innerHTML=t?('<div class="msg err">'+t+'</div>'):''}
// Si ya hay sesión, saltar directo al panel.
sb.auth.getSession().then(function(r){ if(r.data.session) location.replace('panel/'); });
$('eye').addEventListener('click',function(){var i=$('pwd');i.type=i.type==='password'?'text':'password';i.focus();});
$('submit').addEventListener('click',async function(){
  showErr('');
  var email=$('email').value.trim().toLowerCase(), pwd=$('pwd').value;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){showErr('Escribe un correo válido.');return}
  if(!pwd){showErr('Escribe tu contraseña.');return}
  var b=$('submit');b.disabled=true;b.textContent='Entrando…';
  var r=await sb.auth.signInWithPassword({email:email,password:pwd});
  b.disabled=false;b.textContent='Entrar';
  if(r.error){
    var m=r.error.message||'';
    showErr(/invalid login|credentials/i.test(m)?'Correo o contraseña incorrectos.':
            /confirm/i.test(m)?'Confirma tu correo antes de entrar.':
            /rate|seconds/i.test(m)?'Espera un momento e intenta de nuevo.':m);
    return;
  }
  location.replace('panel/');
});
$('pwd').addEventListener('keydown',function(e){if(e.key==='Enter')$('submit').click()});
</script>
```

(El botón Google se cablea en Task 2.)

- [ ] **Step 3: Verificar en vivo (tras publicar)**

```bash
cd /c/Users/aidev/Downloads/tiketes-web
git add index.html login.html && git commit -m "feat: login web (correo/contraseña) + botón en la barra"
git push origin main
# esperar publicación
curl -s https://tiketes.com.mx/login.html | grep -c "signInWithPassword"   # esperado: >=1
curl -s https://tiketes.com.mx/index.html | grep -c "Iniciar sesión"        # esperado: >=1
```

Y con Chrome headless: cargar `login.html`, confirmar que el DOM tiene `#email`, `#pwd`, `#google`, `#submit`. Login real con una cuenta de prueba → debe redirigir a `panel/` (aún 404 hasta Task 3; el redirect en sí valida el login).

Expected: la landing muestra "Iniciar sesión"; el login autentica y redirige.

---

### Task 2: Login con Google (OAuth) + configuración de redirect

**Files:**
- Modify: `login.html` (cablear `#google`)

**Interfaces:**
- Consumes: `sb` (cliente Supabase de Task 1).

- [ ] **Step 1: Configurar Supabase y Google (dashboard — dependencia manual)**

Documentar para el dueño/operador (no es código):
1. Supabase → Authentication → URL Configuration: **Site URL** = `https://tiketes.com.mx`; **Redirect URLs** += `https://tiketes.com.mx/panel/` y `https://tiketes.com.mx/login.html`.
2. Google Cloud Console → OAuth client (Web): **Authorized redirect URIs** += `https://wwukfbadzhowpvruumrp.supabase.co/auth/v1/callback`.
3. Supabase → Authentication → Providers → Google: habilitado con el Client ID/Secret del cliente Web.

- [ ] **Step 2: Cablear el botón**

```js
$('google').addEventListener('click',async function(){
  showErr('');
  var r=await sb.auth.signInWithOAuth({
    provider:'google',
    options:{ redirectTo: location.origin + '/panel/' }
  });
  if(r.error) showErr('No pudimos abrir Google. Intenta de nuevo.');
});
```

- [ ] **Step 3: Verificar**

```bash
git add login.html && git commit -m "feat: login web con Google (OAuth)"
git push origin main
```

Cargar `login.html` en un navegador real, clic "Entrar con Google" → debe redirigir a `accounts.google.com`; tras autorizar → vuelve a `panel/` con sesión. (Si la config del Step 1 falta, Google mostrará `redirect_uri_mismatch` — es la señal de que falta autorizar la URL.)

Expected: el flujo de Google llega al panel con sesión.

---

### Task 3: Scaffold del panel + guard de sesión + layout

**Files:**
- Create: `panel/common.js`, `panel/panel.css`, `panel/index.html`

**Interfaces:**
- Produces:
  - `panel/common.js` expone (globales): `sb` (cliente), `requireSession()` → `Promise<Session>` (redirige si no hay), `escapeHtml(str)` → string, `signOut()`, `CATS` (array de categorías), `PLAN_LIMIT` (mapa), `PLAN_NAME` (mapa).
  - `panel/index.html` monta el shell y llama `requireSession()` antes de pintar.

- [ ] **Step 1: Crear `panel/common.js`**

```js
// Cliente Supabase + guard + helpers, compartido por todas las páginas del panel.
window.SUPABASE_URL='https://wwukfbadzhowpvruumrp.supabase.co';
window.SUPABASE_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3dWtmYmFkemhvd3B2cnV1bXJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNDk1MjksImV4cCI6MjA5NDcyNTUyOX0.2-cPfqjoEkFkzVcWEvIzQHL4SWbvdJnNlCeUSEyzXk8';
var sb=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON);
var CATS=['abarrotes','bebidas','lacteos','snacks','panaderia','dulces','limpieza','cuidado','mascotas','galletas','papas','otros'];
var PLAN_LIMIT={free:50,essential:500,pro:2500,premium:25000};
var PLAN_NAME={free:'Free',essential:'Essential',pro:'Pro',premium:'Premium'};

// Guard: sin sesión, no se pinta nada.
async function requireSession(){
  var r=await sb.auth.getSession();
  if(!r.data.session){ location.replace('../login.html'); throw new Error('no-session'); }
  return r.data.session;
}
function escapeHtml(s){
  return String(s==null?'':s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
async function signOut(){ try{ await sb.auth.signOut(); }catch(e){} location.replace('../login.html'); }
```

- [ ] **Step 2: Crear `panel/panel.css`**

Estilos del shell: `body` con `display:grid; grid-template-columns:230px 1fr`; `.sidebar` (fondo `#0A0B1F`, ítems con icono+texto, activo violeta, "Pronto" en gris con badge); `.topbar` (nombre tienda + inicial + botón salir); `.content` (padding); `.tbl` (tabla con header sticky, filas con divisor); `.modal`/`.modal-card` (overlay + tarjeta); `.btn`/`.btn-primary`/`.btn-ghost`; responsive < 820px (sidebar colapsa a barra superior). Reusar variables de color del sitio (fondo `#07070F`/`#0C0C1A`, violeta, texto blanco/60%).

- [ ] **Step 3: Crear `panel/index.html` (shell)**

`<head>` con favicons, `colors_and_type.css`, `panel/panel.css`. Antes de `</body>`: los scripts CDN de supabase, `common.js`, `inventory.js`, y el beacon Cloudflare. Cuerpo:

```html
<aside class="sidebar">
  <a class="brand" href="/"><img src="../assets/logo-mark-web.png" class="brand-mark" alt=""><span>Tiketes</span></a>
  <nav>
    <a class="nav-item active">📦 Inventario</a>
    <span class="nav-item off">📊 Reportes <b>Pronto</b></span>
    <span class="nav-item off">👥 Personal <b>Pronto</b></span>
  </nav>
</aside>
<main>
  <header class="topbar">
    <div><b id="storeName">…</b></div>
    <div class="topbar-right">
      <span id="storeInitial" class="avatar">·</span>
      <button class="btn btn-ghost" onclick="signOut()">Salir</button>
    </div>
  </header>
  <section class="content" id="content"><!-- inventory.js pinta aquí --></section>
</main>
```

Al final, `inventory.js` arranca (ver Task 4). El shell llama al inicio:

```js
requireSession().then(async function(session){
  // Nombre de la tienda para la barra (RLS: solo el propio perfil)
  var p=await sb.from('profiles').select('store_name').eq('id', session.user.id).maybeSingle();
  var name=(p.data && p.data.store_name) || 'Mi negocio';
  document.getElementById('storeName').textContent=name;
  document.getElementById('storeInitial').textContent=name.charAt(0).toUpperCase();
  window.__initInventory && window.__initInventory(session);
});
```

- [ ] **Step 4: Verificar**

```bash
git add panel/common.js panel/panel.css panel/index.html
git commit -m "feat: shell del panel + guard de sesión"
git push origin main
```

Chrome headless SIN sesión → cargar `https://tiketes.com.mx/panel/` → el DOM final debe ser el de `login.html` (redirigido). CON sesión (inyectar sesión vía login real en un navegador) → muestra la barra lateral, el nombre de la tienda en el topbar y la sección de contenido.

Expected: sin sesión redirige; con sesión muestra el shell con el nombre real.

---

### Task 4: Lista de productos + buscador + filtro por categoría

**Files:**
- Create: `panel/inventory.js`
- Modify: `panel/index.html` (ya incluye `inventory.js`)

**Interfaces:**
- Consumes: `sb`, `escapeHtml`, `CATS`, `requireSession` de `common.js`.
- Produces: `window.__initInventory(session)` que carga y pinta la tabla; función interna `loadProducts()` reutilizada por CRUD/import.

- [ ] **Step 1: Estructura + fetch + render (con escape)**

```js
(function(){
  var session=null, all=[], q='', cat='';
  window.__initInventory=function(s){ session=s; render(); loadProducts(); };

  async function loadProducts(){
    // RLS filtra por auth.uid(); NO enviamos user_id en el select.
    var r=await sb.from('products')
      .select('id,name,price,cost_price,stock,min_stock,category,unit,brand,barcode,sku,description')
      .order('name',{ascending:true});
    if(r.error){ toast('No pudimos cargar tus productos.'); return; }
    all=r.data||[]; paint();
  }

  function visible(){
    return all.filter(function(p){
      var okq=!q || (p.name+' '+(p.sku||'')+' '+(p.barcode||'')).toLowerCase().indexOf(q)>=0;
      var okc=!cat || p.category===cat;
      return okq && okc;
    });
  }

  function paint(){
    var rows=visible().map(function(p){
      return '<tr data-id="'+p.id+'">'
        +'<td>'+escapeHtml(p.name)+'</td>'
        +'<td>$'+Number(p.price).toFixed(2)+'</td>'
        +'<td>'+(p.cost_price!=null?'$'+Number(p.cost_price).toFixed(2):'—')+'</td>'
        +'<td>'+(p.stock!=null?p.stock:0)+'</td>'
        +'<td>'+escapeHtml(p.category||'otros')+'</td>'
        +'<td>'+escapeHtml(p.sku||'')+'</td>'
        +'<td class="row-actions"><button class="lnk" data-act="edit">Editar</button>'
        +'<button class="lnk danger" data-act="del">Eliminar</button></td></tr>';
    }).join('');
    document.getElementById('tbody').innerHTML = rows ||
      '<tr><td colspan="7" class="empty">Sin productos. Agrega el primero o importa tu Excel.</td></tr>';
  }

  function render(){
    document.getElementById('content').innerHTML=
      '<div class="inv-head">'
      +'<h1>Inventario</h1>'
      +'<div class="inv-actions">'
      +'<button class="btn btn-ghost" id="btnImport">Importar Excel</button>'
      +'<button class="btn btn-primary" id="btnAdd">+ Agregar producto</button></div></div>'
      +'<div class="inv-filters">'
      +'<input id="q" placeholder="Buscar por nombre, SKU o código…">'
      +'<select id="cat"><option value="">Todas las categorías</option>'
      + CATS.map(function(c){return '<option>'+c+'</option>'}).join('') +'</select></div>'
      +'<div class="tbl-wrap"><table class="tbl"><thead><tr>'
      +'<th>Nombre</th><th>Precio</th><th>Costo</th><th>Stock</th><th>Categoría</th><th>SKU</th><th></th>'
      +'</tr></thead><tbody id="tbody"></tbody></table></div>';
    document.getElementById('q').addEventListener('input',function(e){q=e.target.value.trim().toLowerCase();paint();});
    document.getElementById('cat').addEventListener('change',function(e){cat=e.target.value;paint();});
    document.getElementById('btnAdd').addEventListener('click',function(){openForm(null);});      // Task 5
    document.getElementById('btnImport').addEventListener('click',function(){openImport();});      // Task 7
    document.addEventListener('click',onRowAction);
  }
  function onRowAction(e){
    var b=e.target.closest('button[data-act]'); if(!b) return;
    var id=b.closest('tr').getAttribute('data-id');
    var p=all.find(function(x){return x.id===id});
    if(b.getAttribute('data-act')==='edit') openForm(p);       // Task 5
    if(b.getAttribute('data-act')==='del')  confirmDelete(p);  // Task 6
  }
  function toast(t){ /* banner no bloqueante simple */ var d=document.getElementById('toast'); if(!d){d=document.createElement('div');d.id='toast';d.className='toast';document.body.appendChild(d);} d.textContent=t; d.classList.add('on'); setTimeout(function(){d.classList.remove('on')},3000); }

  // Se exponen para tasks siguientes (mismo IIFE en el archivo final):
  window.__inv={ loadProducts:loadProducts, all:function(){return all}, toast:toast };
})();
```

(Nota para el implementador: `openForm`, `confirmDelete`, `openImport` se definen en Tasks 5-7 **dentro del mismo IIFE/archivo**; al escribir esos tasks, añadir sus funciones a este cierre, no crear otro.)

- [ ] **Step 2: Verificar RLS + render**

```bash
git add panel/inventory.js && git commit -m "feat: lista de inventario con buscador y filtro"
git push origin main
```

Con sesión real en navegador: la tabla muestra los productos del dueño. En la consola del navegador, intentar leer datos ajenos NO debe funcionar:

```js
// En consola, con sesión: pedir explícitamente otro user_id → RLS devuelve 0 filas
await sb.from('products').select('*').neq('user_id', session.user.id)  // => data: []
```

Expected: se ven solo los productos propios; el buscador y el filtro funcionan; la consulta cruzada devuelve `[]`.

---

### Task 5: Agregar / editar producto (modal) + límite de plan

**Files:**
- Modify: `panel/inventory.js` (añadir `openForm`, `saveProduct` al IIFE)

**Interfaces:**
- Consumes: `sb`, `escapeHtml`, `CATS`, `PLAN_NAME`, `PLAN_LIMIT`, `loadProducts`, `toast`.

- [ ] **Step 1: Modal con todos los campos**

`openForm(product|null)` pinta un `.modal` con inputs: nombre*, precio*, costo, stock, stock_minimo, categoria (select de `CATS`), unidad (default `pza`), marca, codigo_barras, sku, descripcion. Si `product` no es null, precarga los valores. Botones Cancelar / Guardar.

- [ ] **Step 2: Guardar (insert o update) con manejo de límite**

```js
async function saveProduct(id, form){
  // form: {name, price, cost_price, stock, min_stock, category, unit, brand, barcode, sku, description}
  if(!form.name || !(form.price>0)){ return {error:'Nombre y precio (mayor a 0) son obligatorios.'}; }
  var COLOR={abarrotes:['#FFF7E6','#A07300'],bebidas:['#E6F0FF','#1E5BB8'],lacteos:['#DCFCE7','#137333'],snacks:['#FFE6E6','#B8252B'],panaderia:['#FFF3E0','#A0522D'],dulces:['#FFE9F2','#9D174D'],limpieza:['#E6FBFF','#0E7A9E'],cuidado:['#EAFCE8','#1F7D2A'],mascotas:['#FFEDE0','#9C4A1C'],galletas:['#F2EEFF','#4524D6'],papas:['#FEF3C7','#7A5500'],otros:['#EEEEF5','#3F3F58']};
  var c=COLOR[form.category]||COLOR.otros;
  var row=Object.assign({}, form, {
    sku: form.sku || form.barcode || null,
    thumb: (form.name.charAt(0)||'📦').toUpperCase(), color:c[0], text_color:c[1]
  });
  var r = id
    ? await sb.from('products').update(row).eq('id', id)   // RLS: solo si es tuyo
    : await sb.from('products').insert(row);               // user_id lo pone el default/policy
  if(r.error){
    var m=r.error.message||'';
    if(m.indexOf('PRODUCT_LIMIT_REACHED')>=0){
      var parts=m.split('PRODUCT_LIMIT_REACHED:')[1].split(':');
      return {limit:{plan:parts[0], limit:parseInt(parts[1],10)}};
    }
    return {error:'No se pudo guardar. Intenta de nuevo.'};
  }
  return {};
}
```

Al `insert`, `user_id` debe quedar en `auth.uid()`. **Verificar en el Step de prueba** que la policy/insert lo asigna; si la tabla NO tiene default `auth.uid()` para `user_id`, añadir `user_id: session.user.id` a `row` en el insert (el implementador confirma con una prueba de inserción). Tras guardar OK: cerrar modal + `loadProducts()`. Si `limit`, mostrar un modal "Llegaste al límite" con el plan y un enlace a `crear-cuenta.html?plan=...` o a la sección de planes.

- [ ] **Step 3: Verificar**

```bash
git add panel/inventory.js && git commit -m "feat: agregar/editar producto en el panel"
git push origin main
```

En navegador con sesión: Agregar un producto de prueba → aparece en la tabla y en la app (misma tabla). Editar su precio → se refleja. Confirmar en la app móvil que el producto llegó con todos los campos. Borrar el de prueba al final.

Expected: alta y edición funcionan y son visibles en la app; el límite (si aplica) muestra el modal.

---

### Task 6: Eliminar producto (con confirmación)

**Files:**
- Modify: `panel/inventory.js` (añadir `confirmDelete`)

**Interfaces:**
- Consumes: `sb`, `loadProducts`, `toast`.

- [ ] **Step 1: Confirmar y borrar**

```js
function confirmDelete(p){
  // modal .modal con "¿Eliminar \"<nombre>\"? Esta acción no se puede deshacer."
  // botones Cancelar / Eliminar (rojo). Al confirmar:
  sb.from('products').delete().eq('id', p.id).then(function(r){   // RLS: solo si es tuyo
    if(r.error){ toast('No se pudo eliminar.'); return; }
    loadProducts();
  });
}
```

El nombre se pinta escapado (`escapeHtml(p.name)`).

- [ ] **Step 2: Verificar**

```bash
git add panel/inventory.js && git commit -m "feat: eliminar producto en el panel"
git push origin main
```

Con sesión: crear un producto de prueba, eliminarlo desde el panel → desaparece de la tabla y de la app.

Expected: la eliminación funciona y pide confirmación.

---

### Task 7: Importar Excel en el panel

**Files:**
- Modify: `panel/index.html` (añadir CDNs de papaparse y xlsx), `panel/inventory.js` (añadir `openImport`)

**Interfaces:**
- Consumes: `sb`, `CATS`, `PLAN_LIMIT`, `loadProducts`, `toast`.

- [ ] **Step 1: CDNs**

En `panel/index.html`, antes de `common.js`:

```html
<script src="https://cdn.jsdelivr.net/npm/papaparse@5/papaparse.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
```

- [ ] **Step 2: Parser (mismo contrato que la app) + insert con tope de límite**

`openImport()` abre un modal con `<input type="file" accept=".xlsx,.csv">` y un enlace a `plantilla.html`. Al elegir archivo: leer con `XLSX.read` (primera hoja) o `Papa.parse` (csv), normalizar filas con las mismas columnas que la app: `nombre, precio, costo, stock, stock_minimo, categoria, unidad, marca, codigo_barras, sku, descripcion` (alias name/price/etc.). Validar: nombre requerido, precio>0. Mostrar vista previa (válidas / con errores). Antes de insertar, contar productos actuales (`select count`) y comparar con `PLAN_LIMIT[plan]`; si el archivo excede, avisar e insertar solo hasta el tope. Insertar en lotes de 100. Mapear a las columnas de `products` (con `thumb/color/text_color` como en Task 5). Al terminar: `loadProducts()` + resumen (insertadas / omitidas).

```js
function normalize(raw){
  var g=function(k){return raw[k]!=null?raw[k]:''};
  var price=parseFloat(String(g('precio')||g('price')).replace(',','.'));
  var name=String(g('nombre')||g('name')).trim();
  var barcode=String(g('codigo_barras')||g('barcode')||g('codigo')).trim();
  var cat=String(g('categoria')||g('category')).trim().toLowerCase();
  if(CATS.indexOf(cat)<0) cat='otros';
  var errors=[];
  if(!name) errors.push('sin nombre');
  if(!(price>0)) errors.push('precio inválido');
  return { name:name, price:isNaN(price)?0:price,
    cost_price: numOrNull(g('costo')||g('cost')),
    stock: parseInt(String(g('stock')||g('cantidad')||'0'),10)||0,
    min_stock: numOrNull(g('stock_minimo')||g('min_stock')),
    category:cat, unit:String(g('unidad')||g('unit')).trim()||'pza',
    brand:String(g('marca')||g('brand')).trim()||null,
    barcode:barcode||null, sku:String(g('sku')).trim()||barcode||null,
    description:String(g('descripcion')||g('description')).trim()||null,
    errors:errors };
}
function numOrNull(v){var s=String(v).replace(',','.').trim(); if(!s)return null; var n=parseFloat(s); return isNaN(n)?null:n;}
```

- [ ] **Step 3: Verificar**

```bash
git add panel/index.html panel/inventory.js && git commit -m "feat: importar Excel en el panel (respeta límite de plan)"
git push origin main
```

Con sesión: descargar la plantilla, poner 3 productos, importarla en el panel → aparecen en la tabla y en la app. Probar un archivo con más filas que el límite (o con una cuenta free y >50) → avisa e importa solo hasta el tope. Borrar los de prueba.

Expected: la importación entra bien y respeta el límite.

---

## Notas de seguridad para el ejecutor (recordatorio)

- Nunca introducir `service_role` ni ningún secreto en el cliente.
- Toda cadena de datos del usuario se pinta con `escapeHtml` o `textContent`.
- No confiar en filtros del cliente para seguridad: RLS es la autoridad. Las pruebas de cada task incluyen una verificación de que datos ajenos devuelven `[]`.
- Opcional (hardening): activar en Supabase la protección de contraseñas filtradas (HaveIBeenPwned).
