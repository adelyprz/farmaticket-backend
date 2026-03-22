// ══════════════════════════════════════════════════════════
// FARMATICKET - API CLIENT
// Módulo para comunicación con el backend
// ══════════════════════════════════════════════════════════

const API_URL = 'http://localhost:3000/api';

// ══════════════════════════════════════════════════════════
//  TICKETS
// ══════════════════════════════════════════════════════════

const TicketsAPI = {
    // Obtener todos los tickets del día
    getAll: async () => {
        const response = await fetch(`${API_URL}/tickets`);
        if (!response.ok) throw new Error('Error al obtener tickets');
        return await response.json();
    },

    // Crear nuevo ticket
    create: async (ticketData) => {
        const response = await fetch(`${API_URL}/tickets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ticketData)
        });
        if (!response.ok) throw new Error('Error al crear ticket');
        return await response.json();
    },

    // Actualizar ticket
    update: async (id, updateData) => {
        const response = await fetch(`${API_URL}/tickets/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        if (!response.ok) throw new Error('Error al actualizar ticket');
        return await response.json();
    },

    // Cambiar tipo de ticket
    cambiarTipo: async (id, idTipoNuevo, idEmpleado) => {
        const response = await fetch(`${API_URL}/tickets/${id}/tipo`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_tipo_nuevo: idTipoNuevo, id_empleado: idEmpleado })
        });
        if (!response.ok) throw new Error('Error al cambiar tipo de ticket');
        return await response.json();
    }
};

// ══════════════════════════════════════════════════════════
//  EMPLEADOS
// ══════════════════════════════════════════════════════════

const EmpleadosAPI = {
    // Obtener todos los empleados
    getAll: async () => {
        const response = await fetch(`${API_URL}/empleados`);
        if (!response.ok) throw new Error('Error al obtener empleados');
        return await response.json();
    },

    // Login de empleado
    login: async (usuario, contrasena) => {
        const response = await fetch(`${API_URL}/empleados/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, contrasena })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al iniciar sesión');
        }
        return await response.json();
    },

    // Crear empleado
    create: async (empleadoData) => {
        const response = await fetch(`${API_URL}/empleados`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(empleadoData)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear empleado');
        }
        return await response.json();
    },

    // Actualizar empleado
    update: async (id, empleadoData) => {
        const response = await fetch(`${API_URL}/empleados/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(empleadoData)
        });
        if (!response.ok) throw new Error('Error al actualizar empleado');
        return await response.json();
    },

    // Eliminar empleado (soft delete)
    delete: async (id) => {
        const response = await fetch(`${API_URL}/empleados/${id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Error al eliminar empleado');
        return await response.json();
    }
};

// ══════════════════════════════════════════════════════════
//  TIPOS DE TICKET
// ══════════════════════════════════════════════════════════

const TiposTicketAPI = {
    // Obtener todos los tipos
    getAll: async () => {
        const response = await fetch(`${API_URL}/tipos-ticket`);
        if (!response.ok) throw new Error('Error al obtener tipos de ticket');
        return await response.json();
    }
};

// ══════════════════════════════════════════════════════════
//  REPORTES
// ══════════════════════════════════════════════════════════

const ReportesAPI = {
    // Obtener reporte diario
    getDiario: async (fecha = null) => {
        const url = fecha 
            ? `${API_URL}/reportes/diario?fecha=${fecha}`
            : `${API_URL}/reportes/diario`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al obtener reporte');
        return await response.json();
    }
};

// ══════════════════════════════════════════════════════════
//  EXPORTAR API
// ══════════════════════════════════════════════════════════

const API = {
    tickets: TicketsAPI,
    empleados: EmpleadosAPI,
    tiposTicket: TiposTicketAPI,
    reportes: ReportesAPI,
    
    // Verificar conexión con el backend
    test: async () => {
        try {
            const response = await fetch(`${API_URL}/test`);
            if (!response.ok) throw new Error('Backend no disponible');
            return await response.json();
        } catch (error) {
            console.error('Error conectando con backend:', error);
            throw error;
        }
    }
};

// Para usar en el HTML
if (typeof window !== 'undefined') {
    window.FarmaTicketAPI = API;
}

// Para usar en Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}
