var clienteAbonoId = null;

document.addEventListener('DOMContentLoaded', function() {
    verificarSesion();
    cargarDatosTienda();
    cargarClientes();
    actualizarResumen();
    document.getElementById('formCliente').addEventListener('submit', function(e) {
        e.preventDefault();
        guardarCliente();
    });
});

function verificarSesion() {
    if (!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN)) window.location.href = '../index.html';
}

function cargarDatosTienda() {
    var t = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TIENDA));
    var u = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USUARIO));
    if (t) { var nt=document.getElementById('nombreTienda'); if(nt) nt.textContent=t.nombre; var cod=document.getElementById('codigoTienda'); if(cod) cod.textContent='Código: '+t.codigo; }
    if (u) { var nu=document.getElementById('nombreUsuario'); if(nu) nu.textContent='👤 '+u.username; }
}

function getClientes() { return JSON.parse(localStorage.getItem('tienda_clientes_fiao') || '[]'); }
function guardarClientes(c) { localStorage.setItem('tienda_clientes_fiao', JSON.stringify(c)); }

function cargarClientes() {
    var clientes = getClientes();
    var div = document.getElementById('listaClientes');
    if (!div) return;
    if (clientes.length === 0) { div.innerHTML = '<p class="text-center">No hay clientes con crédito</p>'; return; }
    div.innerHTML = clientes.map(function(c) {
        var pct = c.cupoMaximo > 0 ? (c.saldo / c.cupoMaximo) * 100 : 0;
        var claseBarra = pct >= 90 ? 'cupo-peligro' : pct >= 70 ? 'cupo-alerta' : 'cupo-ok';
        return '<div class="cliente-card">' +
            '<div class="cliente-header">' +
                '<div><strong>👤 ' + c.nombre + '</strong>' + (c.apodo ? ' <span style="color:#999;">"' + c.apodo + '"</span>' : '') + '</div>' +
                '<span class="cliente-estado ' + (c.estado === 'BLOQUEADO' ? 'estado-bloqueado' : 'estado-activo') + '">' + (c.estado === 'BLOQUEADO' ? '🔒 Bloqueado' : '🟢 Activo') + '</span>' +
            '</div>' +
            '<div class="cliente-info">' + (c.telefono ? '📱 ' + c.telefono + ' ' : '') + (c.direccion ? '📍 ' + c.direccion : '') + '</div>' +
            '<div class="cliente-saldos">' +
                '<div class="saldo-row"><span>Cupo máximo:</span><strong>$' + c.cupoMaximo.toLocaleString() + '</strong></div>' +
                '<div class="saldo-row"><span>Total prestado:</span><strong>$' + c.totalPrestado.toLocaleString() + '</strong></div>' +
                '<div class="saldo-row"><span>Total abonado:</span><strong style="color:#4CAF50;">$' + c.totalAbonado.toLocaleString() + '</strong></div>' +
                '<div class="saldo-row saldo-pendiente"><span>Saldo pendiente:</span><strong style="color:#ff5252;">$' + c.saldo.toLocaleString() + '</strong></div>' +
            '</div>' +
            '<div class="barra-cupo"><div class="barra-progreso ' + claseBarra + '" style="width:' + Math.min(pct, 100) + '%"></div></div>' +
            '<div class="porcentaje-cupo" style="font-size:12px;color:#999;text-align:right;">' + pct.toFixed(0) + '% del cupo</div>' +
            '<div class="cliente-acciones">' +
                '<button onclick="mostrarAbono(' + c.id + ')" class="btn-abonar">💰 Abonar</button>' +
                '<button onclick="toggleBloqueo(' + c.id + ')" class="btn-bloquear">' + (c.estado === 'BLOQUEADO' ? '🔓 Desbloquear' : '🔒 Bloquear') + '</button>' +
                '<button onclick="eliminarCliente(' + c.id + ')" class="btn-eliminar-cliente">🗑️</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function actualizarResumen() {
    var c = getClientes();
    document.getElementById('totalPrestado').textContent = '$' + c.reduce(function(s, x) { return s + x.totalPrestado; }, 0).toLocaleString();
    document.getElementById('totalAbonado').textContent = '$' + c.reduce(function(s, x) { return s + x.totalAbonado; }, 0).toLocaleString();
    document.getElementById('saldoPendiente').textContent = '$' + c.reduce(function(s, x) { return s + x.saldo; }, 0).toLocaleString();
}

function guardarCliente() {
    var clientes = getClientes();
    var nombre = document.getElementById('nombreCliente').value.trim();
    var cupo = parseInt(document.getElementById('cupoCliente').value) || 50000;
    if (!nombre) { alert('Nombre obligatorio'); return; }
    
    var nuevoCliente = {
        id: Date.now(),
        nombre: nombre,
        apodo: document.getElementById('apodoCliente').value.trim(),
        telefono: document.getElementById('telefonoCliente').value.trim(),
        direccion: document.getElementById('direccionCliente').value.trim(),
        cupoMaximo: cupo,
        saldo: 0,
        totalPrestado: 0,
        totalAbonado: 0,
        estado: 'ACTIVO'
    };
    
    clientes.push(nuevoCliente);
    guardarClientes(clientes);
    
    // SYNC
    if (typeof Sync !== 'undefined') {
        Sync.sincronizarCliente({
            id: nuevoCliente.id,
            nombre: nuevoCliente.nombre,
            apodo: nuevoCliente.apodo,
            telefono: nuevoCliente.telefono,
            cupoMaximo: nuevoCliente.cupoMaximo,
            saldo: nuevoCliente.saldo,
            totalPrestado: nuevoCliente.totalPrestado,
            totalAbonado: nuevoCliente.totalAbonado,
            estado: nuevoCliente.estado
        });
    }
    
    document.getElementById('formCliente').reset();
    document.getElementById('modalCliente').style.display = 'none';
    cargarClientes();
    actualizarResumen();
}

function mostrarAbono(id) {
    var c = getClientes().find(function(x) { return x.id === id; });
    if (!c) return;
    clienteAbonoId = id;
    document.getElementById('nombreClienteAbono').textContent = '👤 ' + c.nombre + (c.apodo ? ' "' + c.apodo + '"' : '');
    document.getElementById('saldoClienteAbono').textContent = 'Saldo pendiente: $' + c.saldo.toLocaleString() + ' | Cupo: $' + c.cupoMaximo.toLocaleString();
    document.getElementById('montoAbono').value = '';
    document.getElementById('modalAbono').style.display = 'flex';
}

function registrarAbono() {
    var monto = parseInt(document.getElementById('montoAbono').value);
    if (!monto || monto <= 0) { alert('Monto inválido'); return; }
    
    var clientes = getClientes();
    var idx = clientes.findIndex(function(x) { return x.id === clienteAbonoId; });
    if (idx === -1) return;
    
    if (monto > clientes[idx].saldo) { alert('El abono supera el saldo pendiente'); return; }
    
    clientes[idx].saldo -= monto;
    clientes[idx].totalAbonado += monto;
    guardarClientes(clientes);
    
    // Guardar abono
    var abonos = JSON.parse(localStorage.getItem('tienda_abonos_fiao') || '[]');
    abonos.push({ id: Date.now(), clienteId: clienteAbonoId, clienteNombre: clientes[idx].nombre, monto: monto, fecha: new Date().toISOString() });
    localStorage.setItem('tienda_abonos_fiao', JSON.stringify(abonos));
    
    // SYNC
    if (typeof Sync !== 'undefined') {
        Sync.sincronizarCliente({
            id: clientes[idx].id,
            nombre: clientes[idx].nombre,
            apodo: clientes[idx].apodo,
            telefono: clientes[idx].telefono,
            cupoMaximo: clientes[idx].cupoMaximo,
            saldo: clientes[idx].saldo,
            totalPrestado: clientes[idx].totalPrestado,
            totalAbonado: clientes[idx].totalAbonado,
            estado: clientes[idx].estado
        });
    }
    
    document.getElementById('modalAbono').style.display = 'none';
    clienteAbonoId = null;
    cargarClientes();
    actualizarResumen();
}

function toggleBloqueo(id) {
    var c = getClientes();
    var idx = c.findIndex(function(x) { return x.id === id; });
    if (idx === -1) return;
    c[idx].estado = c[idx].estado === 'ACTIVO' ? 'BLOQUEADO' : 'ACTIVO';
    guardarClientes(c);
    
    // SYNC
    if (typeof Sync !== 'undefined') {
        Sync.sincronizarCliente({
            id: c[idx].id, nombre: c[idx].nombre, apodo: c[idx].apodo,
            telefono: c[idx].telefono, cupoMaximo: c[idx].cupoMaximo,
            saldo: c[idx].saldo, totalPrestado: c[idx].totalPrestado,
            totalAbonado: c[idx].totalAbonado, estado: c[idx].estado
        });
    }
    cargarClientes();
}

function eliminarCliente(id) {
    if (!confirm('¿Eliminar este cliente?')) return;
    var nuevos = getClientes().filter(function(x) { return x.id !== id; });
    guardarClientes(nuevos);
    cargarClientes();
    actualizarResumen();
}

function mostrarFormulario() {
    document.getElementById('formCliente').reset();
    document.getElementById('modalCliente').style.display = 'flex';
}

function cerrarModalCliente() { document.getElementById('modalCliente').style.display = 'none'; }
function cerrarModalAbono() { document.getElementById('modalAbono').style.display = 'none'; clienteAbonoId = null; }

function cerrarSesion() { if (confirm('¿Cerrar sesión?')) { localStorage.clear(); window.location.href = '../index.html'; } }