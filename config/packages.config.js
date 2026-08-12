/**
 * CONFIGURACIÓN CENTRAL DE PAQUETES COMERCIALES (FASE 1-4)
 * Arquitectura Para Todos — Arqui IA
 */

const CONFIG = {
  // Precios y Moneda
  CURRENCY: 'S/',
  BASIC_PRICE: 250,
  PREMIUM_PRICE: 450,

  // Asesorías / Reuniones
  BASIC_MEETINGS: 2,
  PREMIUM_MEETINGS: 4,
  MEETING_DURATION: 45, // minutos

  // Habilitación de características por paquete
  BASIC_HAS_3D_MODEL: false,
  PREMIUM_HAS_3D_MODEL: true,

  BASIC_HAS_VIDEO: false,
  PREMIUM_HAS_VIDEO: true,

  BASIC_HAS_EXTRA_VIEWS: false,
  PREMIUM_HAS_EXTRA_VIEWS: true,

  PREMIUM_YOUTUBE_ENABLED: true,

  // Copy Comercial
  HERO: {
    TITLE: "DE UNA IDEA A UNA CASA.",
    SUBTITLE: "Arqui IA te ayuda a descubrir qué casa podrías construir. Nosotros te ayudamos a desarrollarla.",
    CTA_FREE: "EMPIEZA GRATIS",
    CTA_DEVELOP: "DESARROLLA TU CASA DESDE S/500"
  },

  PREMIUM_BADGE: "RECOMENDADO",

  DISCLAIMERS: [
    "Los entregables corresponden al alcance contratado y constituyen una propuesta arquitectónica desarrollada.",
    "Para ejecutar una obra deberán realizarse los estudios, especialidades, verificaciones normativas, estructurales, instalaciones, licencias y demás documentos que correspondan según la normativa y las condiciones del proyecto."
  ],

  // Definición de Entregables por Paquete
  DELIVERABLES: {
    BASIC: [
      { code: "PROGRAM", name: "Programa Arquitectónico", type: "document" },
      { code: "FLOOR_PLAN", name: "Planta Arquitectónica", type: "plan" },
      { code: "PDF_PLAN", name: "Planos PDF Acotados", type: "pdf" },
      { code: "FACADE_3D", name: "Vista 3D Conceptual de Fachada", type: "image" },
      { code: "PROJECT_DOCUMENT", name: "Documento Integral del Proyecto", type: "pdf" }
    ],
    PREMIUM: [
      { code: "PROGRAM", name: "Programa Arquitectónico", type: "document" },
      { code: "FLOOR_PLAN", name: "Plantas Arquitectónicas", type: "plan" },
      { code: "PDF_PLAN", name: "Planos PDF Acotados", type: "pdf" },
      { code: "FACADE_3D", name: "Vista 3D Principal de Fachada", type: "image" },
      { code: "EXTRA_3D_VIEWS", name: "Vistas 3D Adicionales", type: "gallery" },
      { code: "3D_MODEL", name: "Modelo 3D Conceptual", type: "model3d" },
      { code: "PROJECT_DOCUMENT", name: "Documento Integral del Proyecto", type: "pdf" },
      { code: "WALKTHROUGH_VIDEO", name: "Video Recorrido de la Propuesta", type: "video" }
    ]
  },

  SUPPORTED_VIDEO_FORMATS: ["video/mp4", "video/quicktime", "video/webm", ".mp4", ".mov", ".webm"]
};

/**
 * Cálculo Dinámico del Precio de Upgrade
 * FASE 2: upgrade_price = PREMIUM_PRICE - BASIC_PRICE (NUNCA hardcodeado)
 */
function getUpgradePrice() {
  return CONFIG.PREMIUM_PRICE - CONFIG.BASIC_PRICE;
}

function getActiveConfig() {
  return {
    currency: CONFIG.CURRENCY,
    basicPrice: CONFIG.BASIC_PRICE,
    premiumPrice: CONFIG.PREMIUM_PRICE,
    upgradePrice: getUpgradePrice(),
    basicMeetings: CONFIG.BASIC_MEETINGS,
    premiumMeetings: CONFIG.PREMIUM_MEETINGS,
    meetingDuration: CONFIG.MEETING_DURATION,
    basicHas3dModel: CONFIG.BASIC_HAS_3D_MODEL,
    premiumHas3dModel: CONFIG.PREMIUM_HAS_3D_MODEL,
    basicHasVideo: CONFIG.BASIC_HAS_VIDEO,
    premiumHasVideo: CONFIG.PREMIUM_HAS_VIDEO,
    basicHasExtraViews: CONFIG.BASIC_HAS_EXTRA_VIEWS,
    premiumHasExtraViews: CONFIG.PREMIUM_HAS_EXTRA_VIEWS,
    premiumYoutubeEnabled: CONFIG.PREMIUM_YOUTUBE_ENABLED,
    hero: CONFIG.HERO,
    premiumBadge: CONFIG.PREMIUM_BADGE,
    disclaimers: CONFIG.DISCLAIMERS,
    deliverables: CONFIG.DELIVERABLES
  };
}

module.exports = {
  CONFIG,
  getUpgradePrice,
  getActiveConfig
};
