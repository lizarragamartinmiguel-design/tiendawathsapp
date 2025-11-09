// Admin JavaScript
class AdminPanel {
    constructor() {
        this.isLoggedIn = false;
        this.currentImageFile = null;
        this.uploadedImageUrl = '';
        this.whatsappConfig = {};
        this.init();
    }

    init() {
        this.checkLogin();
        this.bindEvents();
    }

    checkLogin() {
        // Por ahora, mostramos directamente el login
        this.showLogin();
    }

    bindEvents() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Product form
        document.getElementById('add-product-btn').addEventListener('click', () => {
            this.showProductForm();
        });

        document.getElementById('product-form-data').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        document.getElementById('cancel-form').addEventListener('click', () => {
            this.hideProductForm();
        });

        // Upload de imágenes
        document.getElementById('upload-area').addEventListener('click', () => {
            document.getElementById('product-image-upload').click();
        });

        document.getElementById('product-image-upload').addEventListener('change', (e) => {
            this.handleImageSelect(e.target.files[0]);
        });

        document.getElementById('remove-image').addEventListener('click', () => {
            this.removeSelectedImage();
        });

        // Configuración WhatsApp
        document.getElementById('whatsapp-config-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveWhatsAppConfig();
        });

        // Drag and drop
        const uploadArea = document.getElementById('upload-area');
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#25D366';
            uploadArea.style.background = '#f8f9fa';
        });

        uploadArea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#ddd';
            uploadArea.style.background = 'transparent';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#ddd';
            uploadArea.style.background = 'transparent';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleImageSelect(files[0]);
            }
        });
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                this.isLoggedIn = true;
                this.showAdminPanel();
                this.loadProducts();
                this.loadWhatsAppConfig(); // Cargar configuración WhatsApp
            } else {
                this.showAlert('Credenciales incorrectas', 'error');
            }
        } catch (error) {
            this.showAlert('Error de conexión', 'error');
        }
    }

    handleLogout() {
        this.isLoggedIn = false;
        this.showLogin();
        this.hideProductForm();
    }

    showLogin() {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('admin-panel').style.display = 'none';
    }

    showAdminPanel() {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
    }

    switchTab(tabName) {
        // Update tabs
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
    }

    showProductForm(product = null) {
        const form = document.getElementById('product-form');
        const title = document.getElementById('form-title');
        
        // Resetear imagen
        this.removeSelectedImage();
        
        if (product) {
            title.textContent = 'Editar Producto';
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.nombre;
            document.getElementById('product-price').value = product.precio;
            document.getElementById('product-category').value = product.categoria || 'Ropa';
            document.getElementById('product-stock').value = product.stock || 0;
            document.getElementById('product-description').value = product.descripcion || '';
            
            // Si el producto ya tiene imagen, mostrarla
            if (product.imagen) {
                document.getElementById('product-image-url').value = product.imagen;
                document.getElementById('preview-img').src = product.imagen;
                document.getElementById('image-preview').style.display = 'block';
                document.getElementById('upload-area').style.display = 'none';
            }
        } else {
            title.textContent = 'Agregar Nuevo Producto';
            document.getElementById('product-form-data').reset();
            document.getElementById('product-id').value = '';
        }
        
        form.style.display = 'block';
    }

    hideProductForm() {
        document.getElementById('product-form').style.display = 'none';
    }

    async saveProduct() {
        const imageUrl = document.getElementById('product-image-url').value;
        
        const productData = {
            nombre: document.getElementById('product-name').value,
            precio: parseFloat(document.getElementById('product-price').value),
            categoria: document.getElementById('product-category').value,
            stock: parseInt(document.getElementById('product-stock').value),
            descripcion: document.getElementById('product-description').value,
            imagen: imageUrl
        };

        const productId = document.getElementById('product-id').value;
        const url = productId ? `/api/admin/productos/${productId}` : '/api/admin/productos';
        const method = productId ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });

            const data = await response.json();

            if (data.success) {
                this.showAlert('Producto guardado correctamente', 'success');
                this.hideProductForm();
                this.loadProducts();
            } else {
                this.showAlert('Error al guardar producto', 'error');
            }
        } catch (error) {
            this.showAlert('Error de conexión', 'error');
        }
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/productos');
            const productos = await response.json();
            this.displayProducts(productos);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    displayProducts(productos) {
        const grid = document.getElementById('products-grid-admin');
        
        grid.innerHTML = productos.map(producto => `
            <div class="product-card-admin">
                ${producto.imagen ? 
                    `<img src="${producto.imagen}" alt="${producto.nombre}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">` :
                    `<div style="width: 100%; height: 150px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; border-radius: 8px; margin-bottom: 1rem;">
                        <i class="fas fa-image" style="font-size: 2rem; color: #ccc;"></i>
                    </div>`
                }
                <h4>${producto.nombre}</h4>
                <p><strong>Precio:</strong> $${producto.precio?.toLocaleString()}</p>
                <p><strong>Categoría:</strong> ${producto.categoria || 'Sin categoría'}</p>
                <p><strong>Stock:</strong> ${producto.stock || 0}</p>
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button class="btn btn-outline" onclick="admin.editProduct(${producto.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn" style="background: #dc3545; color: white;" onclick="admin.deleteProduct(${producto.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    }

    async editProduct(id) {
        try {
            const response = await fetch(`/api/productos/${id}`);
            const producto = await response.json();
            this.showProductForm(producto);
        } catch (error) {
            this.showAlert('Error al cargar producto', 'error');
        }
    }

    async deleteProduct(id) {
        if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
            try {
                const response = await fetch(`/api/admin/productos/${id}`, {
                    method: 'DELETE'
                });

                const data = await response.json();

                if (data.success) {
                    this.showAlert('Producto eliminado', 'success');
                    this.loadProducts();
                } else {
                    this.showAlert('Error al eliminar producto', 'error');
                }
            } catch (error) {
                this.showAlert('Error de conexión', 'error');
            }
        }
    }

    // ========== CONFIGURACIÓN WHATSAPP ==========

    // Cargar configuración de WhatsApp
    async loadWhatsAppConfig() {
        try {
            const response = await fetch('/api/admin/config/whatsapp');
            const data = await response.json();
            
            if (data.success && data.config) {
                this.whatsappConfig = data.config;
                this.displayWhatsAppConfig();
                console.log('Configuración WhatsApp cargada:', this.whatsappConfig);
            } else {
                console.log('No hay configuración de WhatsApp guardada');
            }
        } catch (error) {
            console.error('Error cargando configuración WhatsApp:', error);
            this.showAlert('Error al cargar configuración de WhatsApp', 'error');
        }
    }

    // Mostrar configuración de WhatsApp en el formulario
    displayWhatsAppConfig() {
        if (this.whatsappConfig) {
            document.getElementById('whatsapp-number').value = this.whatsappConfig.numero_whatsapp || '';
            document.getElementById('whatsapp-token').value = this.whatsappConfig.token_api || '';
            document.getElementById('whatsapp-phone-id').value = this.whatsappConfig.phone_id || '';
            document.getElementById('whatsapp-welcome').value = this.whatsappConfig.mensaje_bienvenida || '';
            document.getElementById('whatsapp-order').value = this.whatsappConfig.mensaje_pedido || '';
        }
    }

    // Guardar configuración de WhatsApp
    async saveWhatsAppConfig() {
        const configData = {
            numero_whatsapp: document.getElementById('whatsapp-number').value,
            mensaje_bienvenida: document.getElementById('whatsapp-welcome').value,
            mensaje_pedido: document.getElementById('whatsapp-order').value,
            token_api: document.getElementById('whatsapp-token').value,
            phone_id: document.getElementById('whatsapp-phone-id').value
        };

        // Validaciones básicas
        if (!configData.numero_whatsapp) {
            this.showAlert('El número de WhatsApp es obligatorio', 'error');
            return;
        }

        try {
            const response = await fetch('/api/admin/config/whatsapp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(configData)
            });

            const data = await response.json();

            if (data.success) {
                this.showAlert('Configuración de WhatsApp guardada correctamente', 'success');
                this.whatsappConfig = configData;
            } else {
                this.showAlert('Error al guardar configuración: ' + (data.error || 'Error desconocido'), 'error');
            }
        } catch (error) {
            console.error('Error guardando configuración WhatsApp:', error);
            this.showAlert('Error de conexión al guardar configuración', 'error');
        }
    }

    // Probar WhatsApp
    testWhatsApp() {
        const numero = document.getElementById('whatsapp-number').value;
        if (!numero) {
            this.showAlert('Primero ingresa un número de WhatsApp', 'error');
            return;
        }

        const mensaje = '¡Hola! Esta es una prueba de la integración de WhatsApp desde tu tienda online.';
        const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
    }

    // ========== MANEJO DE IMÁGENES ==========

    async handleImageSelect(file) {
        if (!file) return;

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            this.showAlert('Por favor selecciona un archivo de imagen válido', 'error');
            return;
        }

        // Validar tamaño (5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showAlert('La imagen es demasiado grande (máximo 5MB)', 'error');
            return;
        }

        this.currentImageFile = file;
        this.showImagePreview(file);
        
        // Subir imagen automáticamente
        await this.uploadImage(file);
    }

    showImagePreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('preview-img').src = e.target.result;
            document.getElementById('image-preview').style.display = 'block';
            document.getElementById('upload-area').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    removeSelectedImage() {
        this.currentImageFile = null;
        this.uploadedImageUrl = '';
        document.getElementById('product-image-url').value = '';
        document.getElementById('image-preview').style.display = 'none';
        document.getElementById('upload-area').style.display = 'block';
    }

    async uploadImage(file) {
        const formData = new FormData();
        formData.append('imagen', file);

        try {
            const response = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.uploadedImageUrl = data.imageUrl;
                document.getElementById('product-image-url').value = data.imageUrl;
                this.showAlert('Imagen subida correctamente', 'success');
            } else {
                this.showAlert('Error al subir imagen: ' + data.error, 'error');
                this.removeSelectedImage();
            }
        } catch (error) {
            this.showAlert('Error de conexión al subir imagen', 'error');
            this.removeSelectedImage();
        }
    }

    showAlert(message, type) {
        const alert = document.getElementById('alert');
        alert.textContent = message;
        alert.className = `alert ${type}`;
        alert.style.display = 'block';
        
        setTimeout(() => {
            alert.style.display = 'none';
        }, 3000);
    }
}

// Inicializar admin panel cuando se carga la página
const admin = new AdminPanel();

// Hacer funciones globales para los botones
window.testWhatsApp = () => {
    admin.testWhatsApp();
};