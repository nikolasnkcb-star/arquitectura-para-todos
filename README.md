# Arquitectura Para Todos — Arqui IA
## Documentación Técnica y Comercial (Modelo Comercial 2.0)

Sistema integral de **Desarrollo Arquitectónico Personalizado** asistido por Inteligencia Artificial (**Arqui IA**).

---

## 1. Novedades del Modelo Comercial 2.0

Se reemplazó el antiguo paquete único por un esquema dual de 2 paquetes profesionales configurables:

* **BASIC — S/500**: *"Lleva tu idea a un plano"* (2 asesorías de 45 minutos, planos PDF acotados, propuesta 3D de fachada, programa arquitectónico y documento digital).
* **PREMIUM — S/900**: *"Desarrolla tu casa"* (4 asesorías de 45 minutos, plantas acotadas, fachada 3D + vistas adicionales, modelo 3D conceptual completo, video recorrido en MP4/MOV/WEBM y opción de publicación en el canal de YouTube).

La etapa gratuita de **Arqui IA** se mantiene intacta.

---

## 2. Configuración Central y Modularidad

Los precios, número de reuniones, duraciones y entregables están desacoplados del código mediante `config/packages.config.js`:

```javascript
BASIC_PRICE = 500
PREMIUM_PRICE = 900

BASIC_MEETINGS = 2
PREMIUM_MEETINGS = 4

MEETING_DURATION = 45 // minutos

BASIC_HAS_3D_MODEL = false
PREMIUM_HAS_3D_MODEL = true

BASIC_HAS_VIDEO = false
PREMIUM_HAS_VIDEO = true

PREMIUM_YOUTUBE_ENABLED = true
```

* **Regla de Precio Histórico**: El precio pagado se registra inmutablemente en el proyecto al momento de la compra, garantizando que futuros cambios de precio no alteren proyectos contratados previamente.

---

## 3. Estructura de la Aplicación

```text
arquitectura_para_todos/
├── config/
│   └── packages.config.js       # Configuración central de paquetes y copy
├── backend/
│   ├── db.js                    # Motor de persistencia y reglas de datos
│   ├── server.js                # Servidor Express y endpoint de Arqui IA
│   ├── services/
│   │   └── email.service.js     # Notificaciones y correos automáticos
│   └── routes/
│       ├── commercial.routes.js # Recomendador, checkout y activación
│       ├── deliverables.routes.js# Entregables y control de permisos backend
│       ├── youtube.routes.js    # Privacidad, consentimiento y YouTube API
│       └── admin.routes.js      # Panel de administración y filtros
├── frontend/
│   ├── index.html               # SPA responsive (Hero, Chat, Precios, Dashboard, Admin)
│   ├── styles.css               # Diseño UI premium (Glassmorphism, dark mode)
│   └── app.js                   # Controlador cliente y consumo de API
├── tests/
│   └── commercial_model.test.js # Batería de 10 pruebas obligatorias
├── package.json
└── README.md
```

---

## 4. Batería de Pruebas Automatizadas

Para ejecutar el suite de pruebas obligatorias:

```bash
npm test
```

Verifica:
1. Selección de paquete BASIC (S/500, 2 reuniones).
2. Selección de paquete PREMIUM (S/900, 4 reuniones, video, 3D).
3. Rechazo de pago (permanece inactivo).
4. Aprobación de pago (activación automática).
5. Bloqueo backend de entregables 3D para BASIC (HTTP 403).
6. Bloqueo backend de video para BASIC (HTTP 403).
7. Bloqueo de publicación en YouTube sin consentimiento (`publication_consent = false`).
8. Publicación en YouTube autorizada (`publication_consent = true`).
9. Preservación del precio histórico pagado tras cambiar configuración.
10. Verificación estricta de 0 referencias al antiguo paquete comercial.

---

## 5. Instrucciones de Ejecución

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar el servidor en desarrollo o producción:
   ```bash
   npm start
   ```
3. Abrir la aplicación en el navegador:
   `http://localhost:3000`
