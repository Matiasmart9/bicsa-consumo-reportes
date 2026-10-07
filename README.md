# Sistema Web Consumo MiPymes – BICSA

Aplicación web para el **seguimiento del consumo y de los contratos** de las instituciones MiPymes de BICSA: registro mensual de consultas, control de vencimientos, facturación y reportes en Excel.

> Versión actual: **V3.3** (definida en [`src/version.js`](src/version.js)).

## Funcionalidades

| Módulo | Qué hace |
| --- | --- |
| **Dashboard** | Resumen general del consumo con gráficos (estado, mayor consumo y consumo mensual), filtros rápidos por estado, orden y tarjetas por institución con historial mensual desplegable. |
| **Instituciones** | Alta, edición, renovación y baja. Vista de tarjetas o lista, filtros (estado, categoría, alto consumo), orden y exportación a Excel. |
| **Registro de consumo** | Consumo mensual por institución con vista previa del uso del contrato y validación contra las consultas disponibles. |
| **Monitoreo Contratos** | Contratos vencidos, críticos (15 días o menos), medios (de 16 días a 1 mes) y próximos a vencer (hasta 2 meses), con buscador, filtros y Excel. |
| **Notificaciones** | Campanita en la barra superior con contratos vencidos o por vencer y consumo alto (75 %) o crítico (90 %). Cada usuario marca las suyas como leídas: no afecta a los demás. |
| **Auditoría** | Registro general de acciones (quién, qué y cuándo) con filtros y exportación a Excel. Se habilita por usuario. |
| **Cargas XML** | Seguimiento de las instituciones que cargan XML. |
| **Facturación** | Facturas, cuotas, pagos y dashboard financiero (módulo de Contabilidad). |
| **Panel Admin** | Gestión de usuarios, roles y permisos. |
| **Reportes Excel** | Todos los reportes se descargan con formato corporativo (encabezados de color, semáforo de estados, columnas ajustadas). |

### Reglas de negocio destacadas

- **Planes Premium / Premium Gold:** incluyen la opción *Dejar de dar seguimiento consumo* (Sí / No). Con «No», el vencimiento de esa institución no aparece en Monitoreo Contratos.
- **Estado «No Renov.»:** se guarda internamente como `vencido` y se muestra como *No Renov.* en pantalla y Excel.
- **Seguimiento de vencimiento:** solo las instituciones **activas** se siguen; las pendientes, en renovación o que no renovaron no se monitorean.
- **Moneda:** cada institución y factura tiene moneda **PYG** o **USD** (obligatoria). Los registros anteriores se consideran PYG. Los totales nunca mezclan monedas.
- **Sesión:** se cierra automáticamente tras **30 minutos sin actividad**, con un aviso 1 minuto antes.

## Tecnologías

- [React 19](https://react.dev/) + [Vite 7](https://vite.dev/)
- [Tailwind CSS 3](https://tailwindcss.com/) · [Framer Motion](https://www.framer.com/motion/) · [lucide-react](https://lucide.dev/)
- [React Router 7](https://reactrouter.com/) · [Recharts](https://recharts.org/)
- [Firebase](https://firebase.google.com/) (Authentication y Firestore)
- [`xlsx-js-style`](https://www.npmjs.com/package/xlsx-js-style) para los reportes Excel con estilos

## Requisitos

- [Node.js](https://nodejs.org/) 20 o superior
- npm

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar el servidor de desarrollo
npm run dev
```

La aplicación queda disponible en <http://localhost:5173>.

### Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente. |
| `npm run build` | Genera la versión de producción en `dist/`. |
| `npm run preview` | Sirve localmente la versión de producción. |
| `npm run lint` | Revisa el código con ESLint. |

## Estructura del proyecto

```
src/
├── App.jsx                  # Rutas, sesión y cierre por inactividad
├── firebase.js              # Configuración de Firebase
├── version.js               # Versión y nombre visibles en la app
├── components/              # Pantallas y modales
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Instituciones.jsx
│   ├── MonitoreoContratos.jsx
│   ├── CargasXML.jsx
│   ├── Facturacion.jsx / DashboardFacturacion.jsx
│   ├── Auditoria.jsx
│   ├── CampanaNotificaciones.jsx
│   ├── Admin.jsx / GestionUsuarios.jsx
│   ├── instituciones/       # Modales y piezas de la pantalla de Instituciones
│   └── Navbar.jsx
├── hooks/
│   ├── useFirebase.js       # Acceso a Firestore (instituciones, usuarios, auditoría)
│   ├── useInactividad.js    # Cierre de sesión por inactividad
│   ├── useNotificaciones.js # Notificaciones y estado de lectura por usuario
│   └── usePermisosUsuario.js
└── utils/
    ├── plan.js              # Reglas de planes Premium y seguimiento
    ├── contratos.js         # Cálculo de vencimientos y vigencia
    ├── moneda.js            # Formato y cálculos PYG / USD
    ├── permisos.js          # Reglas de acceso (auditoría, monitoreo)
    ├── excel.js             # Estilos y utilidades de Excel
    └── reporteConsumo.js    # Reporte Excel principal de consumo
```

## Roles y permisos

El rol y los permisos de cada usuario se guardan en la colección `usuarios` de Firestore y se administran desde **Panel Admin → Gestión de Usuarios**.

- **Administrador:** acceso total.
- **Operador:** instituciones y consumo, según los permisos que se le asignen.
- **Contabilidad:** facturación y dashboard financiero.

Permisos configurables: agregar, editar y eliminar instituciones, registrar consumos, gestionar comentarios, ver historial, acceso a Facturación / Dashboard de Facturación, acceso a **Monitoreo Contratos** y acceso a **Auditoría**.

## Firebase y seguridad

La configuración del proyecto Firebase está en [`src/firebase.js`](src/firebase.js). Las claves de una app web de Firebase identifican el proyecto y no son secretas: **la seguridad real la dan las reglas de Firestore**.

### Reglas de Firestore

El archivo [`firestore.rules`](firestore.rules) define quién puede leer y escribir cada colección. Se basan en el documento de cada usuario en `usuarios` (rol, `activo` y permisos):

- Sin sesión, o con una cuenta que no tenga documento activo en `usuarios`, **no se accede a nada**.
- Solo el administrador crea, edita o elimina usuarios, roles y permisos.
- Instituciones, facturas, comentarios y auditoría se limitan según los permisos de cada usuario.
- La auditoría es **inmutable**: solo se pueden crear registros, siempre a nombre del usuario que actúa.
- Todo lo que no figura en el archivo queda denegado.

**Cómo publicarlas** (Firebase Console → *Firestore Database* → *Reglas*):

1. Publica primero la versión nueva de la aplicación (la creación de usuarios ahora usa una app secundaria de Firebase para no cerrar la sesión del administrador).
2. Copia el contenido de `firestore.rules`, pégalo en el editor y usa **Probar reglas** (*Rules Playground*) con un usuario administrador y uno sin permisos.
3. Pulsa **Publicar**. Si algo falla, el historial de reglas de la consola permite volver a la versión anterior.
4. No desactives el registro de usuarios en *Authentication → Configuración*: la app lo necesita para crear cuentas, y las reglas ya impiden que una cuenta sin perfil acceda a datos.

## Despliegue

```bash
npm run build
```

El contenido de `dist/` puede publicarse en cualquier hosting estático (Netlify, Firebase Hosting, etc.). Al usar rutas de React Router, configura el hosting para redirigir todas las rutas a `index.html`.

## Historial de versiones

- **V3.3** – Moneda PYG/USD en instituciones y facturación, notificaciones por usuario, auditoría general con permiso, estado y filtro de estado en Cargas XML, reglas de seguridad de Firestore y código de Instituciones dividido en módulos.
- **V3.2** – Nuevo login, Monitoreo Contratos con permisos, reportes Excel con estilo, rediseño de Instituciones y modales, estado «No Renov.», cierre de sesión por inactividad.
- **V3.1** – Versión anterior.
