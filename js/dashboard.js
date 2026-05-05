document.addEventListener('DOMContentLoaded', function() {
    verificarSesion();
    cargarDatosTienda();
    cargarDashboard();
});

function verificarSesion() {
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN)) window.location.href = '../index.html';
}

function cargarDatosTienda() {
    var t = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TIENDA));
    var u = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USUARIO));
    if (t) { document.getElementById('nombreTienda').textContent = t.nombre; document.getElementById('codigoTienda').textContent = 'Código: ' + t.codigo; }
    if (u) { document.getElementById('nombreUsuario').textContent = '👤 ' + u.username; }
    var fecha = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('fechaHoy').textContent = fecha;
}

function cargarDashboard() {
    var hoy = new Date().toDateString();
    
    var ventas = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.VENTAS_PENDIENTES) || '[]');
    var ventasHoy = ventas.filter(function(v) { return new Date(v.fecha).toDateString() === hoy; });
    var totalVentas = ventasHoy.reduce(function(s, v) { return s + v.total; }, 0);
    
    var gastos = JSON.parse(localStorage.getItem('tienda_gastos') || '[]');
    var gastosHoy = gastos.filter(function(g) { return new Date(g.fecha).toDateString() === hoy; });
    var totalGastos = gastosHoy.reduce(function(s, g) { return s + g.monto; }, 0);
    
    var clientes = JSON.parse(localStorage.getItem('tienda_clientes_fiao') || '[]');
    var fiaoPendiente = clientes.reduce(function(s, c) { return s + c.saldo; }, 0);
    
    var abonos = JSON.parse(localStorage.getItem('tienda_abonos_fiao') || '[]');
    var abonosHoy = abonos.filter(function(a) { return new Date(a.fecha).toDateString() === hoy; });
    var totalAbonos = abonosHoy.reduce(function(s, a) { return s + a.monto; }, 0);
    var ganancia = totalVentas + totalAbonos - totalGastos;
    
    document.getElementById('kpiVentasHoy').textContent = '$' + totalVentas.toLocaleString();
    document.getElementById('kpiTransacciones').textContent = ventasHoy.length;
    document.getElementById('kpiFiaoPendiente').textContent = '$' + fiaoPendiente.toLocaleString();
    document.getElementById('kpiGastosHoy').textContent = '$' + totalGastos.toLocaleString();
    document.getElementById('kpiGanancia').textContent = '$' + ganancia.toLocaleString();
    
    mostrarAlertas();
    mostrarUltimasVentas(ventasHoy.slice(0, 5));
}

function mostrarAlertas() {
    var div = document.getElementById('alertasSection');
    var html = '';
    var alertas = 0;
    
    // STOCK BAJO
    var productos = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.PRODUCTOS) || '[]');
    var stockBajo = productos.filter(function(p) { return p.stock > 0 && p.stock <= (p.stockMinimo || 5); });
    var agotados = productos.filter(function(p) { return p.stock <= 0; });
    
    if (agotados.length > 0) {
        html += '<div class="alerta peligro" onclick="irA(\'inventario.html\')" style="cursor:pointer;">' +
            '<span>❌</span><div><strong>' + agotados.length + ' productos agotados</strong><br><small>' + 
            agotados.slice(0, 3).map(function(p) { return p.nombre; }).join(', ') + 
            (agotados.length > 3 ? ' y más...' : '') + '</small></div></div>';
        alertas++;
    }
    
    if (stockBajo.length > 0) {
        html += '<div class="alerta advertencia" onclick="irA(\'inventario.html\')" style="cursor:pointer;">' +
            '<span>⚠️</span><div><strong>' + stockBajo.length + ' productos con stock bajo</strong><br><small>' + 
            stockBajo.slice(0, 3).map(function(p) { 
    var s = parseInt(p.stock);
    return p.nombre + ' (' + s + (p.unidad === 'LIBRA' ? 'g' : '') + ')'; 
}).join(', ') + 
            (stockBajo.length > 3 ? ' y más...' : '') + '</small></div></div>';
        alertas++;
    }
    
    // CUENTAS POR COBRAR
    var clientes = JSON.parse(localStorage.getItem('tienda_clientes_fiao') || '[]');
    var fiaoAlto = clientes.filter(function(c) { return c.saldo > 0 && c.saldo >= c.cupoMaximo * 0.8; });
    var fiaoNormal = clientes.filter(function(c) { return c.saldo > 0 && c.saldo < c.cupoMaximo * 0.8; });
    
    if (fiaoAlto.length > 0) {
        html += '<div class="alerta peligro" onclick="irA(\'fiao.html\')" style="cursor:pointer;">' +
            '<span>📝</span><div><strong>' + fiaoAlto.length + ' clientes cerca del límite de crédito</strong><br><small>' + 
            fiaoAlto.map(function(c) { return c.nombre + ': $' + c.saldo.toLocaleString(); }).join(', ') + 
            '</small></div></div>';
        alertas++;
    }
    
    if (fiaoNormal.length > 0) {
        var totalFiao = fiaoNormal.reduce(function(s, c) { return s + c.saldo; }, 0);
        html += '<div class="alerta info" onclick="irA(\'fiao.html\')" style="cursor:pointer;">' +
            '<span>💰</span><div><strong>' + fiaoNormal.length + ' clientes con crédito pendiente</strong><br><small>Total: $' + 
            totalFiao.toLocaleString() + '</small></div></div>';
        alertas++;
    }
    
    if (alertas === 0) {
        html = '<div class="alerta exito"><span>✅</span> ¡Todo en orden! No hay alertas pendientes.</div>';
    }
    
    div.innerHTML = html;
}

function mostrarUltimasVentas(ventas) {
    var div = document.getElementById('ultimasVentas');
    if (ventas.length === 0) { div.innerHTML = '<p class="text-center">No hay ventas hoy</p>'; return; }
    div.innerHTML = ventas.sort(function(a, b) { return new Date(b.fecha) - new Date(a.fecha); }).map(function(v) {
        return '<div class="venta-mini"><div class="venta-mini-info"><span class="venta-mini-items">' + 
            v.items.map(function(i) { return i.nombre + (i.gramos ? ' (' + i.gramos + 'g)' : ''); }).join(', ') + 
            '</span><span class="venta-mini-hora">' + new Date(v.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) + 
            ' - ' + (v.medioPago === 'CREDITO' ? '📝 Crédito' : '💵 ' + v.medioPago) + '</span></div>' +
            '<span class="venta-mini-total">$' + v.total.toLocaleString() + '</span></div>';
    }).join('');
}

function irA(pagina) { window.location.href = pagina; }
function cerrarSesion() { if (confirm('¿Cerrar sesión?')) { localStorage.clear(); window.location.href = '../index.html'; } }