# 🚀 Guía de Instalación - FarmaTicket Backend

## 📋 Requisitos Previos

Antes de empezar, necesitas tener instalado:

1. **Node.js** (versión 14 o superior)
   - Descargar: https://nodejs.org/
   - Verificar instalación: `node --version`

2. **MySQL** (versión 5.7 o superior)
   - Opción 1: XAMPP (incluye MySQL) - https://www.apachefriends.org/
   - Opción 2: MySQL directamente - https://dev.mysql.com/downloads/mysql/
   - Verificar instalación: `mysql --version`

3. **npm** (viene con Node.js)
   - Verificar instalación: `npm --version`

---

## 📁 Estructura de Archivos

```
farmaticket-backend/
├── server.js              # Servidor principal
├── package.json           # Dependencias del proyecto
├── .env                   # Variables de entorno (crear)
├── .env.example          # Plantilla de variables
├── .gitignore            # Archivos a ignorar en Git
├── api-client.js         # Cliente API para el frontend
└── README.md             # Esta guía
```

---

## 🔧 PASO 1: Configurar MySQL

### 1.1 Iniciar MySQL

**Si usas XAMPP:**
1. Abre el panel de control de XAMPP
2. Click en "Start" en MySQL
3. MySQL debería estar corriendo en puerto 3306

**Si usas MySQL directamente:**
1. Abre MySQL Workbench o línea de comandos
2. Asegúrate que el servicio MySQL esté corriendo

### 1.2 Crear la Base de Datos

Abre MySQL desde la línea de comandos o phpMyAdmin:

```bash
mysql -u root -p
```

Luego ejecuta:

```sql
CREATE DATABASE farmaticket CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE farmaticket;
```

### 1.3 Importar el Script SQL

**Opción A: Desde línea de comandos**
```bash
mysql -u root -p farmaticket < farmaticket_database.sql
```

**Opción B: Desde phpMyAdmin**
1. Abre phpMyAdmin (http://localhost/phpmyadmin)
2. Selecciona la base de datos "farmaticket"
3. Ve a la pestaña "Importar"
4. Selecciona el archivo `farmaticket_database.sql`
5. Click en "Continuar"

**Opción C: Desde MySQL Workbench**
1. Conecta a tu servidor MySQL
2. Abre el script `farmaticket_database.sql`
3. Ejecuta el script (⚡ icono de rayo)

### 1.4 Verificar la Instalación

```sql
USE farmaticket;
SHOW TABLES;
```

Deberías ver estas tablas:
- `empleados`
- `tipos_ticket`
- `tickets`
- `historial_tickets`
- `configuracion`
- `reportes_diarios`
- `auditoria_empleados`

---

## 🔧 PASO 2: Instalar Node.js y Dependencias

### 2.1 Verificar Node.js

Abre la terminal/CMD y ejecuta:

```bash
node --version
npm --version
```

Deberías ver algo como:
```
v18.x.x
9.x.x
```

Si no tienes Node.js, descárgalo de: https://nodejs.org/

### 2.2 Navegar a la Carpeta del Backend

```bash
cd ruta/a/farmaticket-backend
```

Por ejemplo:
```bash
cd C:\Users\TuUsuario\Desktop\farmaticket-backend
```

### 2.3 Instalar Dependencias

```bash
npm install
```

Esto instalará:
- `express` - Framework web
- `mysql2` - Conector MySQL
- `cors` - Permitir peticiones desde el frontend
- `bcrypt` - Encriptación de contraseñas
- `dotenv` - Variables de entorno
- `nodemon` - Auto-recarga en desarrollo

La instalación puede tomar 1-2 minutos.

---

## 🔧 PASO 3: Configurar Variables de Entorno

### 3.1 Crear archivo .env

Copia el archivo `.env.example` y renómbralo a `.env`:

**Windows:**
```bash
copy .env.example .env
```

**Mac/Linux:**
```bash
cp .env.example .env
```

### 3.2 Editar .env

Abre el archivo `.env` con un editor de texto y configura:

```env
# Puerto del servidor
PORT=3000

# Configuración de Base de Datos MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=farmaticket
```

**Importante:**
- Si MySQL no tiene contraseña, deja `DB_PASSWORD=` vacío
- Si usas XAMPP por defecto, `DB_PASSWORD=` está vacío
- Si cambiaste el puerto de MySQL, ajusta `DB_HOST=localhost:3307`

### 3.3 Ejemplo de .env

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=farmaticket
```

---

## 🚀 PASO 4: Iniciar el Servidor

### 4.1 Modo Desarrollo (con auto-recarga)

```bash
npm run dev
```

Deberías ver:

```
╔════════════════════════════════════════════╗
║       🚀 FARMATICKET API SERVER           ║
╠════════════════════════════════════════════╣
║  Puerto: 3000                             
║  URL: http://localhost:3000             
║  Base de Datos: farmaticket       
╚════════════════════════════════════════════╝

✅ Conectado a MySQL exitosamente
```

### 4.2 Modo Producción

```bash
npm start
```

### 4.3 Verificar que Funciona

Abre tu navegador y ve a:

```
http://localhost:3000/api/test
```

Deberías ver:

```json
{
  "message": "✅ FarmaTicket API funcionando correctamente",
  "timestamp": "2025-03-22T...",
  "version": "1.0.0"
}
```

---

## 🔧 PASO 5: Conectar el Frontend

### 5.1 Agregar el Cliente API al HTML

En tu archivo `farmaticket_v3M_responsive.html`, agrega antes de la línea `</head>`:

```html
<script src="http://localhost:3000/api-client.js"></script>
```

O copia el contenido de `api-client.js` dentro de un `<script>` en tu HTML.

### 5.2 Modificar la Base de Datos en el Frontend

Busca la línea donde se define `const DB = {` (aproximadamente línea 346) y reemplaza con:

```javascript
// Base de datos - ahora conectada con MySQL
const DB = {
    empleados: [],
    tickets: [],
    tiposTicket: [],
    ticketCounter: 0
};

// Cargar datos desde el backend al iniciar
async function cargarDatosIniciales() {
    try {
        // Verificar conexión
        await FarmaTicketAPI.test();
        console.log('✅ Conectado con el backend');
        
        // Cargar tipos de ticket
        DB.tiposTicket = await FarmaTicketAPI.tiposTicket.getAll();
        
        // Cargar empleados
        DB.empleados = await FarmaTicketAPI.empleados.getAll();
        
        // Cargar tickets del día
        DB.tickets = await FarmaTicketAPI.tickets.getAll();
        DB.ticketCounter = DB.tickets.length;
        
        console.log('✅ Datos cargados desde MySQL');
    } catch (error) {
        console.error('❌ Error conectando con backend:', error);
        alert('No se pudo conectar con el servidor. Asegúrate que el backend esté corriendo en http://localhost:3000');
    }
}

// Llamar al cargar la página
cargarDatosIniciales();
```

---

## 📡 API Endpoints Disponibles

### TICKETS

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/tickets` | Obtener todos los tickets del día |
| POST | `/api/tickets` | Crear nuevo ticket |
| PUT | `/api/tickets/:id` | Actualizar ticket |
| PUT | `/api/tickets/:id/tipo` | Cambiar tipo de ticket |

### EMPLEADOS

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/empleados` | Obtener todos los empleados |
| POST | `/api/empleados/login` | Login de empleado |
| POST | `/api/empleados` | Crear empleado |
| PUT | `/api/empleados/:id` | Actualizar empleado |
| DELETE | `/api/empleados/:id` | Eliminar empleado |

### TIPOS DE TICKET

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/tipos-ticket` | Obtener tipos de ticket |

### REPORTES

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/reportes/diario` | Reporte del día actual |
| GET | `/api/reportes/diario?fecha=2025-03-22` | Reporte de fecha específica |

---

## 🧪 Probar el API con Ejemplos

### Crear un Ticket

```javascript
// Desde la consola del navegador
const nuevoTicket = await FarmaTicketAPI.tickets.create({
    id_tipo: 1,
    es_preferencial: false,
    sub_categoria: null
});
console.log('Ticket creado:', nuevoTicket);
```

### Login de Empleado

```javascript
const empleado = await FarmaTicketAPI.empleados.login('admin', 'admin123');
console.log('Empleado logueado:', empleado);
```

### Obtener Tickets

```javascript
const tickets = await FarmaTicketAPI.tickets.getAll();
console.log('Tickets del día:', tickets);
```

---

## 🐛 Solución de Problemas

### Problema 1: "Error conectando a MySQL"

**Causa:** MySQL no está corriendo o credenciales incorrectas

**Solución:**
1. Verifica que MySQL esté corriendo (XAMPP o servicio)
2. Verifica las credenciales en `.env`
3. Intenta conectar manualmente: `mysql -u root -p`

### Problema 2: "Puerto 3000 ya está en uso"

**Causa:** Otro programa usa el puerto 3000

**Solución:**
1. Cambia el puerto en `.env`: `PORT=3001`
2. O cierra el programa que usa el puerto 3000

### Problema 3: "Cannot find module 'express'"

**Causa:** Dependencias no instaladas

**Solución:**
```bash
npm install
```

### Problema 4: "CORS error" en el navegador

**Causa:** Frontend y backend en diferentes dominios

**Solución:** Ya incluido en `server.js` con `app.use(cors())`

### Problema 5: "La base de datos está vacía"

**Causa:** No se ejecutó el script SQL

**Solución:**
```bash
mysql -u root -p farmaticket < farmaticket_database.sql
```

### Problema 6: Frontend no se conecta

**Causa:** Backend no está corriendo o URL incorrecta

**Solución:**
1. Verifica que el backend esté corriendo: `npm run dev`
2. Abre http://localhost:3000/api/test
3. Verifica la URL en `api-client.js` (línea 5)

---

## 📊 Verificar Base de Datos

Para ver los datos en MySQL:

```sql
USE farmaticket;

-- Ver empleados
SELECT * FROM empleados;

-- Ver tickets del día
SELECT * FROM tickets WHERE DATE(fecha_creacion) = CURDATE();

-- Ver tipos de ticket
SELECT * FROM tipos_ticket;

-- Ver historial
SELECT * FROM historial_tickets ORDER BY fecha_hora DESC LIMIT 10;
```

---

## 🔐 Seguridad

### Usuarios por Defecto

Al instalar la base de datos, se crean estos usuarios:

| Usuario | Contraseña | Cargo |
|---------|------------|-------|
| admin | admin123 | Administrador |
| medico1 | 123 | Médico |
| cajero1 | 123 | Cajero |
| cajero2 | 123 | Cajero |
| cajero3 | 123 | Cajero |

**⚠️ IMPORTANTE:** Cambia estas contraseñas en producción.

### Encriptación de Contraseñas

Actualmente las contraseñas se guardan en texto plano para facilitar las pruebas.

Para activar encriptación (en producción):

1. Descomentar las líneas con `bcrypt` en `server.js`
2. Las contraseñas se hashearán automáticamente

---

## 📁 Archivos a Editar

Para personalizar el sistema:

1. **server.js** - Lógica del servidor y rutas
2. **.env** - Configuración de base de datos
3. **api-client.js** - Cliente para el frontend
4. **farmaticket_database.sql** - Estructura de la base de datos

---

## 🚀 Desplegar en Producción

### Opción 1: Servidor Local (LAN)

1. Cambia `localhost` por la IP del servidor en `.env`
2. Configura el firewall para permitir puerto 3000
3. Los clientes acceden a `http://IP_SERVIDOR:3000`

### Opción 2: Hosting Web

Servicios recomendados:
- **Heroku** (https://heroku.com)
- **Railway** (https://railway.app)
- **DigitalOcean** (https://digitalocean.com)
- **AWS** (https://aws.amazon.com)

---

## 📞 Comandos Útiles

```bash
# Instalar dependencias
npm install

# Iniciar en desarrollo
npm run dev

# Iniciar en producción
npm start

# Ver versión de Node
node --version

# Ver puertos en uso (Windows)
netstat -ano | findstr :3000

# Ver puertos en uso (Mac/Linux)
lsof -i :3000

# Detener servidor
Ctrl + C
```

---

## ✅ Checklist de Instalación

- [ ] Node.js instalado (versión 14+)
- [ ] MySQL instalado y corriendo
- [ ] Base de datos `farmaticket` creada
- [ ] Script SQL ejecutado
- [ ] Carpeta backend descargada
- [ ] `npm install` ejecutado
- [ ] Archivo `.env` configurado
- [ ] `npm run dev` funciona
- [ ] http://localhost:3000/api/test responde
- [ ] Frontend conectado con backend
- [ ] Tickets se crean y guardan en MySQL

---

## 🎉 ¡Listo!

Si todo funcionó correctamente, ahora tienes:

✅ Backend Node.js corriendo en puerto 3000
✅ Base de datos MySQL configurada
✅ API REST funcionando
✅ Frontend conectado con MySQL
✅ Datos persistentes (no se pierden al refrescar)

**Próximos Pasos:**

1. Prueba crear tickets desde el frontend
2. Verifica que se guarden en MySQL
3. Prueba el login de empleados
4. Crea nuevos empleados desde el panel
5. Genera reportes

¿Tienes algún problema? Revisa la sección **Solución de Problemas** arriba. 🚀
