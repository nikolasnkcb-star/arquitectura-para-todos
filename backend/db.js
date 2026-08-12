/**
 * MOTOR DE BASE DE DATOS Y GESTOR DE PERSISTENCIA (CON SOPORTE DE UPGRADE)
 * Arquitectura Para Todos — Arqui IA
 */

const fs = require('fs');
const path = require('path');
const { CONFIG, getUpgradePrice } = require('../config/packages.config');

const DB_FILE = path.join(__dirname, 'data.json');

let memoryDb = {
  projects: [],
  project_packages: [],
  package_upgrades: [],
  meetings: [],
  deliverables: [],
  youtube_metadata: []
};

function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      memoryDb = Object.assign({
        projects: [],
        project_packages: [],
        package_upgrades: [],
        meetings: [],
        deliverables: [],
        youtube_metadata: []
      }, parsed);
    } else {
      saveDb();
    }
  } catch (err) {
    console.error("Error al cargar la base de datos:", err);
  }
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), 'utf8');
  } catch (err) {
    console.error("Error al guardar la base de datos:", err);
  }
}

loadDb();

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

function createProject(data) {
  const project = {
    id: generateId('proj'),
    client_name: data.client_name || 'Cliente Arqui IA',
    client_email: data.client_email || 'cliente@ejemplo.com',
    client_phone: data.client_phone || '',
    project_name: data.project_name || 'Casa Unifamiliar',
    maps_url: data.maps_url || '',
    lot_width: data.lot_width || 8,
    lot_length: data.lot_length || 20,
    slope: data.slope || 'plano',
    levels_desired: data.levels_desired || '2 pisos',
    family_needs: data.family_needs || 'Vivienda familiar de 4 personas',
    required_rooms: data.required_rooms || '3 dormitorios, 2.5 baños',
    budget_approx: data.budget_approx || 'S/180,000',
    reference_images: data.reference_images || [],
    architectural_program: data.architectural_program || 'Programa preliminar en desarrollo',
    conceptual_proposal: data.conceptual_proposal || 'Concepto moderno e integrado',
    initial_distribution: data.initial_distribution || 'Distribución preliminar',
    facade_concept: data.facade_concept || 'Fachada contemporánea',
    reference_budget: data.reference_budget || 'Estimación preliminar referencial',
    ai_recommendation: data.ai_recommendation || null,
    project_package: null,
    package_price: null,
    package_price_original: null,
    upgrade_payment: null,
    meeting_count: 0,
    meetings_completed: 0,
    project_progress: 0,
    payment_status: 'PENDING',
    project_status: 'DRAFT',
    publication_consent: false,
    video_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  memoryDb.projects.push(project);
  saveDb();
  return project;
}

function getProjectById(id) {
  return memoryDb.projects.find(p => p.id === id);
}

function getProjectByPhone(phone) {
  // Búsqueda por número de teléfono exacto o limpiando espacios si es necesario
  return memoryDb.projects.find(p => p.client_phone && p.client_phone.replace(/\s+/g, '') === phone.replace(/\s+/g, ''));
}

function getAllProjects() {
  return memoryDb.projects;
}

function updateProject(id, updates) {
  const proj = getProjectById(id);
  if (!proj) return null;

  Object.assign(proj, updates, { updated_at: new Date().toISOString() });
  saveDb();
  return proj;
}

function selectPackage(projectId, packageCode) {
  const project = getProjectById(projectId);
  if (!project) throw new Error("Proyecto no encontrado");

  const isBasic = packageCode.toUpperCase() === 'BASIC';
  const isPremium = packageCode.toUpperCase() === 'PREMIUM';

  if (!isBasic && !isPremium) {
    throw new Error("Paquete no válido. Debe ser BASIC o PREMIUM.");
  }

  const code = isBasic ? 'BASIC' : 'PREMIUM';
  const price = isBasic ? CONFIG.BASIC_PRICE : CONFIG.PREMIUM_PRICE;
  const meetingCount = isBasic ? CONFIG.BASIC_MEETINGS : CONFIG.PREMIUM_MEETINGS;

  project.project_package = code;
  project.package_price = price;
  project.meeting_count = meetingCount;
  project.payment_status = 'PENDING';
  project.project_status = 'DRAFT';
  project.updated_at = new Date().toISOString();

  const pkgRecord = {
    id: generateId('pkg'),
    project_id: projectId,
    package_code: code,
    package_name: isBasic ? 'BASIC — Lleva tu idea a un plano' : 'PREMIUM — Desarrolla tu casa',
    price: price,
    currency: CONFIG.CURRENCY,
    meeting_count: meetingCount,
    meeting_duration: CONFIG.MEETING_DURATION,
    status: 'SELECTED',
    purchased_at: null,
    activated_at: null,
    completed_at: null
  };

  memoryDb.project_packages = memoryDb.project_packages.filter(p => p.project_id !== projectId);
  memoryDb.project_packages.push(pkgRecord);

  saveDb();
  return { project, package: pkgRecord };
}

function confirmPaymentAndActivate(projectId, paymentStatus = 'PAID') {
  const project = getProjectById(projectId);
  if (!project) throw new Error("Proyecto no encontrado");

  if (paymentStatus !== 'PAID') {
    project.payment_status = paymentStatus;
    project.project_status = 'DRAFT';
    saveDb();
    return { success: false, status: paymentStatus, message: "El pago no fue aprobado. El proyecto permanece inactivo." };
  }

  project.payment_status = 'PAID';
  project.project_status = 'ACTIVE';
  project.project_progress = 10;

  const pkgRecord = memoryDb.project_packages.find(p => p.project_id === projectId);
  if (pkgRecord) {
    pkgRecord.status = 'PAID';
    pkgRecord.purchased_at = new Date().toISOString();
    pkgRecord.activated_at = new Date().toISOString();
  }

  memoryDb.meetings = memoryDb.meetings.filter(m => m.project_id !== projectId);
  const count = project.project_package === 'BASIC' ? CONFIG.BASIC_MEETINGS : CONFIG.PREMIUM_MEETINGS;

  for (let i = 1; i <= count; i++) {
    memoryDb.meetings.push({
      id: generateId('mtg'),
      project_id: projectId,
      meeting_number: i,
      title: `Asesoría Personalizada ${String(i).padStart(2, '0')}`,
      scheduled_at: null,
      duration: CONFIG.MEETING_DURATION,
      status: 'PENDING',
      meeting_url: '',
      notes: '',
      created_at: new Date().toISOString(),
      completed_at: null
    });
  }

  memoryDb.deliverables = memoryDb.deliverables.filter(d => d.project_id !== projectId);
  const deliverableDefs = CONFIG.DELIVERABLES[project.project_package] || [];

  deliverableDefs.forEach(def => {
    memoryDb.deliverables.push({
      id: generateId('dlv'),
      project_id: projectId,
      type: def.code,
      name: def.name,
      status: 'PENDING',
      file_url: null,
      preview_url: null,
      uploaded_at: null,
      delivered_at: null,
      notes: ''
    });
  });

  if (project.project_package === 'PREMIUM') {
    memoryDb.youtube_metadata = memoryDb.youtube_metadata.filter(y => y.project_id !== projectId);
    memoryDb.youtube_metadata.push({
      id: generateId('yt'),
      project_id: projectId,
      youtube_video_id: null,
      youtube_url: null,
      youtube_status: 'NOT_READY',
      publication_consent: false,
      youtube_title: `Casa ${project.client_name.split(' ')[0] || 'Unifamiliar'} | Diseño de vivienda con Arqui IA`,
      youtube_description: '',
      youtube_tags: 'arquitectura, arqui ia, diseño de casas, planos, 3d',
      youtube_visibility: 'PUBLIC',
      published_at: null
    });
  }

  saveDb();
  return {
    success: true,
    project,
    meetings: getProjectMeetings(projectId),
    deliverables: getProjectDeliverables(projectId)
  };
}

/**
 * FASE 2: EJECUCIÓN SEGURA DE UPGRADE BASIC -> PREMIUM (Reglas 3, 4, 5)
 */
function executePackageUpgrade(projectId) {
  const project = getProjectById(projectId);
  if (!project) throw new Error("Proyecto no encontrado");

  if (project.project_package === 'PREMIUM') {
    throw new Error("El proyecto ya se encuentra en Paquete PREMIUM.");
  }

  // FASE 2 & TEST 14/20: Cálculo Dinámico del Precio de Upgrade
  const originalPaidPrice = project.package_price || CONFIG.BASIC_PRICE;
  const upgradePriceCalculated = CONFIG.PREMIUM_PRICE - originalPaidPrice;

  // Registrar transacción de Upgrade en PACKAGE_UPGRADE sin borrar el historial
  const upgradeRecord = {
    id: generateId('upg'),
    project_id: projectId,
    from_package: 'BASIC',
    to_package: 'PREMIUM',
    original_package_price: originalPaidPrice,
    upgrade_price: upgradePriceCalculated,
    paid_at: new Date().toISOString(),
    payment_status: 'PAID',
    created_at: new Date().toISOString()
  };

  memoryDb.package_upgrades.push(upgradeRecord);

  // Actualizar estado del Proyecto
  project.project_package = 'PREMIUM';
  project.package_price_original = originalPaidPrice;
  project.upgrade_payment = upgradePriceCalculated;
  project.package_price = CONFIG.PREMIUM_PRICE; // Valor total contratado S/900
  project.meeting_count = CONFIG.PREMIUM_MEETINGS; // 4
  project.updated_at = new Date().toISOString();

  // FASE 4: MANTENER REUNIONES EXISTENTES Y AGREGAR SOLO LAS FALTANTES (meeting_03 y meeting_04)
  const existingMeetings = getProjectMeetings(projectId);
  const existingNumbers = existingMeetings.map(m => m.meeting_number);

  for (let i = 1; i <= CONFIG.PREMIUM_MEETINGS; i++) {
    if (!existingNumbers.includes(i)) {
      memoryDb.meetings.push({
        id: generateId('mtg'),
        project_id: projectId,
        meeting_number: i,
        title: `Asesoría Personalizada ${String(i).padStart(2, '0')}`,
        scheduled_at: null,
        duration: CONFIG.MEETING_DURATION,
        status: 'PENDING',
        meeting_url: '',
        notes: '',
        created_at: new Date().toISOString(),
        completed_at: null
      });
    }
  }

  // FASE 5: MANTENER ENTREGABLES EXISTENTES Y AGREGAR SOLO LOS ENTREGABLES PREMIUM FALTANTES
  const existingDeliverables = memoryDb.deliverables.filter(d => d.project_id === projectId);
  const existingTypes = existingDeliverables.map(d => d.type);

  const premiumDefs = CONFIG.DELIVERABLES.PREMIUM;
  premiumDefs.forEach(def => {
    if (!existingTypes.includes(def.code)) {
      memoryDb.deliverables.push({
        id: generateId('dlv'),
        project_id: projectId,
        type: def.code,
        name: def.name,
        status: 'PENDING',
        file_url: null,
        preview_url: null,
        uploaded_at: null,
        delivered_at: null,
        notes: ''
      });
    }
  });

  // Inicializar metadata de YouTube si no existía
  if (!memoryDb.youtube_metadata.some(y => y.project_id === projectId)) {
    memoryDb.youtube_metadata.push({
      id: generateId('yt'),
      project_id: projectId,
      youtube_video_id: null,
      youtube_url: null,
      youtube_status: 'NOT_READY',
      publication_consent: false,
      youtube_title: `Casa ${project.client_name.split(' ')[0] || 'Unifamiliar'} | Diseño de vivienda con Arqui IA`,
      youtube_description: '',
      youtube_tags: 'arquitectura, arqui ia, diseño de casas, planos, 3d',
      youtube_visibility: 'PUBLIC',
      published_at: null
    });
  }

  saveDb();
  return {
    success: true,
    project,
    upgradeRecord,
    meetings: getProjectMeetings(projectId),
    deliverables: getProjectDeliverables(projectId, 'PREMIUM')
  };
}

/**
 * HISTORIAL DE PAGOS (FASE 6 DE PROYECTO)
 */
function getProjectPaymentHistory(projectId) {
  const project = getProjectById(projectId);
  if (!project) return null;

  const originalPrice = project.package_price_original || (project.project_package === 'BASIC' ? project.package_price : CONFIG.BASIC_PRICE);
  const upgradeRecord = memoryDb.package_upgrades.find(u => u.project_id === projectId && u.payment_status === 'PAID');

  return {
    original_package: 'BASIC',
    original_paid: originalPrice,
    has_upgrade: Boolean(upgradeRecord || project.upgrade_payment),
    upgrade_package: upgradeRecord ? upgradeRecord.to_package : (project.upgrade_payment ? 'PREMIUM' : null),
    upgrade_paid: upgradeRecord ? upgradeRecord.upgrade_price : (project.upgrade_payment || 0),
    total_paid: project.package_price || (originalPrice + (project.upgrade_payment || 0))
  };
}

/**
 * FASE 6: Validación de Fecha/Hora de Reunion — rechaza fechas pasadas, fuera de horario y superposiciones
 */
function validateMeetingSchedule(scheduledAt, meetingId) {
  if (!scheduledAt) return { valid: false, error: 'Se requiere fecha y hora de la reunión.' };
  const date = new Date(scheduledAt);
  if (isNaN(date.getTime())) return { valid: false, error: 'Formato de fecha y hora inválido.' };
  
  const now = new Date();
  if (date <= now) {
    return { valid: false, error: `No se pueden programar reuniones en fechas pasadas. Fecha recibida: ${date.toISOString()}.` };
  }

  const day = date.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) {
    return { valid: false, error: 'Solo se pueden agendar reuniones de Lunes a Viernes.' };
  }

  const hours = date.getHours();
  const mins = date.getMinutes();
  const timeInMins = hours * 60 + mins;
  const startMins = 9 * 60; // 09:00
  const endMins = 18 * 60; // 18:00
  const duration = CONFIG.MEETING_DURATION || 45;

  if (timeInMins < startMins || (timeInMins + duration) > endMins) {
    return { valid: false, error: 'El horario debe estar entre las 09:00 AM y las 06:00 PM.' };
  }

  // Verificar superposición
  const overlapping = memoryDb.meetings.find(m => {
    if (m.id === meetingId || !m.scheduled_at) return false;
    const mDate = new Date(m.scheduled_at);
    if (isNaN(mDate.getTime())) return false;
    
    // Misma fecha
    if (date.getFullYear() === mDate.getFullYear() && date.getMonth() === mDate.getMonth() && date.getDate() === mDate.getDate()) {
      const mTimeInMins = mDate.getHours() * 60 + mDate.getMinutes();
      const mDuration = m.duration || 45;
      // overlap condition: start1 < end2 AND end1 > start2
      if (timeInMins < (mTimeInMins + mDuration) && (timeInMins + duration) > mTimeInMins) {
        return true;
      }
    }
    return false;
  });

  if (overlapping) {
    return { valid: false, error: 'El horario seleccionado ya está reservado. Por favor, elige otro bloque.' };
  }

  return { valid: true };
}

function getAvailability(dateStr) {
  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return [];
  
  const day = targetDate.getDay();
  if (day === 0 || day === 6) return []; // Fines de semana sin disponibilidad
  
  const blocks = [];
  const startMins = 9 * 60;
  const endMins = 18 * 60;
  const duration = CONFIG.MEETING_DURATION || 45;

  for (let current = startMins; (current + duration) <= endMins; current += duration) {
    // format HH:MM
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    blocks.push({ time: `${h}:${m}`, available: true });
  }

  // Marcar ocupados
  memoryDb.meetings.forEach(m => {
    if (!m.scheduled_at) return;
    const mDate = new Date(m.scheduled_at);
    if (targetDate.getFullYear() === mDate.getFullYear() && targetDate.getMonth() === mDate.getMonth() && targetDate.getDate() === mDate.getDate()) {
      const mTimeInMins = mDate.getHours() * 60 + mDate.getMinutes();
      const mDuration = m.duration || 45;
      blocks.forEach(b => {
        const [bh, bm] = b.time.split(':').map(Number);
        const bTime = bh * 60 + bm;
        if (bTime < (mTimeInMins + mDuration) && (bTime + duration) > mTimeInMins) {
          b.available = false;
        }
      });
    }
  });

  return blocks;
}

function getProjectMeetings(projectId) {
  return memoryDb.meetings.filter(m => m.project_id === projectId).sort((a, b) => a.meeting_number - b.meeting_number);
}

function updateMeeting(meetingId, updates) {
  const mtg = memoryDb.meetings.find(m => m.id === meetingId);
  if (!mtg) return null;

  // FASE 6: Validar fecha si se está programando
  if (updates.scheduled_at) {
    const validation = validateMeetingSchedule(updates.scheduled_at, meetingId);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
  }

  Object.assign(mtg, updates);
  if (updates.status === 'COMPLETED' && !mtg.completed_at) {
    mtg.completed_at = new Date().toISOString();
  }

  const projMeetings = memoryDb.meetings.filter(m => m.project_id === mtg.project_id);
  const completedCount = projMeetings.filter(m => m.status === 'COMPLETED').length;
  updateProject(mtg.project_id, { meetings_completed: completedCount });

  saveDb();
  return mtg;
}

function getProjectDeliverables(projectId, userPackage = null) {
  const project = getProjectById(projectId);
  if (!project) return [];

  const pkg = userPackage || project.project_package;
  let list = memoryDb.deliverables.filter(d => d.project_id === projectId);

  // FASE 5: SEGURIDAD BACKEND — Si el usuario sigue en BASIC, restringir deliverables Premium
  if (pkg === 'BASIC') {
    const forbiddenTypes = ['3D_MODEL', 'EXTRA_3D_VIEWS', 'WALKTHROUGH_VIDEO'];
    list = list.filter(d => !forbiddenTypes.includes(d.type));
  }

  return list;
}

function updateDeliverable(deliverableId, updates) {
  const dlv = memoryDb.deliverables.find(d => d.id === deliverableId);
  if (!dlv) return null;

  Object.assign(dlv, updates);
  if (updates.status === 'READY' || updates.status === 'DELIVERED') {
    dlv.delivered_at = new Date().toISOString();
  }

  if (dlv.type === 'WALKTHROUGH_VIDEO' && updates.file_url) {
    updateProject(dlv.project_id, { video_url: updates.file_url });
  }

  saveDb();
  return dlv;
}

function updatePublicationConsent(projectId, consent) {
  const project = getProjectById(projectId);
  if (!project) throw new Error("Proyecto no encontrado");

  project.publication_consent = Boolean(consent);
  
  const yt = memoryDb.youtube_metadata.find(y => y.project_id === projectId);
  if (yt) {
    yt.publication_consent = Boolean(consent);
  }

  saveDb();
  return { project, youtube: yt };
}

function getYoutubeMetadata(projectId) {
  return memoryDb.youtube_metadata.find(y => y.project_id === projectId) || null;
}

function updateYoutubeMetadata(projectId, updates) {
  let yt = memoryDb.youtube_metadata.find(y => y.project_id === projectId);
  if (!yt) {
    yt = {
      id: generateId('yt'),
      project_id: projectId,
      youtube_video_id: null,
      youtube_url: null,
      youtube_status: 'NOT_READY',
      publication_consent: false,
      youtube_title: '',
      youtube_description: '',
      youtube_tags: '',
      youtube_visibility: 'PUBLIC',
      published_at: null
    };
    memoryDb.youtube_metadata.push(yt);
  }

  Object.assign(yt, updates);
  saveDb();
  return yt;
}

function updateYoutubeStatus(projectId, status) {
  const yt = getYoutubeMetadata(projectId);
  if (!yt) return { success: false, error: 'Metadata no encontrada' };
  yt.youtube_status = status;
  if (status === 'PUBLISHED') yt.published_at = new Date().toISOString();
  saveDb();
  return { success: true, youtube: yt };
}

module.exports = {
  createProject,
  getProjectById,
  getAllProjects,
  getProjectByPhone,
  updateProject,
  selectPackage,
  confirmPaymentAndActivate,
  executePackageUpgrade,
  updateYoutubeStatus,
  getProjectPaymentHistory,
  getAvailability,
  validateMeetingSchedule,
  getProjectMeetings,
  updateMeeting,
  getProjectDeliverables,
  updateDeliverable,
  updatePublicationConsent,
  getYoutubeMetadata,
  updateYoutubeMetadata
};
