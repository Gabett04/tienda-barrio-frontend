// =============================================
// LÓGICA DE VENTAS - COMPLETO CON GRAMOS Y SYNC
// =============================================

let carrito = [];
let productos = [];
let medioPagoSeleccionado = null;

const productosEjemplo = [
    { id: 1, nombre: 'Arroz Libra', precio: 1800, stock: 50, categoria: 'Abarrotes', unidad: 'UNIDAD' },
    { id: 2, nombre: 'Huevos Unidad', precio: 600, stock: 100, categoria: 'Lácteos y Huevos', unidad: 'UNIDAD' },
    { id: 3, nombre: 'Leche Bolsa', precio: 4500, stock: 30, categoria: 'Lácteos y Huevos', unidad: 'UNIDAD' },
    { id: 4, nombre: 'Pan Aliñado', precio: 400, stock: 80, categoria: 'Pan y Repostería', unidad: 'UNIDAD' },
    { id: 5, nombre: 'Gaseosa Personal', precio: 2500, stock: 60, categoria: 'Bebidas', unidad: 'UNIDAD' },
    { id: 6, nombre: 'Chicle', precio: 200, stock: 200, categoria: 'Golosinas y Paquetes', unidad: 'UNIDAD' },
    { id: 7, nombre: 'Jabón Rey', precio: 2600, stock: 40, categoria: 'Aseo Hogar', unidad: 'UNIDAD' },
    { id: 8, nombre: 'Papel Higiénico', precio: 1500, stock: 70, categoria: 'Aseo Personal', unidad: 'UNIDAD' },
    { id: 9, nombre: 'Café Sello Rojo 250g', precio: 9500, stock: 25, categoria: 'Abarrotes', unidad: 'UNIDAD' },
    { id: 10, nombre: 'Arroz Kilo', precio: 3500, stock: 35, categoria: 'Abarrotes', unidad: 'UNIDAD' },
    { id: 11, nombre: 'Mogolla', precio: 500, stock: 90, categoria: 'Pan y Repostería', unidad: 'UNIDAD' },
    { id: 12, nombre: 'Detergente Sobre', precio: 1000, stock: 55, categoria: 'Aseo Hogar', unidad: 'UNIDAD' },
    { id: 13, nombre: 'Queso Libra', precio: 8000, stock: 20000, categoria: 'Lácteos y Huevos', unidad: 'LIBRA' },
    { id: 14, nombre: 'Carne Libra', precio: 12000, stock: 15000, categoria: 'Abarrotes', unidad: 'LIBRA' },
    { id: 15, nombre: 'Azúcar Libra', precio: 1200, stock: 80000, categoria: 'Abarrotes', unidad: 'LIBRA' }
];

document.addEventListener('DOMContentLoaded', function() {
    verificarSesion(); cargarDatosTienda(); cargarProductos();
    configurarBusqueda(); configurarCalculoCambio();
});

function verificarSesion() { if (!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN)) window.location.href = '../index.html'; }

function cargarDatosTienda() {
    var t = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TIENDA));
    var u = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USUARIO));
    if (t) { document.getElementById('nombreTienda').textContent = t.nombre; document.getElementById('codigoTienda').textContent = 'Código: ' + t.codigo; }
    if (u) { document.getElementById('nombreUsuario').textContent = '👤 ' + u.username; }
}

function cargarClientesFiaoSelect() {
    var clientes = JSON.parse(localStorage.getItem('tienda_clientes_fiao') || '[]');
    var activos = clientes.filter(function(c) { return c.estado === 'ACTIVO'; });
    var select = document.getElementById('clienteFiao');
    if (!select) return;
    if (activos.length === 0) { select.innerHTML = '<option value="">No hay clientes</option>'; return; }
    select.innerHTML = '<option value="">-- Seleccionar --</option>' + activos.map(function(c) {
        return '<option value="' + c.id + '">' + c.nombre + (c.apodo ? ' "' + c.apodo + '"' : '') + ' (Saldo: $' + c.saldo.toLocaleString() + ')</option>';
    }).join('');
}

function cargarProductos() {
    var guardados = localStorage.getItem(CONFIG.STORAGE_KEYS.PRODUCTOS);
    if (guardados) { productos = JSON.parse(guardados); }
    else { productos = []; localStorage.setItem(CONFIG.STORAGE_KEYS.PRODUCTOS, JSON.stringify([])); }
    mostrarProductos(productos); cargarCategorias();
}

function cargarCategorias() {
    var cats = ['todas']; productos.forEach(function(p) { if (cats.indexOf(p.categoria) === -1) cats.push(p.categoria); });
    document.getElementById('categorias').innerHTML = cats.map(function(cat) {
        return '<button class="categoria-btn' + (cat === 'todas' ? ' active' : '') + '" onclick="filtrarPorCategoria(\'' + cat + '\')">' + (cat === 'todas' ? '📦 Todas' : cat) + '</button>';
    }).join('');
}

function mostrarProductos(lista) {
    var grid = document.getElementById('productosGrid');
    if (lista.length === 0) { grid.innerHTML = '<p class="mensaje-vacio">No hay productos</p>'; return; }
    grid.innerHTML = lista.map(function(p) {
        var precioTexto = '$' + p.precio.toLocaleString();
        var unidadTexto = p.unidad === 'LIBRA' ? ' x 500g' : '';
        var stockTexto;
        if (p.unidad === 'LIBRA') { stockTexto = parseInt(p.stock).toLocaleString() + 'g'; }
        else { stockTexto = parseInt(p.stock).toLocaleString(); }
        return '<div class="producto-card' + (p.stock <= 0 ? ' sin-stock' : '') + '" ' + (p.stock > 0 ? 'onclick="agregarAlCarrito(' + p.id + ')"' : '') + '>' +
            '<div class="producto-nombre">' + p.nombre + '</div>' +
            '<div class="producto-precio">' + precioTexto + unidadTexto + '</div>' +
            '<div class="producto-stock">Stock: ' + stockTexto + '</div></div>';
    }).join('');
}

function configurarBusqueda() {
    document.getElementById('buscarProducto').addEventListener('input', function() {
        var t = this.value.toLowerCase();
        mostrarProductos(productos.filter(function(p) { return p.nombre.toLowerCase().includes(t) || p.categoria.toLowerCase().includes(t); }));
    });
}

function configurarCalculoCambio() {
    var input = document.getElementById('pagaCon');
    if (input) input.addEventListener('input', calcularCambio);
}

function filtrarPorCategoria(cat) {
    document.querySelectorAll('.categoria-btn').forEach(function(b) { b.classList.remove('active'); });
    var btn = document.querySelector('[data-categoria="' + cat + '"]');
    if (btn) btn.classList.add('active');
    mostrarProductos(cat === 'todas' ? productos : productos.filter(function(p) { return p.categoria === cat; }));
    document.getElementById('buscarProducto').value = '';
}

function agregarAlCarrito(id) {
    var p = productos.find(function(x) { return x.id === id; });
    if (!p || p.stock <= 0) return;
    var cantidad = 1;
    var precioUnitario = p.precio;
    if (p.unidad === 'LIBRA') {
        var gramos = prompt('¿Cuántos gramos? (500g = $' + p.precio.toLocaleString() + ')', '500');
        if (!gramos) return;
        gramos = parseInt(gramos);
        if (isNaN(gramos) || gramos <= 0) { alert('Cantidad inválida'); return; }
        cantidad = gramos;
        precioUnitario = Math.round((p.precio / 500) * gramos / 100) * 100;
    }
    carrito.push({ id: p.id, nombre: p.nombre, precio: precioUnitario, cantidad: 1, gramos: p.unidad === 'LIBRA' ? cantidad : null, unidad: p.unidad || 'UNIDAD' });
    actualizarCarrito();
}

function actualizarCarrito() {
    var div = document.getElementById('carritoItems');
    if (carrito.length === 0) { div.innerHTML = '<p class="carrito-vacio">No hay productos</p>'; }
    else {
        div.innerHTML = carrito.map(function(item, i) {
            var nombreMostrar = item.nombre + (item.gramos ? ' (' + item.gramos + 'g)' : '');
            return '<div class="carrito-item"><div class="carrito-item-info"><div class="carrito-item-nombre">' + nombreMostrar + '</div><div class="carrito-item-precio">$' + item.precio.toLocaleString() + '</div></div><button class="btn-cantidad" onclick="eliminarDelCarrito(' + i + ')">✕</button></div>';
        }).join('');
    }
    calcularTotales();
}

function eliminarDelCarrito(i) { carrito.splice(i, 1); actualizarCarrito(); }

function calcularTotales() {
    var s = carrito.reduce(function(a, i) { return a + i.precio; }, 0);
    document.getElementById('subtotal').textContent = '$' + s.toLocaleString();
    document.getElementById('totalFinal').textContent = '$' + s.toLocaleString();
}

function vaciarCarrito() { if (carrito.length && confirm('¿Vaciar?')) { carrito = []; actualizarCarrito(); } }

function cobrar() {
    if (carrito.length === 0) { alert('Agrega productos'); return; }
    var total = carrito.reduce(function(s, i) { return s + i.precio; }, 0);
    document.getElementById('totalCobro').textContent = '$' + total.toLocaleString();
    document.getElementById('modalCobro').style.display = 'flex';
    medioPagoSeleccionado = null;
    document.querySelectorAll('.pago-btn').forEach(function(b) { b.classList.remove('seleccionado'); });
    document.getElementById('pagoEfectivo').style.display = 'none';
    document.getElementById('pagoFiao').style.display = 'none';
    document.getElementById('pagaCon').value = '';
    document.getElementById('cambio').textContent = '$0';
}

function seleccionarPago(medio) {
    medioPagoSeleccionado = medio;
    document.querySelectorAll('.pago-btn').forEach(function(b) { b.classList.remove('seleccionado'); });
    document.getElementById('pagoEfectivo').style.display = 'none';
    document.getElementById('pagoFiao').style.display = 'none';
    if (medio === 'EFECTIVO') {
        document.getElementById('pagoEfectivo').style.display = 'block'; document.getElementById('pagaCon').focus();
        document.querySelectorAll('.pago-btn')[0].classList.add('seleccionado');
    } else if (medio === 'NEQUI') {
        document.querySelectorAll('.pago-btn')[1].classList.add('seleccionado');
    } else if (medio === 'DAVIPLATA') {
        document.querySelectorAll('.pago-btn')[2].classList.add('seleccionado');
    } else if (medio === 'CREDITO') {
        document.getElementById('pagoFiao').style.display = 'block';
        document.querySelectorAll('.pago-btn')[3].classList.add('seleccionado');
        cargarClientesFiaoSelect();
    }
}

function calcularCambio() {
    var t = carrito.reduce(function(s, i) { return s + i.precio; }, 0);
    var p = parseInt(document.getElementById('pagaCon').value) || 0;
    var c = p - t;
    document.getElementById('cambio').textContent = c >= 0 ? '$' + c.toLocaleString() : 'Falta dinero';
    document.getElementById('cambio').style.color = c >= 0 ? '#4CAF50' : 'red';
}

function confirmarVenta() {
    if (!medioPagoSeleccionado) { alert('Selecciona medio de pago'); return; }
    var total = carrito.reduce(function(s, i) { return s + i.precio; }, 0);
    if (medioPagoSeleccionado === 'EFECTIVO') { var paga = parseInt(document.getElementById('pagaCon').value) || 0; if (paga < total) { alert('Monto insuficiente'); return; } }
    
    var clienteFiaoData = null;
    if (medioPagoSeleccionado === 'CREDITO') {
        var cid = document.getElementById('clienteFiao').value;
        if (!cid) { alert('Selecciona un cliente'); return; }
        var clientes = JSON.parse(localStorage.getItem('tienda_clientes_fiao') || '[]');
        var cli = clientes.find(function(c) { return c.id == cid; });
        if (!cli) { alert('Cliente no encontrado'); return; }
        if (cli.estado === 'BLOQUEADO') { alert('Cliente bloqueado'); return; }
        if ((cli.saldo + total) > cli.cupoMaximo) { alert('Excede cupo máximo'); return; }
        clienteFiaoData = cli;
    }
    
    carrito.forEach(function(item) { var p = productos.find(function(x) { return x.id === item.id; }); if (p) { if (item.gramos) { p.stock -= item.gramos; } else { p.stock -= item.cantidad; } } });
    localStorage.setItem(CONFIG.STORAGE_KEYS.PRODUCTOS, JSON.stringify(productos));
    
    if (medioPagoSeleccionado === 'CREDITO' && clienteFiaoData) {
        var clientes = JSON.parse(localStorage.getItem('tienda_clientes_fiao') || '[]');
        var idx = clientes.findIndex(function(c) { return c.id == clienteFiaoData.id; });
        if (idx !== -1) { clientes[idx].saldo += total; clientes[idx].totalPrestado += total; }
        localStorage.setItem('tienda_clientes_fiao', JSON.stringify(clientes));
        if (typeof Sync !== 'undefined' && idx !== -1) {
            Sync.sincronizarCliente({
                id: clientes[idx].id, nombre: clientes[idx].nombre, apodo: clientes[idx].apodo || '',
                telefono: clientes[idx].telefono || '', cupoMaximo: clientes[idx].cupoMaximo,
                saldo: clientes[idx].saldo, totalPrestado: clientes[idx].totalPrestado,
                totalAbonado: clientes[idx].totalAbonado || 0, estado: clientes[idx].estado
            });
        }
    }
    
    var venta = { id: Date.now(), fecha: new Date().toISOString(), items: JSON.parse(JSON.stringify(carrito)), total: total, medioPago: medioPagoSeleccionado, clienteFiao: clienteFiaoData ? { id: clienteFiaoData.id, nombre: clienteFiaoData.nombre } : null };
    var ventasPendientes = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.VENTAS_PENDIENTES) || '[]');
    ventasPendientes.push(venta);
    localStorage.setItem(CONFIG.STORAGE_KEYS.VENTAS_PENDIENTES, JSON.stringify(ventasPendientes));
    if (typeof Sync !== 'undefined') { 
        Sync.sincronizarVenta(venta); 
        productos.forEach(function(p) { Sync.sincronizarProducto({ id: p.id, nombre: p.nombre, stock: p.stock, precio: p.precio, unidad: p.unidad || 'UNIDAD' }); }); 
    }
    
    var cambio = 0; if (medioPagoSeleccionado === 'EFECTIVO') cambio = (parseInt(document.getElementById('pagaCon').value) || 0) - total;
    mostrarTicket(venta, cambio);
    carrito = []; actualizarCarrito(); cancelarCobro(); cargarProductos();
}

function cancelarCobro() { document.getElementById('modalCobro').style.display = 'none'; medioPagoSeleccionado = null; }

function mostrarTicket(venta, cambio) {
    var itemsHtml = venta.items.map(function(i) { var n = i.nombre + (i.gramos ? ' (' + i.gramos + 'g)' : ''); return '<tr><td>' + n + '</td><td style="text-align:right;">$' + i.precio.toLocaleString() + '</td></tr>'; }).join('');
    var html = '<div class="ticket-overlay" id="ticketOverlay" onclick="cerrarTicket()"><div class="ticket" onclick="event.stopPropagation()"><div class="ticket-header"><h2>🏪 Tienda Barrio</h2><p>' + new Date().toLocaleString('es-CO') + '</p></div><div class="ticket-body"><table>' + itemsHtml + '</table></div><div class="ticket-footer"><h1>TOTAL: $' + venta.total.toLocaleString() + '</h1>' + (cambio > 0 ? '<p>Cambio: $' + cambio.toLocaleString() + '</p>' : '') + '<p>¡Gracias por tu compra!</p></div><div class="ticket-actions"><button onclick="imprimirTicket()">🖨️</button><button onclick="cerrarTicket()">✖</button></div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html); reproducirSonido();
}

function cerrarTicket() { var t = document.getElementById('ticketOverlay'); if (t) t.remove(); }
function imprimirTicket() { var t = document.querySelector('.ticket').cloneNode(true); var a = t.querySelector('.ticket-actions'); if (a) a.remove(); var w = window.open('', '', 'width=300,height=400'); w.document.write('<html><body style="font-family:monospace;text-align:center;">' + t.innerHTML + '</body></html>'); w.print(); w.close(); }
function reproducirSonido() { try { var ctx = new (window.AudioContext || window.webkitAudioContext)(); var o = ctx.createOscillator(), g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.value = 800; g.gain.value = 0.1; o.start(); o.stop(ctx.currentTime + 0.15); } catch(e) {} }

function cerrarSesion() { if (confirm('¿Cerrar sesión?')) { localStorage.clear(); window.location.href = '../index.html'; } }