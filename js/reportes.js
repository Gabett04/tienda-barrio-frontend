var periodoActual = 'hoy';
var graficaVentas = null;
var graficaPagos = null;

document.addEventListener('DOMContentLoaded', function() {
    verificarSesion();
    cargarDatosTienda();
    configurarPeriodos();
    generarReporte();
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

function configurarPeriodos() {
    document.querySelectorAll('.periodo-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.periodo-btn').forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            periodoActual = this.dataset.periodo;
            generarReporte();
        });
    });
}

function getRangoFechas() {
    var hoy = new Date();
    switch(periodoActual) {
        case 'hoy': return { inicio: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()), fin: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59) };
        case 'semana': var ini = new Date(hoy); ini.setDate(ini.getDate()-ini.getDay()); ini.setHours(0,0,0,0); return { inicio: ini, fin: new Date() };
        case 'mes': return { inicio: new Date(hoy.getFullYear(), hoy.getMonth(), 1), fin: new Date() };
    }
}

function generarReporte() {
    var r = getRangoFechas();
    var ventas = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.VENTAS_PENDIENTES) || '[]');
    var vf = ventas.filter(function(v) { var f = new Date(v.fecha); return f >= r.inicio && f <= r.fin; });
    var gastos = JSON.parse(localStorage.getItem('tienda_gastos') || '[]');
    var gf = gastos.filter(function(g) { var f = new Date(g.fecha); return f >= r.inicio && f <= r.fin; });
    var abonos = JSON.parse(localStorage.getItem('tienda_abonos_fiao') || '[]');
    var af = abonos.filter(function(a) { var f = new Date(a.fecha); return f >= r.inicio && f <= r.fin; });
    
    var tv = vf.reduce(function(s,v){return s+v.total;},0);
    var vc = vf.filter(function(v){return v.medioPago!=='CREDITO';}).reduce(function(s,v){return s+v.total;},0);
    var vfiao = vf.filter(function(v){return v.medioPago==='CREDITO';}).reduce(function(s,v){return s+v.total;},0);
    var tg = gf.reduce(function(s,g){return s+g.monto;},0);
    var ta = af.reduce(function(s,a){return s+a.monto;},0);
    
    document.getElementById('totalVentas').textContent = '$'+tv.toLocaleString();
    document.getElementById('ventasContado').textContent = '$'+vc.toLocaleString();
    document.getElementById('ventasFiao').textContent = '$'+vfiao.toLocaleString();
    document.getElementById('totalGastos').textContent = '$'+tg.toLocaleString();
    document.getElementById('totalAbonos').textContent = '$'+ta.toLocaleString();
    document.getElementById('gananciaNeta').textContent = '$'+(tv+ta-tg).toLocaleString();
    
    generarGraficas(vf, gf);
    mostrarDetalleVentas(vf);
    mostrarDetalleAbonos(af);
    mostrarCuentasPorCobrar();
}

function generarGraficas(ventas, gastos) {
    if (graficaVentas) graficaVentas.destroy();
    if (graficaPagos) graficaPagos.destroy();
    
    var tv = ventas.reduce(function(s,v){return s+v.total;},0);
    var tg = gastos.reduce(function(s,g){return s+g.monto;},0);
    
    var ctx1 = document.getElementById('graficaVentasGastos');
    if (ctx1 && typeof Chart !== 'undefined') {
        graficaVentas = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: ['Ventas', 'Gastos', 'Ganancia'],
                datasets: [{ data: [tv, tg, tv-tg], backgroundColor: ['#4CAF50', '#ff5252', '#2196F3'], borderRadius: 8 }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }
    
    var vc = ventas.filter(function(v){return v.medioPago!=='CREDITO';}).reduce(function(s,v){return s+v.total;},0);
    var vf = ventas.filter(function(v){return v.medioPago==='CREDITO';}).reduce(function(s,v){return s+v.total;},0);
    
    var ctx2 = document.getElementById('graficaPagos');
    if (ctx2 && typeof Chart !== 'undefined') {
        graficaPagos = new Chart(ctx2, {
            type: 'line',
            data: {
                labels: ['Contado', 'Crédito'],
                datasets: [{ data: [vc, vf], borderColor: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.1)', tension: 0.3, fill: true, pointRadius: 6, pointBackgroundColor: '#4CAF50' }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }
}

function mostrarDetalleVentas(ventas) {
    var div = document.getElementById('listaVentas');
    if (ventas.length===0) { div.innerHTML=''; return; }
    div.innerHTML = '<h3>📋 Ventas</h3>' + ventas.sort(function(a,b){return new Date(b.fecha)-new Date(a.fecha);}).map(function(v){
        var productos = v.items.map(function(i){ return i.nombre + (i.gramos ? ' ('+i.gramos+'g)' : '') + ' x' + (i.cantidad||1); }).join(', ');
        return '<div class="venta-item"><div class="venta-header"><span>'+new Date(v.fecha).toLocaleString('es-CO')+'</span><span>'+(v.medioPago==='CREDITO'?'📝 Crédito':'💵 '+v.medioPago)+'</span></div><div style="font-size:13px;color:#666;">'+productos+'</div><div class="venta-total"><strong>$'+v.total.toLocaleString()+'</strong></div></div>';
    }).join('');
}

function mostrarDetalleAbonos(abonos) {
    var div = document.getElementById('listaAbonos');
    if (abonos.length===0) { div.innerHTML=''; return; }
    div.innerHTML = '<h3>💰 Abonos - $'+abonos.reduce(function(s,a){return s+a.monto;},0).toLocaleString()+'</h3>'+abonos.map(function(a){ return '<div class="abono-item"><span>'+new Date(a.fecha).toLocaleString('es-CO')+'</span> - 👤 '+a.clienteNombre+' <strong style="color:#4CAF50;">+$'+a.monto.toLocaleString()+'</strong></div>'; }).join('');
}

function mostrarCuentasPorCobrar() {
    var div = document.getElementById('listaCuentasCobrar');
    var clientes = JSON.parse(localStorage.getItem('tienda_clientes_fiao')||'[]').filter(function(c){return c.saldo>0;});
    if (clientes.length===0) { div.innerHTML=''; return; }
    var total = clientes.reduce(function(s,c){return s+c.saldo;},0);
    div.innerHTML = '<h3>📝 Cuentas por Cobrar - $'+total.toLocaleString()+'</h3>'+clientes.map(function(c){ return '<div class="cuenta-item"><strong>'+c.nombre+'</strong> - $'+c.saldo.toLocaleString()+'</div>'; }).join('');
}

function descargarReporte() {
    var opcion = prompt('¿Qué formato deseas?\n1 = PDF (Imprimir)\n2 = CSV (Excel)\n3 = Cancelar');
    
    if (opcion === '1') {
        descargarPDF();
    } else if (opcion === '2') {
        descargarCSV();
    }
}

function descargarPDF() {
    var nombreTienda = document.getElementById('nombreTienda').textContent || 'Tienda';
    var html = '<html><head><meta charset="UTF-8"><title>Reporte</title>';
    html += '<style>body{font-family:Arial;padding:30px;color:#333;}h1{color:#4CAF50;text-align:center;}h2{color:#666;margin-top:20px;}table{width:100%;border-collapse:collapse;margin:15px 0;}th{background:#4CAF50;color:white;padding:10px;}td{padding:8px;border-bottom:1px solid #ddd;}.verde{color:#4CAF50;}.rojo{color:#ff5252;}.total{font-size:20px;font-weight:bold;}</style></head><body>';
    
    html += '<h1>📊 Reporte - ' + nombreTienda + '</h1>';
    html += '<p style="text-align:center;">Período: <strong>' + periodoActual + '</strong> | Fecha: ' + new Date().toLocaleString('es-CO') + '</p>';
    
    html += '<h2>📋 Resumen</h2><table>';
    html += '<tr><td>💰 Ventas Totales</td><td class="verde"><strong>' + document.getElementById('totalVentas').textContent + '</strong></td></tr>';
    html += '<tr><td>💵 Ventas Contado</td><td>' + document.getElementById('ventasContado').textContent + '</td></tr>';
    html += '<tr><td>📝 Ventas Crédito</td><td>' + document.getElementById('ventasFiao').textContent + '</td></tr>';
    html += '<tr><td>💸 Gastos</td><td class="rojo">' + document.getElementById('totalGastos').textContent + '</td></tr>';
    html += '<tr><td>💰 Abonos</td><td class="verde">' + document.getElementById('totalAbonos').textContent + '</td></tr>';
    html += '<tr style="font-size:18px;"><td><strong>📈 Ganancia Neta</strong></td><td><strong>' + document.getElementById('gananciaNeta').textContent + '</strong></td></tr>';
    html += '</table>';
    
    // Ventas detalle
    var ventas = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.VENTAS_PENDIENTES) || '[]');
    var r = getRangoFechas();
    var vf = ventas.filter(function(v) { var f = new Date(v.fecha); return f >= r.inicio && f <= r.fin; });
    
    if (vf.length > 0) {
        html += '<h2>🛒 Ventas Realizadas</h2><table><tr><th>Fecha</th><th>Productos</th><th>Total</th><th>Pago</th></tr>';
        vf.forEach(function(v) {
            var productos = v.items.map(function(i){ return i.nombre + (i.gramos?' ('+i.gramos+'g)':'') + ' x'+(i.cantidad||1); }).join(', ');
            html += '<tr><td>'+new Date(v.fecha).toLocaleString('es-CO')+'</td><td>'+productos+'</td><td class="verde">$'+v.total.toLocaleString()+'</td><td>'+(v.medioPago==='CREDITO'?'Crédito':v.medioPago)+'</td></tr>';
        });
        html += '</table>';
    }
    
    // Cuentas por cobrar
    var clientes = JSON.parse(localStorage.getItem('tienda_clientes_fiao')||'[]').filter(function(c){return c.saldo>0;});
    if (clientes.length > 0) {
        html += '<h2>📝 Cuentas por Cobrar</h2><table><tr><th>Cliente</th><th>Saldo</th></tr>';
        clientes.forEach(function(c) { html += '<tr><td>'+c.nombre+'</td><td class="rojo">$'+c.saldo.toLocaleString()+'</td></tr>'; });
        html += '</table>';
    }
    
    html += '</body></html>';
    
    var ventana = window.open('', 'Reporte PDF', 'width=800,height=600');
    ventana.document.write(html);
    ventana.document.close();
    setTimeout(function() { ventana.print(); }, 500);
}

function descargarCSV() {
    var nombreTienda = document.getElementById('nombreTienda').textContent || 'Tienda';
    var csv = 'REPORTE - ' + nombreTienda + '\n';
    csv += 'Período: ' + periodoActual + '\n';
    csv += 'Fecha: ' + new Date().toLocaleString('es-CO') + '\n\n';
    csv += 'RESUMEN\n';
    csv += 'Ventas Totales,' + document.getElementById('totalVentas').textContent + '\n';
    csv += 'Ventas Contado,' + document.getElementById('ventasContado').textContent + '\n';
    csv += 'Ventas Crédito,' + document.getElementById('ventasFiao').textContent + '\n';
    csv += 'Gastos,' + document.getElementById('totalGastos').textContent + '\n';
    csv += 'Abonos,' + document.getElementById('totalAbonos').textContent + '\n';
    csv += 'Ganancia Neta,' + document.getElementById('gananciaNeta').textContent + '\n\n';
    
    var ventas = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.VENTAS_PENDIENTES) || '[]');
    var r = getRangoFechas();
    var vf = ventas.filter(function(v) { var f = new Date(v.fecha); return f >= r.inicio && f <= r.fin; });
    
    if (vf.length > 0) {
        csv += 'VENTAS\n';
        csv += 'Fecha,Productos,Total,Medio Pago\n';
        vf.forEach(function(v) {
            var productos = v.items.map(function(i){ return i.nombre + (i.gramos?' ('+i.gramos+'g)':'') + ' x'+(i.cantidad||1); }).join(' | ');
            csv += new Date(v.fecha).toLocaleString('es-CO') + ',"' + productos + '",' + v.total + ',' + (v.medioPago==='CREDITO'?'Crédito':v.medioPago) + '\n';
        });
    }
    
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'reporte_' + periodoActual + '_' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
}

function cerrarSesion() { if(confirm('¿Cerrar sesión?')){localStorage.clear();window.location.href='../index.html';} }