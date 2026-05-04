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
    if (t) {
        var nt = document.getElementById('nombreTienda');
        var cod = document.getElementById('codigoTienda');
        if (nt) nt.textContent = t.nombre;
        if (cod) cod.textContent = 'Código: ' + t.codigo;
    }
    if (u) {
        var nu = document.getElementById('nombreUsuario');
        if (nu) nu.textContent = '👤 ' + u.username;
    }
}

function getClientes() { return JSON.parse(localStorage.getItem('tienda_clientes_fiao') || '[]'); }
function guardarClientes(c) { localStorage.setItem('tienda_clientes_fiao', JSON.stringify(c)); }

function cargarClientes() {
    var clientes = getClientes();
    var div = document.getElementById('listaClientes');
    if (!div) return;
    if (clientes.length === 0) { div.innerHTML = '<p class="text-center">No hay clientes</p>'; return; }
    div.innerHTML = clientes.map(function(c) {
        var pct = c.cupoMaximo>0 ? (c.saldo/c.cupoMaximo)*100 : 0;
        return '<div class="cliente-card"><div class="cliente-header"><strong>👤 '+c.nombre+'</strong>'+(c.apodo?' <span style="color:#999">"'+c.apodo+'"</span>':'')+'<span class="cliente-estado '+(c.estado==='BLOQUEADO'?'estado-bloqueado':'estado-activo')+'">'+(c.estado==='BLOQUEADO'?'🔒 Bloqueado':'🟢 Activo')+'</span></div><div class="cliente-saldos"><div class="saldo-row"><span>Prestado:</span><strong>$'+c.totalPrestado.toLocaleString()+'</strong></div><div class="saldo-row"><span>Abonado:</span><strong>$'+c.totalAbonado.toLocaleString()+'</strong></div><div class="saldo-row saldo-pendiente"><span>Pendiente:</span><strong>$'+c.saldo.toLocaleString()+'</strong></div></div><div class="barra-cupo"><div class="barra-progreso '+(pct>=90?'cupo-peligro':pct>=70?'cupo-alerta':'cupo-ok')+'" style="width:'+Math.min(pct,100)+'%"></div></div><div class="cliente-acciones"><button onclick="mostrarAbono('+c.id+')" class="btn-abonar">💰 Abonar</button><button onclick="toggleBloqueo('+c.id+')" class="btn-bloquear">'+(c.estado==='BLOQUEADO'?'🔓':'🔒')+'</button><button onclick="eliminarCliente('+c.id+')">🗑️</button></div></div>';
    }).join('');
}

function actualizarResumen() {
    var c = getClientes();
    document.getElementById('totalPrestado').textContent = '$'+c.reduce(function(s,x){return s+x.totalPrestado;},0).toLocaleString();
    document.getElementById('totalAbonado').textContent = '$'+c.reduce(function(s,x){return s+x.totalAbonado;},0).toLocaleString();
    document.getElementById('saldoPendiente').textContent = '$'+c.reduce(function(s,x){return s+x.saldo;},0).toLocaleString();
}

function guardarCliente() {
    var clientes = getClientes();
    var nombre = document.getElementById('nombreCliente').value.trim();
    var cupo = parseInt(document.getElementById('cupoCliente').value) || 50000;
    if (!nombre) { alert('Nombre obligatorio'); return; }
    clientes.push({
        id: Date.now(), nombre: nombre,
        apodo: document.getElementById('apodoCliente').value.trim(),
        telefono: document.getElementById('telefonoCliente').value.trim(),
        cupoMaximo: cupo, saldo: 0, totalPrestado: 0, totalAbonado: 0, estado: 'ACTIVO'
    });
    guardarClientes(clientes);
    document.getElementById('formCliente').reset();
    document.getElementById('modalCliente').style.display = 'none';
    cargarClientes();
    actualizarResumen();
}

function mostrarAbono(id) {
    var c = getClientes().find(function(x){ return x.id===id; });
    if (!c) return;
    clienteAbonoId = id;
    document.getElementById('nombreClienteAbono').textContent = '👤 '+c.nombre+' (Saldo: $'+c.saldo.toLocaleString()+')';
    document.getElementById('modalAbono').style.display = 'flex';
}

function registrarAbono() {
    var monto = parseInt(document.getElementById('montoAbono').value);
    if (!monto || monto<=0) { alert('Monto inválido'); return; }
    var clientes = getClientes();
    var idx = clientes.findIndex(function(x){ return x.id===clienteAbonoId; });
    if (idx===-1) return;
    if (monto > clientes[idx].saldo) { alert('Supera el saldo'); return; }
    clientes[idx].saldo -= monto;
    clientes[idx].totalAbonado += monto;
    guardarClientes(clientes);
    var abonos = JSON.parse(localStorage.getItem('tienda_abonos_fiao')||'[]');
    abonos.push({ id:Date.now(), clienteId:clienteAbonoId, clienteNombre:clientes[idx].nombre, monto:monto, fecha:new Date().toISOString() });
    localStorage.setItem('tienda_abonos_fiao', JSON.stringify(abonos));
    document.getElementById('modalAbono').style.display = 'none';
    cargarClientes();
    actualizarResumen();
}

function toggleBloqueo(id) {
    var c = getClientes();
    var idx = c.findIndex(function(x){ return x.id===id; });
    if (idx===-1) return;
    c[idx].estado = c[idx].estado==='ACTIVO'?'BLOQUEADO':'ACTIVO';
    guardarClientes(c);
    cargarClientes();
}

function eliminarCliente(id) {
    if (!confirm('¿Eliminar?')) return;
    guardarClientes(getClientes().filter(function(x){ return x.id!==id; }));
    cargarClientes();
    actualizarResumen();
}

function mostrarFormulario() {
    document.getElementById('formCliente').reset();
    document.getElementById('modalCliente').style.display = 'flex';
}

function cerrarModalCliente() { document.getElementById('modalCliente').style.display = 'none'; }
function cerrarModalAbono() { document.getElementById('modalAbono').style.display = 'none'; clienteAbonoId=null; }
function cerrarSesion() { if(confirm('¿Cerrar sesión?')){localStorage.clear();window.location.href='../index.html';} }