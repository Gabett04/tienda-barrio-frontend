var Sync = {
    token: function() { return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN); },
    
    subir: async function(tipo, datos) {
        if (!navigator.onLine) return;
        try {
            await fetch(CONFIG.API_URL + '/sync/' + tipo, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.token() },
                body: JSON.stringify(datos)
            });
        } catch(e) {}
    },
    
    bajar: async function() {
        if (!navigator.onLine) return;
        try {
            var resp = await fetch(CONFIG.API_URL + '/sync/todo', { headers: { 'Authorization': 'Bearer ' + this.token() } });
            if (!resp.ok) return;
            var data = await resp.json();
            
            if (data.inventario && data.inventario.length > 0) {
                var local = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.PRODUCTOS) || '[]');
                data.inventario.forEach(function(p) {
                    var existe = local.find(function(l) { return l.id === p.id_producto_local; });
                    if (!existe) { 
                        local.push({ 
                            id: p.id_producto_local, 
                            nombre: p.nombre_producto, 
                            precio: p.precio_venta, 
                            stock: p.stock_actual, 
                            categoria: 'Abarrotes', 
                            unidad: p.unidad || 'UNIDAD', 
                            stockMinimo: 5 
                        }); 
                    } else { 
                        existe.stock = p.stock_actual; 
                        existe.precio = p.precio_venta; 
                        existe.unidad = p.unidad || existe.unidad;
                    }
                });
                localStorage.setItem(CONFIG.STORAGE_KEYS.PRODUCTOS, JSON.stringify(local));
            }
            
            if (data.ventas && data.ventas.length > 0) {
                var lv = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.VENTAS_PENDIENTES) || '[]');
                var ids = lv.map(function(v) { return v.id; });
                data.ventas.forEach(function(v) {
                    if (ids.indexOf(v.id_venta_local) === -1 && v.detalle_json) {
                        lv.push({ id: v.id_venta_local, fecha: v.fecha_venta, items: v.detalle_json.items || [], total: v.total, medioPago: v.medio_pago, clienteFiao: v.detalle_json.clienteFiao || null });
                    }
                });
                localStorage.setItem(CONFIG.STORAGE_KEYS.VENTAS_PENDIENTES, JSON.stringify(lv));
            }
            
            if (data.gastos && data.gastos.length > 0) {
                var lg = JSON.parse(localStorage.getItem('tienda_gastos') || '[]');
                var ig = lg.map(function(g) { return g.id; });
                data.gastos.forEach(function(g) { if (ig.indexOf(g.id_gasto_local) === -1) { lg.push({ id: g.id_gasto_local, categoria: g.categoria, descripcion: g.descripcion, monto: g.monto, fecha: g.fecha }); } });
                localStorage.setItem('tienda_gastos', JSON.stringify(lg));
            }
            
            if (data.clientes && data.clientes.length > 0) {
                var lc = JSON.parse(localStorage.getItem('tienda_clientes_fiao') || '[]');
                var ic = lc.map(function(c) { return c.id; });
                data.clientes.forEach(function(c) {
                    var clienteData = { id: c.id_cliente_local, nombre: c.nombre, apodo: c.apodo, telefono: c.telefono, direccion: '', cupoMaximo: c.cupo_maximo, saldo: c.saldo, totalPrestado: c.total_prestado, totalAbonado: c.total_abonado, estado: c.estado };
                    if (ic.indexOf(c.id_cliente_local) === -1) { lc.push(clienteData); }
                    else { var idx = lc.findIndex(function(x) { return x.id === c.id_cliente_local; }); if (idx !== -1) { lc[idx] = clienteData; } }
                });
                localStorage.setItem('tienda_clientes_fiao', JSON.stringify(lc));
            }
        } catch(e) {}
    },
    
    sincronizarVenta: function(v) { this.subir('venta', v); },
    sincronizarProducto: function(p) { this.subir('inventario', p); },
    sincronizarGasto: function(g) { this.subir('gasto', g); },
    sincronizarCliente: function(c) { this.subir('cliente', c); }
};

setInterval(function() { Sync.bajar(); }, 10000);
Sync.bajar();