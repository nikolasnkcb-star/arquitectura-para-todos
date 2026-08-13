/**
 * SERVIDOR NATIVO NODE.JS (ZERO DEPENDENCIES)
 * Arquitectura Para Todos — Arqui IA
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const { CONFIG, getActiveConfig, getUpgradePrice } = require('../config/packages.config');
const db = require('./db');
const emailService = require('./services/email.service');
const { GoogleGenerativeAI } = require('@google/generative-ai');

try { require('dotenv').config(); } catch (e) {}
let mpClient = null;
let mpPreference = null;
let mpPayment = null;
if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
  try {
    const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
    mpClient = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN, options: { timeout: 5000 } });
    mpPreference = new Preference(mpClient);
    mpPayment = new Payment(mpClient);
    console.log("[MercadoPago] Integración habilitada (SDK v2).");
  } catch (err) {
    console.warn("[MercadoPago] Módulo 'mercadopago' no instalado. Operando en modo fallback/simulación.");
  }
}

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '../frontend');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // OPTIONS Pre-flight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // --- RUTAS API ---

  // 1. CONFIGURACIÓN
  if (pathname === '/api/config' && method === 'GET') {
    return sendJson(res, 200, getActiveConfig());
  }

  // 2. CHAT ARQUI IA (ETAPA GRATUITA) - GEMINI AI
  if (pathname === '/api/aria/chat' && method === 'POST') {
    const body = await parseBody(req);
    const { history = [], projectData = {} } = body;

    // Inicializar Gemini
    const apiKey = process.env.GEMINI_API_KEY || 'MISSING_API_KEY';

    const systemPrompt = `
Eres "Arqui IA", un arquitecto carismático, consultor comercial y especialista en el Reglamento Nacional de Edificaciones (RNE) del Perú. Trabajas para "Arquitectura Para Todos".
Tu objetivo es interactuar de manera fluida y amigable con el usuario para recopilar información técnica de su futuro proyecto (hasta 200 m²).

DEBES recopilar obligatoriamente estos 8 datos:
1. location (Ubicación del terreno)
2. dimensions (Medidas de frente y fondo)
3. slope (Topografía: plano o pendiente)
4. floors (Cantidad de niveles deseados)
5. people (Quiénes conforman la familia o habitantes)
6. rooms (Ambientes indispensables)
7. budget (Presupuesto estimado, si no sabe puedes sugerir que lo estimarás)
8. style (Estilo arquitectónico preferido)

REGLAS DE INTERACCIÓN:
- Sé conversacional, no lances todas las preguntas de golpe. Haz 1 o 2 preguntas a la vez.
- Adapta tus respuestas según lo que el usuario diga (ej. si mencionan perros, diles que considerarás un espacio para mascotas).
- Trata de vender sutilmente los beneficios del "Paquete Básico" (S/ 500) y el "Paquete Premium" (S/ 900).
- La conversación debe sentirse natural.

INSTRUCCIONES DE SALIDA (ESTRICTAS):
Debes responder SIEMPRE con un objeto JSON válido con la siguiente estructura:
{
  "reply": "Tu mensaje para el usuario (usa emojis, sé amigable).",
  "extractedData": {
    "location": "...",
    "dimensions": "...",
    "slope": "...",
    "floors": "...",
    "people": "...",
    "rooms": "...",
    "budget": "...",
    "style": "..."
  },
  "progress": 25, // Un número del 0 al 100 estimando cuánto de los 8 datos tienes completos.
  "finished": false // Pon true SOLO cuando tengas los 8 datos completamente definidos con confianza.
}

Datos actuales recopilados: ${JSON.stringify(projectData)}
Historial de conversación: ${JSON.stringify(history.slice(-6))} // últimos mensajes
`;

    try {
      if (apiKey === 'MISSING_API_KEY') {
         return sendJson(res, 200, {
           reply: "⚠️ No se ha configurado la API Key de Gemini. Por favor, configura process.env.GEMINI_API_KEY.",
           finished: false,
           progress: 0
         });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Error de Gemini API:", data);
        return sendJson(res, 500, { success: false, error: data.error?.message || "Error en la respuesta de la IA" });
      }

      let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      // Limpiar bloques de markdown si los hubiera
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const aiResponse = JSON.parse(responseText);

      // Si terminó, crear el proyecto
      if (aiResponse.finished) {
        const pd = aiResponse.extractedData || {};
        
        const width = parseFloat((pd.dimensions || '').match(/\d+(\.\d+)?/g)?.[0]) || 8;
        const length = parseFloat((pd.dimensions || '').match(/\d+(\.\d+)?/g)?.[1]) || 20;
        const lotArea = width * length;
        const estBuilt = Math.round(lotArea * 1.6);
        const estCostLow = Math.round(estBuilt * 1100);
        const estCostHigh = Math.round(estBuilt * 1400);

        const summaryData = {
          lot_width: width,
          lot_length: length,
          lot_area: lotArea,
          estimated_built_area: `${estBuilt} m²`,
          estimated_budget: `S/${estCostLow.toLocaleString()} - S/${estCostHigh.toLocaleString()}`,
          architectural_style: pd.style || "Contemporáneo",
          program_summary: pd.rooms || "Ambientes básicos",
          is_complex: lotArea > 180 || (pd.floors || '').includes('3')
        };

        const project = db.createProject({
          client_name: 'Cliente Arqui IA',
          client_email: 'cliente@arqui.pe',
          project_name: `Casa ${pd.location || 'Unifamiliar'}`,
          maps_url: pd.location || '',
          lot_width: width,
          lot_length: length,
          slope: pd.slope || 'Plano',
          levels_desired: pd.floors || '2 pisos',
          family_needs: pd.people || 'Familia unifamiliar',
          required_rooms: pd.rooms || '3 dormitorios, sala, comedor, cocina',
          budget_approx: pd.budget || `S/${estCostLow.toLocaleString()}`,
          architectural_program: summaryData.program_summary,
          conceptual_proposal: summaryData.architectural_style,
          reference_budget: summaryData.estimated_budget,
          ai_recommendation: summaryData.is_complex ? 'PREMIUM' : 'BASIC'
        });

        return sendJson(res, 200, {
          success: true,
          finished: true,
          project,
          summary: summaryData,
          reply: aiResponse.reply || "¡Excelente! He analizado toda tu información."
        });
      }

      return sendJson(res, 200, {
        success: true,
        finished: false,
        reply: aiResponse.reply,
        extractedData: aiResponse.extractedData,
        progress: aiResponse.progress
      });

    } catch (err) {
      console.error("[Gemini API Error]", err);
      return sendJson(res, 500, { success: false, error: "Error en la IA: " + (err.message || err.toString()) });
    }
  }

  // 3. RECOMENDADOR ARQUI IA
  if (pathname === '/api/aria/recommend' && method === 'POST') {
    const body = await parseBody(req);
    const width = parseFloat(body.lot_width) || 8;
    const length = parseFloat(body.lot_length) || 20;
    const area = width * length;
    const levelsStr = String(body.levels_desired || '').toLowerCase();
    const roomsStr = String(body.required_rooms || '').toLowerCase();

    const isComplex = area > 180 || levelsStr.includes('3') || levelsStr.includes('terraza') || roomsStr.includes('4');

    const recommendation = isComplex ? {
      recommended_package: 'PREMIUM',
      badge: CONFIG.PREMIUM_BADGE,
      reason: 'Tu proyecto tiene una mayor complejidad, mayor área o varias decisiones de diseño. Te recomendaría el Paquete Premium (S/900) para disponer de más tiempo de revisión (4 asesorías) y desarrollar mejor la propuesta 3D y video recorrido.'
    } : {
      recommended_package: 'BASIC',
      badge: null,
      reason: 'Por las características de tu vivienda, considero que el Paquete Básico (S/500) puede ser suficiente para desarrollar la distribución, los planos PDF acotados y una propuesta de fachada.'
    };

    return sendJson(res, 200, {
      success: true,
      recommendation,
      note: "Esta recomendación es puramente informativa. Puedes seleccionar libremente el paquete BASIC o PREMIUM."
    });
  }

  // 3.5 BUSCAR PROYECTO POR NÚMERO (LOGIN)
  if (pathname === '/api/projects/lookup' && method === 'GET') {
    const phone = url.parse(req.url, true).query.phone;
    if (!phone) {
      return sendJson(res, 400, { success: false, error: "El número de teléfono es requerido." });
    }
    const project = db.getProjectByPhone(phone);
    if (!project) {
      return sendJson(res, 404, { success: false, error: "No se encontró ningún proyecto asociado a este número." });
    }
    return sendJson(res, 200, { success: true, project });
  }

  // 4. CREAR PROYECTO
  if (pathname === '/api/projects/create' && method === 'POST') {
    const body = await parseBody(req);
    const project = db.createProject(body);
    return sendJson(res, 200, { success: true, project });
  }

  // 4.1 ACTUALIZAR PROYECTO (WhatsApp Contact)
  if (pathname.match(/^\/api\/projects\/([^\/]+)$/) && method === 'PUT') {
    const match = pathname.match(/^\/api\/projects\/([^\/]+)$/);
    const projectId = match[1];
    const body = await parseBody(req);
    try {
      const project = db.updateProject(projectId, body);
      return sendJson(res, 200, project);
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // 5. SELECCIÓN DE PAQUETE
  if (pathname === '/api/checkout/select-package' && method === 'POST') {
    const body = await parseBody(req);
    try {
      const result = db.selectPackage(body.projectId, body.packageCode);
      return sendJson(res, 200, {
        success: true,
        projectId: result.project.id,
        packageCode: result.project.project_package,
        packagePrice: result.project.package_price,
        meetingCount: result.project.meeting_count,
        packageDetails: result.package
      });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // 6. CHECKOUT PAGO Y ACTIVACIÓN
  if (pathname === '/api/checkout/pay' && method === 'POST') {
    const body = await parseBody(req);
    const project = db.getProjectById(body.projectId);
    if (!project) return sendJson(res, 404, { success: false, error: 'Proyecto no encontrado' });

    // Fallback simulación o forzar fallo para tests
    if (!mpPreference || body.simulateStatus === 'FAILED') {
      const targetStatus = body.simulateStatus || 'PAID';
      const activation = db.confirmPaymentAndActivate(body.projectId, targetStatus);
      if (!activation.success) {
        return sendJson(res, 400, { success: false, paymentStatus: targetStatus, message: "El pago no pudo ser procesado o fue rechazado. El proyecto no ha sido activado." });
      }
      emailService.sendPaymentConfirmedEmail(activation.project);
      emailService.sendProjectActivatedEmail(activation.project);
      return sendJson(res, 200, { success: true, message: "Pago validado y proyecto activado correctamente.", project: activation.project, meetingsCreated: activation.meetings.length, deliverablesCreated: activation.deliverables.length });
    }

    // Flujo real MercadoPago
    try {
      const baseUrl = process.env.APP_URL || (req.headers.host ? `https://${req.headers.host}` : 'http://localhost:3000');
      const webhookUrl = process.env.WEBHOOK_BASE_URL ? `${process.env.WEBHOOK_BASE_URL}/api/webhooks/payments` : (req.headers.host ? `https://${req.headers.host}/api/webhooks/payments` : undefined);

      const prefBody = {
        items: [{
          id: project.project_package,
          title: `Paquete Arquitectónico ${project.project_package} - Arqui IA`,
          quantity: 1,
          unit_price: Number(project.package_price),
          currency_id: 'PEN'
        }],
        metadata: { project_id: project.id, type: 'NEW_PACKAGE' },
        back_urls: {
          success: baseUrl,
          failure: baseUrl,
          pending: baseUrl
        },
        auto_return: 'approved',
        notification_url: webhookUrl
      };
      console.log("[MercadoPago] Creando preferencia de pago:", prefBody);
      const preference = await mpPreference.create({ body: prefBody });
      console.log("[MercadoPago] Preferencia creada exitosamente. ID:", preference.id);
      return sendJson(res, 200, { success: true, init_point: preference.init_point || preference.sandbox_init_point });
    } catch (err) {
      console.error("[MercadoPago Error]", err);
      return sendJson(res, 500, { success: false, error: 'Error al generar preferencia de pago.' });
    }
  }

  // 6b. INFORMACIÓN DE UPGRADE BASIC -> PREMIUM
  if (pathname.match(/^\/api\/projects\/([^\/]+)\/upgrade-info$/) && method === 'GET') {
    const match = pathname.match(/^\/api\/projects\/([^\/]+)\/upgrade-info$/);
    const project = db.getProjectById(match[1]);
    if (!project) return sendJson(res, 404, { success: false, error: 'Proyecto no encontrado' });

    const originalPaid = project.package_price_original || (project.project_package === 'BASIC' ? project.package_price : CONFIG.BASIC_PRICE);
    const upgradeDifference = CONFIG.PREMIUM_PRICE - originalPaid;

    return sendJson(res, 200, {
      success: true,
      projectId: project.id,
      currentPackage: project.project_package,
      originalPaidPrice: originalPaid,
      premiumPrice: CONFIG.PREMIUM_PRICE,
      upgradePrice: Math.max(0, upgradeDifference),
      currency: CONFIG.CURRENCY
    });
  }

  // 6c. CHECKOUT UPGRADE BASIC -> PREMIUM
  if (pathname === '/api/checkout/upgrade-pay' && method === 'POST') {
    const body = await parseBody(req);
    const project = db.getProjectById(body.projectId);
    if (!project) return sendJson(res, 404, { success: false, error: 'Proyecto no encontrado' });
    if (project.project_package === 'PREMIUM') {
      return sendJson(res, 400, { success: false, error: 'El proyecto ya cuenta con Paquete PREMIUM.' });
    }

    // Fallback simulación o forzar fallo para tests
    if (!mpPreference || body.simulateStatus === 'FAILED') {
      if (body.simulateStatus === 'FAILED') return sendJson(res, 400, { success: false, paymentStatus: 'FAILED', message: 'El pago de actualización a Premium fue rechazado. El paquete permanece en BASIC.' });
      try {
        const result = db.executePackageUpgrade(body.projectId);
        const paymentHistory = db.getProjectPaymentHistory(body.projectId);
        emailService.sendUpgradeConfirmedEmail(result.project, result.upgradeRecord);
        return sendJson(res, 200, { success: true, message: '¡Actualización a PREMIUM completada con éxito!', project: result.project, upgradeDetails: result.upgradeRecord, paymentHistory, meetings: result.meetings, deliverables: result.deliverables });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    }

    // Flujo real MercadoPago
    try {
      const originalPaid = project.package_price_original || (project.project_package === 'BASIC' ? project.package_price : CONFIG.BASIC_PRICE);
      const upgradePrice = Math.max(0, CONFIG.PREMIUM_PRICE - originalPaid);
      
      const baseUrl = process.env.APP_URL || (req.headers.host ? `https://${req.headers.host}` : 'http://localhost:3000');
      const webhookUrl = process.env.WEBHOOK_BASE_URL ? `${process.env.WEBHOOK_BASE_URL}/api/webhooks/payments` : (req.headers.host ? `https://${req.headers.host}/api/webhooks/payments` : undefined);

      const prefBody = {
        items: [{
          id: 'UPGRADE_PREMIUM',
          title: 'Upgrade a Paquete PREMIUM - Arqui IA',
          quantity: 1,
          unit_price: Number(upgradePrice),
          currency_id: 'PEN'
        }],
        metadata: { project_id: project.id, type: 'UPGRADE' },
        back_urls: {
          success: baseUrl,
          failure: baseUrl,
          pending: baseUrl
        },
        auto_return: 'approved',
        notification_url: webhookUrl
      };
      
      console.log("[MercadoPago Upgrade] Creando preferencia de pago:", prefBody);
      const preference = await mpPreference.create({ body: prefBody });
      console.log("[MercadoPago Upgrade] Preferencia creada exitosamente. ID:", preference.id);
      return sendJson(res, 200, { success: true, init_point: preference.init_point || preference.sandbox_init_point });
    } catch (err) {
      console.error("[MercadoPago Error Upgrade]", err);
      return sendJson(res, 500, { success: false, error: 'Error al generar preferencia de upgrade.' });
    }
  }

  // 6d. WEBHOOK MERCADOPAGO (PAGOS ASÍNCRONOS)
  if (pathname === '/api/webhooks/payments' && method === 'POST') {
    if (!mpPayment) return sendJson(res, 400, { success: false, error: 'Webhook no configurado localmente.' });
    
    // En Express se extraería de query o body. MercadoPago envía type=payment y data.id en body o query.
    const query = parsedUrl.query;
    const body = await parseBody(req);
    
    const paymentId = query['data.id'] || (body.data && body.data.id);
    const topic = query.type || body.type;

    if (topic === 'payment' && paymentId) {
      try {
        const paymentInfo = await mpPayment.get({ id: paymentId });
        if (paymentInfo.status === 'approved') {
          const projectId = paymentInfo.metadata?.project_id;
          const payType = paymentInfo.metadata?.type;
          
          if (projectId) {
            const project = db.getProjectById(projectId);
            if (project) {
              if (payType === 'NEW_PACKAGE' && project.payment_status !== 'PAID') {
                const activation = db.confirmPaymentAndActivate(projectId, 'PAID');
                if (activation.success) {
                  emailService.sendPaymentConfirmedEmail(activation.project);
                  emailService.sendProjectActivatedEmail(activation.project);
                }
              } else if (payType === 'UPGRADE' && project.project_package !== 'PREMIUM') {
                const result = db.executePackageUpgrade(projectId);
                emailService.sendUpgradeConfirmedEmail(result.project, result.upgradeRecord);
              }
            }
          }
        }
      } catch (err) {
        console.error("[Webhook Error] Error procesando pago:", err.message);
        return sendJson(res, 500, { success: false });
      }
    }
    
    // MercadoPago requiere que siempre se retorne 200/201
    return sendJson(res, 200, { success: true });
  }

  // 6e. DISPONIBILIDAD (Calendario)
  if (pathname === '/api/admin/availability' && method === 'GET') {
    const query = parsedUrl.query;
    const dateStr = query.date || new Date().toISOString().split('T')[0];
    const availability = db.getAvailability(dateStr);
    return sendJson(res, 200, { success: true, date: dateStr, availability });
  }

  // 7. ENTREGABLES PROYECTO (lista autorizada)
  if (pathname.match(/^\/api\/projects\/([^\/]+)\/deliverables$/) && method === 'GET') {
    const match = pathname.match(/^\/api\/projects\/([^\/]+)\/deliverables$/);
    const projectId = match[1];
    const project = db.getProjectById(projectId);
    if (!project) return sendJson(res, 404, { success: false, error: 'Proyecto no encontrado' });
    const deliverables = db.getProjectDeliverables(projectId, project.project_package);
    return sendJson(res, 200, { success: true, package: project.project_package, deliverables });
  }

  // 7b. ACCESO A ENTREGABLE ESPECIFICO (con verificacion de permisos backend)
  if (pathname.match(/^\/api\/projects\/([^\/]+)\/deliverables\/([^\/]+)\/access$/) && method === 'GET') {
    const match = pathname.match(/^\/api\/projects\/([^\/]+)\/deliverables\/([^\/]+)\/access$/);
    const [, projectId, type] = match;
    const project = db.getProjectById(projectId);
    if (!project) return sendJson(res, 404, { success: false, error: 'Proyecto no encontrado' });
    const forbiddenForBasic = ['3D_MODEL', 'EXTRA_3D_VIEWS', 'WALKTHROUGH_VIDEO'];
    if (project.project_package === 'BASIC' && forbiddenForBasic.includes(type.toUpperCase())) {
      return sendJson(res, 403, {
        success: false,
        code: 'ACCESS_DENIED',
        error: 'ACCESO DENEGADO. Este entregable pertenece exclusivamente al Paquete PREMIUM.'
      });
    }
    const deliverables = db.getProjectDeliverables(projectId, project.project_package);
    const target = deliverables.find(d => d.type.toUpperCase() === type.toUpperCase());
    if (!target) return sendJson(res, 404, { success: false, error: 'Entregable no encontrado en este proyecto' });
    return sendJson(res, 200, { success: true, deliverable: target, accessGranted: true });
  }

  // 7c. REUNIONES DEL PROYECTO (FASE 4 - ruta dedicada para el cliente)
  if (pathname.match(/^\/api\/projects\/([^\/]+)\/meetings$/) && method === 'GET') {
    const match = pathname.match(/^\/api\/projects\/([^\/]+)\/meetings$/);
    const projectId = match[1];
    const project = db.getProjectById(projectId);
    if (!project) return sendJson(res, 404, { success: false, error: 'Proyecto no encontrado' });
    const meetings = db.getProjectMeetings(projectId);
    return sendJson(res, 200, {
      success: true,
      projectId,
      packageCode: project.project_package,
      meetingCount: project.meeting_count,
      meetings
    });
  }

  // 8. YOUTUBE METADATA
  if (pathname.match(/^\/api\/projects\/([^\/]+)\/youtube$/) && method === 'GET') {
    const match = pathname.match(/^\/api\/projects\/([^\/]+)\/youtube$/);
    const projectId = match[1];
    const project = db.getProjectById(projectId);

    if (!project) return sendJson(res, 404, { success: false, error: "Proyecto no encontrado" });
    if (project.project_package !== 'PREMIUM') {
      return sendJson(res, 403, { success: false, code: 'PREMIUM_ONLY', error: 'La función de video y YouTube está disponible únicamente en el Paquete PREMIUM.' });
    }

    const yt = db.getYoutubeMetadata(projectId);
    return sendJson(res, 200, { success: true, publication_consent: project.publication_consent, video_url: project.video_url, youtube: yt });
  }

  // 9. PUBLICACIÓN CONSENTIMIENTO
  if (pathname.match(/^\/api\/projects\/([^\/]+)\/publication-consent$/) && method === 'POST') {
    const match = pathname.match(/^\/api\/projects\/([^\/]+)\/publication-consent$/);
    const projectId = match[1];
    const body = await parseBody(req);
    const result = db.updatePublicationConsent(projectId, Boolean(body.consent));
    return sendJson(res, 200, { success: true, publication_consent: result.project.publication_consent });
  }

  // 10. YOUTUBE PUBLICACIÓN
  if (pathname.match(/^\/api\/projects\/([^\/]+)\/youtube\/publish$/) && method === 'POST') {
    const match = pathname.match(/^\/api\/projects\/([^\/]+)\/youtube\/publish$/);
    const projectId = match[1];
    const project = db.getProjectById(projectId);

    if (!project) return sendJson(res, 404, { success: false, error: "Proyecto no encontrado" });

    const errors = [];
    if (!project.publication_consent) errors.push("Falta la autorización expresa del cliente (publication_consent = true).");
    if (project.payment_status !== 'PAID') errors.push("El estado del pago no es PAID.");
    if (project.project_package !== 'PREMIUM') errors.push("El proyecto no cuenta con Paquete PREMIUM.");
    if (!project.video_url) errors.push("No se ha cargado ningún archivo de video (video_url es nulo).");

    if (errors.length > 0) {
      return sendJson(res, 403, {
        success: false,
        code: 'PUBLICATION_BLOCKED',
        message: 'PUBLICACIÓN BLOQUEADA por no cumplir las reglas de privacidad y paquete.',
        reasons: errors
      });
    }

    const clientFirstName = (project.client_name || 'Unifamiliar').split(' ')[0];
    const autoTitle = `Casa ${clientFirstName} | Diseño de vivienda con Arqui IA`;
    const autoDescription = `PROYECTO ARQUITECTÓNICO DESARROLLADO CON ARQUI IA\nEstilo: ${project.conceptual_proposal || 'Contemporáneo'}\nTerreno: ${project.lot_width}m x ${project.lot_length}m (${project.lot_width * project.lot_length} m²)`;

    const youtubeVideoId = `yt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const youtubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;

    const updatedYt = db.updateYoutubeMetadata(projectId, {
      youtube_video_id: youtubeVideoId,
      youtube_url: youtubeUrl,
      youtube_status: 'PUBLISHED',
      youtube_title: autoTitle,
      youtube_description: autoDescription,
      youtube_visibility: 'PUBLIC',
      published_at: new Date().toISOString()
    });

    return sendJson(res, 200, {
      success: true,
      message: "Video publicado exitosamente en el canal de YouTube.",
      youtube_video_id: youtubeVideoId,
      youtube_url: youtubeUrl,
      youtube_status: 'PUBLISHED',
      metadata: updatedYt
    });
  }

  // 11. ADMIN PROYECTOS
  if (pathname === '/api/admin/projects' && method === 'GET') {
    const filter = parsedUrl.query.filter || 'ALL';
    let projects = db.getAllProjects();

    switch (filter.toUpperCase()) {
      case 'BASIC': projects = projects.filter(p => p.project_package === 'BASIC'); break;
      case 'PREMIUM': projects = projects.filter(p => p.project_package === 'PREMIUM'); break;
      case 'PENDING_PAYMENT': projects = projects.filter(p => p.payment_status !== 'PAID'); break;
      case 'PAID': projects = projects.filter(p => p.payment_status === 'PAID'); break;
      case 'ACTIVE': projects = projects.filter(p => p.project_status === 'ACTIVE'); break;
      case 'COMPLETED': projects = projects.filter(p => p.project_status === 'COMPLETED'); break;
      case 'WITH_VIDEO': projects = projects.filter(p => Boolean(p.video_url)); break;
      case 'WITH_YOUTUBE_CONSENT': projects = projects.filter(p => p.publication_consent === true); break;
      case 'WITHOUT_YOUTUBE_CONSENT': projects = projects.filter(p => p.publication_consent === false); break;
    }

    const enriched = projects.map(p => ({
      ...p,
      meetings: db.getProjectMeetings(p.id),
      deliverables: db.getProjectDeliverables(p.id, p.project_package),
      youtube: db.getYoutubeMetadata(p.id)
    }));

    return sendJson(res, 200, { success: true, count: enriched.length, filter, projects: enriched });
  }

  // 12. ADMIN EDITAR REUNIÓN (con validación de fecha)
  if (pathname.match(/^\/api\/admin\/projects\/([^\/]+)\/meetings\/([^\/]+)$/) && method === 'PUT') {
    const match = pathname.match(/^\/api\/admin\/projects\/([^\/]+)\/meetings\/([^\/]+)$/);
    const meetingId = match[2];
    const body = await parseBody(req);

    // FASE 6: Validar fecha en backend (no confiar solo en frontend)
    if (body.scheduled_at) {
      const dateValidation = db.validateMeetingSchedule(body.scheduled_at);
      if (!dateValidation.valid) {
        return sendJson(res, 400, { success: false, error: dateValidation.error });
      }
    }

    try {
      const mtg = db.updateMeeting(meetingId, {
        scheduled_at: body.scheduled_at,
        meeting_url: body.meeting_url,
        status: body.status || 'SCHEDULED',
        notes: body.notes
      });
      if (mtg && body.status === 'SCHEDULED') {
        const proj = db.getProjectById(match[1]);
        if (proj) emailService.sendMeetingScheduledEmail(proj, mtg);
      }
      return sendJson(res, 200, { success: true, meeting: mtg });
    } catch (err) {
      return sendJson(res, 400, { success: false, error: err.message });
    }
  }

  // 13. ADMIN PUBLICAR ENTREGABLE
  if (pathname.match(/^\/api\/admin\/projects\/([^\/]+)\/deliverables\/([^\/]+)$/) && method === 'PUT') {
    const match = pathname.match(/^\/api\/admin\/projects\/([^\/]+)\/deliverables\/([^\/]+)$/);
    const deliverableId = match[2];
    const body = await parseBody(req);
    const dlv = db.updateDeliverable(deliverableId, {
      file_url: body.file_url,
      preview_url: body.preview_url,
      status: body.status || 'READY',
      notes: body.notes
    });
    if (dlv) {
      const proj = db.getProjectById(match[1]);
      if (proj && (body.status === 'READY' || body.status === 'DELIVERED')) {
        emailService.sendDeliverableReadyEmail(proj, dlv);
      }
    }
    return sendJson(res, 200, { success: true, deliverable: dlv });
  }

  // 14. ADMIN CAMBIAR ESTADO DEL PROYECTO
  if (pathname.match(/^\/api\/admin\/projects\/([^\/]+)\/status$/) && method === 'PUT') {
    const match = pathname.match(/^\/api\/admin\/projects\/([^\/]+)\/status$/);
    const body = await parseBody(req);
    const project = db.updateProject(match[1], {
      project_status: body.project_status,
      project_progress: body.project_progress
    });
    if (!project) return sendJson(res, 404, { success: false, error: 'Proyecto no encontrado' });
    if (body.project_status === 'COMPLETED') emailService.sendProjectCompletedEmail(project);
    return sendJson(res, 200, { success: true, project });
  }

  // --- SERVIR ARCHIVOS ESTÁTICOS DE FRONTEND ---
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Error interno del servidor');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Arquitectura Para Todos — Arqui IA (Servidor Nativo)`);
  console.log(`  Servidor activo en: http://localhost:${PORT}`);
  console.log(`  Modelo Comercial: BASIC (S/500) y PREMIUM (S/900)`);
  console.log(`=======================================================`);
});
