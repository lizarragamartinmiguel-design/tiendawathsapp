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

// 🟢 BACKEND EN RENDER
const API_URL = 'https://tiendawhatsapp-backend.onrender.com';

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
// CARGAR PRODUCTOS DESDE BACKEND
// =============================================
async function loadProductsFromBackend() {
  try {
    console.log('🔄 Cargando productos desde backend...');
    const res = await fetch(`${API_URL}/api/products`);
    if (!res.ok) throw new Error('Error al obtener productos');
    state.products = await res.json();
    console.log('✅ Productos cargados desde backend:', state.products.length);
  } catch (err) {
    console.warn('⚠️ Falló carga desde backend, usando locales', err);
    // fallback a localStorage o defaults
    const adminProducts = localStorage.getItem('adminProducts');
    state.products = adminProducts ? JSON.parse(adminProducts) : [
      { id: 1, name: 'Camiseta Básica',  price: 29.99, image: '👕', description: 'Algodón 100%', category: 'Ropa',      stock: 10 },
      { id: 2, name: 'Zapatos Deportivos', price: 49.99, image: '👟', description: 'Cómodos',       category: 'Calzado',   stock: 5  },
      { id: 3, name: 'Auriculares Bluetooth', price: 19.99, image: '🎧', description: 'Alta calidad', category: 'Electrónica', stock: 8 }
    ];
  }
}

// =============================================
// RENDERIZAR PRODUCTOS
// =============================================
function renderProducts() {
  const grid = elements.productsGrid;
  if (!grid) return;

  if (!state.products.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem;color:#666">
        <i class="fas fa-box-open" style="font-size:3rem;margin-bottom:1rem"></i>
        <h3>No hay productos</h3>
        <p>Los productos se cargan desde el panel de administración</p>
        <a href="/admin.html" class="btn btn-whatsapp">Ir al Admin</a>
      </div>`;
    return;
  }

  grid.innerHTML = state.products.map(p => {
    let img = '📦';
    if (p.image) {
      if (p.image.startsWith('http') || p.image.startsWith('data:')) {
        img = `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
      } else {
        img = `<div style="font-size:3rem">${p.image}</div>`;
      }
    }
    return `
      <div class="product-card">
        <div class="product-image">${img}</div>
        <div class="product-info">
          <h3>${p.name}</h3>
          <p style="color:#666;font-size:.9rem;margin-bottom:.5rem">${p.category||'General'}</p>
          <p style="color:#888;font-size:.8rem;margin-bottom:1rem">${p.description||''}</p>
          <div class="product-price">$${(p.price||0).toFixed(2)}</div>
          <div class="product-actions">
            <button class="btn btn-outline" onclick="addToCart(${p.id})">
              <i class="fas fa-cart-plus"></i> Agregar
            </button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// =============================================
// CARRITO
// =============================================
function addToCart(id) {
  const p = state.products.find(pr => pr.id == id);
  if (!p) return;
  if (p.stock !== undefined && p.stock <= 0) { showNotification('Sin stock','error'); return; }
  const item = state.cart.find(it => it.id == id);
  if (item) {
    if (p.stock !== undefined && item.quantity >= p.stock) { showNotification('Límite de stock','error'); return; }
    item.quantity++;
  } else {
    state.cart.push({ id: p.id, name: p.name, price: p.price, image: p.image, quantity: 1 });
  }
  saveCart();
  renderCart();
  updateCartCount();
  showNotification(`${p.name} agregado`);
}

function removeFromCart(id) {
  state.cart = state.cart.filter(it => it.id != id);
  saveCart();
  renderCart();
  updateCartCount();
  showNotification('Producto eliminado');
}

function updateQuantity(id, change) {
  const item = state.cart.find(it => it.id == id);
  const product = state.products.find(p => p.id == id);
  if (!item) return;
  const newQty = item.quantity + change;
  if (newQty < 1) { removeFromCart(id); return; }
  if (product && product.stock !== undefined && newQty > product.stock) { showNotification('Sin stock suficiente','error'); return; }
  item.quantity = newQty;
  saveCart();
  renderCart();
  updateCartCount();
}

function renderCart() {
  const container = elements.cartItems;
  const totalEl = elements.cartTotal;
  if (!container || !totalEl) return;
  if (!state.cart.length) {
    container.innerHTML = `<div class="empty-cart"><i class="fas fa-shopping-cart"></i><p>Tu carrito está vacío</p></div>`;
    totalEl.textContent = '0.00';
    return;
  }
  let html = ''; let total = 0;
  state.cart.forEach(it => {
    const sub = (it.price || 0) * it.quantity;
    total += sub;
    let img = '📦';
    if (it.image) {
      if (it.image.startsWith('http') || it.image.startsWith('data:')) {
        img = `<img src="${it.image}" alt="${it.name}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
      } else {
        img = `<div style="font-size:1.5rem">${it.image}</div>`;
      }
    }
    html += `
      <div class="cart-item">
        <div class="cart-item-image">${img}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${it.name}</div>
          <div class="cart-item-price">$${(it.price||0).toFixed(2)}</div>
          <div class="cart-item-quantity">
            <button class="quantity-btn" onclick="updateQuantity(${it.id},-1)"><i class="fas fa-minus"></i></button>
            <span>${it.quantity}</span>
            <button class="quantity-btn" onclick="updateQuantity(${it.id},1)"><i class="fas fa-plus"></i></button>
          </div>
        </div>
        <button class="quantity-btn" onclick="removeFromCart(${it.id})" style="background:#ff4444;color:white"><i class="fas fa-trash"></i></button>
      </div>`;
  });
  container.innerHTML = html;
  totalEl.textContent = total.toFixed(2);
}

function updateCartCount() {
  const badge = elements.cartCount;
  if (!badge) return;
  const total = state.cart.reduce((t,it)=>t+it.quantity,0);
  badge.textContent = total;
}

function toggleCart() {
  elements.cartFloating?.classList.toggle('active');
}

// =============================================
// WHATSAPP
// =============================================
function sendOrderToWhatsApp() {
  if (!state.cart.length) { showNotification('Carrito vacío','error'); return; }
  const phone = state.settings.whatsappNumber || '5491112345678';
  let msg = `¡Hola! Quiero hacer este pedido:\n\n*${state.settings.storeName}*\n\n`;
  let total = 0;
  state.cart.forEach(it=>{
    const sub = (it.price||0)*it.quantity;
    total+=sub;
    msg+=`• ${it.name} - ${it.quantity} × $${(it.price||0).toFixed(2)} = $${sub.toFixed(2)}\n`;
  });
  msg+=`\n*Total: $${total.toFixed(2)}*\n\nNombre: [Tu nombre]\nDirección: [Tu dirección]\nTeléfono: [Tu teléfono]\n\n¡Gracias!`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,'_blank');
}

// =============================================
// NOTIFICACIONES
// =============================================
function showNotification(msg, type='success') {
  const div = document.createElement('div');
  div.className = `notification ${type}`;
  div.innerHTML = `<i class="fas fa-${type==='error'?'exclamation-circle':'check-circle'}"></i> ${msg}`;
  div.style.cssText = `position:fixed;top:100px;right:20px;background:${type==='error'?'#ff4444':'#25D366'};color:white;padding:1rem 1.5rem;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.2);z-index:10000;display:flex;align-items:center;gap:.5rem;font-weight:500;animation:slideIn .3s ease`;
  document.body.appendChild(div);
  setTimeout(()=>{div.style.animation='slideOut .3s ease'; setTimeout(()=>div.remove(),300)},3000);
}

// =============================================
// UTILS
// =============================================
function saveCart() { try { localStorage.setItem('cart',JSON.stringify(state.cart)); } catch {} }
function loadCart() { try { state.cart=JSON.parse(localStorage.getItem('cart')||'[]'); } catch { state.cart=[]; } }
function scrollToProducts() { document.getElementById('productos')?.scrollIntoView({behavior:'smooth'}); }

// =============================================
// EVENTOS
// =============================================
function setupEvents() {
  elements.cartIcon?.addEventListener('click',toggleCart);
  elements.closeCart?.addEventListener('click',toggleCart);
  document.addEventListener('click',e=>{
    if (elements.cartFloating?.classList.contains('active') &&
        !elements.cartFloating.contains(e.target) &&
        !elements.cartIcon?.contains(e.target)) toggleCart();
  });
}

// =============================================
// INICIALIZAR
// =============================================
async function init() {
  console.log('🚀 Inicializando tienda...');
  elements = getElements();
  loadCart();
  await loadProductsFromBackend();
  renderProducts();
  renderCart();
  updateCartCount();
  setupEvents();
  console.log('✅ Tienda lista');
}
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.toggleCart = toggleCart;
window.sendOrderToWhatsApp = sendOrderToWhatsApp;
window.scrollToProducts = scrollToProducts;

if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
else init();

// =============================================
// ESCUCHAR CAMBIOS EN TIEMPO REAL
// =============================================
const socket = io('https://tiendawhatsapp-backend.onrender.com');

socket.on('connect', () => {
  console.log('✅ Conectado a tiempo real');
});

socket.on('products:updated', async () => {
  console.log('🔄 Productos actualizados por el admin');
  await loadProductsFromBackend();
  renderProducts();
});