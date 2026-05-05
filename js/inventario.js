var productoEditando = null;

document.addEventListener('DOMContentLoaded', function() {
    verificarSesion(); cargarDatosTienda(); cargarProductos(); configurarBusqueda();
    var form = document.getElementById('formProducto');
    if (form) form.addEventListener('submit', function(e) { e.preventDefault(); guardarProducto(); });
});

function verificarSesion() { if (!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN)) window.location.href = '../index.html'; }

function cargarDatosTienda() {
    var t = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.TIENDA));
    var u = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USUARIO));
    if (t) { var nt=document.getElementById('nombreTienda'); if(nt) nt.textContent=t.nombre; var cod=document.getElementById('codigoTienda'); if(cod) cod.textContent='Código: '+t.codigo; }
    if (u) { var nu=document.getElementById('nombreUsuario'); if(nu) nu.textContent='👤 '+u.username; }
}

function getProductos() { return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.PRODUCTOS) || '[]'); }
function guardarProductos(p) { localStorage.setItem(CONFIG.STORAGE_KEYS.PRODUCTOS, JSON.stringify(p)); }

function cargarProductos() {
    var productos = getProductos();
    var tbody = document.getElementById('tablaProductos'); if (!tbody) return;
    var tp = document.getElementById('totalProductos'); if (tp) tp.textContent = productos.length + ' productos';
    if (productos.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay productos</td></tr>'; return; }
    tbody.innerHTML = productos.map(function(p) {
        var stockClass = p.stock <= (p.stockMinimo||5) ? 'stock-bajo' : 'stock-normal';
        var stockMostrar;
        if (p.unidad === 'LIBRA') { stockMostrar = parseInt(p.stock).toLocaleString() + 'g'; }
        else { stockMostrar = parseInt(p.stock).toLocaleString(); }
        return '<tr><td><strong>'+p.nombre+'</strong></td><td>'+(p.categoria||'-')+'</td><td>$'+p.precio.toLocaleString()+(p.unidad==='LIBRA'?'/lb':'')+'</td><td class="'+stockClass+'">'+stockMostrar+'</td><td><button class="btn-accion btn-stock" onclick="agregarStock('+p.id+')">+</button> <button class="btn-accion btn-editar" onclick="editarProducto('+p.id+')">✏️</button> <button class="btn-accion btn-eliminar" onclick="eliminarProducto('+p.id+')">🗑️</button></td></tr>';
    }).join('');
}

function configurarBusqueda() {
    var input=document.getElementById('buscarInventario'), select=document.getElementById('filtroCategoria');
    if(!input||!select) return;
    function filtrar(){ var p=getProductos(); var t=input.value.toLowerCase(); var c=select.value; mostrarFiltrados(p.filter(function(x){ return x.nombre.toLowerCase().includes(t)&&(c==='todas'||x.categoria===c); })); }
    input.addEventListener('input',filtrar); select.addEventListener('change',filtrar);
}

function mostrarFiltrados(lista) {
    var tbody=document.getElementById('tablaProductos'); if(!tbody) return;
    if(lista.length===0){ tbody.innerHTML='<tr><td colspan="5">Sin resultados</td></tr>'; return; }
    tbody.innerHTML=lista.map(function(p){ return '<tr><td>'+p.nombre+'</td><td>'+p.categoria+'</td><td>$'+p.precio.toLocaleString()+'</td><td>'+p.stock+'</td><td><button class="btn-accion btn-editar" onclick="editarProducto('+p.id+')">✏️</button></td></tr>'; }).join('');
}

function mostrarFormulario() { productoEditando=null; var f=document.getElementById('formProducto'); if(f) f.reset(); document.getElementById('modalProducto').style.display='flex'; }

function editarProducto(id) {
    var p=getProductos().find(function(x){ return x.id===id; }); if(!p) return; productoEditando=id;
    document.getElementById('productoId').value=p.id; document.getElementById('nombreProducto').value=p.nombre;
    document.getElementById('categoriaProducto').value=p.categoria||''; document.getElementById('unidadProducto').value=p.unidad||'UNIDAD';
    document.getElementById('precioVenta').value=p.precio; document.getElementById('cantidadInicial').value=p.stock;
    document.getElementById('modalProducto').style.display='flex';
}

function guardarProducto() {
    var productos=getProductos();
    var n=document.getElementById('nombreProducto').value.trim();
    var p=parseInt(document.getElementById('precioVenta').value);
    if(!n||!p){ alert('Nombre y precio obligatorios'); return; }
    var datos={ nombre:n, categoria:document.getElementById('categoriaProducto').value, unidad:document.getElementById('unidadProducto').value, precio:p, stock:parseFloat(document.getElementById('cantidadInicial').value)||0, stockMinimo:5 };
    if(productoEditando){ 
        var idx=productos.findIndex(function(x){ return x.id===productoEditando; }); 
        if(idx!==-1){ 
            productos[idx].nombre=datos.nombre; 
            productos[idx].categoria=datos.categoria; 
            productos[idx].unidad=datos.unidad; 
            productos[idx].precio=datos.precio; 
            productos[idx].stock=datos.stock; 
        } 
    }
    else { datos.id=Date.now(); productos.push(datos); }
    guardarProductos(productos);
    cerrarModalProducto(); cargarProductos();
    if(typeof Sync!=='undefined') Sync.sincronizarProducto({ id:datos.id, nombre:datos.nombre, stock:datos.stock, precio:datos.precio, unidad:datos.unidad });
}

function eliminarTodos() {
    if (!confirm('⚠️ ¿Eliminar TODOS los productos?')) return;
    if (!confirm('¿Estás completamente seguro?')) return;
    localStorage.removeItem(CONFIG.STORAGE_KEYS.PRODUCTOS);
    if (typeof Sync !== 'undefined') {
        Sync.subir('inventario', { id: 0, nombre: 'reset', stock: 0, precio: 0, unidad: 'RESET' });
    }
    cargarProductos();
    alert('✅ Todos los productos eliminados');
}

function agregarStock(id) { var c=prompt('Cantidad:'); if(!c) return; c=parseFloat(c); if(isNaN(c)||c<=0) return; var p=getProductos(); var idx=p.findIndex(function(x){ return x.id===id; }); if(idx!==-1) p[idx].stock+=c; guardarProductos(p); cargarProductos(); }
function eliminarProducto(id) { if(!confirm('¿Eliminar?')) return; guardarProductos(getProductos().filter(function(x){ return x.id!==id; })); cargarProductos(); }
function cerrarModalProducto() { document.getElementById('modalProducto').style.display='none'; productoEditando=null; }
function cerrarSesion() { if(confirm('¿Cerrar sesión?')){localStorage.clear();window.location.href='../index.html';} }