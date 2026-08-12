/**
 * CONTROLADOR PRINCIPAL JAVASCRIPT FRONTEND (FASE 1-5 COMPLETA)
 * Arquitectura Para Todos — Arqui IA
 */

const state = {
  activeConfig: null,
  currentProjectId: null,
  currentProject: null,
  selectedPackageCode: null,
  chatStep: 0,
  chatProjectData: {},
  adminFilter: 'ALL',
  adminProjects: [],
  viewer3DState: { angle: 45, zoom: 1, panX: 0, panY: 0 }
};

// Cargar configuración comercial activa desde el servidor
async function initConfig() {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    state.activeConfig = config;

    document.getElementById('priceBasicDisplay').textContent = config.basicPrice;
    document.getElementById('pricePremiumDisplay').textContent = config.premiumPrice;
    
    // Novedad: Llenado dinámico de spans agregados
    if(document.getElementById('heroBasicPrice')) document.getElementById('heroBasicPrice').textContent = config.basicPrice;
    if(document.getElementById('footerBasicPrice')) document.getElementById('footerBasicPrice').textContent = config.basicPrice;
    if(document.getElementById('footerPremiumPrice')) document.getElementById('footerPremiumPrice').textContent = config.premiumPrice;

    if (config.premiumBadge) {
      document.getElementById('premiumBadgeDisplay').textContent = config.premiumBadge;
    }
  } catch (err) {
    console.error("Error al cargar la configuración:", err);
  }
}

// Navegación de Secciones SPA
function navTo(sectionId) {
  const sections = ['heroSection', 'freeStage', 'conversionSection', 'landingPricing', 'clientDashboard', 'adminPanel', 'processSection', 'reviewsSection'];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === sectionId) {
        el.classList.remove('hidden');
        el.classList.add('active-view');
      } else if (sectionId === 'heroSection' && (id === 'processSection' || id === 'reviewsSection' || id === 'landingPricing')) {
        el.classList.remove('hidden');
        el.classList.add('active-view');
      } else if (sectionId === 'conversionSection' && id === 'landingPricing') {
        el.classList.remove('hidden');
        el.classList.add('active-view');
      } else {
        el.classList.add('hidden');
        el.classList.remove('active-view');
      }
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Iniciar Etapa Gratuita con Arqui IA
function startFreeStage() {
  navTo('freeStage');
  state.chatStep = 0;
  state.chatProjectData = {};
  document.getElementById('chatMessages').innerHTML = '';
  document.getElementById('projectSummaryData').innerHTML = '<p class="empty-state">Arqui IA irá organizando aquí la ficha técnica de tu terreno y vivienda.</p>';
  sendChatMessage('');
}

async function sendChatMessage(userText) {
  const typingDiv = document.getElementById('chatTyping');
  const input = document.getElementById('chatInput');

  if (userText) {
    appendMessage('user', userText);
    input.value = '';

    // FASE 1: Guardar respuestas del usuario estructuradamente
    const step = state.chatStep;
    if (step === 1) state.chatProjectData.maps = userText;
    else if (step === 2) {
      state.chatProjectData.dimensions_raw = userText;
      const nums = userText.match(/\d+(\.\d+)?/g);
      if (nums && nums.length >= 2) {
        state.chatProjectData.lot_width = parseFloat(nums[0]);
        state.chatProjectData.lot_length = parseFloat(nums[1]);
      }
    }
    else if (step === 3) state.chatProjectData.slope = userText;
    else if (step === 4) state.chatProjectData.levels = userText;
    else if (step === 5) state.chatProjectData.family = userText;
    else if (step === 6) state.chatProjectData.rooms = userText;
    else if (step === 7) state.chatProjectData.budget = userText;
    else if (step === 8) state.chatProjectData.references = userText;
  }

  typingDiv.classList.remove('hidden');

  try {
    const res = await fetch('/api/aria/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        step: state.chatStep,
        message: userText,
        projectData: state.chatProjectData
      })
    });

    const data = await res.json();
    typingDiv.classList.add('hidden');

    if (data.finished) {
      state.currentProjectId = data.project.id;
      state.currentProject = data.project;
      
      const techSheetHtml = `
        <div class="tech-sheet">
          <div class="tech-sheet-header">Ficha de Anteproyecto</div>
          <div class="tech-sheet-row"><span class="tech-sheet-label">Ubicación:</span><span class="tech-sheet-value">${state.chatProjectData.location || 'No especificada'}</span></div>
          <div class="tech-sheet-row"><span class="tech-sheet-label">Terreno:</span><span class="tech-sheet-value">${state.chatProjectData.dimensions || 'No especificado'}</span></div>
          <div class="tech-sheet-row"><span class="tech-sheet-label">Niveles:</span><span class="tech-sheet-value">${state.chatProjectData.floors || '1'}</span></div>
          <div class="tech-sheet-row"><span class="tech-sheet-label">Habitantes:</span><span class="tech-sheet-value">${state.chatProjectData.people || 'Familia'}</span></div>
          <div class="tech-sheet-row"><span class="tech-sheet-label">Presupuesto:</span><span class="tech-sheet-value">${state.chatProjectData.budget || 'Referencial'}</span></div>
          
          <div class="rne-seal" style="margin-top:1.5rem; justify-content:center; display:flex;">
            <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            Cumple normativa RNE
          </div>
          <div class="tech-sheet-disclaimer">
            Propuesta conceptual referencial. Para obtener el expediente técnico ejecutable con planos en PDF, adquiere el Paquete Básico.
          </div>
        </div>
      `;

      appendMessage('aria', "¡Entiendo perfectamente! Qué emocionante proyecto familiar. He analizado todos tus requerimientos y he estructurado la siguiente Ficha Técnica para nosotros. Dale una mirada a las opciones para empezar:", false);
      appendMessage('aria', techSheetHtml, true);
      
      setTimeout(() => {
        showWhatsAppModal();
      }, 4000);
      return;
    }

    if (data.nextQuestion) {
      appendMessage('aria', data.nextQuestion);
    } else if (data.message) {
      appendMessage('aria', data.message);
    }

    state.chatStep = data.step || (state.chatStep + 1);
    const pct = Math.min(100, Math.round((state.chatStep / 8) * 100));
    document.getElementById('chatProgressBar').style.width = pct + '%';
    document.getElementById('chatProgressText').textContent = `Progreso: ${pct}%`;

    if (userText) {
      updateSummaryFacts(userText);
    }

  } catch (err) {
    typingDiv.classList.add('hidden');
    console.error("Error en chat:", err);
  }
}

function appendMessage(sender, text, isHtml = false) {
  const messagesDiv = document.getElementById('chatMessages');
  const msgWrap = document.createElement('div');
  msgWrap.className = `chat-msg ${sender}`;

  const author = document.createElement('div');
  author.className = 'author';
  author.textContent = sender === 'aria' ? 'Arqui IA' : 'Tú';

  const body = document.createElement('div');
  if (isHtml) {
    body.innerHTML = text;
  } else {
    body.textContent = text;
  }

  msgWrap.appendChild(author);
  msgWrap.appendChild(body);
  messagesDiv.appendChild(msgWrap);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function updateSummaryFacts(text) {
  const container = document.getElementById('projectSummaryData');
  if (container.querySelector('.empty-state')) {
    container.innerHTML = '';
  }

  const keys = ['Ubicación', 'Medidas del terreno', 'Topografía', 'Niveles deseados', 'Habitantes', 'Ambientes requeridos', 'Presupuesto estimativo'];
  const currentKey = keys[Math.min(keys.length - 1, state.chatStep - 1)] || 'Dato';

  const item = document.createElement('div');
  item.className = 'summary-fact-item';
  item.innerHTML = `<strong>${currentKey}:</strong> ${text}`;
  container.appendChild(item);
}

function handleReferenceUpload(e) {
  const files = e.target.files;
  const previewDiv = document.getElementById('referencePreviewList');
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    const reader = new FileReader();
    reader.onload = function(evt) {
      const img = document.createElement('img');
      img.src = evt.target.result;
      img.className = 'reference-thumb';
      previewDiv.appendChild(img);
    };
    reader.readAsDataURL(files[i]);
  }

  appendMessage('aria', `He recibido tus ${files.length} imagen(es) de referencia. Arqui IA analizará el estilo, la materialidad, los colores y la volumetría para tu propuesta inicial.`);
}

async function showConversionScreen(project) {
  document.getElementById('freeStage').classList.add('hidden');
  document.getElementById('conversionSection').classList.remove('hidden');
  document.getElementById('landingPricing').classList.remove('hidden');

  try {
    const res = await fetch('/api/aria/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lot_width: project.lot_width,
        lot_length: project.lot_length,
        levels_desired: project.levels_desired,
        required_rooms: project.required_rooms
      })
    });
    const recData = await res.json();
    
    if (recData.success && recData.recommendation) {
      const rec = recData.recommendation;
      document.getElementById('recReason').textContent = rec.reason;
      
      if (rec.recommended_package === 'PREMIUM') {
        document.getElementById('cardPremium').classList.add('featured');
      } else {
        document.getElementById('cardBasic').classList.add('featured');
      }
    }
  } catch (err) {
    console.error("Error al obtener recomendación:", err);
  }

  window.scrollTo({ top: document.getElementById('conversionSection').offsetTop - 80, behavior: 'smooth' });
}

async function selectAndCheckout(packageCode) {
  state.selectedPackageCode = packageCode;

  if (!state.currentProjectId) {
    const res = await fetch('/api/projects/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: 'Cliente Demo',
        project_name: 'Casa Personalizada'
      })
    });
    const data = await res.json();
    state.currentProjectId = data.project.id;
    state.currentProject = data.project;
  }

  try {
    const res = await fetch('/api/checkout/select-package', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: state.currentProjectId,
        packageCode: packageCode
      })
    });

    const data = await res.json();

    if (!data.success) {
      alert("Error al seleccionar paquete: " + data.error);
      return;
    }

    document.getElementById('checkoutProjectName').textContent = state.currentProject.project_name || 'Casa Unifamiliar';
    document.getElementById('checkoutPackageName').textContent = `${data.packageCode} (${data.packageDetails.package_name})`;
    document.getElementById('checkoutMeetings').textContent = `${data.meetingCount} asesorías de 45 minutos`;
    document.getElementById('checkoutPrice').textContent = `S/${data.packagePrice}`;

    document.getElementById('checkoutModal').classList.remove('hidden');

  } catch (err) {
    console.error("Error en checkout:", err);
  }
}

function closeCheckoutModal() {
  document.getElementById('checkoutModal').classList.add('hidden');
}

async function processPaymentSimulated(statusToSimulate) {
  try {
    const res = await fetch('/api/checkout/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: state.currentProjectId,
        simulateStatus: statusToSimulate
      })
    });

    const data = await res.json();

    if (!data.success) {
      alert(`⚠️ PAGO NO APROBADO: ${data.message || data.error}`);
      return;
    }

    if (data.init_point) {
      window.location.href = data.init_point;
      return;
    }

    alert(`🎉 ¡Pago Validado con Éxito!\nTu proyecto en paquete ${data.project.project_package} ha sido ACTIVADO.`);
    closeCheckoutModal();

    state.currentProject = data.project;
    openClientDashboard();

  } catch (err) {
    console.error("Error al procesar el pago:", err);
  }
}

/**
 * FASE 2: MODAL DE UPGRADE BASIC -> PREMIUM
 */
async function openUpgradeModal() {
  if (!state.currentProjectId) return;

  try {
    const res = await fetch(`/api/projects/${state.currentProjectId}/upgrade-info`);
    const data = await res.json();

    if (!data.success) {
      alert("Error al obtener información de upgrade.");
      return;
    }

    document.getElementById('upgradeOriginalPaid').textContent = `${data.currency}${data.originalPaidPrice}`;
    document.getElementById('upgradePremiumPrice').textContent = `${data.currency}${data.premiumPrice}`;
    document.getElementById('upgradeDiffPrice').textContent = `${data.currency}${data.upgradePrice}`;
    document.getElementById('btnUpgradeAmount').textContent = `${data.upgradePrice}`;

    document.getElementById('upgradeModal').classList.remove('hidden');
  } catch (err) {
    console.error("Error al abrir modal de upgrade:", err);
  }
}

function closeUpgradeModal() {
  document.getElementById('upgradeModal').classList.add('hidden');
}

async function processUpgradePaymentSimulated(statusToSimulate) {
  try {
    const res = await fetch('/api/checkout/upgrade-pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: state.currentProjectId,
        simulateStatus: statusToSimulate
      })
    });

    const data = await res.json();

    if (!data.success) {
      alert(`⚠️ PAGO DE UPGRADE RECHAZADO: ${data.message || data.error}`);
      return;
    }

    if (data.init_point) {
      window.location.href = data.init_point;
      return;
    }

    alert(`🎉 ¡FELICITACIONES!\nTu proyecto ha sido actualizado a PREMIUM con éxito.`);
    closeUpgradeModal();

    state.currentProject = data.project;
    openClientDashboard();

  } catch (err) {
    console.error("Error en pago de upgrade:", err);
  }
}

// Abrir Panel del Cliente — Mi Proyecto
async function openClientDashboard() {
  if (!state.currentProjectId) {
    const res = await fetch('/api/admin/projects');
    const data = await res.json();
    if (data.projects && data.projects.length > 0) {
      state.currentProjectId = data.projects[0].id;
      state.currentProject = data.projects[0];
    } else {
      alert("Aún no tienes un proyecto activo. Por favor inicia la etapa gratuita o selecciona un paquete.");
      return;
    }
  }

  navTo('clientDashboard');

  const p = state.currentProject;
  const isPremium = p.project_package === 'PREMIUM';

  document.getElementById('dashProjectTitle').textContent = (p.project_name || 'MI PROYECTO').toUpperCase();
  document.getElementById('dashClientName').textContent = `Cliente: ${p.client_name || 'Juan Pérez'}`;
  document.getElementById('dashPackageCode').textContent = p.project_package || 'NO SELECCIONADO';
  document.getElementById('dashPackagePrice').textContent = `S/${p.package_price || 0}`;
  document.getElementById('dashMeetingsCount').textContent = `${p.meetings_completed || 0} / ${p.meeting_count || (isPremium ? 4 : 2)}`;
  
  document.getElementById('dashProgressBar').style.width = `${p.project_progress || 10}%`;

  document.getElementById('stage3D').style.display = isPremium ? 'inline' : 'none';
  document.getElementById('stageVideo').style.display = isPremium ? 'inline' : 'none';

  // FASE 4 & FASE 1: RENDER DE PROMO DE UPGRADE Y TARJETAS BLOQUEADAS SI ES BASIC
  const promoBox = document.getElementById('basicUpgradePromoBox');
  const lockedSection = document.getElementById('lockedDeliverablesSection');

  if (!isPremium) {
    try {
      const upgRes = await fetch(`/api/projects/${p.id}/upgrade-info`);
      const upgData = await upgRes.json();
      if (upgData.success) {
        document.getElementById('promoDiffPrice').textContent = upgData.upgradePrice;
        document.getElementById('promoBasicPrice').textContent = upgData.originalPaidPrice;
        document.getElementById('promoPaidPrice').textContent = upgData.originalPaidPrice;
        document.getElementById('promoPremiumPrice').textContent = upgData.premiumPrice;
      }
    } catch (err) {
      console.error("Error obteniendo info de upgrade:", err);
    }

    promoBox.classList.remove('hidden');
    lockedSection.classList.remove('hidden');
  } else {
    promoBox.classList.add('hidden');
    lockedSection.classList.add('hidden');
  }

  // FASE 6: RENDER HISTORIAL DE PAGOS
  renderPaymentHistory(p);

  await loadMeetings();
  await loadDeliverables();

  // FASE 3: VISOR 3D CONCEPTUAL (SOLO PREMIUM)
  const viewer3DSection = document.getElementById('viewer3DSection');
  const videoSection = document.getElementById('premiumVideoSection');

  if (isPremium) {
    viewer3DSection.classList.remove('hidden');
    videoSection.classList.remove('hidden');
    init3DViewer();
    loadYoutubeModule();
  } else {
    viewer3DSection.classList.add('hidden');
    videoSection.classList.add('hidden');
  }
}

// FASE 6: RENDERING DE HISTORIAL DE PAGOS
function renderPaymentHistory(project) {
  const container = document.getElementById('paymentHistoryBreakdown');
  if (!container) return;

  const isUpgraded = Boolean(project.package_price_original || project.upgrade_payment);
  const originalPrice = project.package_price_original || (project.project_package === 'BASIC' ? project.package_price : (state.activeConfig ? state.activeConfig.basicPrice : 500));
  const upgradePaid = project.upgrade_payment || (isUpgraded ? (project.package_price - originalPrice) : 0);
  const totalPaid = project.package_price || (originalPrice + upgradePaid);

  container.innerHTML = `
    <div class="payment-history-card">
      <span class="label">PAGO ORIGINAL</span>
      <span class="val">BASIC (S/${originalPrice})</span>
    </div>
    ${isUpgraded ? `
      <div class="payment-history-card">
        <span class="label">UPGRADE ADICIONAL</span>
        <span class="val gold-text">PREMIUM (+S/${upgradePaid})</span>
      </div>
    ` : ''}
    <div class="payment-history-card" style="border-color: var(--color-emerald);">
      <span class="label">TOTAL CONTRATADO</span>
      <span class="val" style="color: var(--color-emerald);">S/${totalPaid}</span>
    </div>
  `;
}

async function loadMeetings() {
  const container = document.getElementById('meetingsList');
  container.innerHTML = '';

  try {
    const res = await fetch(`/api/projects/${state.currentProjectId}/meetings`);
    const data = await res.json();
    
    if (!data.success || !data.meetings || data.meetings.length === 0) {
      container.innerHTML = '<p class="muted">No hay reuniones generadas aún.</p>';
      return;
    }

    data.meetings.forEach(m => {
      const card = document.createElement('div');
      card.className = `meeting-item-card ${m.status === 'COMPLETED' ? 'completed' : ''}`;
      
      const formattedDate = m.scheduled_at 
        ? new Date(m.scheduled_at).toLocaleString('es-PE', { dateStyle: 'medium', timeStyle: 'short' })
        : 'Por agendar por el equipo';

      card.innerHTML = `
        <h4>${m.title}</h4>
        <p><strong>Duración:</strong> ${m.duration} minutos</p>
        <p><strong>Estado:</strong> <span class="badge-sm">${m.status}</span></p>
        <p><strong>Fecha Programada:</strong> ${formattedDate}</p>
        ${m.meeting_url ? `<a href="${m.meeting_url}" target="_blank" class="btn btn-sm btn-outline">Unirse a la asesoría →</a>` : ''}
      `;
      container.appendChild(card);
    });

  } catch (err) {
    console.error("Error al cargar reuniones:", err);
  }
}

async function loadDeliverables() {
  const container = document.getElementById('deliverablesGrid');
  container.innerHTML = '';

  try {
    const res = await fetch(`/api/projects/${state.currentProjectId}/deliverables`);
    const data = await res.json();

    if (!data.success || !data.deliverables || data.deliverables.length === 0) {
      container.innerHTML = '<p class="muted">No hay entregables disponibles aún.</p>';
      return;
    }

    data.deliverables.forEach(d => {
      const card = document.createElement('div');
      card.className = `deliverable-card ${d.status === 'READY' || d.status === 'DELIVERED' ? 'ready' : ''}`;
      card.innerHTML = `
        <h4>${d.name}</h4>
        <p class="text-sm muted">Tipo: ${d.type}</p>
        <p class="text-sm">Estado: <strong>${d.status}</strong></p>
        <div style="margin-top: 1rem;">
          ${d.file_url 
            ? `<a href="${d.file_url}" target="_blank" class="btn btn-sm btn-primary">Descargar / Ver Archivo</a>` 
            : `<button class="btn btn-sm btn-outline" disabled>En elaboración</button>`}
        </div>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    console.error("Error al cargar entregables:", err);
  }
}

// FASE 3: PREPARAR VISOR 3D CONCEPTUAL
function init3DViewer() {
  const canvas = document.getElementById('canvas3D');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  render3DFrame(ctx, canvas.width, canvas.height);
}

function control3D(action) {
  const st = state.viewer3DState;
  if (action === 'rotate') st.angle = (st.angle + 15) % 360;
  if (action === 'zoomIn') st.zoom = Math.min(2.5, st.zoom + 0.2);
  if (action === 'zoomOut') st.zoom = Math.max(0.5, st.zoom - 0.2);
  if (action === 'pan') st.panX = (st.panX + 20) % 80;
  if (action === 'reset') { st.angle = 45; st.zoom = 1; st.panX = 0; st.panY = 0; }

  const canvas = document.getElementById('canvas3D');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    render3DFrame(ctx, canvas.width, canvas.height);
  }
}

function render3DFrame(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);

  // Fondo gradiente visor
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#0a0f1d');
  grad.addColorStop(1, '#182238');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(w / 2 + state.viewer3DState.panX, h / 2 + state.viewer3DState.panY);
  ctx.scale(state.viewer3DState.zoom, state.viewer3DState.zoom);

  const rad = (state.viewer3DState.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Rejilla de terreno
  ctx.strokeStyle = '#263554';
  ctx.lineWidth = 1;
  for (let i = -120; i <= 120; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i * cos, i * sin + 60);
    ctx.lineTo(i * cos - 60, i * sin + 120);
    ctx.stroke();
  }

  // Dibujar volumetría 3D conceptual de vivienda (2 Niveles)
  // Nivel 1
  ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(-70, -20, 140, 70);
  ctx.fill();
  ctx.stroke();

  // Nivel 2
  ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.strokeStyle = '#f59e0b';
  ctx.beginPath();
  ctx.rect(-50, -75, 100, 55);
  ctx.fill();
  ctx.stroke();

  // Texto overlay
  ctx.restore();
  ctx.fillStyle = '#9ca3af';
  ctx.font = '12px Outfit, sans-serif';
  ctx.fillText(`VISTA CONCEPTUAL INTERACTIVA · Ángulo: ${state.viewer3DState.angle}° | Zoom: ${state.viewer3DState.zoom.toFixed(1)}x`, 15, h - 15);
}

// Módulo YouTube & Consentimiento
async function loadYoutubeModule() {
  try {
    const res = await fetch(`/api/projects/${state.currentProjectId}/youtube`);
    const data = await res.json();

    if (data.success) {
      const consentRadios = document.getElementsByName('ytConsent');
      consentRadios.forEach(r => {
        r.checked = (r.value === 'true' && data.publication_consent) || (r.value === 'false' && !data.publication_consent);
      });

      const alertBox = document.getElementById('youtubeStatusAlert');
      const yt = data.youtube;
      if (yt && yt.youtube_status === 'PUBLISHED') {
        alertBox.innerHTML = `✅ <strong>PUBLICADO EN YOUTUBE:</strong> <a href="${yt.youtube_url}" target="_blank" style="color: #60a5fa;">${yt.youtube_url}</a>`;
      } else {
        alertBox.textContent = `Estado de Autorización: ${data.publication_consent ? 'AUTORIZADO PARA PUBLICACIÓN' : 'PRIVADO (NO AUTORIZADO)'}`;
      }

      const videoContainer = document.getElementById('videoContainer');
      if (data.video_url) {
        videoContainer.innerHTML = `<video controls width="100%"><source src="${data.video_url}" type="video/mp4">Tu navegador no soporta video.</video>`;
      }
    }
  } catch (err) {
    console.error("Error al cargar módulo de YouTube:", err);
  }
}

async function toggleConsent(consentBool) {
  try {
    const res = await fetch(`/api/projects/${state.currentProjectId}/publication-consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent: consentBool })
    });
    const data = await res.json();
    if (data.success) {
      loadYoutubeModule();
    }
  } catch (err) {
    console.error("Error al guardar consentimiento:", err);
  }
}

// Panel Administrativo
function openAdminPanel() {
  navTo('adminPanel');
  loadAdminProjects();
}

function setAdminFilter(filterCode, btn) {
  state.adminFilter = filterCode;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadAdminProjects();
}

async function loadAdminProjects() {
  const tbody = document.getElementById('adminProjectsTableBody');
  tbody.innerHTML = '<tr><td colspan="8" class="text-center">Cargando proyectos...</td></tr>';

  try {
    const res = await fetch(`/api/admin/projects?filter=${state.adminFilter}`);
    const data = await res.json();
    state.adminProjects = data.projects || [];

    if (state.adminProjects.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center muted">No se encontraron proyectos con este filtro.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    state.adminProjects.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${p.project_name}</strong><br><span class="muted">${p.client_name}</span></td>
        <td><span class="package-badge ${p.project_package === 'PREMIUM' ? 'premium-badge' : 'basic-badge'}">${p.project_package || 'SIN PAQUETE'}</span></td>
        <td>S/${p.package_price || 0}</td>
        <td><span class="badge-sm">${p.payment_status}</span></td>
        <td>${p.meetings_completed || 0} / ${p.meeting_count || 0}</td>
        <td>${p.video_url ? '🎬 SÍ' : '—'}</td>
        <td>${p.publication_consent ? '✅ SÍ' : '❌ NO'}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="openAdminManageModal('${p.id}')">Gestionar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error("Error al cargar proyectos admin:", err);
  }
}

function openAdminManageModal(projectId) {
  const project = state.adminProjects.find(p => p.id === projectId);
  if (!project) return;

  state.currentProjectId = projectId;
  document.getElementById('adminModalProjectTitle').textContent = `— ${project.project_name}`;

  // FASE 1: PROGRAMAR REUNIONES CON INPUT DATETIME-LOCAL
  const meetingsDiv = document.getElementById('adminMeetingsManageList');
  meetingsDiv.innerHTML = '';
  (project.meetings || []).forEach(m => {
    const box = document.createElement('div');
    box.className = 'summary-fact-item';

    const defaultVal = m.scheduled_at ? new Date(m.scheduled_at).toISOString().slice(0, 16) : '';

    box.innerHTML = `
      <strong>Asesoría #${m.meeting_number} (45 min):</strong> Status: ${m.status}<br>
      Fecha/Hora: <input type="datetime-local" value="${defaultVal}" id="mtgDate_${m.id}">
      Link: <input type="text" value="${m.meeting_url || ''}" id="mtgUrl_${m.id}" style="width: 220px;">
      <button class="btn btn-sm btn-primary" onclick="saveAdminMeeting('${project.id}', '${m.id}')">Guardar Programación</button>
    `;
    meetingsDiv.appendChild(box);
  });

  const delivDiv = document.getElementById('adminDeliverablesManageList');
  delivDiv.innerHTML = '';
  (project.deliverables || []).forEach(d => {
    const box = document.createElement('div');
    box.className = 'summary-fact-item';
    box.innerHTML = `
      <strong>${d.name} (${d.type}):</strong> 
      URL: <input type="text" placeholder="https://..." value="${d.file_url || ''}" id="dlvUrl_${d.id}" style="width: 240px;">
      <button class="btn btn-sm btn-success" onclick="saveAdminDeliverable('${project.id}', '${d.id}')">Publicar Entregable</button>
    `;
    delivDiv.appendChild(box);
  });

  const ytDiv = document.getElementById('adminYoutubePublishControl');
  if (project.project_package === 'PREMIUM') {
    const yt = project.youtube || {};
    ytDiv.innerHTML = `
      <p><strong>Consentimiento del Cliente:</strong> ${project.publication_consent ? '✅ SÍ AUTORIZADO' : '❌ NO AUTORIZADO'}</p>
      <p><strong>Video Carga:</strong> ${project.video_url ? '🎬 CORTOMETRAJE CARGADO' : '⚠️ FALTA VIDEO'}</p>
      <p><strong>Estado YouTube:</strong> ${yt.youtube_status || 'NOT_READY'}</p>
      <div style="margin-top: 1rem;">
        <button class="btn btn-primary" onclick="triggerYoutubePublish('${project.id}')">🚀 EJECUTAR PUBLICACIÓN EN YOUTUBE</button>
      </div>
    `;
  } else {
    ytDiv.innerHTML = '<p class="muted">Función no aplicable para Paquete BASIC.</p>';
  }

  document.getElementById('adminManageModal').classList.remove('hidden');
}

function closeAdminModal() {
  document.getElementById('adminManageModal').classList.add('hidden');
}

// FASE 1: GUARDAR REUNIÓN CON DATETIME-LOCAL Y VALIDACIÓN DE ZONA HORARIA
async function saveAdminMeeting(projectId, meetingId) {
  const dateInput = document.getElementById(`mtgDate_${meetingId}`).value;
  const url = document.getElementById(`mtgUrl_${meetingId}`).value;

  if (!dateInput) {
    alert("Por favor selecciona una fecha y hora válida.");
    return;
  }

  const isoDateTime = new Date(dateInput).toISOString();

  try {
    const res = await fetch(`/api/admin/projects/${projectId}/meetings/${meetingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduled_at: isoDateTime, meeting_url: url, status: 'SCHEDULED' })
    });
    const data = await res.json();
    if (data.success) {
      alert("Asesoría de 45 minutos programada correctamente y notificación enviada al cliente.");
      loadAdminProjects();
    }
  } catch (err) {
    console.error("Error al guardar reunión:", err);
  }
}

async function saveAdminDeliverable(projectId, deliverableId) {
  const fileUrl = document.getElementById(`dlvUrl_${deliverableId}`).value;
  try {
    const res = await fetch(`/api/admin/projects/${projectId}/deliverables/${deliverableId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_url: fileUrl, status: 'READY' })
    });
    const data = await res.json();
    if (data.success) {
      alert("Entregable publicado exitosamente.");
      loadAdminProjects();
    }
  } catch (err) {
    console.error("Error al guardar entregable:", err);
  }
}

async function triggerYoutubePublish(projectId) {
  try {
    const res = await fetch(`/api/projects/${projectId}/youtube/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await res.json();

    if (!data.success) {
      alert(`⛔ PUBLICACIÓN BLOQUEADA:\n${(data.reasons || [data.message]).join('\n')}`);
      return;
    }

    alert(`🎉 ¡VIDEO PUBLICADO EN YOUTUBE!\nURL: ${data.youtube_url}`);
    openAdminManageModal(projectId);
    loadAdminProjects();

  } catch (err) {
    console.error("Error al publicar en YouTube:", err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initConfig();

  document.getElementById('chatForm').addEventListener('submit', e => {
    e.preventDefault();
    const val = document.getElementById('chatInput').value.trim();
    if (val) sendChatMessage(val);
  });
});

/* =========================================================
   WHATSAPP MODAL & REVIEWS LOGIC
   ========================================================= */

function showWhatsAppModal() {
  const modal = document.getElementById('whatsappModal');
  if (modal) {
    modal.classList.add('active');
  }
}

function openLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.classList.add('active');
    document.getElementById('loginError').style.display = 'none';
  }
}

function closeLoginModal() {
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const phone = document.getElementById('loginPhone').value;
  const errorDiv = document.getElementById('loginError');
  errorDiv.style.display = 'none';

  try {
    const res = await fetch(`/api/projects/lookup?phone=${encodeURIComponent(phone)}`);
    const data = await res.json();
    if (res.ok && data.success) {
      state.currentProjectId = data.project.id;
      state.currentProject = data.project;
      closeLoginModal();
      
      // Si el proyecto ya fue pagado o seleccionado, mejor mandarlo al dashboard directamente
      // si tiene status de pago PENDING o nada, mandarlo a conversion
      if (state.currentProject.payment_status === 'PAID') {
        loadClientDashboard();
      } else {
        showConversionScreen(state.currentProject);
      }
    } else {
      errorDiv.innerText = data.error || "No se encontró ningún proyecto.";
      errorDiv.style.display = 'block';
    }
  } catch (err) {
    console.error("Error en login:", err);
    errorDiv.innerText = "Ocurrió un error al conectar con el servidor.";
    errorDiv.style.display = 'block';
  }
}

async function handleWhatsappSubmit(event) {
  event.preventDefault();
  const waName = document.getElementById('waName').value;
  const waPhone = document.getElementById('waPhone').value;

  try {
    // FASE 7: Actualizar el proyecto temporal con el contacto del lead
    const res = await fetch(`/api/projects/${state.currentProjectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: waName,
        client_phone: waPhone
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      state.currentProject = data;
    }
  } catch (err) {
    console.error("Error guardando contacto:", err);
  }

  // Cerrar modal y mostrar conversión
  document.getElementById('whatsappModal').classList.remove('active');
  showConversionScreen(state.currentProject);
}

const allReviews = [
  { name: "Carlos G.", text: "Me ahorraron miles en materiales innecesarios. Su distribución de la luz es increíble para un terreno de 120m2.", stars: 5, color: "c82021" },
  { name: "María P.", text: "Súper rápidos. En dos semanas ya tenía los planos listos para la municipalidad cumpliendo todo el RNE. ¡Recomendados!", stars: 5, color: "f5c518" },
  { name: "Luis F.", text: "La ficha gratuita por WhatsApp nos ayudó muchísimo a aterrizar nuestro presupuesto. Muy buena asesoría en Lima.", stars: 4, color: "c82021" },
  { name: "Ana R.", text: "Excelente trato y diseño pensando en nuestra familia de 5. Los planos en PDF son clarísimos.", stars: 5, color: "2563eb" },
  { name: "Jorge M.", text: "Pensé que construir en 90m2 iba a ser imposible, pero lograron 2 pisos súper iluminados.", stars: 5, color: "059669" },
  { name: "Elena V.", text: "Agradezco que me explicaran todo sin términos complicados. Súper accesibles.", stars: 5, color: "f5c518" },
  { name: "Ricardo T.", text: "Sus ideas para ventilación cruzada fueron un éxito en el calor de Piura. ¡Gracias!", stars: 5, color: "c82021" },
  { name: "Silvia L.", text: "Me encantó el seguimiento. Vale totalmente la pena el paquete Premium.", stars: 5, color: "2563eb" },
  { name: "Fernando C.", text: "Proceso súper ordenado desde el día 1. Cumplen con todo el RNE y te dan tranquilidad.", stars: 4, color: "c82021" },
  { name: "Rosa H.", text: "Tuvimos un par de cambios a mitad de camino y fueron muy flexibles.", stars: 5, color: "f5c518" },
  { name: "Miguel A.", text: "El análisis de Arqui IA al inicio me pareció muy innovador. Dio en el clavo con lo que queríamos.", stars: 5, color: "059669" },
  { name: "Carmen S.", text: "Nos ayudaron a integrar nuestra sala y comedor aprovechando al máximo la luz solar.", stars: 5, color: "c82021" },
  { name: "Hugo D.", text: "Planos detallados y muy profesionales. La municipalidad los aprobó rápido.", stars: 5, color: "2563eb" },
  { name: "Teresa Q.", text: "El arquitecto que nos tocó fue súper paciente con mis mil preguntas.", stars: 5, color: "f5c518" },
  { name: "José P.", text: "Un precio bastante justo considerando todo el entregable técnico que te dan.", stars: 4, color: "c82021" },
  { name: "Diana M.", text: "Diseños muy bonitos y funcionales. Mi casa quedó exactamente como la soñaba.", stars: 5, color: "059669" },
  { name: "Víctor Z.", text: "La visualización en 3D fue clave para que mi esposa y yo nos pusiéramos de acuerdo.", stars: 5, color: "c82021" },
  { name: "Laura N.", text: "El acompañamiento en obra fue fundamental. El maestro constructor entendió todo a la perfección.", stars: 5, color: "f5c518" },
  { name: "Pedro J.", text: "Recomendadísimo para quien quiere construir de forma segura y sin gastar una fortuna.", stars: 5, color: "2563eb" },
  { name: "Gabriela B.", text: "El mejor servicio de arquitectura online en Perú. Todo muy transparente.", stars: 5, color: "c82021" },
  { name: "Raúl C.", text: "Optimizaron mi presupuesto al máximo indicándome qué materiales locales convenían más.", stars: 5, color: "059669" },
  { name: "Natalia E.", text: "Muy amables y profesionales. El chat inicial ya te da mucha claridad.", stars: 4, color: "f5c518" },
  { name: "Oscar Y.", text: "La terraza que diseñaron quedó espectacular. Todo el mundo me pregunta quién hizo el plano.", stars: 5, color: "c82021" },
  { name: "Valeria W.", text: "Totalmente recomendable. Un servicio completo de principio a fin.", stars: 5, color: "2563eb" },
  { name: "Eduardo K.", text: "Hicieron que el sueño de la casa propia pareciera mucho menos complicado de lograr.", stars: 5, color: "f5c518" }
];

function loadMoreReviews() {
  const container = document.getElementById('reviewsContainer');
  const btn = document.getElementById('btnLoadReviews');
  
  if (container && btn) {
    // Mostrar del índice 3 en adelante
    for (let i = 3; i < allReviews.length; i++) {
      const r = allReviews[i];
      const starsHtml = r.stars === 5 ? '★★★★★' : '★★★★☆';
      const card = document.createElement('div');
      card.className = 'review-card';
      card.innerHTML = `
        <div class="review-header">
          <img src="https://ui-avatars.com/api/?name=${r.name.replace(' ', '+')}&background=${r.color}&color=fff" alt="Avatar" class="review-avatar">
          <div>
            <strong>${r.name}</strong>
            <div class="review-stars">${starsHtml}</div>
          </div>
        </div>
        <p class="review-text">"${r.text}"</p>
      `;
      container.appendChild(card);
    }
    btn.style.display = 'none'; // Ocultar botón después de cargar todas
  }
}
