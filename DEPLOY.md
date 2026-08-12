# Guía de Despliegue en Producción (Cloud Hosting)

Este proyecto está configurado para ejecutarse sin problemas en plataformas de alojamiento en la nube (PaaS) como Render, Railway o en un Servidor Privado Virtual (VPS). Como utiliza **Zero Dependencies** para la arquitectura base, consume muy pocos recursos y arranca inmediatamente.

## 1. Preparación del Repositorio
Para desplegar la aplicación, el primer paso es subir todo el código a GitHub.
1. Inicializa el repositorio local si no lo has hecho:
   ```bash
   git init
   git add .
   git commit -m "Versión Inicial para Producción"
   ```
2. Crea un nuevo repositorio en [GitHub](https://github.com/) e ignora subir la carpeta `node_modules` (asegúrate de tener un archivo `.gitignore` válido).
3. Vincula el repositorio local con el remoto y súbelo (push).

## 2. Despliegue en Render.com (Recomendado)
Render es ideal para proyectos web basados en Node.js, ya que detecta automáticamente `package.json` y los comandos de inicio.

1. Regístrate o Inicia Sesión en [Render.com](https://render.com/).
2. Haz clic en **New +** y selecciona **Web Service**.
3. Vincula tu cuenta de GitHub y selecciona el repositorio de este proyecto.
4. **Configuración Básica:**
   - **Name**: `arquitectura-para-todos` (o el de tu elección)
   - **Environment**: `Node`
   - **Build Command**: `npm install` (Instalará las dependencias necesarias como Express, MercadoPago, dotenv).
   - **Start Command**: `npm start` (Ejecutará `node backend/server.js`).
5. **Configuración de Variables de Entorno (Environment Variables):**
   Antes de darle a "Create Web Service", haz clic en **Advanced** y agrega las siguientes variables (puedes guiarte de `.env.example`):
   - `PORT`: `10000` (Render suele utilizar 10000 u otros dinámicos. Puedes omitirlo y Render lo inyectará automáticamente).
   - `NODE_ENV`: `production`
   - `MERCADOPAGO_ACCESS_TOKEN`: `Tu token secreto de MercadoPago`.
   - `RESEND_API_KEY`: `Tu API Key de Resend`.
   - `APP_URL`: La URL pública de tu app en Render (Ej. `https://tu-app.onrender.com`).
   - `WEBHOOK_BASE_URL`: Igual que APP_URL.

6. Haz clic en **Create Web Service**. Espera unos 30-60 segundos y tu servidor estará en línea.

## 3. Configuración de Dominio Personalizado
Si compraste un dominio (Ej. `arquitectura.pe`), puedes enlazarlo fácilmente:

1. Ve a los **Settings** de tu Web Service en Render.
2. Deslízate hacia abajo a la sección **Custom Domains** y haz clic en **Add Custom Domain**.
3. Escribe tu dominio y Render te pedirá que configures tu panel DNS (Ej. Cloudflare, GoDaddy).
4. **Configuración DNS:**
   - Crea un registro `CNAME` que apunte de `www` hacia `tu-app.onrender.com`.
   - Crea un registro `A` o `ALIAS` en la raíz (`@`) que apunte a las IP provistas por Render.
5. Render generará automáticamente el certificado HTTPS.

## 4. Validación Final en Producción
Una vez desplegado:
1. Navega a tu web y simula una interacción con Arqui IA hasta que salga el popup de WhatsApp.
2. Realiza un clic en el "Paquete Básico", revisa que te redirija a MercadoPago.
3. Asegúrate que en MercadoPago se refleje el nombre correcto del paquete y el valor asignado (S/250.00).

¡Tu aplicación de Arquitectura Inteligente ya está en línea y lista para escalar en toda la región!
