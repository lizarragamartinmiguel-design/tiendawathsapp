// Configuración
const API_BASE_URL = 'http://localhost:3002/api';
let carrito = [];
let sessionId = generarSessionId();

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    cargarProductos();
    actualizarCarrito();
    
    // Recuperar carrito del localStorage si existe
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) {
        carrito = JSON.parse(carritoGuardado);
        actualizarCarrito();
    }
});

// Generar ID de sesión único
function generarSessionId() {
    return 'session_' + Math.random().toString(36).substr(2, 9);
}

// Cargar productos desde la API
async function cargarProductos() {
    try {
        console.log('Cargando productos desde API...');
        const response = await fetch('/api/productos');
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const productos = await response.json();
        console.log('Productos recibidos:', productos);
        
        if (productos && productos.length > 0) {
            mostrarProductos(productos);
        } else {
            console.log('No hay productos, mostrando demo');
            mostrarProductosDemo();
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
        mostrarProductosDemo();
    }
}

// Mostrar productos demo
function mostrarProductosDemo() {
    const productosDemo = [
        {
            id: 1,
            nombre: "Camiseta Básica",
            precio: 25000,
            descripcion: "Camiseta 100% algodón de alta calidad",
            categoria: "Ropa",
            stock: 50,
            imagen: null
        },
        {
            id: 2,
            nombre: "Zapatos Deportivos", 
            precio: 120000,
            descripcion: "Zapatos deportivos para running y ejercicio",
            categoria: "Calzado",
            stock: 25,
            imagen: null
        },
        {
            id: 3,
            nombre: "Bolso Casual",
            precio: 45000,
            descripcion: "Bolso casual perfecto para el día a día",
            categoria: "Accesorios",
            stock: 15,
            imagen: null
        }
    ];
    
    mostrarProductos(productosDemo);
}

// Mostrar productos en la grid
function mostrarProductos(productos) {
    const grid = document.getElementById('products-grid');
    console.log('Mostrando productos:', productos);
    
    if (!productos || productos.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <i class="fas fa-box-open" style="font-size: 4rem; color: #ccc; margin-bottom: 1rem;"></i>
                <h3>No hay productos disponibles</h3>
                <p>Agrega productos desde el panel de administración.</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = productos.map(producto => `
        <div class="product-card">
            <div class="product-image">
                ${producto.imagen ? 
                    `<img src="${producto.imagen}" alt="${producto.nombre}" style="width: 100%; height: 100%; object-fit: cover;">` :
                    `<i class="fas ${obtenerIconoProducto(producto.categoria)}"></i>`
                }
            </div>
            <div class="product-info">
                <h3>${producto.nombre}</h3>
                <p class="product-description">${producto.descripcion || 'Sin descripción'}</p>
                <div class="product-price">$${producto.precio?.toLocaleString()}</div>
                ${producto.stock ? `<div class="product-stock">Stock: ${producto.stock}</div>` : ''}
                <div class="product-actions">
                    <button class="btn btn-outline" onclick="agregarAlCarrito(${producto.id})">
                        <i class="fas fa-cart-plus"></i>
                        Agregar
                    </button>
                    <button class="btn btn-whatsapp" onclick="comprarDirectoWhatsApp(${producto.id})">
                        <i class="fab fa-whatsapp"></i>
                        Comprar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Obtener icono según categoría
function obtenerIconoProducto(categoria) {
    const iconos = {
        'Ropa': 'fa-tshirt',
        'Calzado': 'fa-shoe-prints',
        'Accesorios': 'fa-bag-shopping',
        'Electrónicos': 'fa-laptop',
        'Hogar': 'fa-home'
    };
    return iconos[categoria] || 'fa-box';
}

// Agregar producto al carrito
async function agregarAlCarrito(productoId) {
    try {
        const producto = obtenerProductoDemo(productoId);
        if (!producto) return;

        const itemExistente = carrito.find(item => item.producto.id === productoId);
        if (itemExistente) {
            itemExistente.cantidad += 1;
        } else {
            carrito.push({
                producto: producto,
                cantidad: 1
            });
        }

        guardarCarrito();
        actualizarCarrito();
        mostrarNotificacion('Producto agregado al carrito');
    } catch (error) {
        console.error('Error agregando al carrito:', error);
        mostrarError('Error al agregar el producto');
    }
}

// Obtener producto demo
function obtenerProductoDemo(productoId) {
    const productosDemo = [
        { id: 1, nombre: "Camiseta Básica", precio: 25000, categoria: "Ropa" },
        { id: 2, nombre: "Zapatos Deportivos", precio: 120000, categoria: "Calzado" },
        { id: 3, nombre: "Bolso Casual", precio: 45000, categoria: "Accesorios" }
    ];
    return productosDemo.find(p => p.id === productoId);
}

// Actualizar interfaz del carrito
function actualizarCarrito() {
    const cartCount = document.getElementById('cart-count');
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    cartCount.textContent = totalItems;
}

// Guardar carrito en localStorage
function guardarCarrito() {
    localStorage.setItem('carrito', JSON.stringify(carrito));
}

// Scroll a productos
function scrollToProducts() {
    document.getElementById('productos').scrollIntoView({
        behavior: 'smooth'
    });
}

// Comprar producto directamente por WhatsApp
function comprarDirectoWhatsApp(productoId) {
    const producto = obtenerProductoDemo(productoId);
    if (!producto) return;

    const mensaje = `¡Hola! Estoy interesado en comprar:\n\n` +
                   `*${producto.nombre}*\n` +
                   `Precio: $${producto.precio.toLocaleString()}\n\n` +
                   `¿Podrían darme más información?`;
    
    enviarWhatsApp(mensaje);
}

// Enviar pedido completo por WhatsApp
function enviarPedidoWhatsApp() {
    if (carrito.length === 0) {
        mostrarError('El carrito está vacío');
        return;
    }

    let mensaje = `*NUEVO PEDIDO - TIENDA ONLINE*\n\n`;
    mensaje += `*Detalle del pedido:*\n`;
    
    let total = 0;
    carrito.forEach((item, index) => {
        const subtotal = item.producto.precio * item.cantidad;
        total += subtotal;
        mensaje += `${index + 1}. ${item.producto.nombre}\n`;
        mensaje += `   Cantidad: ${item.cantidad}\n`;
        mensaje += `   Precio: $${item.producto.precio.toLocaleString()}\n`;
        mensaje += `   Subtotal: $${subtotal.toLocaleString()}\n\n`;
    });
    
    mensaje += `*TOTAL: $${total.toLocaleString()}*\n\n`;
    mensaje += `*Información del cliente:*\n` +
               `Nombre: \n` +
               `Teléfono: \n` +
               `Dirección: \n` +
               `Método de pago: `;

    enviarWhatsApp(mensaje);
}

// Enviar mensaje por WhatsApp
function enviarWhatsApp(mensaje) {
    const numeroWhatsApp = '1234567890'; // Cambia por tu número
    const textoCodificado = encodeURIComponent(mensaje);
    const url = `https://wa.me/${numeroWhatsApp}?text=${textoCodificado}`;
    window.open(url, '_blank');
}

// Utilidades de UI
function mostrarNotificacion(mensaje) {
    // Crear notificación toast
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--primary-color);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    toast.innerHTML = `
        <i class="fas fa-check-circle" style="margin-right: 0.5rem;"></i>
        ${mensaje}
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

function mostrarError(mensaje) {
    alert('Error: ' + mensaje);
}

// Hacer función global para el botón
window.enviarPedidoWhatsApp = enviarPedidoWhatsApp;

// Agregar estilos para las animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .product-stock {
        font-size: 0.9rem;
        color: #666;
        margin-bottom: 1rem;
    }
    .product-description {
        color: #555;
        margin-bottom: 1rem;
        line-height: 1.4;
    }
`;
document.head.appendChild(style);