# Sistema Web Consumo MiPymes – BICSA

Aplicación web para el **seguimiento del consumo y de los contratos** de las instituciones MiPymes de BICSA: registro mensual de consultas, control de vencimientos, facturación y reportes en Excel.

> Versión actual: **V3.2** (definida en [`src/version.js`](src/version.js)).

## Funcionalidades

| Módulo | Qué hace |
| --- | --- |
| **Dashboard** | Resumen de instituciones, consumo y estado de los contratos. |
| **Instituciones** | Alta, edición, renovación y baja. Vista de tarjetas o lista, filtros (estado, categoría, alto consumo), orden y exportación a Excel. |
| **Registro de consumo** | Consumo mensual por institución con vista previa del uso del contrato y validación contra las consultas disponibles. |
| **Monitoreo Contratos** | Contratos vencidos, críticos (hasta 1 mes) y próximos a vencer (2 meses), con buscador y filtros. |
| **Cargas XML** | Seguimiento de las instituciones que cargan XML. |
| **Facturación** | Facturas, cuotas, pagos y dashboard financiero (módulo de Contabilidad). |
| **Panel Admin** | Gestión de usuarios, roles y permisos. |
| **Reportes Excel** | Todos los reportes se descargan con formato corporativo (encabezados de color, semáforo de estados, columnas ajustadas). |

### Reglas de negocio destacadas

- **Planes Premium / Premium Gold:** incluyen la opción *Dejar de dar seguimiento consumo* (Sí / No). Con «No», el vencimiento de esa institución no aparece en Monitoreo Contratos.
- **Estado «No Renov.»:** se guarda internamente como `vencido` y se muestra como *No Renov.* en pantalla y Excel.
- **Seguimiento de vencimiento:** solo las instituciones **activas** se siguen; las pendientes, en renovación o que no renovaron no se monitorean.
- **Sesión:** se cierra automáticamente tras **15 minutos sin actividad**, con un aviso 1 minuto antes.

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
│   ├── Admin.jsx / GestionUsuarios.jsx
│   └── Navbar.jsx
├── hooks/
│   ├── useFirebase.js       # Acceso a Firestore (instituciones, usuarios, auditoría)
│   └── useInactividad.js    # Cierre de sesión por inactividad
└── utils/
    ├── plan.js              # Reglas de planes Premium y seguimiento
    ├── contratos.js         # Cálculo de vencimientos y vigencia
    ├── excel.js             # Estilos y utilidades de Excel
    └── reporteConsumo.js    # Reporte Excel principal de consumo
```

## Roles y permisos

El rol y los permisos de cada usuario se guardan en la colección `usuarios` de Firestore y se administran desde **Panel Admin → Gestión de Usuarios**.

- **Administrador:** acceso total.
- **Operador:** instituciones y consumo, según los permisos que se le asignen.
- **Contabilidad:** facturación y dashboard financiero.

Permisos configurables: agregar, editar y eliminar instituciones, registrar consumos, gestionar comentarios, ver historial, acceso a Facturación / Dashboard de Facturación y acceso a **Monitoreo Contratos**.

## Firebase

La configuración del proyecto Firebase está en [`src/firebase.js`](src/firebase.js). Las claves de una app web de Firebase identifican el proyecto y no son secretas; la seguridad real depende de las **reglas de Firestore** y de **Firebase Authentication**, que deben mantenerse restringidas a usuarios autenticados.

## Despliegue

```bash
npm run build
```

El contenido de `dist/` puede publicarse en cualquier hosting estático (Netlify, Firebase Hosting, etc.). Al usar rutas de React Router, configura el hosting para redirigir todas las rutas a `index.html`.

## Historial de versiones

- **V3.2** – Nuevo login, Monitoreo Contratos con permisos, reportes Excel con estilo, rediseño de Instituciones y modales, estado «No Renov.», cierre de sesión por inactividad.
- **V3.1** – Versión anterior.
