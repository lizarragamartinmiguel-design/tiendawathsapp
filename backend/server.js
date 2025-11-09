require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3002;

// Configuración de SQLite
const dbPath = path.join(__dirname, 'tienda.db');
const db = new sqlite3.Database(dbPath);

// Configurar Multer para upload de imágenes
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'), false);
        }
    }
});

// Inicializar base de datos
const initDatabase = () => {
    db.serialize(() => {
        // Tabla de productos
        db.run(`CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            precio REAL NOT NULL,
            categoria TEXT,
            descripcion TEXT,
            imagen TEXT,
            stock INTEGER DEFAULT 0,
            activo BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabla de usuarios admin
        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            email TEXT,
            rol TEXT DEFAULT 'admin',
            activo BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabla de configuración de WhatsApp
        db.run(`CREATE TABLE IF NOT EXISTS config_whatsapp (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero_whatsapp TEXT,
            mensaje_bienvenida TEXT,
            mensaje_pedido TEXT,
            token_api TEXT,
            phone_id TEXT,
            activo BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Insertar usuario admin por defecto
        const passwordHash = bcrypt.hashSync('admin123', 10);
        db.run(`INSERT OR IGNORE INTO usuarios (username, password_hash, email, rol) 
                VALUES (?, ?, ?, ?)`, 
                ['admin', passwordHash, 'admin@tienda.com', 'admin']);

        // Insertar configuración WhatsApp por defecto
        db.run(`INSERT OR IGNORE INTO config_whatsapp 
                (numero_whatsapp, mensaje_bienvenida, mensaje_pedido) 
                VALUES (?, ?, ?)`, 
                ['1234567890', '¡Hola! Bienvenido a nuestra tienda. ¿En qué puedo ayudarte?', 'Gracias por tu pedido. Nos pondremos en contacto contigo pronto.']);

        // Insertar productos de ejemplo
        db.run(`INSERT OR IGNORE INTO productos 
                (nombre, precio, categoria, descripcion, stock) 
                VALUES (?, ?, ?, ?, ?)`, 
                ['Camiseta Básica', 25000, 'Ropa', 'Camiseta 100% algodón', 50]);

        db.run(`INSERT OR IGNORE INTO productos 
                (nombre, precio, categoria, descripcion, stock) 
                VALUES (?, ?, ?, ?, ?)`, 
                ['Zapatos Deportivos', 120000, 'Calzado', 'Zapatos para running', 25]);

        console.log('✅ Base de datos SQLite inicializada correctamente');
    });
};

// Inicializar BD
initDatabase();

// Helper para promesas con SQLite
const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/uploads', express.static(uploadsDir));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'sqlite_secret_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ========== MIDDLEWARE Y RUTAS BÁSICAS ==========

// Login admin
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'admin123') {
        req.session.isAdmin = true;
        req.session.username = username;
        res.json({ success: true, message: 'Login exitoso' });
    } else {
        res.status(401).json({ success: false, error: 'Credenciales incorrectas' });
    }
});

// Middleware para verificar admin
const requireAdmin = (req, res, next) => {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(401).json({ error: 'No autorizado' });
    }
};

// ========== RUTAS PÚBLICAS ==========

// Obtener todos los productos
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await dbAll('SELECT * FROM productos WHERE activo = 1 ORDER BY created_at DESC');
        res.json(productos);
    } catch (error) {
        console.error('Error en API productos:', error);
        res.status(500).json({ error: 'Error al cargar productos' });
    }
});

// Obtener producto por ID
app.get('/api/productos/:id', async (req, res) => {
    try {
        const producto = await dbGet('SELECT * FROM productos WHERE id = ? AND activo = 1', [req.params.id]);
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(producto);
    } catch (error) {
        res.status(500).json({ error: 'Error al cargar producto' });
    }
});

// ========== RUTAS PROTEGIDAS (ADMIN) ==========

// Obtener configuración de WhatsApp
app.get('/api/admin/config/whatsapp', requireAdmin, async (req, res) => {
    try {
        const config = await dbGet('SELECT * FROM config_whatsapp WHERE activo = 1 ORDER BY id DESC LIMIT 1');
        res.json({ success: true, config: config || {} });
    } catch (error) {
        console.error('Error obteniendo configuración WhatsApp:', error);
        res.status(500).json({ error: 'Error al cargar configuración' });
    }
});

// Guardar configuración de WhatsApp
app.post('/api/admin/config/whatsapp', requireAdmin, async (req, res) => {
    try {
        const { numero_whatsapp, mensaje_bienvenida, mensaje_pedido, token_api, phone_id } = req.body;
        
        // Verificar si ya existe configuración
        const existingConfig = await dbGet('SELECT * FROM config_whatsapp WHERE activo = 1');
        
        if (existingConfig) {
            // Actualizar configuración existente
            await dbRun(
                `UPDATE config_whatsapp 
                 SET numero_whatsapp = ?, mensaje_bienvenida = ?, mensaje_pedido = ?, 
                     token_api = ?, phone_id = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [numero_whatsapp, mensaje_bienvenida, mensaje_pedido, token_api, phone_id, existingConfig.id]
            );
        } else {
            // Crear nueva configuración
            await dbRun(
                `INSERT INTO config_whatsapp 
                 (numero_whatsapp, mensaje_bienvenida, mensaje_pedido, token_api, phone_id) 
                 VALUES (?, ?, ?, ?, ?)`,
                [numero_whatsapp, mensaje_bienvenida, mensaje_pedido, token_api, phone_id]
            );
        }
        
        res.json({ 
            success: true, 
            message: 'Configuración de WhatsApp guardada correctamente' 
        });
    } catch (error) {
        console.error('Error guardando configuración WhatsApp:', error);
        res.status(500).json({ error: 'Error al guardar configuración' });
    }
});

// Ruta para upload de imágenes
app.post('/api/admin/upload', requireAdmin, upload.single('imagen'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No se subió ningún archivo' });
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        res.json({ 
            success: true, 
            imageUrl: imageUrl,
            message: 'Imagen subida correctamente'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Crear producto con imagen
app.post('/api/admin/productos', requireAdmin, async (req, res) => {
    try {
        const { nombre, precio, categoria, descripcion, imagen, stock } = req.body;
        
        const result = await dbRun(
            `INSERT INTO productos (nombre, precio, categoria, descripcion, imagen, stock) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nombre, precio, categoria, descripcion, imagen, stock || 0]
        );
        
        res.json({ 
            success: true, 
            producto: { 
                id: result.id, 
                nombre, 
                precio, 
                categoria, 
                descripcion, 
                imagen, 
                stock: stock || 0 
            }
        });
    } catch (error) {
        console.error('Error creando producto:', error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// Actualizar producto con imagen
app.put('/api/admin/productos/:id', requireAdmin, async (req, res) => {
    try {
        const { nombre, precio, categoria, descripcion, imagen, stock } = req.body;
        
        await dbRun(
            `UPDATE productos 
             SET nombre = ?, precio = ?, categoria = ?, descripcion = ?, 
                 imagen = ?, stock = ?
             WHERE id = ?`,
            [nombre, precio, categoria, descripcion, imagen, stock || 0, req.params.id]
        );
        
        res.json({ 
            success: true, 
            producto: { 
                id: req.params.id, 
                nombre, 
                precio, 
                categoria, 
                descripcion, 
                imagen, 
                stock: stock || 0 
            }
        });
    } catch (error) {
        console.error('Error actualizando producto:', error);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

// Eliminar producto (soft delete)
app.delete('/api/admin/productos/:id', requireAdmin, async (req, res) => {
    try {
        await dbRun(
            'UPDATE productos SET activo = 0 WHERE id = ?',
            [req.params.id]
        );
        
        res.json({ 
            success: true, 
            message: 'Producto eliminado correctamente' 
        });
    } catch (error) {
        console.error('Error eliminando producto:', error);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

// ========== RUTAS PRINCIPALES ==========

// Ruta del panel admin
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'admin.html'));
});

// Ruta principal - DEBE estar al final
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
    console.log(`👨‍💼 Panel admin: http://localhost:${PORT}/admin`);
    console.log(`📁 Uploads: http://localhost:${PORT}/uploads/`);
    console.log(`💬 Config WhatsApp: Disponible en panel admin`);
});