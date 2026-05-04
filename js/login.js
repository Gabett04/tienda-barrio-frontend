document.addEventListener('DOMContentLoaded', function() {
    var loginForm = document.getElementById('loginForm');
    var mensajeError = document.getElementById('mensajeError');

    var token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    if (token) {
        window.location.href = 'pages/dashboard.html';
        return;
    }

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var codigoTienda = document.getElementById('codigoTienda').value.trim().toUpperCase();
        var username = document.getElementById('username').value.trim();
        var password = document.getElementById('password').value;
        if (!codigoTienda || !username || !password) { mostrarError('Todos los campos son obligatorios'); return; }

        var btnLogin = document.querySelector('.btn-login');
        btnLogin.textContent = '⏳ Iniciando sesión...';
        btnLogin.disabled = true;

        try {
            var response = await fetch(CONFIG.API_URL + '/auth/tienda/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ codigo_tienda: codigoTienda, username: username, password: password })
            });
            var data = await response.json();
            if (!response.ok) throw new Error(data.mensaje || data.error || 'Error al iniciar sesión');

            localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, data.token);
            localStorage.setItem(CONFIG.STORAGE_KEYS.TIENDA, JSON.stringify(data.tienda));
            localStorage.setItem(CONFIG.STORAGE_KEYS.USUARIO, JSON.stringify(data.usuario));

            // Cargar datos desde la nube
            await cargarDatosNube(data.token);

            window.location.href = 'pages/dashboard.html';
        } catch (error) {
            mostrarError(error.message);
            btnLogin.textContent = '🔐 Iniciar Sesión';
            btnLogin.disabled = false;
        }
    });

    function mostrarError(mensaje) {
        mensajeError.textContent = mensaje;
        mensajeError.style.display = 'block';
        setTimeout(function() { mensajeError.style.display = 'none'; }, 5000);
    }

    async function cargarDatosNube(token) {
        try {
            var resp = await fetch(CONFIG.API_URL + '/sync/todo', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!resp.ok) return;
            var data = await resp.json();
            
            // Fusionar inventario: lo de la nube + lo local
            if (data.inventario && data.inventario.length > 0) {
                var localInv = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.PRODUCTOS) || '[]');
                var fusionado = {};
                localInv.forEach(function(p) { fusionado[p.id] = p; });
                data.inventario.forEach(function(p) {
                    if (!fusionado[p.id_producto_local]) {
                        fusionado[p.id_producto_local] = {
                            id: p.id_producto_local,
                            nombre: p.nombre_producto,
                            precio: p.precio_venta,
                            stock: p.stock_actual,
                            categoria: 'Abarrotes',
                            unidad: 'UNIDAD',
                            stockMinimo: 5
                        };
                    }
                });
                var resultado = Object.values(fusionado);
                localStorage.setItem(CONFIG.STORAGE_KEYS.PRODUCTOS, JSON.stringify(resultado));
            }
            
            // Ventas de la nube
            if (data.ventas && data.ventas.length > 0) {
                var localVentas = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.VENTAS_PENDIENTES) || '[]');
                var idsLocales = localVentas.map(function(v) { return v.id; });
                data.ventas.forEach(function(v) {
                    if (idsLocales.indexOf(v.id_venta_local) === -1) {
                        localVentas.push({
                            id: v.id_venta_local,
                            fecha: v.fecha_venta,
                            items: v.detalle_json ? v.detalle_json.items : [],
                            total: v.total,
                            medioPago: v.medio_pago,
                            clienteFiao: v.detalle_json ? v.detalle_json.clienteFiao : null
                        });
                    }
                });
                localStorage.setItem(CONFIG.STORAGE_KEYS.VENTAS_PENDIENTES, JSON.stringify(localVentas));
            }
            
            // Gastos de la nube
            if (data.gastos && data.gastos.length > 0) {
                var localGastos = JSON.parse(localStorage.getItem('tienda_gastos') || '[]');
                var idsGastos = localGastos.map(function(g) { return g.id; });
                data.gastos.forEach(function(g) {
                    if (idsGastos.indexOf(g.id_gasto_local) === -1) {
                        localGastos.push({
                            id: g.id_gasto_local,
                            categoria: g.categoria,
                            descripcion: g.descripcion,
                            monto: g.monto,
                            fecha: g.fecha
                        });
                    }
                });
                localStorage.setItem('tienda_gastos', JSON.stringify(localGastos));
            }
        } catch(e) {
            console.log('Usando datos locales');
        }
    }
});