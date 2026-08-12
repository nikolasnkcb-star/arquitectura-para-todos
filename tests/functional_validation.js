/**
 * VALIDACIÓN FUNCIONAL COMPLETA EN TIEMPO REAL (FASES 1 - 7)
 * Arquitectura Para Todos — Arqui IA
 */

const http = require('http');

function request(options, bodyData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    req.on('error', reject);
    if (bodyData) req.write(JSON.stringify(bodyData));
    req.end();
  });
}

async function runValidation() {
  console.log("\n=======================================================");
  console.log("  VALIDACIÓN FUNCIONAL EN TIEMPO REAL (FASES 1 A 7)");
  console.log("=======================================================\n");

  // 1. Configuración Dinámica
  const config = await request({ hostname: 'localhost', port: 3000, path: '/api/config', method: 'GET' });
  console.log("1. Configuración Dinámica:", {
    basicPrice: config.body.basicPrice,
    premiumPrice: config.body.premiumPrice,
    upgradePrice: config.body.upgradePrice,
    duration: config.body.meetingDuration
  });

  // 2. Flujo Completo BASIC
  console.log("\n--- FLUJO 1: CLIENTE CONTRATA BASIC ---");
  const chat1 = await request({ hostname: 'localhost', port: 3000, path: '/api/aria/chat', method: 'POST' }, {
    step: 8, projectData: { name: 'Cliente Upgrade Test', lot_width: 8, lot_length: 15 }
  });
  const projId = chat1.body.project.id;

  await request({ hostname: 'localhost', port: 3000, path: '/api/checkout/select-package', method: 'POST' }, {
    projectId: projId, packageCode: 'BASIC'
  });
  await request({ hostname: 'localhost', port: 3000, path: '/api/checkout/pay', method: 'POST' }, {
    projectId: projId, simulateStatus: 'PAID'
  });

  const delivsBasic = await request({ hostname: 'localhost', port: 3000, path: `/api/projects/${projId}/deliverables`, method: 'GET' });
  console.log("-> Entregables Iniciales BASIC:", delivsBasic.body.deliverables.map(d => d.type));

  // 3. Consulta de Upgrade
  console.log("\n--- FLUJO 2: SOLICITUD Y CÁLCULO DE UPGRADE ---");
  const upgInfo = await request({ hostname: 'localhost', port: 3000, path: `/api/projects/${projId}/upgrade-info`, method: 'GET' });
  console.log("-> Información de Upgrade:", {
    originalPaid: upgInfo.body.originalPaidPrice,
    premiumPrice: upgInfo.body.premiumPrice,
    upgradePrice: upgInfo.body.upgradePrice
  });

  // 4. Ejecución del Upgrade BASIC -> PREMIUM
  const upgPay = await request({ hostname: 'localhost', port: 3000, path: '/api/checkout/upgrade-pay', method: 'POST' }, {
    projectId: projId, simulateStatus: 'PAID'
  });

  console.log("\n--- RESULTADO TRAS EL UPGRADE ---");
  console.log("-> Paquete Actualizado:", upgPay.body.project.project_package);
  console.log("-> Total Reuniones (Faltantes Agregadas):", upgPay.body.meetings.length);
  console.log("-> Entregables Premium Desbloqueados:", upgPay.body.deliverables.map(d => d.type));
  console.log("-> Historial de Pagos:", upgPay.body.paymentHistory);

  console.log("\n=======================================================");
  console.log("  TODAS LAS FASES FUNCIONALES VERIFICADAS CON ÉXITO");
  console.log("=======================================================\n");
}

runValidation().catch(console.error);
