# Panel web de Tiketes — Fase 1: Login + Inventario

**Fecha:** 2026-07-16
**Estado:** Diseño aprobado (pendiente de revisión del spec)

## Objetivo

Dar al **dueño** un panel web de escritorio para gestionar su negocio desde la
computadora, empezando por el **inventario**. Reutiliza el backend actual
(Supabase + RLS), sin servidor propio y sin tocar la landing existente.

## Alcance por fases

- **Fase 1 (este spec):** botón "Iniciar sesión" en la barra + `login.html` +
  panel de inventario (`panel/`).
- **Fase 2 (futuro):** Reportes.
- **Fase 3 (futuro):** Personal + Perfil + eliminar cuenta (con re-autenticación).

Solo el **dueño** entra al panel. Los empleados siguen usando la app.

## Arquitectura

Sitio estático en GitHub Pages (HTML/CSS/JS puro), hablando directo con
Supabase vía `@supabase/supabase-js` (CDN), igual que `crear-cuenta.html`.

```
tiketes.com.mx/
├─ index.html         (landing — solo se añade el botón "Iniciar sesión")
├─ login.html         (NUEVO — correo/contraseña + Google)
└─ panel/
   └─ index.html      (NUEVO — inventario; zona protegida)
```

- **No hay servidor** → no hay backend propio que atacar. La superficie de
  ataque es Supabase (protegido por RLS) y el cliente estático.

## Componentes

### 1. Botón "Iniciar sesión" (en `index.html`)
- En `.nav-actions`, a la izquierda de "Crear cuenta": un botón ghost
  "Iniciar sesión" → `location.href='login.html'`. Sin otros cambios a la landing.

### 2. `login.html`
- Mismo lenguaje visual que `crear-cuenta.html` (fondo `#050617`, orbes,
  inputs r14, CTA violeta).
- Campos: **correo**, **contraseña** (con botón ver 👁️).
- Botón primario **Entrar** → `supabase.auth.signInWithPassword`.
- Botón **Entrar con Google** → `supabase.auth.signInWithOAuth({ provider:'google',
  options:{ redirectTo:'https://tiketes.com.mx/panel/' }})`.
- Enlaces: "¿Olvidaste tu contraseña?" (por ahora: indica recuperarla desde la
  app) y "Crear una cuenta" → `crear-cuenta.html`.
- Errores humanizados: credenciales inválidas, correo no confirmado, rate limit.
- Al obtener sesión → redirige a `panel/`.

### 3. `panel/index.html` — Inventario
Layout de escritorio:
- **Barra lateral izquierda:** Inventario (activo). Reportes y Personal como
  ítems deshabilitados con etiqueta "Pronto".
- **Barra superior:** nombre de la tienda + inicial/foto del dueño + botón Salir
  (`supabase.auth.signOut()` → `login.html`).
- **Contenido:** tabla de productos con columnas nombre, precio, costo, stock,
  categoría, SKU. Funcionalidades:
  - Buscador (por nombre/SKU) + filtro por categoría.
  - **+ Agregar producto:** modal con los campos de la app (nombre, precio,
    costo, stock, stock mínimo, categoría, unidad, marca, código de barras, SKU,
    descripción). Sin cámara (web).
  - **Editar** producto (mismo modal, precargado).
  - **Eliminar** producto (con confirmación).
  - **Importar Excel:** usa la plantilla existente; parsea con papaparse/xlsx en
    el navegador e inserta respetando el límite de plan (mismo trigger
    `check_product_limit_global`); muestra un aviso cuando el archivo se pasa.

## Flujo de datos

- `login.html` obtiene sesión (JWT) que `supabase-js` persiste en `localStorage`.
- Cada página de `panel/` corre un **guard** al cargar: `supabase.auth.getSession()`;
  si no hay sesión → `location.replace('../login.html')` antes de pintar nada.
- Las consultas (`select/insert/update/delete` sobre `products`) las filtra RLS
  por `user_id = auth.uid()`. El cliente nunca envía `user_id` en el `select`;
  RLS lo impone.

## Seguridad (requisito central)

1. **Solo la llave pública (anon) en el cliente.** Es pública por diseño y segura
   con RLS — no se puede ni se necesita esconder. **Ninguna llave secreta**
   (service_role, secretos de webhooks, Resend, Polar) toca la web; viven solo en
   Supabase.
2. **RLS es la protección real.** Antes de programar: correr `get_advisors`
   (security) y revisar que las políticas de `products` y `profiles` filtren por
   `auth.uid()` en select/insert/update/delete. Arreglar cualquier hueco.
3. **Guard de sesión** en todas las páginas de `panel/`: sin sesión, no se ve nada.
4. **XSS:** todo dato del usuario (nombres de productos, etc.) se pinta
   escapado (`textContent` o escape de `<`), nunca `innerHTML` con datos crudos.
5. **HTTPS** ya forzado (GitHub Pages).
6. **Google OAuth:** autorizar `tiketes.com.mx` en Supabase (Site URL + Redirect
   URLs) y en el cliente OAuth de Google (redirect = callback de Supabase). Esto
   también resuelve el pendiente del "Site URL = localhost".
7. **Operaciones destructivas** (eliminar cuenta, Fase 3) exigirán re-autenticación.

## Manejo de errores

- Login: mensajes claros por caso (credenciales, correo sin confirmar, rate
  limit, sin conexión).
- Panel: si una consulta falla, banner no bloqueante con reintento; si la sesión
  expira (401), redirige al login.
- Import: filas inválidas se muestran en vista previa antes de insertar; el
  excedente por límite de plan abre el aviso (no inserta a ciegas).

## Pruebas / verificación

- Guard: abrir `panel/` sin sesión → redirige a `login.html`.
- Login correo/contraseña y Google → llega al panel con la sesión correcta.
- RLS: con una sesión, intentar leer productos de otro `user_id` (manipulando la
  query en consola) → 0 filas / bloqueado.
- CRUD de productos refleja en la app (misma tabla).
- Import respeta el límite de plan.
- Revisar en consola que no haya ninguna llave secreta ni `service_role`.

## Fuera de alcance (Fase 1)

- Reportes, Personal, Perfil, eliminar cuenta (Fases 2-3).
- Empleados en el panel.
- Cámara / escaneo (no aplica en web).
- Ventas / cobro desde web.
