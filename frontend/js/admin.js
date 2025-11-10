// =============================================
// CONFIGURACIÓN DE SEGURIDAD
// =============================================
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123' // ¡Cambia esta contraseña!
};

// 🟢 BACKEND EN RENDER
const API_URL = 'https://tiendawhatsapp-backend.onrender.com';

// =============================================
// ESTADO DEL PANEL ADMIN
// =============================================
let adminState = {
    isLoggedIn: false,
    products: [],
    settings: {
        whatsappNumber: '5491112345678',
        businessName: 'Mi Tienda WhatsApp',
        storeName: 'Tienda WhatsApp',
        storePhone: '+1234567890',
        storeDescription: 'Tu tienda online integrada con WhatsApp'
    }
};

// =============================================
// ELEMENTOS DEL DOM - ADMIN
// =============================================
const adminElements = {
    loginSection: document.getElementById('login-section'),
    adminPanel: document.getElementById('admin-panel'),
    loginForm: document.getElementById('login-form'),
    logoutBtn: document.getElementById('logout-btn'),
    alert: document.getElementById('alert'),
    loginAlert: document.getElementById('login-alert'),
    
    // Productos
    productForm: document.getElementById('product-form'),
    productFormData: document.getElementById('product-form-data'),
    productsGridAdmin: document.getElementById('products-grid-admin'),
    addProductBtn: document.getElementById('add-product-btn'),
    cancelForm: document.getElementById('cancel-form'),
    
    // Form inputs
    productId: document.getElementById('product-id'),
    productName: document.getElementById('product-name'),
    productPrice: document.getElementById('product-price'),
    productCategory: document.getElementById('product-category'),
    productStock: document.getElementById('product-stock'),
    productDescription: document.getElementById('product-description'),
    productImageUrl: document.getElementById('product-image-url'),
    
    // WhatsApp
    whatsappConfigForm: document.getElementById('whatsapp-config-form'),
    whatsappNumber: document.getElementById('whatsapp-number'),
    businessName: document.getElementById('business-name'),
    whatsappWelcome: document.getElementById('whatsapp-welcome'),
    whatsappOrder: document.getElementById('whatsapp-order'),
    
    // Store
    storeConfigForm: document.getElementById('store-config-form'),
    storeName: document.getElementById('store-name'),
    storePhone: document.getElementById('store-phone'),
    storeDescription: document.getElementById('store-description'),
    
    // Stats
    totalProducts: document.getElementById('total-products'),
    productCount: document.getElementById('product-count')
};

// =============================================
// EMITIR CAMBIOS A TODOS LOS CLIENTES
// =============================================
async function emitProductsUpdated() {
    try {
        await fetch(`${API_URL}/api/emit-products-update`, { method: 'POST' });
        console.log('✅ Evento products:updated emitido');
    } catch (err) {
        console.warn('⚠️ No se pudo emitir el evento:', err);
    }
}

// =============================================
// FUNCIONES DE AUTENTICACIÓN MEJORADAS
// =============================================
function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    if (!username) {
        showLoginAlert('Por favor ingresa el usuario');
        document.getElementById('username').focus();
        return;
    }
    
    if (!password) {
        showLoginAlert('Por favor ingresa la contraseña');
        document.getElementById('password').focus();
        return;
    }
    
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        adminState.isLoggedIn = true;
        localStorage.setItem('adminLoggedIn', 'true');
        localStorage.setItem('adminSession', Date.now().toString());
        
        showAdminPanel();
        showAlert('Sesión iniciada correctamente', 'success');
        adminElements.loginForm.reset();
    } else {
        showLoginAlert('Usuario o contraseña incorrectos');
        const passwordInput = document.getElementById('password');
        passwordInput.style.borderColor = '#dc3545';
        passwordInput.style.animation = 'shake 0.5s';
        setTimeout(() => {
            passwordInput.style.animation = '';
            passwordInput.style.borderColor = '';
        }, 500);
        passwordInput.value = '';
        passwordInput.focus();
    }
}

function handleLogout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        adminState.isLoggedIn = false;
        localStorage.removeItem('adminLoggedIn');
        localStorage.removeItem('adminSession');
        showLoginPanel();
        showAlert('Sesión cerrada correctamente', 'success');
    }
}

function checkExistingSession() {
    const savedLogin = localStorage.getItem('adminLoggedIn');
    const sessionTime = localStorage.getItem('adminSession');
    
    if (savedLogin === 'true' && sessionTime) {
        const sessionAge = Date.now() - parseInt(sessionTime);
        const maxSessionAge = 24 * 60 * 60 * 1000;
        if (sessionAge < maxSessionAge) {
            adminState.isLoggedIn = true;
            return true;
        } else {
            localStorage.removeItem('adminLoggedIn');
            localStorage.removeItem('adminSession');
            showLoginAlert('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
        }
    }
    return false;
}

function showAdminPanel() {
    adminElements.loginSection.style.display = 'none';
    adminElements.adminPanel.style.display = 'block';
    loadAdminData();
}

function showLoginPanel() {
    adminElements.loginSection.style.display = 'block';
    adminElements.adminPanel.style.display = 'none';
    adminElements.loginForm.reset();
    setTimeout(() => {
        document.getElementById('username').focus();
    }, 100);
}

// =============================================
// FUNCIONES DE PRODUCTOS
// =============================================
function showProductForm() {
    adminElements.productForm.style.display = 'block';
    document.getElementById('form-title').textContent = 'Agregar Nuevo Producto';
    adminElements.productFormData.reset();
    adminElements.productId.value = '';
    hideImagePreview();
}

function hideProductForm() {
    adminElements.productForm.style.display = 'none';
}

function handleProductSubmit(e) {
    e.preventDefault();
    
    const productData = {
        id: adminElements.productId.value || Date.now(),
        name: adminElements.productName.value,
        price: parseFloat(adminElements.productPrice.value),
        category: adminElements.productCategory.value,
        stock: parseInt(adminElements.productStock.value) || 0,
        description: adminElements.productDescription.value,
        image: adminElements.productImageUrl.value || '📦'
    };
    
    if (adminElements.productId.value) {
        const index = adminState.products.findIndex(p => p.id == adminElements.productId.value);
        if (index !== -1) {
            adminState.products[index] = productData;
        }
    } else {
        adminState.products.push(productData);
    }
    
    saveProducts();
    emitProductsUpdated(); // ← WebSocket a todos los clientes
    renderAdminProducts();
    hideProductForm();
    showAlert('Producto guardado correctamente', 'success');
}

function editProduct(productId) {
    const product = adminState.products.find(p => p.id == productId);
    if (!product) return;
    
    adminElements.productId.value = product.id;
    adminElements.productName.value = product.name;
    adminElements.productPrice.value = product.price;
    adminElements.productCategory.value = product.category;
    adminElements.productStock.value = product.stock;
    adminElements.productDescription.value = product.description || '';
    adminElements.productImageUrl.value = product.image || '';
    
    if (product.image && product.image.startsWith('http')) {
        showImagePreview(product.image);
    }
    
    document.getElementById('form-title').textContent = 'Editar Producto';
    adminElements.productForm.style.display = 'block';
}

function deleteProduct(productId) {
    if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
        adminState.products = adminState.products.filter(p => p.id != productId);
        saveProducts();
        emitProductsUpdated(); // ← WebSocket a todos los clientes
        renderAdminProducts();
        showAlert('Producto eliminado correctamente', 'success');
    }
}

function renderAdminProducts() {
    let html = '';
    
    if (adminState.products.length === 0) {
        html = `
            <div style="text-align: center; padding: 3rem; color: #666;">
                <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p>No hay productos registrados</p>
                <button class="btn btn-whatsapp" onclick="showProductForm()">
                    <i class="fas fa-plus"></i> Agregar Primer Producto
                </button>
            </div>
        `;
    } else {
        adminState.products.forEach(product => {
            html += `
                <div class="product-card-admin">
                    <div class="product-image-admin">
                        ${product.image}
                    </div>
                    <h4>${product.name}</h4>
                    <p style="color: var(--primary-color); font-weight: bold; font-size: 1.2rem;">
                        $${product.price.toFixed(2)}
                    </p>
                    <p style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">
                        ${product.category} • Stock: ${product.stock}
                    </p>
                    <p style="color: #888; font-size: 0.8rem;">
                        ${product.description || 'Sin descripción'}
                    </p>
                    <div class="product-actions-admin">
                        <button class="btn-sm btn-edit" onclick="editProduct(${product.id})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn-sm btn-delete" onclick="deleteProduct(${product.id})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                </div>
            `;
        });
    }
    
    adminElements.productsGridAdmin.innerHTML = html;
    updateStats();
}

// =============================================
// FUNCIONES DE CONFIGURACIÓN
// =============================================
function handleWhatsAppConfig(e) {
    e.preventDefault();
    
    adminState.settings.whatsappNumber = adminElements.whatsappNumber.value;
    adminState.settings.businessName = adminElements.businessName.value;
    adminState.settings.whatsappWelcome = adminElements.whatsappWelcome.value;
    adminState.settings.whatsappOrder = adminElements.whatsappOrder.value;
    
    saveSettings();
    showAlert('Configuración de WhatsApp guardada correctamente', 'success');
}

function handleStoreConfig(e) {
    e.preventDefault();
    
    adminState.settings.storeName = adminElements.storeName.value;
    adminState.settings.storePhone = adminElements.storePhone.value;
    adminState.settings.storeDescription = adminElements.storeDescription.value;
    
    saveSettings();
    showAlert('Configuración de la tienda guardada correctamente', 'success');
}

// =============================================
// FUNCIONES UTILITARIAS
// =============================================
function showAlert(message, type) {
    adminElements.alert.textContent = message;
    adminElements.alert.className = `alert ${type}`;
    adminElements.alert.style.display = 'block';
    
    setTimeout(() => {
        adminElements.alert.style.display = 'none';
    }, 3000);
}

function showLoginAlert(message) {
    adminElements.loginAlert.textContent = message;
    adminElements.loginAlert.className = 'alert error';
    adminElements.loginAlert.style.display = 'block';
    
    setTimeout(() => {
        adminElements.loginAlert.style.display = 'none';
    }, 3000);
}

function updateStats() {
    adminElements.totalProducts.textContent = adminState.products.length;
    adminElements.productCount.textContent = adminState.products.length;
}

function loadAdminData() {
    loadProducts();
    loadSettings();
    renderAdminProducts();
    setupTabs();
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            // Remover active de todos
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            // Agregar active al seleccionado
            tab.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// =============================================
// STORAGE FUNCTIONS
// =============================================
function saveProducts() {
    localStorage.setItem('adminProducts', JSON.stringify(adminState.products));
}

function loadProducts() {
    const saved = localStorage.getItem('adminProducts');
    if (saved) {
        adminState.products = JSON.parse(saved);
    }
}

function saveSettings() {
    localStorage.setItem('adminSettings', JSON.stringify(adminState.settings));
}

function loadSettings() {
    const saved = localStorage.getItem('adminSettings');
    if (saved) {
        adminState.settings = JSON.parse(saved);
        // Actualizar inputs
        adminElements.whatsappNumber.value = adminState.settings.whatsappNumber;
        adminElements.businessName.value = adminState.settings.businessName;
        adminElements.storeName.value = adminState.settings.storeName;
        adminElements.storePhone.value = adminState.settings.storePhone;
        adminElements.storeDescription.value = adminState.settings.storeDescription;
        
        if (adminState.settings.whatsappWelcome) {
            adminElements.whatsappWelcome.value = adminState.settings.whatsappWelcome;
        }
        if (adminState.settings.whatsappOrder) {
            adminElements.whatsappOrder.value = adminState.settings.whatsappOrder;
        }
    }
}

// =============================================
// UPLOAD DE IMÁGENES
// =============================================
function setupImageUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('product-image-upload');
    const preview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    const removeBtn = document.getElementById('remove-image');
    
    if (!uploadArea || !fileInput) return;
    
    uploadArea.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--primary-color)';
        uploadArea.style.background = 'var(--light-gray)';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = 'var(--border-color)';
        uploadArea.style.background = 'transparent';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleImageSelect(files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleImageSelect(e.target.files[0]);
        }
    });
    
    if (removeBtn) {
        removeBtn.addEventListener('click', hideImagePreview);
    }
}

function handleImageSelect(file) {
    if (!file.type.startsWith('image/')) {
        showAlert('Por favor selecciona una imagen válida', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showAlert('La imagen debe ser menor a 5MB', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        showImagePreview(e.target.result);
        adminElements.productImageUrl.value = e.target.result;
    };
    reader.readAsDataURL(file);
}

function showImagePreview(imageUrl) {
    const preview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    
    if (preview && previewImg) {
        previewImg.src = imageUrl;
        preview.style.display = 'block';
    }
}

function hideImagePreview() {
    const preview = document.getElementById('image-preview');
    if (preview) {
        preview.style.display = 'none';
        adminElements.productImageUrl.value = '';
    }
}

// =============================================
// INICIALIZACIÓN MEJORADA
// =============================================
function initAdmin() {
    console.log('🔐 Inicializando panel admin...');
    
    if (checkExistingSession()) {
        showAdminPanel();
        console.log('✅ Sesión existente encontrada');
    } else {
        showLoginPanel();
        console.log('🔒 Mostrando pantalla de login');
    }
    
    if (adminElements.loginForm) {
        adminElements.loginForm.addEventListener('submit', handleLogin);
    }
    
    if (adminElements.logoutBtn) {
        adminElements.logoutBtn.addEventListener('click', handleLogout);
    }
    
    if (adminElements.addProductBtn) {
        adminElements.addProductBtn.addEventListener('click', showProductForm);
    }
    
    if (adminElements.cancelForm) {
        adminElements.cancelForm.addEventListener('click', hideProductForm);
    }
    
    if (adminElements.productFormData) {
        adminElements.productFormData.addEventListener('submit', handleProductSubmit);
    }
    
    if (adminElements.whatsappConfigForm) {
        adminElements.whatsappConfigForm.addEventListener('submit', handleWhatsAppConfig);
    }
    
    if (adminElements.storeConfigForm) {
        adminElements.storeConfigForm.addEventListener('submit', handleStoreConfig);
    }
    
    setupImageUpload();
    console.log('✅ Panel Admin inicializado correctamente');
}

// =============================================
// INICIAR PANEL ADMIN
// =============================================
document.addEventListener('DOMContentLoaded', initAdmin);