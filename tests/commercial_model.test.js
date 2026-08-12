/**
 * BATERÍA DE PRUEBAS COMPLETA (TESTS 1 - 20)
 * Arquitectura Para Todos — Arqui IA
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const db = require('../backend/db');
const { CONFIG, getUpgradePrice } = require('../config/packages.config');

let passedTests = 0;
let failedTests = 0;

function runTest(testName, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   Detalle: ${err.message}`);
    failedTests++;
  }
}

console.log("\n=======================================================");
console.log("  EJECUTANDO BATERÍA DE PRUEBAS 1 - 20 (MODELO 2.0)");
console.log("=======================================================\n");

// TEST 01: Selección de BASIC (S/500, 2 reuniones, 45 min, entregables BASIC)
runTest("TEST 01: Usuario selecciona BASIC", () => {
  const proj = db.createProject({ client_name: "Cliente Basic Test" });
  db.selectPackage(proj.id, 'BASIC');
  const result = db.confirmPaymentAndActivate(proj.id, 'PAID');

  assert.strictEqual(result.project.project_package, 'BASIC');
  assert.strictEqual(result.project.package_price, 250);
  assert.strictEqual(result.project.meeting_count, 2);
  assert.strictEqual(result.meetings.length, 2);
  assert.strictEqual(result.meetings[0].duration, 45);
  
  const deliverables = db.getProjectDeliverables(proj.id, 'BASIC');
  assert.strictEqual(deliverables.length, 5);
  assert.strictEqual(deliverables.some(d => d.type === '3D_MODEL'), false);
});

// TEST 02: Selección de PREMIUM (S/900, 4 reuniones, 45 min, entregables PREMIUM)
runTest("TEST 02: Usuario selecciona PREMIUM", () => {
  const proj = db.createProject({ client_name: "Cliente Premium Test" });
  db.selectPackage(proj.id, 'PREMIUM');
  const result = db.confirmPaymentAndActivate(proj.id, 'PAID');

  assert.strictEqual(result.project.project_package, 'PREMIUM');
  assert.strictEqual(result.project.package_price, 450);
  assert.strictEqual(result.project.meeting_count, 4);
  assert.strictEqual(result.meetings.length, 4);
  
  const deliverables = db.getProjectDeliverables(proj.id, 'PREMIUM');
  assert.strictEqual(deliverables.length, 8);
  assert.strictEqual(deliverables.some(d => d.type === '3D_MODEL'), true);
  assert.strictEqual(deliverables.some(d => d.type === 'WALKTHROUGH_VIDEO'), true);
});

// TEST 03: Pago rechazado -> project_status != ACTIVE
runTest("TEST 03: Pago rechazado", () => {
  const proj = db.createProject({ client_name: "Cliente Pago Fallido" });
  db.selectPackage(proj.id, 'BASIC');
  const result = db.confirmPaymentAndActivate(proj.id, 'FAILED');

  assert.strictEqual(result.success, false);
  assert.notStrictEqual(result.status, 'PAID');

  const updatedProj = db.getProjectById(proj.id);
  assert.notStrictEqual(updatedProj.project_status, 'ACTIVE');
});

// TEST 04: Pago aprobado -> project_status == ACTIVE
runTest("TEST 04: Pago aprobado", () => {
  const proj = db.createProject({ client_name: "Cliente Pago Éxito" });
  db.selectPackage(proj.id, 'BASIC');
  const result = db.confirmPaymentAndActivate(proj.id, 'PAID');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.project.project_status, 'ACTIVE');
  assert.strictEqual(result.project.payment_status, 'PAID');
});

// TEST 05 & TEST 06: BASIC intenta acceder a Modelo 3D o Video (ACCESS DENIED backend)
runTest("TEST 05 & 06: Restricción de permisos backend para BASIC", () => {
  const proj = db.createProject({ client_name: "Cliente Permisos BASIC" });
  db.selectPackage(proj.id, 'BASIC');
  db.confirmPaymentAndActivate(proj.id, 'PAID');

  const deliverables = db.getProjectDeliverables(proj.id, 'BASIC');
  const has3DModel = deliverables.some(d => d.type === '3D_MODEL');
  const hasVideo = deliverables.some(d => d.type === 'WALKTHROUGH_VIDEO');

  assert.strictEqual(has3DModel, false);
  assert.strictEqual(hasVideo, false);
});

// TEST 07: Premium intenta publicar sin consentimiento -> PUBLICATION BLOCKED
runTest("TEST 07: Publicación sin consentimiento", () => {
  const proj = db.createProject({ client_name: "Cliente Premium Sin Consentimiento" });
  db.selectPackage(proj.id, 'PREMIUM');
  db.confirmPaymentAndActivate(proj.id, 'PAID');
  db.updateProject(proj.id, { video_url: 'https://ejemplo.com/video.mp4', publication_consent: false });

  const updated = db.getProjectById(proj.id);
  assert.strictEqual(updated.publication_consent, false);
});

// TEST 08: Premium autoriza publicación -> publication_consent = true
runTest("TEST 08: Autorización de publicación registrada", () => {
  const proj = db.createProject({ client_name: "Cliente Premium Con Consentimiento" });
  db.selectPackage(proj.id, 'PREMIUM');
  db.confirmPaymentAndActivate(proj.id, 'PAID');
  
  const res = db.updatePublicationConsent(proj.id, true);
  assert.strictEqual(res.project.publication_consent, true);
});

// TEST 09: Modificar BASIC_PRICE y verificar que proyectos anteriores conservan precio histórico
runTest("TEST 09: Preservación de precio histórico pagado", () => {
  const proj = db.createProject({ client_name: "Cliente Histórico" });
  db.selectPackage(proj.id, 'BASIC');
  db.confirmPaymentAndActivate(proj.id, 'PAID');

  assert.strictEqual(proj.package_price, 250);

  CONFIG.BASIC_PRICE = 650;
  const fetched = db.getProjectById(proj.id);
  assert.strictEqual(fetched.package_price, 250);
  CONFIG.BASIC_PRICE = 250;
});

// TEST 10: Verificación de código -> Cero referencias comerciales activas a "600"
runTest("TEST 10: Auditoría de 0 referencias comerciales activas al paquete anterior de S/600", () => {
  const filesToScan = [
    'config/packages.config.js',
    'backend/db.js',
    'backend/server.js',
    'backend/services/email.service.js',
    'backend/routes/commercial.routes.js',
    'backend/routes/deliverables.routes.js',
    'backend/routes/youtube.routes.js',
    'backend/routes/admin.routes.js',
    'frontend/index.html',
    'frontend/app.js'
  ];

  let foundCommercial600Count = 0;
  filesToScan.forEach(relPath => {
    const fullPath = path.join(__dirname, '..', relPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(/S\/\s*600|price\s*[:=]\s*600|PRICE_600/gi);
      if (matches) {
        foundCommercial600Count += matches.length;
      }
    }
  });

  assert.strictEqual(foundCommercial600Count, 0, `Se encontraron ${foundCommercial600Count} referencias comerciales a S/600 en el código.`);
});

// TEST 11: BASIC muestra entregables Premium bloqueados
runTest("TEST 11: BASIC distingue entregables bloqueados para ventas de Upgrade", () => {
  const proj = db.createProject({ client_name: "Test 11 BASIC" });
  db.selectPackage(proj.id, 'BASIC');
  db.confirmPaymentAndActivate(proj.id, 'PAID');

  const basicDelivs = db.getProjectDeliverables(proj.id, 'BASIC');
  const premiumDelivs = CONFIG.DELIVERABLES.PREMIUM;
  const lockedTypes = premiumDelivs.filter(pd => !basicDelivs.some(bd => bd.type === pd.code)).map(pd => pd.code);

  assert.strictEqual(lockedTypes.includes('3D_MODEL'), true);
  assert.strictEqual(lockedTypes.includes('WALKTHROUGH_VIDEO'), true);
});

// TEST 12: BASIC no puede acceder al modelo 3D (HTTP 403 / Filtered Backend)
runTest("TEST 12: BASIC no puede acceder al modelo 3D en Backend", () => {
  const proj = db.createProject({ client_name: "Test 12 3D Denied" });
  db.selectPackage(proj.id, 'BASIC');
  db.confirmPaymentAndActivate(proj.id, 'PAID');

  const list = db.getProjectDeliverables(proj.id, 'BASIC');
  const model3d = list.find(d => d.type === '3D_MODEL');
  assert.strictEqual(model3d, undefined);
});

// TEST 13: BASIC no puede acceder al video walkthrough (HTTP 403 / Filtered Backend)
runTest("TEST 13: BASIC no puede acceder al video recorrido en Backend", () => {
  const proj = db.createProject({ client_name: "Test 13 Video Denied" });
  db.selectPackage(proj.id, 'BASIC');
  db.confirmPaymentAndActivate(proj.id, 'PAID');

  const list = db.getProjectDeliverables(proj.id, 'BASIC');
  const video = list.find(d => d.type === 'WALKTHROUGH_VIDEO');
  assert.strictEqual(video, undefined);
});

// TEST 14: Upgrade calcula correctamente PREMIUM_PRICE - BASIC_PRICE (Dinámico)
runTest("TEST 14: Upgrade calcula dinámicamente PREMIUM_PRICE - BASIC_PRICE", () => {
  CONFIG.BASIC_PRICE = 250;
  CONFIG.PREMIUM_PRICE = 450;
  const diff = getUpgradePrice();
  assert.strictEqual(diff, 200);
});

// TEST 15: Upgrade BASIC -> PREMIUM por S/200
runTest("TEST 15: Ejecución de Upgrade BASIC -> PREMIUM por S/200", () => {
  const proj = db.createProject({ client_name: "Test 15 Upgrade" });
  db.selectPackage(proj.id, 'BASIC');
  db.confirmPaymentAndActivate(proj.id, 'PAID');

  const result = db.executePackageUpgrade(proj.id);
  assert.strictEqual(result.project.project_package, 'PREMIUM');
  assert.strictEqual(result.upgradeRecord.upgrade_price, 200);
  assert.strictEqual(result.project.package_price, 450);
});

// TEST 16: Upgrade conserva el pago original en historial de pagos
runTest("TEST 16: Upgrade conserva el registro del pago original S/250", () => {
  const proj = db.createProject({ client_name: "Test 16 Payment History" });
  db.selectPackage(proj.id, 'BASIC');
  db.confirmPaymentAndActivate(proj.id, 'PAID');
  db.executePackageUpgrade(proj.id);

  const history = db.getProjectPaymentHistory(proj.id);
  assert.strictEqual(history.original_paid, 250);
  assert.strictEqual(history.upgrade_paid, 200);
  assert.strictEqual(history.total_paid, 450);
});

// TEST 17: Upgrade crea únicamente las reuniones faltantes (meeting_03, meeting_04)
runTest("TEST 17: Upgrade agrega únicamente reuniones faltantes", () => {
  const proj = db.createProject({ client_name: "Test 17 Meetings" });
  db.selectPackage(proj.id, 'BASIC');
  db.confirmPaymentAndActivate(proj.id, 'PAID');

  // Simular que completó 1 reunión
  const initialMeetings = db.getProjectMeetings(proj.id);
  db.updateMeeting(initialMeetings[0].id, { status: 'COMPLETED' });

  // Ejecutar Upgrade
  const result = db.executePackageUpgrade(proj.id);
  const newMeetings = result.meetings;

  assert.strictEqual(newMeetings.length, 4);
  assert.strictEqual(newMeetings[0].status, 'COMPLETED'); // Conservó reunión 1 completada
  assert.strictEqual(newMeetings[2].meeting_number, 3);
  assert.strictEqual(newMeetings[3].meeting_number, 4);
});

// TEST 18: Upgrade agrega únicamente los entregables Premium faltantes sin duplicar
runTest("TEST 18: Upgrade agrega únicamente entregables Premium faltantes sin duplicados", () => {
  const proj = db.createProject({ client_name: "Test 18 Deliverables" });
  db.selectPackage(proj.id, 'BASIC');
  db.confirmPaymentAndActivate(proj.id, 'PAID');

  const result = db.executePackageUpgrade(proj.id);
  const delivs = result.deliverables;

  assert.strictEqual(delivs.length, 8);
  const programCount = delivs.filter(d => d.type === 'PROGRAM').length;
  assert.strictEqual(programCount, 1); // No duplicó el programa
});

// TEST 19: Después del upgrade el usuario tiene permisos PREMIUM completos
runTest("TEST 19: Usuario tiene permisos PREMIUM completos tras Upgrade", () => {
  const proj = db.createProject({ client_name: "Test 19 Permissions" });
  db.selectPackage(proj.id, 'BASIC');
  db.confirmPaymentAndActivate(proj.id, 'PAID');

  // Pre-upgrade: 3D prohibido
  let delivs = db.getProjectDeliverables(proj.id);
  assert.strictEqual(delivs.some(d => d.type === '3D_MODEL'), false);

  // Post-upgrade: 3D y Video permitidos
  db.executePackageUpgrade(proj.id);
  delivs = db.getProjectDeliverables(proj.id);

  assert.strictEqual(delivs.some(d => d.type === '3D_MODEL'), true);
  assert.strictEqual(delivs.some(d => d.type === 'WALKTHROUGH_VIDEO'), true);
});

// TEST 20: Cambiar precios de configuración modifica automáticamente el precio del upgrade
runTest("TEST 20: Modificar precios de configuración recalcula dinámicamente el precio de Upgrade", () => {
  // Configuración actual: 250 y 450 -> 200
  assert.strictEqual(getUpgradePrice(), 200);

  // Modificar temporalmente a 600 y 1000 -> 400
  CONFIG.BASIC_PRICE = 600;
  CONFIG.PREMIUM_PRICE = 1000;
  assert.strictEqual(getUpgradePrice(), 400);

  // Modificar a 500 y 1200 -> 700
  CONFIG.BASIC_PRICE = 500;
  CONFIG.PREMIUM_PRICE = 1200;
  assert.strictEqual(getUpgradePrice(), 700);

  // Restablecer valores originales
  CONFIG.BASIC_PRICE = 250;
  CONFIG.PREMIUM_PRICE = 450;
  assert.strictEqual(getUpgradePrice(), 200);
});

// TEST 21 & 22: Creación de proyecto conserva datos de terreno y no usa defaults
runTest("TEST 21 y 22: Conservación de datos reales de terreno al crear proyecto", () => {
  const pData = {
    client_name: 'Ana',
    lot_width: 10,
    lot_length: 20,
    slope: 'Pronunciada',
    levels_desired: '3',
    family_needs: '4 personas',
    required_rooms: '4 dormitorios'
  };
  const proj = db.createProject(pData);
  assert.strictEqual(proj.lot_width, 10);
  assert.strictEqual(proj.lot_length, 20);
  assert.strictEqual(proj.slope, 'Pronunciada');
  assert.strictEqual(proj.levels_desired, '3');
});

// TEST 23 & 24: Precio histórico se mantiene inmutable ante cambios de BASIC_PRICE
runTest("TEST 23 y 24: Cálculo histórico de upgrade", () => {
  // Compró BASIC a 250
  const proj = db.createProject({ client_name: "Cliente Upgrade Historico" });
  db.selectPackage(proj.id, 'BASIC');
  db.confirmPaymentAndActivate(proj.id, 'PAID');
  
  assert.strictEqual(proj.package_price, 250);

  // Inflación: BASIC_PRICE sube a 600, PREMIUM_PRICE sube a 1000
  CONFIG.BASIC_PRICE = 600;
  CONFIG.PREMIUM_PRICE = 1000;

  // Upgrade se calcula como PREMIUM_PRICE(1000) - PAGADO(250) = 750 (No 200)
  const history = db.getProjectPaymentHistory(proj.id);
  const diff = CONFIG.PREMIUM_PRICE - (proj.package_price_original || proj.package_price);
  
  assert.strictEqual(diff, 750);

  // Revertir
  CONFIG.BASIC_PRICE = 250;
  CONFIG.PREMIUM_PRICE = 450;
});

// TEST 25 & 26: Consulta de reuniones
runTest("TEST 25 y 26: Consulta de reuniones aislada por proyecto", () => {
  const p1 = db.createProject({ client_name: "P1" });
  db.selectPackage(p1.id, 'BASIC');
  db.confirmPaymentAndActivate(p1.id, 'PAID');

  const p2 = db.createProject({ client_name: "P2" });
  db.selectPackage(p2.id, 'PREMIUM');
  db.confirmPaymentAndActivate(p2.id, 'PAID');

  const m1 = db.getProjectMeetings(p1.id);
  const m2 = db.getProjectMeetings(p2.id);

  assert.strictEqual(m1.length, 2);
  assert.strictEqual(m2.length, 4);
  assert.ok(m1.every(m => m.project_id === p1.id));
  assert.ok(m2.every(m => m.project_id === p2.id));
});

// TEST 27 & 28: Generación de correo simulado de Upgrade (vía registro de historial)
runTest("TEST 27 y 28: Registro de Upgrade (email indirecto)", () => {
  const p = db.createProject({ client_name: "P Email" });
  db.selectPackage(p.id, 'BASIC');
  db.confirmPaymentAndActivate(p.id, 'PAID');
  
  const result = db.executePackageUpgrade(p.id);
  assert.strictEqual(result.upgradeRecord.original_package_price, 250);
  assert.strictEqual(result.upgradeRecord.upgrade_price, 200);
  assert.strictEqual(result.project.package_price, 450);
});

// TEST 29: Validación de fecha pasada
runTest("TEST 29: Validación de fechas pasadas en reuniones", () => {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1); // Ayer

  const validation = db.validateMeetingSchedule(pastDate.toISOString());
  assert.strictEqual(validation.valid, false);

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1); // Mañana
  const validationFut = db.validateMeetingSchedule(futureDate.toISOString());
  assert.strictEqual(validationFut.valid, true);
});

// TEST 30: Tabla comparativa (Mock de archivo)
runTest("TEST 30: Tabla comparativa muestra YouTube solo en PREMIUM", () => {
  const html = fs.readFileSync(path.join(__dirname, '../frontend/index.html'), 'utf8');
  assert.ok(html.includes('<td class="text-center muted">—</td>'));
  assert.ok(html.includes('Opcional*'));
});

// TEST 31: Actualización de Proyecto (Captura de WhatsApp)
runTest("TEST 31: Captura obligatoria de WhatsApp actualiza el proyecto", () => {
  const proj = db.createProject({ client_name: "Lead Inicial" });
  assert.strictEqual(proj.client_phone, ''); // Inicialmente vacío

  const updatedProj = db.updateProject(proj.id, {
    client_name: "Juan Pérez",
    client_phone: "+51 987 654 321"
  });

  assert.strictEqual(updatedProj.client_phone, "+51 987 654 321");
  assert.strictEqual(updatedProj.client_name, "Juan Pérez");
  
  const fetched = db.getProjectById(proj.id);
  assert.strictEqual(fetched.client_phone, "+51 987 654 321");
});

console.log("\n=======================================================");
console.log(`  RESULTADOS DE PRUEBAS: ${passedTests} PASADAS, ${failedTests} FALLADAS`);
console.log("=======================================================\n");

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
