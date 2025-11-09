const express = require('express');
const axios = require('axios');
const router = express.Router();

// Configuración de WhatsApp Business API
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || 'TU_TOKEN_AQUI';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || 'TU_PHONE_ID_AQUI';
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'mi_token_de_verificacion';

// Verificación del webhook
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token === VERIFY_TOKEN) {
        console.log('✅ Webhook verificado correctamente');
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Recibir mensajes de WhatsApp
router.post('/', async (req, res) => {
    console.log('📱 Mensaje recibido de WhatsApp:', JSON.stringify(req.body, null, 2));

    try {
        const body = req.body;

        if (body.object === 'whatsapp_business_account') {
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
                const message = body.entry[0].changes[0].value.messages[0];
                const from = message.from;
                const text = message.text?.body || '';

                // Procesar el mensaje
                await procesarMensajeWhatsApp(from, text);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('❌ Error procesando mensaje WhatsApp:', error);
        res.sendStatus(500);
    }
});

// Función para procesar mensajes de WhatsApp
async function procesarMensajeWhatsApp(from, text) {
    const mensaje = text.toLowerCase().trim();

    if (mensaje.includes('catalogo') || mensaje.includes('productos')) {
        await enviarCatalogo(from);
    } else if (mensaje.includes('hola') || mensaje.includes('buenas')) {
        await enviarMensajeBienvenida(from);
    } else if (mensaje.includes('pedido') || mensaje.includes('comprar')) {
        await solicitarInformacionPedido(from);
    } else {
        await enviarOpcionesMenu(from);
    }
}

// Función para enviar mensaje a WhatsApp
async function enviarMensajeWhatsApp(to, message) {
    try {
        const response = await axios.post(
            `https://graph.facebook.com/v17.0/${WHATSAPP_PHONE_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to: to,
                type: "text",
                text: {
                    body: message
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('✅ Mensaje enviado correctamente');
        return response.data;
    } catch (error) {
        console.error('❌ Error enviando mensaje:', error.response?.data || error.message);
        throw error;
    }
}

// Mensaje de bienvenida
async function enviarMensajeBienvenida(to) {
    const mensaje = `¡Hola! 👋 Bienvenido a nuestra tienda.

Escribe:
📋 *CATALOGO* - Para ver nuestros productos
🛒 *PEDIDO* - Para hacer un pedido
📞 *CONTACTO* - Para información de contacto

¿En qué puedo ayudarte hoy?`;
    
    await enviarMensajeWhatsApp(to, mensaje);
}

// Enviar catálogo
async function enviarCatalogo(to) {
    const mensaje = `🛍️ *NUESTRO CATÁLOLO DE PRODUCTOS*

1. *Camiseta Básica* - $25.000
   - Colores: Negro, Blanco, Azul
   - Talles: S, M, L, XL

2. *Jeans Clásicos* - $89.000
   - Colores: Azul, Negro
   - Talles: 28-40

3. *Zapatos Deportivos* - $120.000
   - Colores: Blanco, Negro, Rojo
   - Talles: 38-44

4. *Bolso Casual* - $45.000
   - Colores: Negro, Marrón, Beige

Para ordenar, escribe *PEDIDO* seguido del número del producto y la cantidad.
Ejemplo: *PEDIDO 1 2* (2 camisetas básicas)`;
    
    await enviarMensajeWhatsApp(to, mensaje);
}

// Solicitar información del pedido
async function solicitarInformacionPedido(to) {
    const mensaje = `🛒 *REALIZAR PEDIDO*

Para hacer tu pedido, por favor envía la siguiente información:

*Producto:* (número del producto)
*Cantidad:* 
*Color:*
*Talle:*
*Dirección de envío:*

También puedes visitar nuestra tienda online para ver imágenes y hacer el pedido directamente.

¿Necesitas ayuda con algún producto?`;
    
    await enviarMensajeWhatsApp(to, mensaje);
}

// Enviar opciones del menú
async function enviarOpcionesMenu(to) {
    const mensaje = `¿En qué más puedo ayudarte? 🤔

Escribe:
📋 *CATALOGO* - Ver productos
🛒 *PEDIDO* - Hacer pedido
📞 *CONTACTO* - Información de contacto
💬 *AYUDA* - Soporte al cliente`;
    
    await enviarMensajeWhatsApp(to, mensaje);
}

module.exports = router;