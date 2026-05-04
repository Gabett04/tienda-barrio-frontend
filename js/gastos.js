document.addEventListener('DOMContentLoaded', function() {
    verificarSesion();
    cargarDatosTienda();
    cargarGastos();
    actualizarResumen();
    document.getElementById('formGasto').addEventListener('submit', function(e) {
        e.preventDefault();
        guardarGasto();
    });
});

function verificarSesion() { if (!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN)) window.location.href = '../index.html'; }

function cargarDatosTienda() {
    var t = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TIENDA));
    var u = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USUARIO));
    if (t) {
        var nt = document.getElementById('nombreTienda'); if (nt) nt.textContent = t.nombre;
        var cod = document.getElementById('codigoTienda'); if (cod) cod.textContent = 'Código: ' + t.codigo;
    }
    if (u) { var nu = document.getElementById('nombreUsuario'); if (nu) nu.textContent = '👤 ' + u.username; }
}

function getGastos() { return JSON.parse(localStorage.getItem('tienda_gastos') || '[]'); }
function guardarGastos(g) { localStorage.setItem('tienda_gastos', JSON.stringify(g)); }

function cargarGastos() {
    var gastos = getGastos();
    var div = document.getElementById('listaGastos');
    if (!div) return;
    if (gastos.length === 0) { div.innerHTML = '<p class="text-center">No hay gastos</p>'; return; }
    var iconos = { 'Mercancía':'📦','Transporte':'🚗','Servicios':'💡','Empleado':'👤','Bolsas/Empaques':'🛍️','Aseo Tienda':'🧹','Otros':'📋' };
    div.innerHTML = gastos.sort(function(a,b){ return new Date(b.fecha)-new Date(a.fecha); }).map(function(g) {
        return '<div class="gasto-card"><div class="gasto-icon">'+(iconos[g.categoria]||'💸')+'</div><div class="gasto-info"><div class="gasto-categoria">'+g.categoria+'</div><div class="gasto-descripcion">'+(g.descripcion||'')+'</div><div class="gasto-fecha">'+new Date(g.fecha).toLocaleDateString('es-CO')+'</div></div><div class="gasto-monto">-$'+g.monto.toLocaleString()+'</div><button class="btn-eliminar-gasto" onclick="eliminarGasto('+g.id+')">🗑️</button></div>';
    }).join('');
}

function actualizarResumen() {
    var gastos = getGastos();
    var hoy = new Date().toDateString();
    var gh = gastos.filter(function(g){ return new Date(g.fecha).toDateString()===hoy; });
    document.getElementById('gastosHoy').textContent = '$'+gh.reduce(function(s,g){return s+g.monto;},0).toLocaleString();
    var semana = new Date(); semana.setDate(semana.getDate()-semana.getDay()); semana.setHours(0,0,0,0);
    var gs = gastos.filter(function(g){ return new Date(g.fecha)>=semana; });
    document.getElementById('gastosSemana').textContent = '$'+gs.reduce(function(s,g){return s+g.monto;},0).toLocaleString();
    var mes = new Date(); mes.setDate(1); mes.setHours(0,0,0,0);
    var gm = gastos.filter(function(g){ return new Date(g.fecha)>=mes; });
    document.getElementById('gastosMes').textContent = '$'+gm.reduce(function(s,g){return s+g.monto;},0).toLocaleString();
}

function guardarGasto() {
    var gastos = getGastos();
    var cat = document.getElementById('categoriaGasto').value;
    var desc = document.getElementById('descripcionGasto').value.trim();
    var monto = parseInt(document.getElementById('montoGasto').value);
    if (!cat || !monto) { alert('Categoría y monto obligatorios'); return; }
    var nuevoGasto = { id: Date.now(), categoria: cat, descripcion: desc, monto: monto, fecha: new Date().toISOString() };
    gastos.push(nuevoGasto);
    guardarGastos(gastos);
    document.getElementById('formGasto').reset();
    document.getElementById('modalGasto').style.display = 'none';
    cargarGastos();
    actualizarResumen();
    if (typeof Sync !== 'undefined') Sync.sincronizarGasto({ id: nuevoGasto.id, categoria: cat, descripcion: desc, monto: monto, fecha: new Date().toISOString() });
}

function eliminarGasto(id) { if (!confirm('¿Eliminar?')) return; guardarGastos(getGastos().filter(function(g){ return g.id!==id; })); cargarGastos(); actualizarResumen(); }
function mostrarFormulario() { document.getElementById('formGasto').reset(); document.getElementById('modalGasto').style.display = 'flex'; }
function cerrarModalGasto() { document.getElementById('modalGasto').style.display = 'none'; }
function cerrarSesion() { if(confirm('¿Cerrar sesión?')){localStorage.clear();window.location.href='../index.html';} }