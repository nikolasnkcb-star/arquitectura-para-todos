/**
 * SERVICIO DE NOTIFICACIONES Y CORREOS AUTOMÁTICOS
 * Arquitectura Para Todos — Arqui IA
 * 
 * Cumple con la especificación de la Sección 31:
 * - Sin ninguna referencia al antiguo paquete comercial.
 * - Información clara de paquetes BASIC (S/500) o PREMIUM (S/900).
 */

try { require('dotenv').config(); } catch (e) {}
const { CONFIG } = require('../../config/packages.config');

let resend = null;
if (process.env.RESEND_API_KEY) {
  try {
    const { Resend } = require('resend');
    resend = new Resend(process.env.RESEND_API_KEY);
  } catch (err) {
    console.warn("Módulo 'resend' no está instalado. Ejecuta: npm install resend");
  }
}

const sentEmailsLog = [];

async function deliverEmail(emailParams, logType) {
  sentEmailsLog.push({ type: logType, date: new Date().toISOString(), email: emailParams });
  
  if (resend) {
    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Arquitectura Para Todos <onboarding@resend.dev>',
        to: emailParams.to,
        subject: emailParams.subject,
        html: emailParams.body.replace(/\n/g, '<br>')
      });
      console.log(`[RESEND ENVIADO] ${logType} -> ${emailParams.to}`);
    } catch (err) {
      console.error(`[RESEND ERROR] No se pudo enviar ${logType}:`, err);
    }
  } else {
    console.log(`[EMAIL SIMULADO] ${logType} -> ${emailParams.to}`);
  }
}

function sendPaymentConfirmedEmail(project) {
  const email = {
    to: project.client_email,
    subject: `¡Pago Confirmado! Tu proyecto ${project.project_name} está en marcha`,
    body: `
Hola ${project.client_name},

¡Gracias por confiar en Arquitectura Para Todos! Hemos confirmado tu pago para el desarrollo arquitectónico personalizado.

DETALLES DE TU COMPRA:
---------------------------------------------
Proyecto: ${project.project_name}
Paquete Contratado: ${project.project_package}
Monto Pagado: ${CONFIG.CURRENCY}${project.package_price}
Asesorías Personalizadas Incluidas: ${project.meeting_count} asesorías (${CONFIG.MEETING_DURATION} minutos cada una)

PRÓXIMOS PASOS:
1. Ingresa a tu panel "Mi Proyecto" para agendar tu primera reunión personalizada con nuestro equipo.
2. Revisaremos juntos tu programa arquitectónico, distribución y necesidades.

Accede a tu panel en cualquier momento desde nuestra plataforma.

Atentamente,
El equipo de Arquitectura Para Todos — Arqui IA
`
  };

  deliverEmail(email, 'PAYMENT_CONFIRMED');
  return email;
}

function sendProjectActivatedEmail(project) {
  const email = {
    to: project.client_email,
    subject: `Tu Proyecto ${project.project_name} ya está Activo`,
    body: `
Hola ${project.client_name},

Tu proyecto "${project.project_name}" ha sido activado correctamente en nuestra plataforma.

Ya puedes acceder a tu panel de cliente para visualizar el cronograma, entregables programados y agendar tus asesorías personalizadas de 45 minutos.

Atentamente,
Arquitectura Para Todos — Arqui IA
`
  };

  deliverEmail(email, 'PROJECT_ACTIVATED');
  return email;
}

function sendMeetingScheduledEmail(project, meeting) {
  const email = {
    to: project.client_email,
    subject: `Reunión Programada — Asesoría #${meeting.meeting_number} (${project.project_name})`,
    body: `
Hola ${project.client_name},

Te confirmamos la programación de tu asesoría personalizada #${meeting.meeting_number}:

DETALLES DE LA REUNIÓN:
---------------------------------------------
Fecha y Hora: ${meeting.scheduled_at || 'Por definir'}
Duración: ${CONFIG.MEETING_DURATION} minutos
Enlace de Video llamada: ${meeting.meeting_url || 'Se enviará 15 min antes'}

Por favor asegúrate de tener a la mano tus referencias y observaciones para aprovechar al máximo los 45 minutos de asesoría.

Atentamente,
Arquitectura Para Todos — Arqui IA
`
  };

  deliverEmail(email, 'MEETING_SCHEDULED');
  return email;
}

function sendDeliverableReadyEmail(project, deliverable) {
  const email = {
    to: project.client_email,
    subject: `Nuevo Entregable Disponible: ${deliverable.name} (${project.project_name})`,
    body: `
Hola ${project.client_name},

¡Tenemos novedades en tu proyecto! Hemos publicado un nuevo entregable:

ENTREGABLE: ${deliverable.name}
PAQUETE: ${project.project_package}

Ingresa a tu panel "Mi Proyecto" para revisar y descargar el archivo.

Atentamente,
Arquitectura Para Todos — Arqui IA
`
  };

  deliverEmail(email, 'DELIVERABLE_READY');
  return email;
}

function sendUpgradeConfirmedEmail(project, upgradeRecord) {
  const { CONFIG } = require('../../config/packages.config');
  const email = {
    to: project.client_email,
    subject: `¡Tu Proyecto ha sido Actualizado a PREMIUM! (${project.project_name})`,
    body: `
Hola ${project.client_name},

¡Felicitaciones! Tu proyecto "${project.project_name}" ha sido actualizado exitosamente al Paquete PREMIUM.

DETALLE DEL UPGRADE:
---------------------------------------------
Paquete Anterior: BASIC (${upgradeRecord.original_package_price ? `S/${upgradeRecord.original_package_price}` : 'S/500'})
Nuevo Paquete: PREMIUM
Importe Original Pagado: S/${upgradeRecord.original_package_price || 500}
Importe del Upgrade: S/${upgradeRecord.upgrade_price || 400}
Nuevo Valor Total del Proyecto: S/${project.package_price || 900}

NUEVOS BENEFICIOS DESBLOQUEADOS:
---------------------------------------------
✓ Asesorías personalizadas de 45 min: 4 (2 adicionales agregadas)
✓ Modelo 3D Conceptual: Desbloqueado
✓ Vistas 3D Adicionales: Desbloqueadas
✓ Video Recorrido de la Propuesta (MP4): Desbloqueado
✓ Posibilidad de publicación en canal YouTube*

PRÓXIMOS PASOS:
Ingresa a tu panel "Mi Proyecto" para revisar el cronograma actualizado, tus 4 asesorías disponibles y los nuevos entregables desbloqueados.

*La publicación en YouTube requiere tu autorización expresa.

Atentamente,
El equipo de Arquitectura Para Todos — Arqui IA
`
  };

  deliverEmail(email, 'UPGRADE_CONFIRMED');
  return email;
}

function sendProjectCompletedEmail(project) {
  const email = {
    to: project.client_email,
    subject: `¡Proyecto Finalizado con Éxito! (${project.project_name})`,
    body: `
Hola ${project.client_name},

¡Felicitaciones! El desarrollo arquitectónico de tu proyecto "${project.project_name}" ha sido completado con éxito.

Todos los entregables de tu paquete ${project.project_package} (planos, propuesta 3D y documentación) están disponibles de forma permanente en tu panel de cliente.

Fue un placer acompañarte a llevar tu idea a un proyecto arquitectónico personalizado.

Atentamente,
Arquitectura Para Todos — Arqui IA
`
  };

  deliverEmail(email, 'PROJECT_COMPLETED');
  return email;
}

function getEmailLogs() {
  return sentEmailsLog;
}

module.exports = {
  sendPaymentConfirmedEmail,
  sendProjectActivatedEmail,
  sendMeetingScheduledEmail,
  sendDeliverableReadyEmail,
  sendUpgradeConfirmedEmail,
  sendProjectCompletedEmail,
  getEmailLogs
};
