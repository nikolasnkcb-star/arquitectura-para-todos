# TASK: Correcciones FASES 1-11 — Arqui IA Modelo Comercial 2.0

## Progreso

- [/] FASE 2: Eliminar rutas Express muertas (decisión: server nativo)
- [ ] FASE 1: Corregir parseo de datos chat en app.js
- [ ] FASE 3: Precio de upgrade solo desde backend
- [ ] FASE 4: Crear GET /api/projects/:id/meetings
- [ ] FASE 5: sendUpgradeConfirmedEmail()
- [ ] FASE 6: Validación fechas pasadas en reuniones
- [ ] FASE 7: Tabla comparativa YouTube
- [ ] FASE 8: Copy visor 3D
- [ ] FASE 9: Tests 21-30
- [ ] FASE 10: functional_validation.js
- [ ] FASE 11: Auditoría S/600 + precios hardcodeados
- [ ] REPORTE FINAL A-L

## Archivos a modificar
- backend/db.js (validateMeetingSchedule)
- backend/services/email.service.js (sendUpgradeConfirmedEmail)
- backend/server.js (rutas faltantes, chat fix, validaciones)
- frontend/app.js (parseo chat, upgrade price, meetings, 3D copy)
- frontend/index.html (YouTube tabla, 3D heading)
- tests/commercial_model.test.js (tests 21-30)

## Archivos a eliminar (código muerto)
- backend/routes/commercial.routes.js
- backend/routes/deliverables.routes.js
- backend/routes/youtube.routes.js
- backend/routes/admin.routes.js
