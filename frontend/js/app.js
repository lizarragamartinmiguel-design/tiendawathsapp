// =============================================
// ESTADO GLOBAL DE LA APLICACIÓN
// =============================================
let state = {
    cart: [],
    products: [],
    settings: {
        whatsappNumber: '5491112345678',
        storeName: 'Tienda WhatsApp'
    }
};

// =============================================
// ELEMENTOS DEL DOM - MÁS ROBUSTO
// =============================================
function getElements() {
    return {
        cartIcon: document.getElementById('cart-icon'),
        cartCount: document.getElementById('cart-count'),
        cartFloating: document.getElementById('cart-floating'),
        closeCart: document.getElementById('close-cart'),
        cartItems: document.getElementById('cart-items'),
        cartTotal: document.getElementById('cart-total'),
        cartTotalElement: document.getElementById('cart-total-element'),
        productsGrid: document.getElementById('products-grid'),
        whatsappContact: document.getElementById('whatsapp-contact'),
        footerStoreName: document.getElementById('footer-store-name')
    };
}

let elements = {};

// =============================================
// FUNCIONES DE PRODUCTOS (CARGAR DESDE ADMIN)
// =============================================

// Cargar productos desde el almacenamiento del admin
function loadProductsFromAdmin() {
    try {
        console.log('🔄 Cargando productos desde admin...');
        
        // Intentar cargar productos del admin
        const adminProducts = localStorage.getItem('adminProducts');
        const adminSettings = localStorage.getItem('adminSettings');
        
        if (adminProducts) {
            const parsedProducts = JSON.parse(adminProducts);
            state.products = Array.isArray(parsedProducts) ? parsedProducts : [];
            console.log('✅ Productos cargados desde admin:', state.products.length);
            
            // Verificar cada producto
            state.products.forEach((product, index) => {
                if (!product.id) {
                    product.id = Date.now() + index; // ID único si no existe
                }
                if (!product.price) {
                    product.price = 0; // Precio por defecto
                }
                if (!product.image) {
                    product.image = '📦'; // Imagen por defecto
                }
            });
        } else {
            // Productos por defecto si no hay en el admin
            state.products = [
                {
                    id: 1,
                    name: "Camiseta Básica",
                    price: 29.99,
                    image: "👕",
                    description: "Camiseta de algodón 100%",
                    category: "Ropa",
                    stock: 10
                },
                {
                    id: 2,
                    name: "Zapatos Deportivos", 
                    price: 49.99,
                    image: "👟",
                    description: "Zapatos cómodos para deporte",
                    category: "Calzado",
                    stock: 5
                },
                {
                    id: 3,
                    name: "Auriculares Bluetooth",
                    price: 19.99,
                    image: "🎧",
                    description: "Sonido de alta calidad",
                    category: "Electrónicos",
                    stock: 8
                }
            ];
            console.log('ℹ️ Usando productos por defecto');
        }
        
        // Cargar configuración del admin
        if (adminSettings) {
            try {
                const settings = JSON.parse(adminSettings);
                state.settings = { ...state.settings, ...settings };
                
                // Actualizar información de contacto
                if (elements.whatsappContact && settings.whatsappNumber) {
                    elements.whatsappContact.textContent = `+${settings.whatsappNumber}`;
                }
                if (elements.footerStoreName && settings.storeName) {
                    elements.footerStoreName.textContent = settings.storeName;
                }
                console.log('✅ Configuración cargada:', settings);
            } catch (settingsError) {
                console.error('❌ Error en configuración:', settingsError);
            }
        }
        
    } catch (error) {
        console.error('❌ Error cargando productos del admin:', error);
        state.products = [];
    }
}

// Renderizar productos en la tienda
function renderProducts() {
    const productsGrid = elements.productsGrid;
    
    if (!productsGrid) {
        console.error('❌ No se encontró el elemento products-grid');
        return;
    }

    let html = '';
    
    if (state.products.length === 0) {
        html = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: #666;">
                <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3>No hay productos disponibles</h3>
                <p>Los productos se cargan desde el panel de administración</p>
                <a href="/admin.html" class="btn btn-whatsapp" style="margin-top: 1rem;">
                    <i class="fas fa-cog"></i> Ir al Panel Admin
                </a>
            </div>
        `;
    } else {
        state.products.forEach(product => {
            // Determinar qué mostrar como imagen
            let imageContent = '📦'; // Por defecto
            if (product.image) {
                if (product.image.startsWith('http') || product.image.startsWith('data:')) {
                    // Es una URL de imagen o data URL
                    imageContent = `<img src="${product.image}" alt="${product.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
                } else {
                    // Es un emoji o texto
                    imageContent = `<div style="font-size: 3rem;">${product.image}</div>`;
                }
            }
            
            html += `
                <div class="product-card">
                    <div class="product-image">
                        ${imageContent}
                    </div>
                    <div class="product-info">
                        <h3>${product.name || 'Producto sin nombre'}</h3>
                        <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">
                            ${product.category || 'General'}
                        </p>
                        <p style="color: #888; font-size: 0.8rem; margin-bottom: 1rem;">
                            ${product.description || 'Producto de calidad'}
                        </p>
                        <div class="product-price">$${(product.price || 0).toFixed(2)}</div>
                        <div class="product-actions">
                            <button class="btn btn-outline" onclick="addToCart(${product.id})">
                                <i class="fas fa-cart-plus"></i> Agregar al Carrito
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    productsGrid.innerHTML = html;
    console.log('✅ Productos renderizados:', state.products.length);
}

// =============================================
// FUNCIONES DEL CARRITO
// =============================================

// Agregar producto al carrito
function addToCart(productId) {
    const product = state.products.find(p => p.id == productId);
    
    if (!product) {
        showNotification('Producto no encontrado', 'error');
        return;
    }

    // Verificar stock
    if (product.stock !== undefined && product.stock <= 0) {
        showNotification('Producto sin stock disponible', 'error');
        return;
    }

    const existingItem = state.cart.find(item => item.id == productId);
    
    if (existingItem) {
        // Verificar stock al aumentar cantidad
        if (product.stock !== undefined && existingItem.quantity >= product.stock) {
            showNotification('No hay más stock disponible de este producto', 'error');
            return;
        }
        existingItem.quantity += 1;
    } else {
        state.cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }
    
    saveCartToStorage();
    renderCart();
    updateCartCount();
    showNotification(`${product.name} agregado al carrito`);
}

// Eliminar producto del carrito
function removeFromCart(productId) {
    state.cart = state.cart.filter(item => item.id != productId);
    saveCartToStorage();
    renderCart();
    updateCartCount();
    showNotification('Producto eliminado del carrito');
}

// Actualizar cantidad de producto
function updateQuantity(productId, change) {
    const item = state.cart.find(item => item.id == productId);
    const product = state.products.find(p => p.id == productId);
    
    if (item && product) {
        const newQuantity = item.quantity + change;
        
        // Verificar stock
        if (product.stock !== undefined && newQuantity > product.stock) {
            showNotification('No hay suficiente stock disponible', 'error');
            return;
        }
        
        if (newQuantity < 1) {
            removeFromCart(productId);
        } else {
            item.quantity = newQuantity;
            saveCartToStorage();
            renderCart();
            updateCartCount();
        }
    }
}

// Renderizar carrito
function renderCart() {
    const cartItems = elements.cartItems;
    const cartTotal = elements.cartTotal;
    
    if (!cartItems || !cartTotal) {
        console.error('❌ Elementos del carrito no encontrados');
        return;
    }

    const cart = state.cart;
    let html = '';
    let total = 0;
    
    if (cart.length === 0) {
        html = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <p>Tu carrito está vacío</p>
                <p style="font-size: 0.8rem; color: #888;">Agrega productos desde el catálogo</p>
            </div>
        `;
    } else {
        cart.forEach(item => {
            const itemTotal = (item.price || 0) * item.quantity;
            total += itemTotal;
            
            let itemImage = '📦';
            if (item.image) {
                if (item.image.startsWith('http') || item.image.startsWith('data:')) {
                    itemImage = `<img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
                } else {
                    itemImage = `<div style="font-size: 1.5rem;">${item.image}</div>`;
                }
            }
            
            html += `
                <div class="cart-item">
                    <div class="cart-item-image">
                        ${itemImage}
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">$${(item.price || 0).toFixed(2)}</div>
                        <div class="cart-item-quantity">
                            <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span style="padding: 0 10px; font-weight: bold;">${item.quantity}</span>
                            <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                    </div>
                    <button class="quantity-btn" onclick="removeFromCart(${item.id})" style="background: #ff4444; color: white;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });
    }
    
    cartItems.innerHTML = html;
    cartTotal.textContent = total.toFixed(2);
}

// Actualizar contador del carrito
function updateCartCount() {
    const cartCount = elements.cartCount;
    if (!cartCount) return;
    
    const totalItems = state.cart.reduce((total, item) => total + (item.quantity || 0), 0);
    cartCount.textContent = totalItems;
}

// Mostrar/ocultar carrito
function toggleCart() {
    const cartFloating = elements.cartFloating;
    if (!cartFloating) return;
    
    cartFloating.classList.toggle('active');
}

// =============================================
// FUNCIONES DE WHATSAPP
// =============================================

// Enviar pedido por WhatsApp
function sendOrderToWhatsApp() {
    if (state.cart.length === 0) {
        showNotification('El carrito está vacío', 'error');
        return;
    }
    
    const message = generateOrderMessage();
    const phoneNumber = state.settings.whatsappNumber || '5491112345678';
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    
    window.open(url, '_blank');
}

// Generar mensaje del pedido
function generateOrderMessage() {
    let message = `¡Hola! Quiero hacer el siguiente pedido:\n\n`;
    message += `*Pedido de ${state.settings.storeName}*\n\n`;
    
    state.cart.forEach(item => {
        const itemTotal = (item.price || 0) * (item.quantity || 0);
        message += `• ${item.name} - ${item.quantity} x $${(item.price || 0).toFixed(2)} = $${itemTotal.toFixed(2)}\n`;
    });
    
    const total = state.cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
    message += `\n*Total: $${total.toFixed(2)}*\n\n`;
    message += `Información de contacto:\n`;
    message += `Nombre: [Tu nombre]\n`;
    message += `Dirección: [Tu dirección]\n`;
    message += `Teléfono: [Tu teléfono]\n\n`;
    message += `¡Gracias!`;
    
    return message;
}

// =============================================
// FUNCIONES UTILITARIAS
// =============================================

// Mostrar notificación
function showNotification(message, type = 'success') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification ${type === 'error' ? 'error' : 'success'}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
        ${message}
    `;
    
    // Estilos de la notificación
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'error' ? '#ff4444' : '#25D366'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Guardar carrito en localStorage
function saveCartToStorage() {
    try {
        localStorage.setItem('cart', JSON.stringify(state.cart));
    } catch (error) {
        console.error('❌ Error guardando carrito:', error);
    }
}

// Cargar carrito desde localStorage
function loadCartFromStorage() {
    try {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            state.cart = JSON.parse(savedCart);
        }
    } catch (error) {
        console.error('❌ Error cargando carrito:', error);
        state.cart = [];
    }
}

// Scroll a productos
function scrollToProducts() {
    const productsSection = document.getElementById('productos');
    if (productsSection) {
        productsSection.scrollIntoView({ 
            behavior: 'smooth' 
        });
    }
}

// =============================================
// EVENT LISTENERS
// =============================================

function setupEventListeners() {
    // Icono del carrito
    if (elements.cartIcon) {
        elements.cartIcon.addEventListener('click', toggleCart);
    }
    
    // Cerrar carrito
    if (elements.closeCart) {
        elements.closeCart.addEventListener('click', toggleCart);
    }
    
    // Cerrar carrito al hacer click fuera
    document.addEventListener('click', (e) => {
        if (elements.cartFloating && elements.cartFloating.classList.contains('active') && 
            !elements.cartFloating.contains(e.target) && 
            elements.cartIcon && !elements.cartIcon.contains(e.target)) {
            toggleCart();
        }
    });
}

// =============================================
// INICIALIZACIÓN MEJORADA
// =============================================

function init() {
    console.log('🚀 Inicializando tienda...');
    
    // Inicializar elementos
    elements = getElements();
    
    // Cargar datos
    loadProductsFromAdmin();
    loadCartFromStorage();
    
    // Renderizar
    renderProducts();
    renderCart();
    updateCartCount();
    
    // Configurar event listeners
    setupEventListeners();
    
    console.log('✅ Tienda WhatsApp inicializada correctamente');
    console.log('📦 Productos cargados:', state.products.length);
    console.log('🛒 Productos en carrito:', state.cart.length);
    console.log('🎯 Elementos encontrados:', Object.keys(elements).filter(key => elements[key] !== null).length);
}

// =============================================
// HACER FUNCIONES GLOBALES
// =============================================
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.toggleCart = toggleCart;
window.sendOrderToWhatsApp = sendOrderToWhatsApp;
window.scrollToProducts = scrollToProducts;

// =============================================
// INICIAR APLICACIÓN
// =============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// =============================================
// ESCUCHAR CAMBIOS EN PRODUCTOS DEL ADMIN
// =============================================
window.addEventListener('storage', function(e) {
    if (e.key === 'adminProducts') {
        console.log('🔄 Productos actualizados desde admin, recargando...');
        loadProductsFromAdmin();
        renderProducts();
    }
});

// Recargar productos cada 5 segundos (para desarrollo)
setInterval(() => {
    const currentCount = state.products.length;
    loadProductsFromAdmin();
    if (state.products.length !== currentCount) {
        console.log('🔄 Productos actualizados automáticamente');
        renderProducts();
    }
}, 5000);