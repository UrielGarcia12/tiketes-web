# Tiketes — Landing Page

Sitio web público de [Tiketes](https://tiketes.app) — POS sin comisiones para PyMEs mexicanas.

## 📂 Estructura

```
tiketes-web/
├── index.html          ← Landing principal
├── privacy.html        ← Aviso de Privacidad
├── terms.html          ← Términos y Condiciones
├── icon.png            ← Logo cuadrado de Tiketes
├── wordmark.png        ← Logo horizontal de Tiketes
└── README.md           ← Este archivo
```

## 🚀 Deploy en GitHub Pages

### **Paso 1 — Crear nuevo repo en GitHub**

1. Ve a [github.com/new](https://github.com/new)
2. Nombre: `tiketes-web`
3. **PUBLIC** (necesario para GitHub Pages gratis)
4. NO marques README, .gitignore ni license
5. Click "Create repository"

### **Paso 2 — Subir esta carpeta**

Abre PowerShell en esta carpeta:

```powershell
cd c:/Users/aidev/Downloads/tiketes-web
git init -b main
git add -A
git commit -m "Initial landing page"
git remote add origin https://github.com/UrielGarcia12/tiketes-web.git
git push -u origin main
```

### **Paso 3 — Activar GitHub Pages**

1. En github.com/UrielGarcia12/tiketes-web → tap **Settings**
2. Sidebar izquierdo → **Pages**
3. Source: **Deploy from a branch**
4. Branch: **main** · Folder: **/ (root)**
5. Click **Save**

En 1-2 minutos tu sitio estará en:
```
https://urielgarcia12.github.io/tiketes-web/
```

### **Paso 4 — Conectar dominio custom (`tiketes.app`)**

#### 4.1 En GitHub Pages:
1. Settings → Pages → **Custom domain**: escribe `tiketes.app`
2. Click **Save**

#### 4.2 En Cloudflare (DNS):
Una vez que tengas el dominio comprado en Cloudflare:

1. Cloudflare Dashboard → tu dominio `tiketes.app` → **DNS** → **Records**
2. Agrega estos **4 registros A** (para apex `tiketes.app`):

   | Type | Name | Content | Proxy |
   |---|---|---|---|
   | A | @ | 185.199.108.153 | DNS only (gris) |
   | A | @ | 185.199.109.153 | DNS only (gris) |
   | A | @ | 185.199.110.153 | DNS only (gris) |
   | A | @ | 185.199.111.153 | DNS only (gris) |

3. Agrega **1 registro CNAME** para el subdominio `www`:

   | Type | Name | Content | Proxy |
   |---|---|---|---|
   | CNAME | www | urielgarcia12.github.io | DNS only (gris) |

> **IMPORTANTE**: Pon todos en "DNS only" (gris) — no en "Proxied" (naranja).
> Si pones proxy, GitHub Pages no podrá emitir el certificado HTTPS.

#### 4.3 Esperar (10 min - 24 hrs):
GitHub Pages emite automáticamente el certificado SSL gratis. Cuando esté listo, verás un check verde junto a "HTTPS" en Settings → Pages.

## 🛠️ Actualizar el sitio

Cualquier cambio:
```powershell
cd c:/Users/aidev/Downloads/tiketes-web
# Edita los archivos
git add -A
git commit -m "Update landing"
git push
```
GitHub Pages se actualiza automático en 1-2 minutos.

## 🎨 Estilo

El sitio replica el mismo lenguaje visual del LoginScreen de la app:
- Fondo navy oscuro `#050617`
- Orbs morados `#6B4BFF` + acento dorado `#F5C518`
- Chispas animadas (sparks)
- Glass cards con backdrop-filter
- Tipografía Sora (display) + Inter (body) + JetBrains Mono (numbers)

## 📧 Email empresarial

Para que `soporte@tiketes.app` y `legal@tiketes.app` funcionen:

1. Compra dominio en Cloudflare (~$14/año para `.app`)
2. Crea cuenta gratis en [Zoho Mail](https://zoho.com/mail) → "Forever Free Plan"
3. Conecta dominio (Zoho te da DNS records a poner en Cloudflare)
4. Crea las cuentas `soporte@tiketes.app` y `legal@tiketes.app`
5. Empieza a recibir correos en zoho.com/mail (web + apps iOS/Android)

## 📄 Licencia

© 2026 Tiketes. Todos los derechos reservados.
