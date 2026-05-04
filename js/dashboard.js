document.addEventListener('DOMContentLoaded', () => {
    verificarSesion();
    cargarDatosTienda();
    cargarDashboard();
});

function verificarSesion() {
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    if (!token) window.location.href = '../index.html';
}

function cargarDatosTienda() {
    const tiendaData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TIENDA));
    const usuarioData = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USUARIO));
    if (tiendaData) {
        document.getElementById('nombreTienda').textContent = tiendaData.nombre;
        document.getElementById('codigoTienda').textContent = 'Código: ' + tiendaData.codigo;
    }
    if (usuarioData) {
        document.getElementById('nombreUsuario').textContent = '👤 ' + usuarioData.username;
    }
    // Fecha
    const fecha = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('fechaHoy').textContent = fecha;
}

function cargarDashboard() {
    const hoy = new Date().toDateString();
    
    // Ventas
    const ventas = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.VENTAS_PENDIENTES) || '[]');
    const ventasHoy = ventas.filter(v => new Date(v.fecha).toDateString() === hoy);
    const totalVentas = ventasHoy.reduce((s, v) => s + v.total, 0);
    const numTransacciones = ventasHoy.length;
    
    // Gastos
    const gastos = JSON.parse(localStorage.getItem('tienda_gastos') || '[]');
    const gastosHoy = gastos.filter(g => new Date(g.fecha).toDateString() === hoy);
    const totalGastos = gastosHoy.reduce((s, g) => s + g.monto, 0);
    
    // Fiao
    const clientes = JSON.parse(localStorage.getItem('tienda_clientes_fiao') || '[]');
    const fiaoPendiente = clientes.reduce((s, c) => s + c.saldo, 0);
    
    // Ganancia
    const abonos = JSON.parse(localStorage.getItem('tienda_abonos_fiao') || '[]');
    const abonosHoy = abonos.filter(a => new Date(a.fecha).toDateString() === hoy);
    const totalAbonos = abonosHoy.reduce((s, a) => s + a.monto, 0);
    const ganancia = totalVentas + totalAbonos - totalGastos;
    
    // Actualizar KPIs
    document.getElementById('kpiVentasHoy').textContent = '$' + totalVentas.toLocaleString();
    document.getElementById('kpiTransacciones').textContent = numTransacciones;
    document.getElementById('kpiFiaoPendiente').textContent = '$' + fiaoPendiente.toLocaleString();
    document.getElementById('kpiGastosHoy').textContent = '$' + totalGastos.toLocaleString();
    document.getElementById('kpiGanancia').textContent = '$' + ganancia.toLocaleString();
    
    // Alertas
    mostrarAlertas(clientes);
    
    // Últimas ventas
    const ultimas = ventasHoy.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 5);
    mostrarUltimasVentas(ultimas);
}

function mostrarAlertas(clientes) {
    const alertasDiv = document.getElementById('alertasSection');
    let html = '';
    
    // Stock bajo
    const productos = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.PRODUCTOS) || '[]');
    const stockBajo = productos.filter(p => p.stock <= (p.stockMinimo || 5) && p.stock > 0);
    if (stockBajo.length > 0) {
        html += '<div class="alerta advertencia">⚠️ ' + stockBajo.length + ' productos con stock bajo</div>';
    }
    
    const agotados = productos.filter(p => p.stock <= 0);
    if (agotados.length > 0) {
        html += '<div class="alerta peligro">❌ ' + agotados.length + ' productos agotados</div>';
    }
    
    // Fiao alto
    const fiaoAlto = clientes.filter(c => c.saldo > 0 && c.saldo >= c.cupoMaximo * 0.8);
    if (fiaoAlto.length > 0) {
        html += '<div class="alerta peligro">📝 ' + fiaoAlto.length + ' clientes cerca del cupo máximo</div>';
    }
    
    if (!html) {
        html = '<div class="alerta exito">✅ Todo en orden. ¡A vender!</div>';
    }
    
    alertasDiv.innerHTML = html;
}

function mostrarUltimasVentas(ventas) {
    const div = document.getElementById('ultimasVentas');
    if (ventas.length === 0) {
        div.innerHTML = '<p class="text-center">No hay ventas hoy</p>';
        return;
    }
    div.innerHTML = ventas.map(v => `
        <div class="venta-mini">
            <div class="venta-mini-info">
                <span class="venta-mini-items">${v.items.map(i => i.nombre + ' x' + i.cantidad).join(', ')}</span>
                <span class="venta-mini-hora">${new Date(v.fecha).toLocaleTimeString('es-CO', {hour:'2-digit',minute:'2-digit'})} - ${v.medioPago}</span>
            </div>
            <span class="venta-mini-total">$${v.total.toLocaleString()}</span>
        </div>
    `).join('');
}

function irA(pagina) {
    window.location.href = pagina;
}

function cerrarSesion() {
    if (confirm('¿Cerrar sesión?')) { localStorage.clear(); window.location.href = '../index.html'; }
}