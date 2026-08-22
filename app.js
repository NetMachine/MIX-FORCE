// ==============================================
// CONFIGURACIÓN DE SUPABASE (Renombrado a 'sb' para evitar errores)
// ==============================================
const SUPABASE_URL = 'https://smdxexgrtdpniphtnvab.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtZHhleGdydGRwbmlwaHRudmFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNjY0MjcsImV4cCI6MjEwMjk0MjQyN30.f7-gHQynQiI4yE9XH9k6yZA_a-x9tlo93jjq3vwQm3g';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==============================================
// VARIABLES GLOBALES
// ==============================================
let usuarioActual = null;
let periodoSeleccionado = null;
let precioBTC = 0;
let precioAnterior = 0;
let prediccionActivaId = null;
let filtroGlobal = 'todos';
let filtroMisPreds = 'todos';
let todasPrediccionesGlobal = [];
let intervaloTiempo = null;
let priceHistory = [];
let wsPrice = null;
let wsBinance = null;
let chartTV = null;
let currentTF = '1m';
let notificaciones = [];

// Constantes de configuración
const DURACIONES = {
    '5m': 5 * 60 * 1000, '15m': 15 * 60 * 1000, '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000, '4h': 4 * 60 * 60 * 1000, '24h': 24 * 60 * 60 * 1000,
    '1sem': 7 * 24 * 60 * 60 * 1000, '1mes': 30 * 24 * 60 * 60 * 1000
};

const PUNTOS_POR_PERIODO = {
    '5m': 1, '15m': 2, '30m': 3, '1h': 4, '4h': 5, '24h': 8, '1sem': 15, '1mes': 30
};

const MULTIPLICADORES = {
    '5m': 1.0, '15m': 1.2, '30m': 1.5, '1h': 2.0, '4h': 2.5, '24h': 3.0, '1sem': 4.0, '1mes': 5.0
};

const TIERS = [
    { nombre: 'Bronce', min: 0, clase: 'tier-bronze' },
    { nombre: 'Plata', min: 50, clase: 'tier-silver' },
    { nombre: 'Oro', min: 200, clase: 'tier-gold' },
    { nombre: 'Platino', min: 500, clase: 'tier-platinum' },
    { nombre: 'Maestro', min: 1000, clase: 'tier-master' },
    { nombre: 'Leyenda', min: 5000, clase: 'tier-legend' }
];

// ==============================================
// INICIALIZACIÓN
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    cargarPrecioBTC();
    cargarDatosMercado();
    cargarTopCryptos();
    iniciarWebSocketPrecio();
    setInterval(cargarDatosMercado, 60000);
    setInterval(cargarTopCryptos, 60000);
    verificarSesion();
});

// ==============================================
// LÓGICA DE PRECIO Y WEBSOCKET
// ==============================================
function iniciarWebSocketPrecio() {
    if (wsPrice) wsPrice.close();
    wsPrice = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@trade');
    wsPrice.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        const price = parseFloat(msg.p);
        precioAnterior = precioBTC;
        precioBTC = price;
        priceHistory.push(price);
        if (priceHistory.length > 80) priceHistory.shift();
        
        actualizarDisplayPrecio(price);
        actualizarSparkline();
        actualizarConversions(price);
        actualizarDiferenciaPrediccion();
    };
    wsPrice.onclose = () => setTimeout(iniciarWebSocketPrecio, 3000);
}

function actualizarDisplayPrecio(price) {
    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtRaw = fmt.format(price);
    const parts = fmtRaw.split('.');
    const entero = parts[0];
    const decimal = parts[1] ? '.' + parts[1] : '';
    
    document.getElementById('hero-price').textContent = entero;
    document.getElementById('hero-price-dec').textContent = decimal;
    document.getElementById('price-value').textContent = fmtRaw;
    document.getElementById('price-value-movil').textContent = fmtRaw;
    document.getElementById('hero-time').textContent = new Date().toLocaleTimeString('es-ES');
}

function actualizarSparkline() {
    if (priceHistory.length < 2) return;
    const svg = document.getElementById('sparkline-path');
    if (!svg) return;
    const min = Math.min(...priceHistory);
    const max = Math.max(...priceHistory);
    const range = max - min || 1;
    const points = priceHistory.map((p, i) => {
        const x = (i / 79) * 80;
        const y = 30 - ((p - min) / range) * 26 - 2;
        return x + ',' + y;
    }).join(' ');
    svg.setAttribute('points', points);
}

// ==============================================
// DATOS DE MERCADO (CoinGecko)
// ==============================================
async function cargarDatosMercado() {
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false');
        const data = await res.json();
        const md = data.market_data;
        
        document.getElementById('quick-mcap').textContent = fmtNum(md.market_cap?.usd || 0);
        document.getElementById('quick-vol').textContent = fmtNum(md.total_volume?.usd || 0);
        document.getElementById('quick-dom').textContent = (md.market_cap_dominance || 0).toFixed(1) + '%';
        document.getElementById('quick-ath').textContent = '$' + Math.round(md.ath?.usd || 0).toLocaleString();
        
        const cambio = md.price_change_percentage_24h || 0;
        const cls = cambio >= 0 ? 'text-green-400' : 'text-red-400';
        const txt = (cambio >= 0 ? '+' : '') + cambio.toFixed(2) + '%';
        document.getElementById('hero-change').textContent = txt;
        document.getElementById('hero-change').className = 'text-sm px-4 py-1.5 rounded-lg font-bold font-mono ' + cls;
        document.getElementById('price-change').textContent = txt;
        document.getElementById('price-change').className = 'text-xs px-2.5 py-1 rounded-lg font-medium ' + cls;
    } catch (e) {}
}

async function cargarTopCryptos() {
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h');
        const cryptos = await res.json();
        
        let ticker = '';
        cryptos.forEach(c => {
            const ch = c.price_change_percentage_24h || 0;
            const col = ch >= 0 ? 'text-green-400' : 'text-red-400';
            ticker += `<span class="ticker-item">${c.symbol.toUpperCase()} <span class="${col}">${ch >= 0 ? '+' : ''}${ch.toFixed(1)}%</span></span>`;
        });
        document.getElementById('market-ticker').innerHTML = ticker + ticker;
        
        document.getElementById('top-crypto-table').innerHTML = cryptos.map((c, i) => {
            const ch = c.price_change_percentage_24h || 0;
            const col = ch >= 0 ? 'text-green-400' : 'text-red-400';
            return `<tr class="border-t border-white/5">
                <td class="py-2.5 px-3 text-gray-600 text-xs">${i + 1}</td>
                <td class="py-2.5 px-3"><span class="font-medium text-sm">${c.name}</span></td>
                <td class="py-2.5 px-3 text-right font-mono text-sm">$${c.current_price.toLocaleString()}</td>
                <td class="py-2.5 px-3 text-right ${col} font-medium text-sm">${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%</td>
            </tr>`;
        }).join('');
    } catch (e) {}
}

// ==============================================
// AUTENTICACIÓN (SUPABASE AUTH)
// ==============================================
async function verificarSesion() {
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
        await cargarUsuario(user);
        iniciarEscuchaGlobal();
        setInterval(() => verificarResultadosPendientes(), 15000);
    } else {
        usuarioActual = null;
        actualizarUI();
    }
}

async function register() {
    const email = document.getElementById('email-reg').value.trim();
    const pass = document.getElementById('pass-reg').value;
    const username = document.getElementById('username').value.trim();
    if (!email || !pass || !username) return mostrarToast('Completa todos los campos', 'error');
    if (pass.length < 6) return mostrarToast('Contrasena minimo 6 caracteres', 'error');
    
    try {
        const { data, error } = await sb.auth.signUp({ email, password: pass });
        if (error) throw error;
        if (data.user) {
            await sb.from('usuarios').insert([{ 
                id: data.user.id, email, username, puntos: 0, aciertos: 0, total_votos: 0, racha: 0, mejor_racha: 0, logros: [] 
            }]);
        }
        mostrarToast('Cuenta creada exitosamente');
        cerrarModal();
    } catch (e) { mostrarToast('Error: ' + e.message, 'error'); }
}

async function login() {
    const email = document.getElementById('email').value.trim();
    const pass = document.getElementById('pass').value;
    try {
        const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        if (data.user) {
            await cargarUsuario(data.user);
            iniciarEscuchaGlobal();
            mostrarToast('Bienvenido');
            cerrarModal();
        }
    } catch (e) { mostrarToast('Error: ' + e.message, 'error'); }
}

async function logout() {
    await sb.auth.signOut();
    usuarioActual = null;
    actualizarUI();
    mostrarToast('Sesion cerrada');
}

async function cargarUsuario(user) {
    const { data, error } = await sb.from('usuarios').select('*').eq('id', user.id).single();
    if (error || !data) {
        usuarioActual = { uid: user.id, email: user.email, username: user.email.split('@')[0], puntos: 0 };
    } else {
        usuarioActual = { uid: user.id, ...data };
    }
    actualizarUI();
    cargarMisPredicciones();
    cargarRanking();
    buscarPrediccionActiva();
    actualizarStatsUsuario();
}

// ==============================================
// LÓGICA DE PREDICCIONES Y VOTACIÓN
// ==============================================
function selectPeriodo(periodo, btn) {
    if (prediccionActivaId) { mostrarToast('Ya tienes una prediccion activa', 'error'); return; }
    periodoSeleccionado = periodo;
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('botones-voto').classList.remove('hidden');
    document.getElementById('periodo-activo').classList.remove('hidden');
    document.getElementById('periodo-activo').textContent = 'Periodo: ' + periodo;
}

async function votar(direccion) {
    if (!usuarioActual) { openModal('login'); return mostrarToast('Inicia sesion para votar', 'error'); }
    if (!periodoSeleccionado) return mostrarToast('Selecciona un periodo', 'error');
    if (prediccionActivaId) return mostrarToast('Ya tienes una prediccion activa', 'error');
    const cierre = new Date(Date.now() + DURACIONES[periodoSeleccionado]);
    
    try {
        const { data: existing } = await sb.from('predicciones').select('*')
            .eq('usuario_id', usuarioActual.uid).eq('periodo', periodoSeleccionado).eq('estado', 'activo');
        if (existing && existing.length > 0) return mostrarToast('Ya votaste en este periodo', 'error');

        const { error } = await sb.from('predicciones').insert([{
            usuario_id: usuarioActual.uid, periodo: periodoSeleccionado, voto: direccion,
            precio_inicial: precioBTC, cierre, estado: 'activo'
        }]);
        if (error) throw error;
        
        mostrarToast('Voto registrado: ' + direccion.toUpperCase());
        document.getElementById('botones-voto').classList.add('hidden');
        buscarPrediccionActiva();
        cargarMisPredicciones();
    } catch (e) { mostrarToast('Error al registrar voto: ' + e.message, 'error'); }
}

async function buscarPrediccionActiva() {
    if (!usuarioActual) return;
    const { data } = await sb.from('predicciones').select('*')
        .eq('usuario_id', usuarioActual.uid).eq('estado', 'activo')
        .order('creado', { ascending: false }).limit(1);

    if (data && data.length > 0) {
        const pred = data[0];
        prediccionActivaId = pred.id;
        document.getElementById('prediccion-activa').classList.remove('hidden');
        document.getElementById('mi-voto').innerHTML = pred.voto === 'sube' ? '<span class="text-green-400">▲ SUBE</span>' : '<span class="text-red-400">▼ BAJA</span>';
        document.getElementById('pred-precio-inicial').textContent = '$' + Math.round(pred.precio_inicial).toLocaleString();
        
        if (intervaloTiempo) clearInterval(intervaloTiempo);
        intervaloTiempo = setInterval(() => actualizarTiempoRestante(pred.cierre), 1000);
    } else {
        document.getElementById('prediccion-activa').classList.add('hidden');
        document.getElementById('botones-voto').classList.remove('hidden');
        if (intervaloTiempo) { clearInterval(intervaloTiempo); intervaloTiempo = null; }
    }
}

async function verificarResultadosPendientes() {
    const { data: preds } = await sb.from('predicciones').select('*').eq('estado', 'activo');
    if (!preds) return;
    
    for (const pred of preds) {
        if (new Date(pred.cierre) > new Date()) continue;
        let precioFinal = precioBTC;
        if (precioFinal === 0) {
            try { const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'); const d = await r.json(); precioFinal = d.bitcoin.usd; } catch (e) {}
        }
        
        const subio = precioFinal > pred.precio_inicial;
        const acierto = (pred.voto === 'sube' && subio) || (pred.voto === 'baja' && !subio);
        const pts = acierto ? Math.round((PUNTOS_POR_PERIODO[pred.periodo] || 1) * (MULTIPLICADORES[pred.periodo] || 1)) : 0;
        
        await sb.from('predicciones').update({ 
            precio_final: precioFinal, estado: 'cerrado', resultado: acierto ? 'acierto' : 'fallo', puntos_ganados: pts 
        }).eq('id', pred.id);
        
        await sb.rpc('incrementar_estadisticas', { 
            user_id: pred.usuario_id, puntos: acierto ? pts : 0, aciertos: acierto ? 1 : 0, total: 1 
        });

        if (usuarioActual && usuarioActual.uid === pred.usuario_id) {
            if (acierto) {
                mostrarToast('Acertaste! +' + pts + ' pts', 'success');
                if (window.confetti) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            } else {
                mostrarToast('Fallaste. BTC ' + (subio ? 'subio' : 'bajo'), 'error');
            }
        }
    }
    cargarMisPredicciones();
    cargarRanking();
    buscarPrediccionActiva();
}

// ==============================================
// RANKING Y GLOBAL
// ==============================================
async function cargarRanking() {
    const { data: usuarios } = await sb.from('usuarios').select('*').order('puntos', { ascending: false }).limit(50);
    const tbody = document.getElementById('ranking-body');
    if (!usuarios || usuarios.length === 0) { tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-gray-600">Sin usuarios</td></tr>'; return; }
    
    let miPos = -1;
    tbody.innerHTML = usuarios.map((u, i) => {
        if (usuarioActual && u.id === usuarioActual.uid) miPos = i + 1;
        const tier = getTier(u.puntos || 0);
        const wr = u.total_votos ? ((u.aciertos / u.total_votos) * 100).toFixed(1) : 0;
        const esYo = usuarioActual && u.id === usuarioActual.uid;
        
        return `<tr class="${esYo ? 'bg-amber-500/5' : ''} border-t border-white/5">
            <td class="py-3 px-4 font-bold text-xs">${i + 1}</td>
            <td class="py-3 px-4"><span class="font-semibold text-sm">${u.username}</span>${esYo ? ' <span class="text-[10px] text-amber-400">TU</span>' : ''}</td>
            <td class="py-3 px-4 text-center"><span class="px-2 py-0.5 rounded-lg text-[10px] font-bold ${tier.clase}">${tier.nombre.toUpperCase()}</span></td>
            <td class="py-3 px-4 text-center font-bold text-amber-400 font-mono">${u.puntos || 0}</td>
            <td class="py-3 px-4 text-center font-medium text-sm">${wr}%</td>
        </tr>`;
    }).join('');
    
    if (miPos > 0 && usuarioActual) {
        document.getElementById('mi-posicion').classList.remove('hidden');
        document.getElementById('mi-rank-pos').textContent = '#' + miPos;
    }
}

async function iniciarEscuchaGlobal() {
    sb.channel('cambios-predicciones')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'predicciones' }, payload => {
            todasPrediccionesGlobal.unshift(payload.new);
            renderizarGlobal();
        })
        .subscribe();
    const { data } = await sb.from('predicciones').select('*').order('creado', { ascending: false }).limit(100);
    todasPrediccionesGlobal = data || [];
    renderizarGlobal();
}

function renderizarGlobal() {
    const cont = document.getElementById('global-predicciones');
    cont.innerHTML = todasPrediccionesGlobal.map(p => {
        const activo = p.estado === 'activo';
        let estadoTxt = activo ? 'PENDIENTE' : p.resultado === 'acierto' ? 'ACIERTO' : 'FALLO';
        let estadoCls = activo ? 'badge-pending' : p.resultado === 'acierto' ? 'badge-win' : 'badge-loss';
        const dirCls = p.voto === 'sube' ? 'text-green-400' : 'text-red-400';
        const dirIcon = p.voto === 'sube' ? '▲' : '▼';
        
        return `<div class="prediction-row glass-card rounded-lg p-3.5">
            <div class="flex justify-between items-center flex-wrap gap-2">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-bold text-sm">Usuario</span>
                    <span class="text-[10px] text-gray-600">${p.periodo}</span>
                    <span class="${dirCls} text-xs font-semibold">${dirIcon}</span>
                </div>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold ${estadoCls}">${estadoTxt}</span>
            </div>
        </div>`;
    }).join('');
}

// ==============================================
// INTERFAZ Y UI (Modal, Toast, Tabs)
// ==============================================
function actualizarUI() {
    const authBtns = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    if (usuarioActual) {
        authBtns.classList.add('hidden');
        userMenu.classList.remove('hidden');
        userMenu.classList.add('flex');
        document.getElementById('user-name').textContent = usuarioActual.username;
        const tier = getTier(usuarioActual.puntos || 0);
        document.getElementById('user-tier').textContent = tier.nombre;
        document.getElementById('user-tier').className = 'text-[10px] font-medium px-2.5 py-0.5 rounded-lg ' + tier.clase;
        document.getElementById('user-pred-stats').classList.remove('hidden');
    } else {
        authBtns.classList.remove('hidden');
        userMenu.classList.add('hidden');
        userMenu.classList.remove('flex');
        document.getElementById('user-pred-stats').classList.add('hidden');
    }
}

function actualizarStatsUsuario() {
    if (!usuarioActual) return;
    const pts = usuarioActual.puntos || 0;
    const ac = usuarioActual.aciertos || 0;
    const tot = usuarioActual.total_votos || 0;
    const wr = tot > 0 ? ((ac/tot)*100).toFixed(1) : 0;
    document.getElementById('stats-puntos').textContent = pts;
    document.getElementById('stats-aciertos').textContent = ac;
    document.getElementById('stats-fallos').textContent = tot - ac;
    document.getElementById('stats-winrate').textContent = wr + '%';
    document.getElementById('user-total-preds').textContent = tot;
    document.getElementById('user-win-preds').textContent = ac;
    document.getElementById('user-winrate-preds').textContent = wr + '%';
}

function getTier(puntos) {
    let t = TIERS[0];
    for (const x of TIERS) if (puntos >= x.min) t = x;
    return t;
}

function openModal(tipo) {
    const modal = document.getElementById('modal-auth');
    document.getElementById('login-form').style.display = tipo === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = tipo === 'register' ? 'block' : 'none';
    document.getElementById('modal-titulo').textContent = tipo === 'login' ? 'Iniciar Sesion' : 'Crear Cuenta';
    modal.classList.add('visible');
}

function cerrarModal() {
    document.getElementById('modal-auth').classList.remove('visible');
}

function switchTab(tab, event) {
    document.querySelectorAll('[id^="tab-"]').forEach(el => el.classList.add('hidden'));
    document.getElementById('tab-' + tab).classList.remove('hidden');
    document.querySelectorAll('[onclick^="switchTab"]').forEach(b => { b.classList.remove('tab-active'); b.classList.add('text-gray-500'); });
    if (event) event.target.classList.add('tab-active');
    if (tab === 'ranking') cargarRanking();
    if (tab === 'predict' && usuarioActual) { cargarMisPredicciones(); buscarPrediccionActiva(); }
    if (tab === 'mercado') { initCandlestickChart(); }
}

function mostrarToast(mensaje, tipo) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-text').textContent = mensaje;
    const bg = tipo === 'success' ? 'border-green-500/30 text-green-400' : tipo === 'error' ? 'border-red-500/30 text-red-400' : 'border-amber-500/30 text-amber-400';
    toast.className = 'toast glass px-6 py-3 rounded-xl text-sm font-medium border ' + bg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4000);
}

// ==============================================
// GRÁFICO DE VELAS (Lightweight Charts)
// ==============================================
function initCandlestickChart() {
    if (chartTV) return;
    const container = document.getElementById('candlestick-chart');
    chartTV = LightweightCharts.createChart(container, {
        layout: { background: { color: 'transparent' }, textColor: '#94a3b8' },
        grid: { vertLines: { color: 'rgba(148,163,184,0.04)' }, horzLines: { color: 'rgba(148,163,184,0.04)' } },
        timeScale: { timeVisible: true, secondsVisible: true },
    });
    const candleSeries = chartTV.addCandlestickSeries();
    window.candleSeries = candleSeries;
    loadCandleHistory();
    connectWebSocket();
}

async function loadCandleHistory() {
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${currentTF}&limit=500`);
    const data = await res.json();
    const candles = data.map(d => ({ time: d[0] / 1000, open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]), close: parseFloat(d[4]) }));
    window.candleSeries.setData(candles);
}

function connectWebSocket() {
    if (wsBinance) wsBinance.close();
    wsBinance = new WebSocket(`wss://stream.binance.com:9443/ws/btcusdt@kline_${currentTF}`);
    wsBinance.onmessage = (event) => {
        const k = JSON.parse(event.data).k;
        window.candleSeries.update({ time: k.t / 1000, open: parseFloat(k.o), high: parseFloat(k.h), low: parseFloat(k.l), close: parseFloat(k.c) });
    };
}

function cambiarTimeframe(tf) {
    currentTF = tf;
    loadCandleHistory();
    connectWebSocket();
}

function actualizarConversions(price) {
    if (!price) return;
    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    document.getElementById('conv-01').textContent = fmt.format(price * 0.1);
    document.getElementById('conv-05').textContent = fmt.format(price * 0.5);
    document.getElementById('conv-1').textContent = fmt.format(price);
    document.getElementById('conv-5').textContent = fmt.format(price * 5);
}

function fmtNum(n) {
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    return '$' + n.toLocaleString();
}