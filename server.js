// ══════════════════════════════════════════════════════════
// FARMATICKET - SERVIDOR BACKEND
// Node.js + Express + MySQL
// ══════════════════════════════════════════════════════════

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares ──
app.use(cors()); // Permitir peticiones desde el frontend
app.use(express.json()); // Parsear JSON

// Configuración de Base de Datos
let dbConfig;

if (process.env.DATABASE_URL) {
    // Usar DATABASE_URL si está disponible
    dbConfig = process.env.DATABASE_URL;
} else {
    // Usar variables individuales
    dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'farmaticket',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };
}

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// ── Verificar conexión a la base de datos ──
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conectado a MySQL exitosamente');
        connection.release();
    } catch (error) {
        console.error('❌ Error conectando a MySQL:', error.message);
        process.exit(1);
    }
}

testConnection();

// ══════════════════════════════════════════════════════════
//  RUTAS - TICKETS
// ══════════════════════════════════════════════════════════

// Obtener todos los tickets del día
app.get('/api/tickets', async (req, res) => {
    try {
        const [tickets] = await pool.query(`
            SELECT 
                t.*,
                tt.nombre as tipo_nombre,
                tt.codigo as tipo_codigo,
                tt.icono as tipo_icono,
                tt.color_hex as tipo_color
            FROM tickets t
            INNER JOIN tipos_ticket tt ON t.id_tipo = tt.id_tipo
            WHERE DATE(t.fecha_creacion) = CURDATE()
            ORDER BY t.id_ticket DESC
        `);
        res.json(tickets);
    } catch (error) {
        console.error('Error obteniendo tickets:', error);
        res.status(500).json({ error: 'Error al obtener tickets' });
    }
});

// Crear nuevo ticket
app.post('/api/tickets', async (req, res) => {
    const { id_tipo, es_preferencial, sub_categoria } = req.body;
    
    try {
        // Generar número de ticket usando procedimiento almacenado
        const [tipo] = await pool.query('SELECT codigo FROM tipos_ticket WHERE id_tipo = ?', [id_tipo]);
        
        if (tipo.length === 0) {
            return res.status(400).json({ error: 'Tipo de ticket no válido' });
        }
        
        const codigo = tipo[0].codigo;
        
        // Llamar al procedimiento para generar número
        await pool.query('CALL generar_numero_ticket(?, @nuevo_numero)', [codigo]);
        const [result] = await pool.query('SELECT @nuevo_numero as numero');
        const numeroTicket = result[0].numero;
        
        // Insertar ticket
        const [insertResult] = await pool.query(`
            INSERT INTO tickets 
            (numero_ticket, id_tipo, es_preferencial, estado, fecha_creacion, sub_categoria)
            VALUES (?, ?, ?, 'Esperando', NOW(), ?)
        `, [numeroTicket, id_tipo, es_preferencial ? 1 : 0, sub_categoria || null]);
        
        // Obtener ticket completo
        const [nuevoTicket] = await pool.query(`
            SELECT 
                t.*,
                tt.nombre as tipo_nombre,
                tt.codigo as tipo_codigo,
                tt.icono as tipo_icono,
                tt.color_hex as tipo_color
            FROM tickets t
            INNER JOIN tipos_ticket tt ON t.id_tipo = tt.id_tipo
            WHERE t.id_ticket = ?
        `, [insertResult.insertId]);
        
        // Registrar en historial
        await pool.query(`
            INSERT INTO historial_tickets (id_ticket, tipo_cambio, descripcion)
            VALUES (?, 'Creacion', 'Ticket generado')
        `, [insertResult.insertId]);
        
        res.status(201).json(nuevoTicket[0]);
    } catch (error) {
        console.error('Error creando ticket:', error);
        res.status(500).json({ error: 'Error al crear ticket' });
    }
});

// Actualizar estado de ticket
app.put('/api/tickets/:id', async (req, res) => {
    const { id } = req.params;
    const { estado, id_empleado_atiende, estacion_atencion, observaciones } = req.body;
    
    try {
        const updates = [];
        const values = [];
        
        if (estado) {
            updates.push('estado = ?');
            values.push(estado);
            
            if (estado === 'Atendiendo') {
                updates.push('hora_llamado = NOW()');
                updates.push('hora_atencion = NOW()');
            } else if (estado === 'Completado') {
                updates.push('hora_completado = NOW()');
                updates.push(`tiempo_espera = TIMESTAMPDIFF(MINUTE, fecha_creacion, hora_atencion)`);
                updates.push(`tiempo_atencion = TIMESTAMPDIFF(MINUTE, hora_atencion, hora_completado)`);
            } else if (estado === 'Cancelado') {
                updates.push('hora_completado = NOW()');
                updates.push(`tiempo_espera = TIMESTAMPDIFF(MINUTE, fecha_creacion, NOW())`);
            }
        }
        
        if (id_empleado_atiende !== undefined) {
            updates.push('id_empleado_atiende = ?');
            values.push(id_empleado_atiende);
        }
        
        if (estacion_atencion) {
            updates.push('estacion_atencion = ?');
            values.push(estacion_atencion);
        }
        
        if (observaciones) {
            updates.push('observaciones = ?');
            values.push(observaciones);
        }
        
        values.push(id);
        
        await pool.query(`
            UPDATE tickets 
            SET ${updates.join(', ')}
            WHERE id_ticket = ?
        `, values);
        
        // Registrar cambio en historial
        await pool.query(`
            INSERT INTO historial_tickets (id_ticket, tipo_cambio, descripcion, id_empleado)
            VALUES (?, ?, ?, ?)
        `, [id, estado === 'Completado' ? 'Completado' : estado === 'Cancelado' ? 'Cancelado' : 'Modificado', 
            `Estado cambiado a ${estado}`, id_empleado_atiende]);
        
        // Obtener ticket actualizado
        const [ticketActualizado] = await pool.query(`
            SELECT 
                t.*,
                tt.nombre as tipo_nombre,
                tt.codigo as tipo_codigo,
                tt.icono as tipo_icono,
                tt.color_hex as tipo_color
            FROM tickets t
            INNER JOIN tipos_ticket tt ON t.id_tipo = tt.id_tipo
            WHERE t.id_ticket = ?
        `, [id]);
        
        res.json(ticketActualizado[0]);
    } catch (error) {
        console.error('Error actualizando ticket:', error);
        res.status(500).json({ error: 'Error al actualizar ticket' });
    }
});

// Cambiar tipo de ticket
app.put('/api/tickets/:id/tipo', async (req, res) => {
    const { id } = req.params;
    const { id_tipo_nuevo, id_empleado } = req.body;
    
    try {
        // Obtener tipo anterior
        const [ticketAnterior] = await pool.query('SELECT id_tipo FROM tickets WHERE id_ticket = ?', [id]);
        
        // Actualizar tipo
        await pool.query('UPDATE tickets SET id_tipo = ? WHERE id_ticket = ?', [id_tipo_nuevo, id]);
        
        // Registrar en historial
        await pool.query(`
            INSERT INTO historial_tickets 
            (id_ticket, tipo_cambio, id_tipo_anterior, id_tipo_nuevo, id_empleado, descripcion)
            VALUES (?, 'Modificado', ?, ?, ?, 'Tipo de ticket modificado')
        `, [id, ticketAnterior[0].id_tipo, id_tipo_nuevo, id_empleado]);
        
        // Obtener ticket actualizado
        const [ticketActualizado] = await pool.query(`
            SELECT 
                t.*,
                tt.nombre as tipo_nombre,
                tt.codigo as tipo_codigo,
                tt.icono as tipo_icono,
                tt.color_hex as tipo_color
            FROM tickets t
            INNER JOIN tipos_ticket tt ON t.id_tipo = tt.id_tipo
            WHERE t.id_ticket = ?
        `, [id]);
        
        res.json(ticketActualizado[0]);
    } catch (error) {
        console.error('Error cambiando tipo de ticket:', error);
        res.status(500).json({ error: 'Error al cambiar tipo de ticket' });
    }
});

// ══════════════════════════════════════════════════════════
//  RUTAS - EMPLEADOS
// ══════════════════════════════════════════════════════════

// Obtener todos los empleados
app.get('/api/empleados', async (req, res) => {
    try {
        const [empleados] = await pool.query(`
            SELECT 
                id_empleado,
                usuario,
                nombre,
                numero_identidad,
                cargo,
                direccion,
                correo,
                telefono,
                estacion_asignada,
                activo,
                fecha_registro
            FROM empleados
            ORDER BY nombre
        `);
        res.json(empleados);
    } catch (error) {
        console.error('Error obteniendo empleados:', error);
        res.status(500).json({ error: 'Error al obtener empleados' });
    }
});

// Login de empleado
app.post('/api/empleados/login', async (req, res) => {
    const { usuario, contrasena } = req.body;
    
    try {
        const [empleados] = await pool.query(`
            SELECT 
                id_empleado,
                usuario,
                nombre,
                numero_identidad,
                cargo,
                estacion_asignada,
                activo,
                contrasena
            FROM empleados
            WHERE usuario = ? AND activo = 1
        `, [usuario]);
        
        if (empleados.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
        }
        
        const empleado = empleados[0];
        
        // Verificar contraseña (en producción usar bcrypt)
        // const match = await bcrypt.compare(contrasena, empleado.contrasena);
        const match = contrasena === empleado.contrasena; // Temporal - sin encriptación
        
        if (!match) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }
        
        // No enviar la contraseña al cliente
        delete empleado.contrasena;
        
        res.json(empleado);
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});

// Crear nuevo empleado
app.post('/api/empleados', async (req, res) => {
    const { 
        usuario, 
        contrasena, 
        nombre, 
        numero_identidad, 
        cargo, 
        direccion, 
        correo, 
        telefono, 
        estacion_asignada 
    } = req.body;
    
    try {
        // Verificar si el usuario ya existe
        const [existente] = await pool.query('SELECT id_empleado FROM empleados WHERE usuario = ?', [usuario]);
        
        if (existente.length > 0) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }
        
        // Verificar si la identidad ya existe
        const [identidadExistente] = await pool.query('SELECT id_empleado FROM empleados WHERE numero_identidad = ?', [numero_identidad]);
        
        if (identidadExistente.length > 0) {
            return res.status(400).json({ error: 'El número de identidad ya está registrado' });
        }
        
        // Hash de contraseña (en producción)
        // const hashedPassword = await bcrypt.hash(contrasena, 10);
        const hashedPassword = contrasena; // Temporal
        
        // Insertar empleado
        const [result] = await pool.query(`
            INSERT INTO empleados 
            (usuario, contrasena, nombre, numero_identidad, cargo, direccion, correo, telefono, estacion_asignada, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [usuario, hashedPassword, nombre, numero_identidad, cargo, direccion, correo, telefono, estacion_asignada]);
        
        // Obtener empleado creado
        const [nuevoEmpleado] = await pool.query(`
            SELECT 
                id_empleado,
                usuario,
                nombre,
                numero_identidad,
                cargo,
                direccion,
                correo,
                telefono,
                estacion_asignada,
                activo,
                fecha_registro
            FROM empleados
            WHERE id_empleado = ?
        `, [result.insertId]);
        
        res.status(201).json(nuevoEmpleado[0]);
    } catch (error) {
        console.error('Error creando empleado:', error);
        res.status(500).json({ error: 'Error al crear empleado' });
    }
});

// Actualizar empleado
app.put('/api/empleados/:id', async (req, res) => {
    const { id } = req.params;
    const { 
        usuario, 
        contrasena, 
        nombre, 
        numero_identidad, 
        cargo, 
        direccion, 
        correo, 
        telefono, 
        estacion_asignada,
        activo 
    } = req.body;
    
    try {
        const updates = [];
        const values = [];
        
        if (usuario) {
            updates.push('usuario = ?');
            values.push(usuario);
        }
        
        if (contrasena) {
            // const hashedPassword = await bcrypt.hash(contrasena, 10);
            updates.push('contrasena = ?');
            values.push(contrasena);
        }
        
        if (nombre) {
            updates.push('nombre = ?');
            values.push(nombre);
        }
        
        if (numero_identidad) {
            updates.push('numero_identidad = ?');
            values.push(numero_identidad);
        }
        
        if (cargo) {
            updates.push('cargo = ?');
            values.push(cargo);
        }
        
        if (direccion !== undefined) {
            updates.push('direccion = ?');
            values.push(direccion);
        }
        
        if (correo !== undefined) {
            updates.push('correo = ?');
            values.push(correo);
        }
        
        if (telefono !== undefined) {
            updates.push('telefono = ?');
            values.push(telefono);
        }
        
        if (estacion_asignada !== undefined) {
            updates.push('estacion_asignada = ?');
            values.push(estacion_asignada);
        }
        
        if (activo !== undefined) {
            updates.push('activo = ?');
            values.push(activo ? 1 : 0);
        }
        
        values.push(id);
        
        await pool.query(`
            UPDATE empleados 
            SET ${updates.join(', ')}
            WHERE id_empleado = ?
        `, values);
        
        // Obtener empleado actualizado
        const [empleadoActualizado] = await pool.query(`
            SELECT 
                id_empleado,
                usuario,
                nombre,
                numero_identidad,
                cargo,
                direccion,
                correo,
                telefono,
                estacion_asignada,
                activo,
                fecha_registro
            FROM empleados
            WHERE id_empleado = ?
        `, [id]);
        
        res.json(empleadoActualizado[0]);
    } catch (error) {
        console.error('Error actualizando empleado:', error);
        res.status(500).json({ error: 'Error al actualizar empleado' });
    }
});

// Eliminar empleado (soft delete)
app.delete('/api/empleados/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        await pool.query('UPDATE empleados SET activo = 0 WHERE id_empleado = ?', [id]);
        res.json({ message: 'Empleado desactivado correctamente' });
    } catch (error) {
        console.error('Error eliminando empleado:', error);
        res.status(500).json({ error: 'Error al eliminar empleado' });
    }
});

// ══════════════════════════════════════════════════════════
//  RUTAS - TIPOS DE TICKET
// ══════════════════════════════════════════════════════════

app.get('/api/tipos-ticket', async (req, res) => {
    try {
        const [tipos] = await pool.query(`
            SELECT * FROM tipos_ticket WHERE activo = 1 ORDER BY id_tipo
        `);
        res.json(tipos);
    } catch (error) {
        console.error('Error obteniendo tipos de ticket:', error);
        res.status(500).json({ error: 'Error al obtener tipos de ticket' });
    }
});

// ══════════════════════════════════════════════════════════
//  RUTAS - REPORTES
// ══════════════════════════════════════════════════════════

app.get('/api/reportes/diario', async (req, res) => {
    const { fecha } = req.query;
    const fechaConsulta = fecha || new Date().toISOString().split('T')[0];
    
    try {
        // Obtener o crear reporte
        const [reporte] = await pool.query(`
            SELECT * FROM reportes_diarios WHERE fecha = ?
        `, [fechaConsulta]);
        
        if (reporte.length === 0) {
            // Generar reporte
            await pool.query('CALL actualizar_reporte_diario()');
            
            const [nuevoReporte] = await pool.query(`
                SELECT * FROM reportes_diarios WHERE fecha = ?
            `, [fechaConsulta]);
            
            res.json(nuevoReporte[0] || {});
        } else {
            res.json(reporte[0]);
        }
    } catch (error) {
        console.error('Error obteniendo reporte:', error);
        res.status(500).json({ error: 'Error al obtener reporte' });
    }
});

// ══════════════════════════════════════════════════════════
//  RUTA DE PRUEBA
// ══════════════════════════════════════════════════════════

app.get('/api/test', (req, res) => {
    res.json({ 
        message: '✅ FarmaTicket API funcionando correctamente',
        timestamp: new Date(),
        version: '1.0.0'
    });
});

// ══════════════════════════════════════════════════════════
//  INICIAR SERVIDOR
// ══════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║       🚀 FARMATICKET API SERVER           ║
╠════════════════════════════════════════════╣
║  Puerto: ${PORT}                           
║  URL: http://localhost:${PORT}             
║  Base de Datos: ${dbConfig.database}       
╚════════════════════════════════════════════╝
    `);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (error) => {
    console.error('❌ Error no manejado:', error);
});
