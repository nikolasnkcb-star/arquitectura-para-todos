# ROUTES — Arquitectura Para Todos · Arqui IA

## Decisión Arquitectónica (FASE 2)

**Servidor**: HTTP nativo Node.js (`backend/server.js`) — Zero dependencias externas.
**Express**: Declarado en package.json pero NO instalado. Los archivos de routes Express 
anteriores fueron eliminados por ser código muerto (nunca montados en el servidor).

**Fuente de verdad única**: `backend/server.js` contiene TODAS las rutas de producción.

---

## API ROUTES (todas en backend/server.js)

### Configuración
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/config | Configuración comercial activa (precios, reuniones, entregables) |

### Arqui IA (Etapa Gratuita)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/aria/chat | Conversación paso a paso con Arqui IA |
| POST | /api/aria/recommend | Recomendación de paquete basada en datos del proyecto |

### Proyectos
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/projects/create | Crear nuevo proyecto |
| GET | /api/projects/:id/deliverables | Entregables autorizados (filtrado backend por paquete) |
| GET | /api/projects/:id/deliverables/:type/access | Acceso a entregable específico con verificación de permisos |
| GET | /api/projects/:id/meetings | Reuniones del proyecto (solo para el cliente) |
| GET | /api/projects/:id/upgrade-info | Información de upgrade BASIC→PREMIUM con precio dinámico |
| GET | /api/projects/:id/youtube | Metadata y estado YouTube (solo PREMIUM) |
| POST | /api/projects/:id/publication-consent | Registrar/modificar autorización de publicación |
| POST | /api/projects/:id/youtube/publish | Publicar video en YouTube (solo PREMIUM, requiere consent) |

### Checkout y Pagos
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/checkout/select-package | Seleccionar paquete BASIC o PREMIUM |
| POST | /api/checkout/pay | Confirmar pago y activar proyecto |
| POST | /api/checkout/upgrade-pay | Pagar y ejecutar upgrade BASIC→PREMIUM |

### Panel Administrativo
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/admin/projects | Listar proyectos con filtros avanzados |
| PUT | /api/admin/projects/:id/meetings/:meetingId | Programar/editar reunión de asesoría |
| PUT | /api/admin/projects/:id/deliverables/:deliverableId | Cargar/actualizar entregable |
| PUT | /api/admin/projects/:id/status | Cambiar estado del proyecto |

---

## Seguridad y Permisos (backend)
- BASIC: NO puede acceder a 3D_MODEL, EXTRA_3D_VIEWS, WALKTHROUGH_VIDEO → HTTP 403
- PREMIUM solo: YouTube, Modelo 3D, Video
- Upgrade: precio calculado como PREMIUM_PRICE - precio_historico_pagado (nunca hardcodeado)
- Publicación YouTube: requiere publication_consent=true + payment_status=PAID + project_package=PREMIUM + video_url != null
