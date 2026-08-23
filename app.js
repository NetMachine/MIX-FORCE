/* ============================================================
   BCPREDICT - APP.JS
   Logica completa migrada de Firebase a Supabase
   ============================================================ */

// ============================================================
// SECCION 1: CONFIGURACION DE SUPABASE
// ============================================================
// IMPORTANTE: Reemplaza estos valores con los de tu proyecto Supabase

const SUPABASE_URL = 'https://TU-PROJECT-URL.supabase.co';
const SUPABASE_ANON_KEY = 'TU-ANON-KEY';

// Inicializar cliente Supabase (global para acceso desde cualquier funcion)
let supabase;
try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch(e) {
    console.error('Error inicializando Supabase:', e);
    // Fallback: crear un mock para que la app no se rompa
    supabase = { auth: { onAuthStateChange: ()=>{}, getSession: async()=>({data:{}}) }, from: ()=>({select:()=>({eq:()=>({order:()=>({data:[],error:null})}), single:()=>({data:null,error:null})}), insert:()=>({select:()=>({single:()=>({data:null,error:null})})}), update:()=>({eq:()=>({error:null})}) }) };
}

// ============================================================
// SECCION 2: ESTADO GLOBAL
// ============================================================

const AppState = {
    currentUser: null,
    userProfile: null,
    currentPrice: 65000,
    previousPrice: 65000,
    priceHistory: [],
    marketData: null,
    periodoSeleccionado: null,
    miPrediccionActiva: null,
    misPredicciones: [],
    todasLasPredicciones: [],
    ranking: [],
    logrosDesbloqueados: [],
    tabActiva: 'predict',
    filtroGlobal: 'todos',
    filtroMisPreds: 'todos',
    timeframeChart: '1s',
    notificaciones: [],
    notifOpen: false,
    candleChart: null,
    candleSeries: null,
    subscriptions: []
};

const PERIODOS = {
    '5m':   { nombre: '5 minutos',  puntos: 1,  multiplicador: 1.0,  ms: 5 * 60 * 1000 },
    '15m':  { nombre: '15 minutos', puntos: 2,  multiplicador: 1.2,  ms: 15 * 60 * 1000 },
    '30m':  { nombre: '30 minutos', puntos: 3,  multiplicador: 1.5,  ms: 30 * 60 * 1000 },
    '1h':   { nombre: '1 hora',     puntos: 4,  multiplicador: 2.0,  ms: 60 * 60 * 1000 },
    '4h':   { nombre: '4 horas',    puntos: 5,  multiplicador: 2.5,  ms: 4 * 60 * 60 * 1000 },
    '24h':  { nombre: '24 horas',   puntos: 8,  multiplicador: 3.0,  ms: 24 * 60 * 60 * 1000 },
    '1sem': { nombre: '7 dias',     puntos: 15, multiplicador: 4.0,  ms: 7 * 24 * 60 * 60 * 1000 },
    '1mes': { nombre: '30 dias',    puntos: 30, multiplicador: 5.0,  ms: 30 * 24 * 60 * 60 * 1000 }
};

const LOGROS_DEF = [
    { id: 'primera_prediccion', nombre: 'Primer Paso', desc: 'Realiza tu primera prediccion', icon: '👶', cond: (u) => (u.total_votos||0) >= 1 },
    { id: 'primer_acierto', nombre: 'Acierto Inicial', desc: 'Acierta tu primera prediccion', icon: '🎯', cond: (u) => (u.aciertos||0) >= 1 },
    { id: 'racha_3', nombre: 'Racha de 3', desc: 'Acierta 3 predicciones seguidas', icon: '🔥', cond: (u) => (u.mejor_racha||0) >= 3 },
    { id: 'racha_5', nombre: 'Racha de 5', desc: 'Acierta 5 predicciones seguidas', icon: '⚡', cond: (u) => (u.mejor_racha||0) >= 5 },
    { id: 'racha_10', nombre: 'Racha de 10', desc: 'Acierta 10 predicciones seguidas', icon: '👑', cond: (u) => (u.mejor_racha||0) >= 10 },
    { id: 'racha_20', nombre: 'Racha de 20', desc: 'Acierta 20 predicciones seguidas', icon: '🏆', cond: (u) => (u.mejor_racha||0) >= 20 },
    { id: 'racha_50', nombre: 'Racha de 50', desc: 'Acierta 50 predicciones seguidas', icon: '💎', cond: (u) => (u.mejor_racha||0) >= 50 },
    { id: 'racha_100', nombre: 'Racha de 100', desc: 'Acierta 100 predicciones seguidas', icon: '🌟', cond: (u) => (u.mejor_racha||0) >= 100 },
    { id: 'puntos_100', nombre: 'Centenar', desc: 'Alcanza 100 puntos', icon: '💯', cond: (u) => (u.puntos||0) >= 100 },
    { id: 'puntos_500', nombre: 'Quinientos', desc: 'Alcanza 500 puntos', icon: '🚀', cond: (u) => (u.puntos||0) >= 500 },
    { id: 'puntos_1000', nombre: 'Millar', desc: 'Alcanza 1,000 puntos', icon: '🔱', cond: (u) => (u.puntos||0) >= 1000 },
    { id: 'puntos_5000', nombre: 'Cinco Mil', desc: 'Alcanza 5,000 puntos', icon: '🏅', cond: (u) => (u.puntos||0) >= 5000 },
    { id: 'puntos_10000', nombre: 'Diez Mil', desc: 'Alcanza 10,000 puntos', icon: '🎖️', cond: (u) => (u.puntos||0) >= 10000 },
    { id: 'nivel_oro', nombre: 'Nivel Oro', desc: 'Alcanza el nivel Oro', icon: '🥇', cond: (u) => (u.puntos||0) >= 200 },
    { id: 'nivel_leyenda', nombre: 'Nivel Leyenda', desc: 'Alcanza el nivel Leyenda', icon: '👑', cond: (u) => (u.puntos||0) >= 5000 }
];

// ============================================================
// SECCION 3: UTILIDADES
// ============================================================

function showToast(msg, tipo) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const colores = { success: 'border-green-500/30 text-green-400', error: 'border-red-500/30 text-red-400', info: 'border-blue-500/30 text-blue-400', warning: 'border-amber-500/30 text-amber-400' };
    toast.className = 'fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-xl text-sm font-medium ' + (colores[tipo] || colores.info);
    toast.style.cssText = 'background:rgba(0,0,0,0.9); backdrop-filter:blur(10px); border:1px solid; box-shadow:0 10px 40px rgba(0,0,0,0.5);';
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => { if(toast) toast.classList.add('hidden'); }, 3000);
}

function formatUSD(num) {
    if (num === undefined || num === null) return '$--';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num);
}

function formatCompact(num) {
    if (!num) return '--';
    if (num >= 1e12) return (num/1e12).toFixed(2)+'T';
    if (num >= 1e9) return (num/1e9).toFixed(2)+'B';
    if (num >= 1e6) return (num/1e6).toFixed(2)+'M';
    if (num >= 1e3) return (num/1e3).toFixed(2)+'K';
    return num.toString();
}

function timeAgo(date) {
    const d = new Date(date); const now = new Date();
    const diff = Math.floor((now-d)/1000);
    if (diff < 60) return 'hace '+diff+'s';
    if (diff < 3600) return 'hace '+Math.floor(diff/60)+'m';
    if (diff < 86400) return 'hace '+Math.floor(diff/3600)+'h';
    return 'hace '+Math.floor(diff/86400)+'d';
}

function tiempoRestante(endDate) {
    const diff = new Date(endDate) - new Date();
    if (diff <= 0) return '00:00:00';
    const h = Math.floor(diff/3600000);
    const m = Math.floor((diff%3600000)/60000);
    const s = Math.floor((diff%60000)/1000);
    return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

function getTier(puntos) {
    if (puntos >= 5000) return { nombre: 'Leyenda', clase: 'tier-legend', color: '#fbbf24', next: null, max: 5000 };
    if (puntos >= 1000) return { nombre: 'Maestro', clase: 'tier-master', color: '#8b5cf6', next: 5000, max: 1000 };
    if (puntos >= 500) return { nombre: 'Platino', clase: 'tier-platinum', color: '#06b6d4', next: 1000, max: 500 };
    if (puntos >= 200) return { nombre: 'Oro', clase: 'tier-gold', color: '#eab308', next: 500, max: 200 };
    if (puntos >= 50) return { nombre: 'Plata', clase: 'tier-silver', color: '#9ca3af', next: 200, max: 50 };
    return { nombre: 'Bronce', clase: 'tier-bronze', color: '#d97706', next: 50, max: 0 };
}

function getRachaMultiplier(racha) {
    if (racha >= 10) return 3.0;
    if (racha >= 5) return 2.0;
    if (racha >= 3) return 1.5;
    return 1.0;
}

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash % 360);
    return 'hsl('+hue+', 70%, 60%)';
}

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);
}

// ============================================================
// SECCION 4: TABS Y MODAL
// ============================================================

function switchTab(tabId, event) {
    AppState.tabActiva = tabId;
    document.querySelectorAll('section[id^="tab-"]').forEach(s => s.classList.add('hidden'));
    const tabEl = document.getElementById('tab-' + tabId);
    if (tabEl) tabEl.classList.remove('hidden');

    const buttons = event && event.target && event.target.parentElement ? event.target.parentElement.children : document.querySelectorAll('[onclick^="switchTab"]');
    Array.from(buttons).forEach(btn => { btn.classList.remove('tab-active'); btn.classList.add('text-gray-500'); });
    if (event && event.target) { event.target.classList.add('tab-active'); event.target.classList.remove('text-gray-500'); }

    if (tabId === 'ranking') cargarRanking();
    if (tabId === 'global') cargarPrediccionesGlobal();
    if (tabId === 'analisis') cargarAnalisis();
    if (tabId === 'orderbook') actualizarOrderBook();
    if (tabId === 'calculadora') actualizarConversiones();
    if (tabId === 'achievements') renderizarLogros();
    if (tabId === 'bots') renderizarBots();
    if (tabId === 'mercado') inicializarChart();
}

function openModal(tipo) {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    modal.classList.remove('hidden'); modal.classList.add('flex');
    switchAuth(tipo);
}

function closeModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) { modal.classList.add('hidden'); modal.classList.remove('flex'); }
}

function switchAuth(tipo) {
    const loginForm = document.getElementById('login-form');
    const regForm = document.getElementById('register-form');
    if (loginForm) loginForm.classList.toggle('hidden', tipo !== 'login');
    if (regForm) regForm.classList.toggle('hidden', tipo !== 'register');
}

// ============================================================
// SECCION 5: AUTENTICACION
// ============================================================

async function register() {
    const username = document.getElementById('reg-username');
    const email = document.getElementById('reg-email');
    const password = document.getElementById('reg-password');
    if (!username || !email || !password) return;

    const uVal = username.value.trim(), eVal = email.value.trim(), pVal = password.value;
    if (!uVal || !eVal || !pVal) { showToast('Completa todos los campos', 'error'); return; }
    if (pVal.length < 6) { showToast('La contrasena debe tener al menos 6 caracteres', 'error'); return; }

    try {
        const { data, error } = await supabase.auth.signUp({ email: eVal, password: pVal, options: { data: { username: uVal } } });
        if (error) throw error;
        if (data.user) await supabase.from('profiles').update({ username: uVal }).eq('id', data.user.id);
        showToast('Cuenta creada! Revisa tu email para confirmar.', 'success');
        closeModal();
    } catch(err) { console.error('Error registro:', err); showToast(err.message || 'Error al registrarse', 'error'); }
}

async function login() {
    const email = document.getElementById('login-email');
    const password = document.getElementById('login-password');
    if (!email || !password) return;

    const eVal = email.value.trim(), pVal = password.value;
    if (!eVal || !pVal) { showToast('Completa todos los campos', 'error'); return; }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: eVal, password: pVal });
        if (error) throw error;
        AppState.currentUser = data.user;
        await cargarPerfilUsuario();
        actualizarUIAuth();
        showToast('Sesion iniciada correctamente', 'success');
        closeModal();
        await cargarMisPredicciones();
        await cargarPrediccionesGlobal();
    } catch(err) { console.error('Error login:', err); showToast(err.message || 'Credenciales incorrectas', 'error'); }
}

async function logout() {
    try {
        await supabase.auth.signOut();
        AppState.currentUser = null; AppState.userProfile = null;
        AppState.miPrediccionActiva = null; AppState.misPredicciones = [];
        AppState.logrosDesbloqueados = [];
        actualizarUIAuth();
        const misPreds = document.getElementById('mis-predicciones');
        if (misPreds) misPreds.innerHTML = '<p class="text-gray-600 text-center py-6 text-sm">Inicia sesion para ver tus predicciones</p>';
        showToast('Sesion cerrada', 'info');
    } catch(err) { console.error('Error logout:', err); }
}

async function cargarPerfilUsuario() {
    if (!AppState.currentUser) return;
    try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', AppState.currentUser.id).single();
        if (error) throw error;
        AppState.userProfile = data;
        await cargarLogrosUsuario();
    } catch(err) { console.error('Error cargando perfil:', err); }
}

function actualizarUIAuth() {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const userName = document.getElementById('user-name');
    const userTier = document.getElementById('user-tier');
    const userStats = document.getElementById('user-pred-stats');

    if (AppState.currentUser && AppState.userProfile) {
        if (authButtons) authButtons.classList.add('hidden');
        if (userMenu) { userMenu.classList.remove('hidden'); userMenu.classList.add('flex'); }
        if (userName) userName.textContent = AppState.userProfile.username || 'Usuario';
        const tier = getTier(AppState.userProfile.puntos || 0);
        if (userTier) userTier.innerHTML = '<span class="'+tier.clase+' px-2 py-0.5 rounded-md">'+tier.nombre+'</span>';
        if (userStats) userStats.classList.remove('hidden');
        actualizarStatsUsuario();
    } else {
        if (authButtons) authButtons.classList.remove('hidden');
        if (userMenu) { userMenu.classList.add('hidden'); userMenu.classList.remove('flex'); }
        if (userStats) userStats.classList.add('hidden');
    }
}

function actualizarStatsUsuario() {
    if (!AppState.userProfile) return;
    const p = AppState.userProfile;
    const sp = document.getElementById('stats-puntos'); if (sp) sp.textContent = p.puntos || 0;
    const sa = document.getElementById('stats-aciertos'); if (sa) sa.textContent = p.aciertos || 0;
    const sf = document.getElementById('stats-fallos'); if (sf) sf.textContent = (p.total_votos||0)-(p.aciertos||0);
    const sw = document.getElementById('stats-winrate'); if (sw) sw.textContent = p.total_votos > 0 ? Math.round((p.aciertos/p.total_votos)*100)+'%' : '0%';
    const utp = document.getElementById('user-total-preds'); if (utp) utp.textContent = p.total_votos || 0;
    const uwp = document.getElementById('user-win-preds'); if (uwp) uwp.textContent = p.aciertos || 0;
    const uwr = document.getElementById('user-winrate-preds'); if (uwr) uwr.textContent = p.total_votos > 0 ? Math.round((p.aciertos/p.total_votos)*100)+'%' : '0%';
}

async function checkSession() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
            AppState.currentUser = session.user;
            await cargarPerfilUsuario();
            actualizarUIAuth();
            await cargarMisPredicciones();
        }
    } catch(err) { console.error('Error checking session:', err); }
}

// ============================================================
// SECCION 6: NOTIFICACIONES
// ============================================================

function toggleNotif() {
    AppState.notifOpen = !AppState.notifOpen;
    const panel = document.getElementById('notif-panel');
    if (panel) panel.classList.toggle('hidden', !AppState.notifOpen);
    if (AppState.notifOpen) cargarNotificaciones();
}

async function cargarNotificaciones() {
    if (!AppState.currentUser) return;
    try {
        const { data, error } = await supabase.from('notifications').select('*').eq('user_id', AppState.currentUser.id).order('created_at', {ascending:false}).limit(20);
        if (error) throw error;
        AppState.notificaciones = data || [];
        renderizarNotificaciones();
        const noLeidas = AppState.notificaciones.filter(n => !n.read).length;
        const badge = document.getElementById('notif-badge');
        if (badge) { badge.textContent = noLeidas; badge.classList.toggle('hidden', noLeidas === 0); }
    } catch(err) { console.error('Error cargando notificaciones:', err); }
}

function renderizarNotificaciones() {
    const container = document.getElementById('notif-list');
    if (!container) return;
    if (!AppState.notificaciones.length) { container.innerHTML = '<p class="text-gray-600 text-sm text-center py-4">Sin notificaciones</p>'; return; }
    container.innerHTML = AppState.notificaciones.map(n => '<div class="notif-item '+(n.read?'':'unread')+' cursor-pointer" onclick="marcarNotifLeida(''+n.id+'')">'+
        '<p class="text-xs text-gray-300">'+n.message+'</p><span class="text-[10px] text-gray-600">'+timeAgo(n.created_at)+'</span></div>').join('');
}

async function marcarNotifLeida(id) {
    try { await supabase.from('notifications').update({read:true}).eq('id', id); await cargarNotificaciones(); }
    catch(err) { console.error('Error marcando notif:', err); }
}

// ============================================================
// SECCION 7: MERCADO Y PRECIOS
// ============================================================

async function fetchBTCPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
        const data = await response.json();
        if (data.bitcoin) {
            AppState.previousPrice = AppState.currentPrice;
            AppState.currentPrice = data.bitcoin.usd;
            AppState.priceHistory.push(AppState.currentPrice);
            if (AppState.priceHistory.length > 50) AppState.priceHistory.shift();
            actualizarPrecioUI(data.bitcoin);
            actualizarSparkline();
            actualizarConversiones();
            if (AppState.miPrediccionActiva) {
                const pp = document.getElementById('pred-precio-actual'); if (pp) pp.textContent = formatUSD(AppState.currentPrice);
                const diff = AppState.currentPrice - AppState.miPrediccionActiva.precio_inicial;
                const diffPct = (diff / AppState.miPrediccionActiva.precio_inicial * 100).toFixed(2);
                const diffEl = document.getElementById('pred-diferencia');
                if (diffEl) { diffEl.textContent = (diff>=0?'+':'')+diffPct+'%'; diffEl.className = diff>=0?'text-green-400':'text-red-400'; }
            }
        }
    } catch(err) { console.error('Error fetching BTC price:', err); }
}

function actualizarPrecioUI(data) {
    const price = data.usd; const change = data.usd_24h_change || 0; const isUp = change >= 0;
    const priceStr = price.toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
    const [whole, dec] = priceStr.split('.');

    const pv = document.getElementById('price-value'); if (pv) pv.textContent = '$'+priceStr;
    const pc = document.getElementById('price-change');
    if (pc) { pc.textContent = (isUp?'+':'')+change.toFixed(2)+'%'; pc.className = 'text-xs px-2.5 py-1 rounded-lg font-bold '+(isUp?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'); }
    const pvm = document.getElementById('price-value-movil'); if (pvm) pvm.textContent = '$'+priceStr;
    const pcm = document.getElementById('price-change-movil');
    if (pcm) { pcm.textContent = (isUp?'+':'')+change.toFixed(2)+'%'; pcm.className = 'text-xs px-2 py-0.5 rounded-lg font-medium '+(isUp?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'); }
    const hp = document.getElementById('hero-price'); if (hp) hp.textContent = '$'+whole;
    const hpd = document.getElementById('hero-price-dec'); if (hpd) hpd.textContent = '.'+dec;
    const hc = document.getElementById('hero-change');
    if (hc) { hc.textContent = (isUp?'+':'')+change.toFixed(2)+'%'; hc.className = 'text-sm px-4 py-1.5 rounded-lg font-bold font-mono '+(isUp?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'); }
    const ht = document.getElementById('hero-time'); if (ht) ht.textContent = new Date().toLocaleTimeString();
}

function actualizarSparkline() {
    const history = AppState.priceHistory;
    if (history.length < 2) return;
    const min = Math.min(...history), max = Math.max(...history), range = max-min || 1;
    const points = history.map((p,i) => { const x=(i/(history.length-1))*80; const y=30-((p-min)/range)*25-2.5; return x+','+y; }).join(' ');
    const spa = document.getElementById('sparkline-area'); if (spa) spa.setAttribute('points', '0,30 '+points+' 80,30');
    const spp = document.getElementById('sparkline-path'); if (spp) spp.setAttribute('points', points);
}

async function fetchMarketData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false');
        const data = await response.json();
        AppState.marketData = data;
        const md = data.market_data;
        const qm = document.getElementById('quick-mcap'); if (qm) qm.textContent = formatCompact(md.market_cap.usd);
        const qv = document.getElementById('quick-vol'); if (qv) qv.textContent = formatCompact(md.total_volume.usd);
        const qd = document.getElementById('quick-dom'); if (qd) qd.textContent = (md.market_cap_dominance||0).toFixed(1)+'%';
        const qa = document.getElementById('quick-ath'); if (qa) qa.textContent = formatUSD(md.ath.usd);
        const dm = document.getElementById('det-mcap'); if (dm) dm.textContent = formatCompact(md.market_cap.usd);
        const dv = document.getElementById('det-vol'); if (dv) dv.textContent = formatCompact(md.total_volume.usd);
        const dh = document.getElementById('det-high'); if (dh) dh.textContent = formatUSD(md.high_24h.usd);
        const dl = document.getElementById('det-low'); if (dl) dl.textContent = formatUSD(md.low_24h.usd);
        const da = document.getElementById('det-ath'); if (da) da.textContent = formatUSD(md.ath.usd);
        const dad = document.getElementById('det-ath-date'); if (dad) dad.textContent = new Date(md.ath_date.usd).toLocaleDateString();
        const ds = document.getElementById('det-supply'); if (ds) ds.textContent = formatCompact(md.circulating_supply);
        const dsb = document.getElementById('det-supply-bar'); if (dsb) dsb.style.width = ((md.circulating_supply/md.max_supply)*100)+'%';
        const dd = document.getElementById('det-dom'); if (dd) dd.textContent = (md.market_cap_dominance||0).toFixed(1)+'%';
        const ddb = document.getElementById('det-dom-bar'); if (ddb) ddb.style.width = (md.market_cap_dominance||0)+'%';
        const dse = document.getElementById('det-sentiment');
        if (dse) { const sent = md.sentiment_votes_up_percentage||50; dse.textContent = sent>50?'Alcista '+sent.toFixed(0)+'%':'Bajista '+(100-sent).toFixed(0)+'%'; dse.className = 'text-base font-bold '+(sent>50?'text-green-400':'text-red-400'); }
        const rangeText = 'H: '+formatUSD(md.high_24h.usd)+'  L: '+formatUSD(md.low_24h.usd);
        const pr = document.getElementById('price-range'); if (pr) pr.textContent = rangeText;
        const hr = document.getElementById('hero-range'); if (hr) hr.textContent = rangeText;
    } catch(err) { console.error('Error fetching market data:', err); }
}

async function fetchMarketTicker() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h,7d');
        const data = await response.json();
        const ticker = document.getElementById('market-ticker');
        if (ticker) {
            const items = data.map(c => { const change=c.price_change_percentage_24h||0; const color=change>=0?'text-green-400':'text-red-400'; const arrow=change>=0?'▲':'▼'; return '<span class="ticker-item '+color+'">'+c.symbol.toUpperCase()+' '+arrow+' '+Math.abs(change).toFixed(2)+'%  $'+c.current_price.toLocaleString()+'</span>'; }).join('');
            ticker.innerHTML = items + items;
        }
        const tbody = document.getElementById('top-crypto-table');
        if (tbody) tbody.innerHTML = data.map((c,i) => { const change24=c.price_change_percentage_24h||0; const change7=c.price_change_percentage_7d_in_currency||0; return '<tr class="border-b border-white/5"><td class="py-2 px-3 text-gray-500 font-mono">'+(i+1)+'</td><td class="py-2 px-3"><div class="flex items-center gap-2"><img src="'+c.image+'" alt="'+c.name+'" class="w-5 h-5 rounded-full"><span class="font-medium">'+c.name+'</span><span class="text-gray-500 text-xs">'+c.symbol.toUpperCase()+'</span></div></td><td class="py-2 px-3 text-right font-mono">$'+c.current_price.toLocaleString()+'</td><td class="py-2 px-3 text-right font-mono '+(change24>=0?'text-green-400':'text-red-400')+'">'+(change24>=0?'+':'')+change24.toFixed(2)+'%</td><td class="py-2 px-3 text-right font-mono hidden sm:table-cell">$'+formatCompact(c.market_cap)+'</td><td class="py-2 px-3 text-right font-mono hidden md:table-cell">$'+formatCompact(c.total_volume)+'</td><td class="py-2 px-3 text-right font-mono hidden lg:table-cell '+(change7>=0?'text-green-400':'text-red-400')+'">'+(change7>=0?'+':'')+change7.toFixed(2)+'%</td></tr>'; }).join('');
    } catch(err) { console.error('Error fetching ticker:', err); }
}

async function fetchFearGreed() {
    try {
        const response = await fetch('https://api.alternative.me/fng/?limit=1');
        const data = await response.json();
        if (data.data && data.data[0]) {
            const value = parseInt(data.data[0].value);
            const label = data.data[0].value_classification;
            const fgv = document.getElementById('fear-greed-value'); if (fgv) fgv.textContent = value;
            const fgb = document.getElementById('fear-greed-bar'); if (fgb) fgb.style.width = value+'%';
            const fgl = document.getElementById('fear-greed-label');
            if (fgl) { fgl.textContent = label; if (value<=25) fgl.className='text-xs font-bold px-2 py-1 rounded-md bg-red-500/20 text-red-400'; else if (value<=45) fgl.className='text-xs font-bold px-2 py-1 rounded-md bg-orange-500/20 text-orange-400'; else if (value<=55) fgl.className='text-xs font-bold px-2 py-1 rounded-md bg-yellow-500/20 text-yellow-400'; else if (value<=75) fgl.className='text-xs font-bold px-2 py-1 rounded-md bg-green-500/20 text-green-400'; else fgl.className='text-xs font-bold px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400'; }
        }
    } catch(err) { console.error('Error fetching fear & greed:', err); }
}

function actualizarConversiones() {
    const price = AppState.currentPrice;
    const c01 = document.getElementById('conv-01'); if (c01) c01.textContent = formatUSD(price*0.1);
    const c05 = document.getElementById('conv-05'); if (c05) c05.textContent = formatUSD(price*0.5);
    const c1 = document.getElementById('conv-1'); if (c1) c1.textContent = formatUSD(price);
    const c5 = document.getElementById('conv-5'); if (c5) c5.textContent = formatUSD(price*5);
    const ce = document.getElementById('calc-entry'); if (ce) ce.placeholder = price.toFixed(0);
    const sc = document.getElementById('sim-current'); if (sc) sc.placeholder = price.toFixed(0);
}

// ============================================================
// SECCION 8: PREDICCIONES
// ============================================================

function selectPeriodo(periodo, btn) {
    if (!AppState.currentUser) { showToast('Debes iniciar sesion para predecir', 'error'); openModal('login'); return; }
    if (AppState.miPrediccionActiva) { showToast('Ya tienes una prediccion activa. Espera a que cierre.', 'warning'); return; }
    AppState.periodoSeleccionado = periodo;
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const p = PERIODOS[periodo];
    const inst = document.getElementById('instruccion'); if (inst) inst.textContent = 'Periodo seleccionado: '+p.nombre;
    const pa = document.getElementById('periodo-activo');
    if (pa) { pa.textContent = 'Periodo: '+p.nombre+' | +'+p.puntos+' pts | x'+p.multiplicador+' multiplicador'; pa.classList.remove('hidden'); }
    const bv = document.getElementById('botones-voto'); if (bv) bv.classList.remove('hidden');
}

async function votar(voto) {
    if (!AppState.currentUser || !AppState.periodoSeleccionado) return;
    if (AppState.miPrediccionActiva) { showToast('Ya tienes una prediccion activa', 'warning'); return; }
    const periodo = AppState.periodoSeleccionado;
    const precioInicial = AppState.currentPrice;
    const cierre = new Date(Date.now() + PERIODOS[periodo].ms);
    try {
        const { data, error } = await supabase.from('predictions').insert([{
            user_id: AppState.currentUser.id, periodo: periodo, voto: voto,
            precio_inicial: precioInicial, cierre: cierre.toISOString(), estado: 'activo'
        }]).select().single();
        if (error) throw error;
        AppState.miPrediccionActiva = data;
        AppState.periodoSeleccionado = null;
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('selected'));
        const bv = document.getElementById('botones-voto'); if (bv) bv.classList.add('hidden');
        const inst = document.getElementById('instruccion'); if (inst) inst.textContent = 'Prediccion registrada! Espera el cierre.';
        showToast('Votaste: '+voto.toUpperCase()+' - Periodo: '+PERIODOS[periodo].nombre, 'success');
        mostrarPrediccionActiva();
        await cargarMisPredicciones();
        await cargarPrediccionesGlobal();
    } catch(err) { console.error('Error votando:', err); showToast('Error al registrar voto: '+err.message, 'error'); }
}

function mostrarPrediccionActiva() {
    const pred = AppState.miPrediccionActiva;
    if (!pred) { const pa = document.getElementById('prediccion-activa'); if (pa) pa.classList.add('hidden'); return; }
    const pael = document.getElementById('prediccion-activa'); if (pael) pael.classList.remove('hidden');
    const mv = document.getElementById('mi-voto'); if (mv) { mv.textContent = pred.voto.toUpperCase(); mv.className = 'font-bold text-base mt-1 '+(pred.voto==='sube'?'text-green-400':'text-red-400'); }
    const ppi = document.getElementById('pred-precio-inicial'); if (ppi) ppi.textContent = formatUSD(pred.precio_inicial);
    const ppa = document.getElementById('pred-precio-actual'); if (ppa) ppa.textContent = formatUSD(AppState.currentPrice);
    const ep = document.getElementById('estado-prediccion'); if (ep) ep.innerHTML = '<span class="px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs font-bold">ACTIVO</span>';
}

function actualizarTiempoRestante() {
    if (!AppState.miPrediccionActiva) return;
    const tr = document.getElementById('tiempo-restante');
    if (!tr) return;
    const diff = new Date(AppState.miPrediccionActiva.cierre) - new Date();
    if (diff <= 0) { tr.textContent = 'Cerrando...'; return; }
    const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000), s = Math.floor((diff%60000)/1000);
    tr.textContent = String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

async function cargarMisPredicciones() {
    if (!AppState.currentUser) return;
    try {
        const { data, error } = await supabase.from('predictions').select('*').eq('user_id', AppState.currentUser.id).order('created_at', {ascending:false});
        if (error) throw error;
        AppState.misPredicciones = data || [];
        const activa = AppState.misPredicciones.find(p => p.estado === 'activo');
        AppState.miPrediccionActiva = activa || null;
        if (activa) mostrarPrediccionActiva();
        else {
            const pa = document.getElementById('prediccion-activa'); if (pa) pa.classList.add('hidden');
            const inst = document.getElementById('instruccion'); if (inst) inst.textContent = 'Selecciona un periodo para comenzar a predecir';
            const pao = document.getElementById('periodo-activo'); if (pao) pao.classList.add('hidden');
        }
        renderizarMisPredicciones();
    } catch(err) { console.error('Error cargando predicciones:', err); }
}

function renderizarMisPredicciones() {
    const container = document.getElementById('mis-predicciones');
    if (!container) return;
    let preds = AppState.misPredicciones;
    if (AppState.filtroMisPreds === 'activos') preds = preds.filter(p => p.estado === 'activo');
    if (AppState.filtroMisPreds === 'cerrados') preds = preds.filter(p => p.estado === 'cerrado');
    if (!preds.length) { container.innerHTML = '<p class="text-gray-600 text-center py-6 text-sm">No tienes predicciones registradas</p>'; return; }
    container.innerHTML = preds.map(p => {
        const isUp = p.voto === 'sube'; const isActivo = p.estado === 'activo'; const isAcierto = p.resultado === 'acierto';
        let estadoClass = isActivo ? 'activo' : (isAcierto ? 'acierto' : 'fallo');
        let estadoText = isActivo ? 'ACTIVO' : (isAcierto ? 'ACIERTO +'+(p.puntos_ganados||0)+' pts' : 'FALLO');
        let estadoColor = isActivo ? 'text-amber-400' : (isAcierto ? 'text-green-400' : 'text-red-400');
        return '<div class="pred-card '+estadoClass+'"><div class="flex justify-between items-center flex-wrap gap-2"><div class="flex items-center gap-3"><span class="text-lg '+(isUp?'text-green-400':'text-red-400')+'">'+(isUp?'▲':'▼')+'</span><div><div class="font-bold text-sm">'+p.voto.toUpperCase()+'</div><div class="text-xs text-gray-500">'+(PERIODOS[p.periodo]?.nombre||p.periodo)+'</div></div></div><div class="text-right"><div class="text-xs font-bold '+estadoColor+'">'+estadoText+'</div><div class="text-[10px] text-gray-600">'+timeAgo(p.created_at)+'</div></div></div>'+(p.precio_final?'<div class="mt-2 pt-2 border-t border-white/5 flex justify-between text-xs text-gray-500 font-mono"><span>Entrada: '+formatUSD(p.precio_inicial)+'</span><span>Salida: '+formatUSD(p.precio_final)+'</span><span class="'+((p.precio_final-p.precio_inicial)>=0?'text-green-400':'text-red-400')+'">'+(((p.precio_final-p.precio_inicial)/p.precio_inicial)*100).toFixed(2)+'%</span></div>':'')+'</div>';
    }).join('');
}

function filtrarMisPreds(filtro) {
    AppState.filtroMisPreds = filtro;
    ['todos','activos','cerrados'].forEach(f => {
        const btn = document.getElementById('misfiltro-'+f);
        if (btn) btn.className = f===filtro?'px-3 py-1.5 rounded-lg text-xs bg-amber-500/20 text-amber-400 font-medium no-select':'px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-500 hover:text-gray-300 transition no-select';
    });
    renderizarMisPredicciones();
}

// ============================================================
// SECCION 9: PREDICCIONES GLOBALES
// ============================================================

async function cargarPrediccionesGlobal() {
    try {
        const { data, error } = await supabase.from('predictions').select('*, profiles(username, puntos)').order('created_at', {ascending:false}).limit(100);
        if (error) throw error;
        AppState.todasLasPredicciones = data || [];
        renderizarPrediccionesGlobal();
    } catch(err) { console.error('Error cargando predicciones globales:', err); }
}

function renderizarPrediccionesGlobal() {
    const container = document.getElementById('global-predicciones');
    if (!container) return;
    let preds = AppState.todasLasPredicciones;
    if (AppState.filtroGlobal === 'activos') preds = preds.filter(p => p.estado === 'activo');
    if (AppState.filtroGlobal === 'cerrados') preds = preds.filter(p => p.estado === 'cerrado');
    if (AppState.filtroGlobal === 'sube') preds = preds.filter(p => p.voto === 'sube');
    if (AppState.filtroGlobal === 'baja') preds = preds.filter(p => p.voto === 'baja');
    const activas = preds.filter(p => p.estado === 'activo').length;
    const gc = document.getElementById('global-count'); if (gc) gc.textContent = preds.length+' predicciones';
    const gac = document.getElementById('global-activas-count'); if (gac) gac.textContent = activas+' activas';
    if (!preds.length) { container.innerHTML = '<p class="text-gray-600 text-center py-6 text-sm">No hay predicciones registradas</p>'; return; }
    container.innerHTML = preds.slice(0,50).map(p => {
        const isUp = p.voto === 'sube'; const isActivo = p.estado === 'activo'; const isAcierto = p.resultado === 'acierto';
        const username = p.profiles?.username || 'Usuario'; const color = stringToColor(username);
        let estadoClass = isActivo ? 'activo' : (isAcierto ? 'acierto' : 'fallo');
        let estadoText = isActivo ? 'ACTIVO' : (isAcierto ? 'ACIERTO' : 'FALLO');
        let estadoColor = isActivo ? 'text-amber-400' : (isAcierto ? 'text-green-400' : 'text-red-400');
        return '<div class="pred-card '+estadoClass+'"><div class="flex justify-between items-center flex-wrap gap-2"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style="background:'+color+'20; color:'+color+'; border:1px solid '+color+'40;">'+getInitials(username)+'</div><div><div class="font-bold text-sm">'+username+'</div><div class="text-xs text-gray-500">'+(PERIODOS[p.periodo]?.nombre||p.periodo)+'</div></div></div><div class="text-right"><div class="text-lg '+(isUp?'text-green-400':'text-red-400')+'">'+(isUp?'▲ SUBE':'▼ BAJA')+'</div><div class="text-[10px] font-bold '+estadoColor+'">'+estadoText+'</div></div></div>'+(!isActivo?'<div class="mt-2 text-xs text-gray-500">'+((p.puntos_ganados||0)>0?'+'+p.puntos_ganados+' pts':'0 pts')+'</div>':'')+'</div>';
    }).join('');
}

function filtrarGlobal(filtro) {
    AppState.filtroGlobal = filtro;
    const filtros = ['todos','activos','cerrados','sube','baja'];
    filtros.forEach(f => {
        const btn = document.getElementById('filtro-'+f);
        if (btn) btn.className = f===filtro?'px-3 py-1.5 rounded-lg text-xs bg-amber-500/20 text-amber-400 font-medium no-select':'px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-500 hover:text-gray-300 transition font-medium no-select';
    });
    renderizarPrediccionesGlobal();
}

// ============================================================
// SECCION 10: RANKING
// ============================================================

async function cargarRanking() {
    try {
        const { data, error } = await supabase.from('profiles').select('*').eq('es_bot', false).order('puntos', {ascending:false}).limit(100);
        if (error) throw error;
        AppState.ranking = data || [];
        renderizarRanking();
    } catch(err) { console.error('Error cargando ranking:', err); }
}

function renderizarRanking() {
    const tbody = document.getElementById('ranking-body');
    if (!tbody) return;
    if (!AppState.ranking.length) { tbody.innerHTML = '<tr><td colspan="8" class="py-6 text-center text-gray-600 text-sm">No hay usuarios en el ranking</td></tr>'; return; }
    tbody.innerHTML = AppState.ranking.map((u,i) => {
        const tier = getTier(u.puntos||0);
        const winrate = u.total_votos>0 ? Math.round((u.aciertos/u.total_votos)*100) : 0;
        const color = stringToColor(u.username||'U');
        const isMe = AppState.currentUser && u.id === AppState.currentUser.id;
        return '<tr class="'+(isMe?'bg-amber-500/5':'')+'"><td class="py-3 px-4">'+(i<3?'<span class="text-lg">'+['🥇','🥈','🥉'][i]+'</span>':'<span class="text-gray-500 font-mono">'+(i+1)+'</span>')+'</td><td class="py-3 px-4"><div class="flex items-center gap-2"><div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style="background:'+color+'20; color:'+color+'; border:1px solid '+color+'40;">'+getInitials(u.username||'U')+'</div><span class="font-medium text-sm '+(isMe?'text-amber-400':'')+'">'+(u.username||'Usuario')+'</span>'+(isMe?'<span class="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">TU</span>':'')+'</div></td><td class="py-3 px-4 text-center"><span class="'+tier.clase+' px-2 py-0.5 rounded text-[10px] font-bold">'+tier.nombre+'</span></td><td class="py-3 px-4 text-center font-bold font-mono text-amber-400">'+(u.puntos||0)+'</td><td class="py-3 px-4 text-center font-mono text-green-400">'+(u.aciertos||0)+'</td><td class="py-3 px-4 text-center font-mono text-gray-500">'+(u.total_votos||0)+'</td><td class="py-3 px-4 text-center font-mono '+(winrate>=50?'text-green-400':'text-red-400')+'">'+winrate+'%</td><td class="py-3 px-4 text-center font-mono text-orange-400 hidden sm:table-cell">'+(u.racha||0)+'</td></tr>';
    }).join('');
    if (AppState.currentUser && AppState.userProfile) {
        const miPos = AppState.ranking.findIndex(u => u.id === AppState.currentUser.id);
        if (miPos >= 0) {
            const mp = document.getElementById('mi-posicion'); if (mp) mp.classList.remove('hidden');
            const mrp = document.getElementById('mi-rank-pos'); if (mrp) mrp.textContent = '#'+(miPos+1);
            const tier = getTier(AppState.userProfile.puntos||0);
            if (tier.next) { const progreso = ((AppState.userProfile.puntos-tier.max)/(tier.next-tier.max))*100; const tpb = document.getElementById('tier-progreso-bar'); if (tpb) tpb.style.width = Math.min(progreso,100)+'%'; const tpt = document.getElementById('tier-progreso-text'); if (tpt) tpt.textContent = AppState.userProfile.puntos+'/'+tier.next+' pts'; }
            else { const tpb = document.getElementById('tier-progreso-bar'); if (tpb) tpb.style.width = '100%'; const tpt = document.getElementById('tier-progreso-text'); if (tpt) tpt.textContent = 'Nivel Maximo!'; }
        }
    }
}

// ============================================================
// SECCION 11: LOGROS
// ============================================================

async function cargarLogrosUsuario() {
    if (!AppState.currentUser) return;
    try {
        const { data, error } = await supabase.from('user_achievements').select('achievement_id').eq('user_id', AppState.currentUser.id);
        if (error) throw error;
        AppState.logrosDesbloqueados = (data||[]).map(l => l.achievement_id);
    } catch(err) { console.error('Error cargando logros:', err); }
}

async function verificarLogros() {
    if (!AppState.userProfile) return;
    const nuevos = [];
    for (const l of LOGROS_DEF) { if (!AppState.logrosDesbloqueados.includes(l.id) && l.cond(AppState.userProfile)) nuevos.push(l); }
    if (nuevos.length > 0) {
        const inserts = nuevos.map(l => ({user_id: AppState.currentUser.id, achievement_id: l.id}));
        try {
            await supabase.from('user_achievements').insert(inserts);
            AppState.logrosDesbloqueados.push(...nuevos.map(l => l.id));
            for (const l of nuevos) {
                showToast('Logro desbloqueado: '+l.nombre+' '+l.icon, 'success');
                await supabase.from('notifications').insert([{user_id: AppState.currentUser.id, message: 'Logro desbloqueado: '+l.nombre+' '+l.icon+' - '+l.desc, tipo: 'success'}]);
            }
            if (typeof confetti !== 'undefined') confetti({particleCount:100, spread:70, origin:{y:0.6}, colors:['#f7931a','#eab308','#fbbf24']});
        } catch(err) { console.error('Error guardando logros:', err); }
    }
}

function renderizarLogros() {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;
    const au = document.getElementById('ach-unlocked'); if (au) au.textContent = AppState.logrosDesbloqueados.length+'/'+LOGROS_DEF.length;
    const abs = document.getElementById('ach-best-streak'); if (abs) abs.textContent = AppState.userProfile?.mejor_racha||0;
    const acs = document.getElementById('ach-current-streak'); if (acs) acs.textContent = AppState.userProfile?.racha||0;
    const am = document.getElementById('ach-multiplier'); if (am) am.textContent = 'x'+getRachaMultiplier(AppState.userProfile?.racha||0).toFixed(1);
    grid.innerHTML = LOGROS_DEF.map(l => { const unlocked = AppState.logrosDesbloqueados.includes(l.id); return '<div class="achievement-card '+(unlocked?'unlocked':'locked')+'"><div class="achievement-icon" style="background: '+(unlocked?'rgba(247,147,26,0.1)':'rgba(255,255,255,0.03)')+'; border: 1px solid '+(unlocked?'rgba(247,147,26,0.3)':'rgba(255,255,255,0.05)')+';">'+l.icon+'</div><h4 class="font-bold text-sm '+(unlocked?'text-amber-400':'text-gray-500')+'">'+l.nombre+'</h4><p class="text-xs text-gray-600 mt-1">'+l.desc+'</p>'+(unlocked?'<span class="text-[10px] text-green-400 mt-2 inline-block">Desbloqueado</span>':'<span class="text-[10px] text-gray-700 mt-2 inline-block">Bloqueado</span>')+'</div>'; }).join('');
}

// ============================================================
// SECCION 12: ANALISIS
// ============================================================

function cargarAnalisis() {
    const preds = AppState.todasLasPredicciones;
    const cerrados = preds.filter(p => p.estado === 'cerrado');
    const aciertos = cerrados.filter(p => p.resultado === 'acierto');
    const at = document.getElementById('anal-total'); if (at) at.textContent = preds.length;
    const aw = document.getElementById('anal-winrate'); if (aw) aw.textContent = cerrados.length>0 ? Math.round((aciertos.length/cerrados.length)*100)+'%' : '0%';
    const aa = document.getElementById('anal-activas'); if (aa) aa.textContent = preds.filter(p => p.estado === 'activo').length;
    const au = document.getElementById('anal-usuarios'); if (au) au.textContent = new Set(preds.map(p => p.user_id)).size;
    const suben = preds.filter(p => p.voto === 'sube').length;
    const bajan = preds.filter(p => p.voto === 'baja').length;
    const total = suben+bajan || 1;
    const dsb = document.getElementById('dist-sube-bar'); if (dsb) dsb.style.width = (suben/total*100)+'%';
    const dsp = document.getElementById('dist-sube-pct'); if (dsp) dsp.textContent = Math.round(suben/total*100)+'%';
    const dbb = document.getElementById('dist-baja-bar'); if (dbb) dbb.style.width = (bajan/total*100)+'%';
    const dbp = document.getElementById('dist-baja-pct'); if (dbp) dbp.textContent = Math.round(bajan/total*100)+'%';
    const periodosStats = {};
    for (const p of cerrados) { if (!periodosStats[p.periodo]) periodosStats[p.periodo] = {total:0, aciertos:0}; periodosStats[p.periodo].total++; if (p.resultado === 'acierto') periodosStats[p.periodo].aciertos++; }
    const mejores = Object.entries(periodosStats).map(([periodo,stats]) => ({periodo, ...stats, winrate: stats.total>0?(stats.aciertos/stats.total*100):0})).sort((a,b) => b.winrate-a.winrate).slice(0,5);
    const mp = document.getElementById('mejores-periodos');
    if (mp) mp.innerHTML = mejores.length ? mejores.map(m => '<div class="flex justify-between items-center p-2 rounded-lg bg-black/20"><span class="text-sm font-medium">'+(PERIODOS[m.periodo]?.nombre||m.periodo)+'</span><div class="text-right"><span class="text-xs font-bold '+(m.winrate>=50?'text-green-400':'text-red-400')+'">'+m.winrate.toFixed(1)+'%</span><span class="text-[10px] text-gray-600 ml-2">'+m.aciertos+'/'+m.total+'</span></div></div>').join('') : '<p class="text-gray-600 text-sm">Sin datos suficientes</p>';
    const ultimos = cerrados.slice(0,20);
    const ur = document.getElementById('ultimos-resultados');
    if (ur) ur.innerHTML = ultimos.length ? ultimos.map(p => { const isAcierto = p.resultado === 'acierto'; const username = p.profiles?.username || 'Usuario'; return '<div class="flex justify-between items-center p-2 rounded-lg '+(isAcierto?'bg-green-500/5':'bg-red-500/5')+' border-l-2 '+(isAcierto?'border-green-500':'border-red-500')+'"><div class="flex items-center gap-2"><span class="text-xs font-medium">'+username+'</span><span class="text-[10px] text-gray-500">'+(PERIODOS[p.periodo]?.nombre||p.periodo)+'</span></div><span class="text-xs font-bold '+(isAcierto?'text-green-400':'text-red-400')+'">'+(isAcierto?'+'+(p.puntos_ganados||0)+' pts':'FALLO')+'</span></div>'; }).join('') : '<p class="text-gray-600 text-sm">Sin resultados aun</p>';
}

// ============================================================
// SECCION 13: CALCULADORA
// ============================================================

function calcularGanancia() {
    const entry = parseFloat(document.getElementById('calc-entry')?.value) || 0;
    const exit = parseFloat(document.getElementById('calc-exit')?.value) || 0;
    const amount = parseFloat(document.getElementById('calc-amount')?.value) || 0;
    const leverage = parseFloat(document.getElementById('calc-leverage')?.value) || 1;
    if (!entry || !amount) return;
    const pnl = (exit-entry)*amount*leverage;
    const roi = ((exit-entry)/entry)*100*leverage;
    const liquidation = entry*(1-1/leverage);
    const cr = document.getElementById('calc-result'); if (cr) { cr.textContent = (pnl>=0?'+':'')+formatUSD(Math.abs(pnl)); cr.className = 'text-xl font-bold font-mono '+(pnl>=0?'text-green-400':'text-red-400'); }
    const croi = document.getElementById('calc-roi'); if (croi) { croi.textContent = (roi>=0?'+':'')+roi.toFixed(2)+'%'; croi.className = 'text-lg font-bold font-mono '+(roi>=0?'text-green-400':'text-red-400'); }
    const cl = document.getElementById('calc-liquidation'); if (cl) cl.textContent = leverage>1 ? formatUSD(liquidation) : 'N/A';
}

function simularPrediccion() {
    const current = parseFloat(document.getElementById('sim-current')?.value) || AppState.currentPrice;
    const target = parseFloat(document.getElementById('sim-target')?.value) || 0;
    const periodo = document.getElementById('sim-periodo')?.value || '5m';
    if (!current || !target) return;
    const change = ((target-current)/current)*100;
    const p = PERIODOS[periodo];
    const sc = document.getElementById('sim-change'); if (sc) { sc.textContent = (change>=0?'+':'')+change.toFixed(2)+'%'; sc.className = 'text-xl font-bold font-mono '+(change>=0?'text-green-400':'text-red-400'); }
    const sp = document.getElementById('sim-puntos'); if (sp) sp.textContent = '+'+p.puntos+' pts (x'+p.multiplicador+')';
    const sa = document.getElementById('sim-advice');
    if (sa) { if (Math.abs(change)<1) { sa.textContent = 'El cambio es muy pequeno. Considera un periodo mas corto.'; sa.className = 'text-xs text-yellow-400'; } else if (Math.abs(change)>20) { sa.textContent = 'El cambio es muy grande. Considera un periodo mas largo.'; sa.className = 'text-xs text-amber-400'; } else { sa.textContent = 'El cambio parece razonable. Buena suerte!'; sa.className = 'text-xs text-green-400'; } }
}

// ============================================================
// SECCION 14: ORDER BOOK
// ============================================================

function actualizarOrderBook() {
    const price = AppState.currentPrice;
    const spread = price * 0.0005;
    const bids = []; let bidTotal = 0;
    for (let i = 0; i < 15; i++) { const p = price-spread-(i*price*0.0002); const size = parseFloat((Math.random()*2+0.1).toFixed(4)); bids.push({price:p, size}); bidTotal += size; }
    const asks = []; let askTotal = 0;
    for (let i = 0; i < 15; i++) { const p = price+spread+(i*price*0.0002); const size = parseFloat((Math.random()*2+0.1).toFixed(4)); asks.push({price:p, size}); askTotal += size; }
    const maxSize = Math.max(...bids.map(b=>b.size), ...asks.map(a=>a.size));
    const obb = document.getElementById('orderbook-bids');
    if (obb) obb.innerHTML = bids.map(b => '<div class="order-row"><div class="bar bg-green-500" style="width:'+(b.size/maxSize*100)+'%"></div><div class="content"><span class="text-green-400">'+b.price.toFixed(2)+'</span><span class="text-gray-500">'+b.size.toFixed(4)+'</span></div></div>').join('');
    const oba = document.getElementById('orderbook-asks');
    if (oba) oba.innerHTML = asks.map(a => '<div class="order-row"><div class="bar bg-red-500" style="width:'+(a.size/maxSize*100)+'%"></div><div class="content"><span class="text-red-400">'+a.price.toFixed(2)+'</span><span class="text-gray-500">'+a.size.toFixed(4)+'</span></div></div>').join('');
    const bt = document.getElementById('bid-total'); if (bt) bt.textContent = bidTotal.toFixed(4)+' BTC';
    const at = document.getElementById('ask-total'); if (at) at.textContent = askTotal.toFixed(4)+' BTC';
    const os = document.getElementById('orderbook-spread'); if (os) os.textContent = formatUSD(spread);
    const ratio = bidTotal/(askTotal||1);
    const or = document.getElementById('orderbook-ratio');
    if (or) { or.textContent = ratio.toFixed(2); or.className = 'text-lg font-bold font-mono '+(ratio>1?'text-green-400':'text-red-400'); }
    const buyPressure = (bidTotal/(bidTotal+askTotal))*100;
    const bpp = document.getElementById('buy-pressure-pct'); if (bpp) bpp.textContent = buyPressure.toFixed(1)+'%';
    const bpb = document.getElementById('buy-pressure-bar'); if (bpb) bpb.style.width = buyPressure+'%';
    const heatmap = document.getElementById('liquidation-heatmap');
    if (heatmap) { heatmap.innerHTML = ''; for (let i = 0; i < 25; i++) { const intensity = Math.random(); const isLong = i < 12; const cell = document.createElement('div'); cell.className = 'heatmap-cell'; cell.style.background = isLong ? 'rgba(239,68,68,'+(intensity*0.5)+')' : 'rgba(34,197,94,'+(intensity*0.5)+')'; heatmap.appendChild(cell); } }
}

// ============================================================
// SECCION 15: GRAFICO DE VELAS
// ============================================================

function inicializarChart() {
    if (AppState.candleChart) return;
    const chartContainer = document.getElementById('candlestick-chart');
    if (!chartContainer || !window.LightweightCharts) return;
    AppState.candleChart = LightweightCharts.createChart(chartContainer, {
        layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#9ca3af' },
        grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
        timeScale: { borderColor: 'rgba(255,255,255,0.1)' },
        width: chartContainer.clientWidth, height: 400,
    });
    AppState.candleSeries = AppState.candleChart.addCandlestickSeries({
        upColor: '#22c55e', downColor: '#ef4444', borderUpColor: '#22c55e', borderDownColor: '#ef4444',
        wickUpColor: '#22c55e', wickDownColor: '#ef4444',
    });
    generarDatosCandle();
    window.addEventListener('resize', () => { if (AppState.candleChart) AppState.candleChart.applyOptions({width: chartContainer.clientWidth}); });
}

function generarDatosCandle() {
    if (!AppState.candleSeries) return;
    const data = []; let price = AppState.currentPrice * 0.95; const now = new Date();
    for (let i = 100; i >= 0; i--) {
        const time = new Date(now.getTime()-i*60000);
        const open = price; const change = (Math.random()-0.48)*price*0.005;
        const close = price+change; const high = Math.max(open,close)+Math.random()*price*0.002; const low = Math.min(open,close)-Math.random()*price*0.002;
        data.push({ time: {year:time.getFullYear(), month:time.getMonth()+1, day:time.getDate(), hour:time.getHours(), minute:time.getMinutes()}, open, high, low, close });
        price = close;
    }
    AppState.candleSeries.setData(data);
    AppState.candleChart.timeScale().fitContent();
}

function cambiarTimeframe(tf) {
    AppState.timeframeChart = tf;
    ['1s','1m','5m','15m','1h','4h'].forEach(t => {
        const btn = document.getElementById('tf-'+t);
        if (btn) btn.className = t===tf?'px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-amber-500/20 text-amber-400 no-select':'px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-white/5 text-gray-500 hover:text-gray-300 transition no-select';
    });
    generarDatosCandle();
}

// ============================================================
// SECCION 16: PARTICULAS THREE.JS
// ============================================================

function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas || !window.THREE) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount*3);
    const colors = new Float32Array(particleCount*3);
    for (let i = 0; i < particleCount; i++) {
        positions[i*3] = (Math.random()-0.5)*20; positions[i*3+1] = (Math.random()-0.5)*20; positions[i*3+2] = (Math.random()-0.5)*20;
        colors[i*3] = 0.97+Math.random()*0.03; colors[i*3+1] = 0.55+Math.random()*0.2; colors[i*3+2] = 0.1+Math.random()*0.1;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    camera.position.z = 5;
    function animate() { requestAnimationFrame(animate); particles.rotation.y += 0.0005; particles.rotation.x += 0.0002; renderer.render(scene, camera); }
    animate();
    window.addEventListener('resize', () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
}

// ============================================================
// SECCION 17: SUSCRIPCIONES REALTIME
// ============================================================

function setupRealtimeSubscriptions() {
    try {
        const predChannel = supabase.channel('predictions-channel').on('postgres_changes', {event:'*', schema:'public', table:'predictions'}, (payload) => {
            console.log('Cambio en predicciones:', payload);
            cargarPrediccionesGlobal();
            if (AppState.currentUser) cargarMisPredicciones();
            if (AppState.tabActiva === 'analisis') cargarAnalisis();
        }).subscribe();
        const profileChannel = supabase.channel('profiles-channel').on('postgres_changes', {event:'*', schema:'public', table:'profiles'}, (payload) => {
            console.log('Cambio en perfiles:', payload);
            if (AppState.tabActiva === 'ranking') cargarRanking();
        }).subscribe();
        AppState.subscriptions.push(predChannel, profileChannel);
    } catch(e) { console.error('Error setup realtime:', e); }
}

// ============================================================
// SECCION 18: CIERRE DE PREDICCIONES VENCIDAS
// ============================================================

async function verificarPrediccionesVencidas() {
    try {
        const { data, error } = await supabase.rpc('check_expired_predictions');
        if (error) { await cerrarPrediccionesManual(); return; }
        if (data && data.length > 0) {
            console.log('Predicciones cerradas:', data);
            await cargarMisPredicciones(); await cargarPrediccionesGlobal(); await cargarPerfilUsuario(); actualizarStatsUsuario(); await verificarLogros();
            for (const result of data) { if (result.acierto && result.user_id === AppState.currentUser?.id) { showToast('Prediccion acertada! +'+result.puntos+' puntos', 'success'); if (typeof confetti !== 'undefined') confetti({particleCount:50, spread:60, origin:{y:0.7}}); } }
        }
    } catch(err) { console.error('Error verificando predicciones:', err); }
}

async function cerrarPrediccionesManual() {
    try {
        const { data: vencidas, error } = await supabase.from('predictions').select('*').eq('estado', 'activo').lt('cierre', new Date().toISOString());
        if (error || !vencidas?.length) return;
        const currentPrice = AppState.currentPrice;
        for (const pred of vencidas) {
            const subio = currentPrice > pred.precio_inicial;
            const acierto = (pred.voto === 'sube' && subio) || (pred.voto === 'baja' && !subio);
            const basePts = PERIODOS[pred.periodo]?.puntos || 1;
            const mult = PERIODOS[pred.periodo]?.multiplicador || 1;
            const { data: profile } = await supabase.from('profiles').select('racha').eq('id', pred.user_id).single();
            const streakMult = getRachaMultiplier(profile?.racha || 0);
            const puntos = acierto ? Math.round(basePts*mult*streakMult) : 0;
            await supabase.from('predictions').update({ estado: 'cerrado', resultado: acierto?'acierto':'fallo', puntos_ganados: puntos, precio_final: currentPrice, cerrado_at: new Date().toISOString() }).eq('id', pred.id);
            if (acierto) {
                await supabase.from('profiles').update({ puntos: supabase.rpc('increment', {x: puntos}), aciertos: supabase.rpc('increment', {x: 1}), total_votos: supabase.rpc('increment', {x: 1}), racha: supabase.rpc('increment', {x: 1}), mejor_racha: supabase.rpc('greatest', {a: supabase.rpc('increment', {x: 1}), b: profile?.mejor_racha || 0}) }).eq('id', pred.user_id);
            } else {
                await supabase.from('profiles').update({ total_votos: supabase.rpc('increment', {x: 1}), racha: 0 }).eq('id', pred.user_id);
            }
        }
        if (vencidas.length > 0) { await cargarMisPredicciones(); await cargarPrediccionesGlobal(); await cargarPerfilUsuario(); actualizarStatsUsuario(); }
    } catch(err) { console.error('Error cerrando predicciones manual:', err); }
}

// ============================================================
// SECCION 19: MOTOR DE BOTS (PANEL DE CONTROL)
// ============================================================

const BotState = { bots: [], intervalId: null, isRunning: false, logs: [], prediccionesHoy: 0 };
const BOT_NAMES = ["CryptoWhale","BitMaster","SatoshiBot","HodlKing","MoonWalker","BullRunner","BearSlayer","ChartMaster","AlphaBot","DeltaFlow","GammaRay","OmegaBot","NeoTrader","ZenMaster","FlashBot","DeepLearn","QuantumAI","NeuralNet","TrendBot","ScalpMaster","SwingPro","DayTrader","PositionBot","Arbitrage","Momentum","VolumeBot","Breakout","SupportBot","Resistance","Fibonacci","ElliottBot","Ichimoku","Bollinger","RSIBot","MACDTrader","Stochastic","WilliamsR","ADXBot","CCI_Bot","MFI_Trader","OBV_Bot","SAR_Bot","ATR_Bot","Keltner","Donchian","Parabolic","HeikinAshi","RenkoBot","PointFigure","KagiBot"];
const BOT_PERSONALITIES = { aggressive: {skillRange:[0.45,0.65], activity:0.9, risk:0.8, desc:"Agresiva"}, balanced: {skillRange:[0.50,0.70], activity:0.7, risk:0.5, desc:"Balanceada"}, conservative: {skillRange:[0.55,0.75], activity:0.5, risk:0.2, desc:"Conservadora"}, whale: {skillRange:[0.65,0.85], activity:0.6, risk:0.6, desc:"Whale"}, newbie: {skillRange:[0.30,0.50], activity:0.8, risk:0.7, desc:"Novato"}, random: {skillRange:[0.40,0.70], activity:0.7, risk:0.5, desc:"Aleatoria"} };

async function createBots() {
    const cantidad = parseInt(document.getElementById('bot-create-count')?.value) || 5;
    const personalidad = document.getElementById('bot-personality')?.value || 'random';
    const skillBase = parseFloat(document.getElementById('bot-skill')?.value) || 0.5;
    try {
        const nuevosBots = [];
        for (let i = 0; i < cantidad; i++) {
            const nombre = BOT_NAMES[Math.floor(Math.random()*BOT_NAMES.length)]+'_'+Math.floor(Math.random()*9999);
            const persona = personalidad === 'random' ? Object.keys(BOT_PERSONALITIES)[Math.floor(Math.random()*5)] : personalidad;
            const config = BOT_PERSONALITIES[persona];
            const skill = config.skillRange[0]+Math.random()*(config.skillRange[1]-config.skillRange[0]);
            const email = 'bot_'+Date.now()+'_'+i+'@bcpredict.local';
            const password = 'BotPass_'+Math.random().toString(36).slice(2);
            const { data: authData, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { username: nombre } } });
            if (authError) { console.warn('Error creando auth para bot:', authError); continue; }
            if (authData.user) {
                await supabase.from('profiles').update({ username: nombre, es_bot: true, personality: persona, skill: skill, activity_level: config.activity, is_active: true, created_by: AppState.currentUser?.id || null }).eq('id', authData.user.id);
                nuevosBots.push({ id: authData.user.id, username: nombre, personality: persona, skill, activity: config.activity, is_active: true });
            }
        }
        BotState.bots.push(...nuevosBots);
        addBotLog('Creados '+nuevosBots.length+' bots nuevos');
        showToast(nuevosBots.length+' bots creados exitosamente', 'success');
        renderizarBots();
    } catch(err) { console.error('Error creando bots:', err); showToast('Error al crear bots: '+err.message, 'error'); }
}

function startAllBots() {
    if (BotState.isRunning) { showToast('Los bots ya estan activos', 'warning'); return; }
    BotState.isRunning = true; addBotLog('Motor de bots iniciado'); showToast('Bots iniciados - Votando automaticamente', 'success');
    BotState.intervalId = setInterval(() => { botVotingCycle(); }, 30000);
    botVotingCycle(); renderizarBots();
}

function stopAllBots() {
    if (!BotState.isRunning) { showToast('Los bots ya estan detenidos', 'warning'); return; }
    clearInterval(BotState.intervalId); BotState.isRunning = false; BotState.intervalId = null;
    addBotLog('Motor de bots detenido'); showToast('Bots detenidos', 'info'); renderizarBots();
}

async function deleteAllBots() {
    if (!confirm('Eliminar TODOS los bots? Esta accion no se puede deshacer.')) return;
    try {
        stopAllBots();
        const { data: misBots, error } = await supabase.from('profiles').select('id').eq('es_bot', true).eq('created_by', AppState.currentUser?.id);
        if (error) throw error;
        for (const bot of misBots||[]) { await supabase.from('profiles').update({ is_active: false }).eq('id', bot.id); }
        BotState.bots = []; addBotLog('Todos los bots eliminados'); showToast((misBots?.length||0)+' bots eliminados', 'info'); renderizarBots();
    } catch(err) { console.error('Error eliminando bots:', err); showToast('Error al eliminar bots', 'error'); }
}

async function botVotingCycle() {
    if (!BotState.bots.length) return;
    for (const bot of BotState.bots) {
        if (!bot.is_active) continue;
        if (Math.random() > bot.activity) continue;
        const tendencia = AppState.currentPrice > AppState.previousPrice ? 'sube' : 'baja';
        const acierto = Math.random() < bot.skill;
        const voto = acierto ? tendencia : (tendencia === 'sube' ? 'baja' : 'sube');
        const periodos = ['5m','15m','30m','1h','4h'];
        const periodo = periodos[Math.floor(Math.random()*periodos.length)];
        try {
            const { error } = await supabase.from('predictions').insert([{ user_id: bot.id, periodo: periodo, voto: voto, precio_inicial: AppState.currentPrice, cierre: new Date(Date.now()+PERIODOS[periodo].ms).toISOString(), estado: 'activo', es_bot: true }]);
            if (!error) { BotState.prediccionesHoy++; addBotLog(bot.username+' voto '+voto.toUpperCase()+' ('+periodo+')'); }
        } catch(err) { console.error('Error bot votando:', err); }
    }
}

function addBotLog(message) {
    const timestamp = new Date().toLocaleTimeString();
    BotState.logs.unshift('['+timestamp+'] '+message);
    if (BotState.logs.length > 100) BotState.logs.pop();
    const logContainer = document.getElementById('bot-logs');
    if (logContainer) logContainer.innerHTML = BotState.logs.map(l => '<div class="text-gray-400 hover:text-gray-300 transition">'+l+'</div>').join('');
}

async function renderizarBots() {
    const bca = document.getElementById('bot-count-active'); if (bca) bca.textContent = BotState.bots.filter(b=>b.is_active).length;
    const bct = document.getElementById('bot-count-total'); if (bct) bct.textContent = BotState.bots.length;
    const bpt = document.getElementById('bot-preds-today'); if (bpt) bpt.textContent = BotState.prediccionesHoy;
    try {
        const { data: botPreds } = await supabase.from('predictions').select('resultado').eq('es_bot', true).eq('estado', 'cerrado');
        if (botPreds?.length) { const aciertos = botPreds.filter(p=>p.resultado==='acierto').length; const baw = document.getElementById('bot-avg-winrate'); if (baw) baw.textContent = Math.round((aciertos/botPreds.length)*100)+'%'; }
    } catch(e) {}
    const tbody = document.getElementById('bots-table');
    if (!tbody) return;
    if (!BotState.bots.length) { tbody.innerHTML = '<tr><td colspan="8" class="py-6 text-center text-gray-600 text-sm">No hay bots activos</td></tr>'; return; }
    tbody.innerHTML = BotState.bots.map(b => { const persona = BOT_PERSONALITIES[b.personality] || BOT_PERSONALITIES.random; return '<tr><td class="py-3 px-4"><div class="flex items-center gap-2"><div class="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px]">🤖</div><span class="font-medium text-sm">'+b.username+'</span></div></td><td class="py-3 px-4 text-center text-xs">'+persona.desc+'</td><td class="py-3 px-4 text-center font-mono text-xs">'+(b.skill*100).toFixed(0)+'%</td><td class="py-3 px-4 text-center font-mono text-xs">-</td><td class="py-3 px-4 text-center font-mono text-xs">-</td><td class="py-3 px-4 text-center font-mono text-xs">-</td><td class="py-3 px-4 text-center"><span class="px-2 py-0.5 rounded text-[10px] font-bold '+(b.is_active?'bg-green-500/20 text-green-400':'bg-gray-500/20 text-gray-400')+'">'+(b.is_active?'ACTIVO':'DETENIDO')+'</span></td><td class="py-3 px-4 text-center"><button onclick="toggleBot(''+b.id+'')" class="text-xs text-amber-400 hover:text-amber-300">Toggle</button></td></tr>'; }).join('');
}

function toggleBot(botId) {
    const bot = BotState.bots.find(b => b.id === botId);
    if (bot) { bot.is_active = !bot.is_active; addBotLog(bot.username+' '+(bot.is_active?'activado':'desactivado')); renderizarBots(); }
}

// ============================================================
// SECCION 20: INICIALIZACION
// ============================================================

async function initApp() {
    console.log('Iniciando BCPredict Pro...');
    await checkSession();
    await fetchBTCPrice();
    await fetchMarketData();
    await fetchMarketTicker();
    await fetchFearGreed();
    await cargarPrediccionesGlobal();
    initParticles();
    setupRealtimeSubscriptions();
    setInterval(() => { fetchBTCPrice(); actualizarTiempoRestante(); }, 5000);
    setInterval(() => { fetchMarketData(); fetchMarketTicker(); }, 30000);
    setInterval(fetchFearGreed, 300000);
    setInterval(() => { if (AppState.tabActiva === 'orderbook') actualizarOrderBook(); }, 3000);
    setInterval(verificarPrediccionesVencidas, 10000);
    console.log('BCPredict Pro iniciado correctamente');
}

// Event listeners
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
document.addEventListener('click', (e) => {
    const notifPanel = document.getElementById('notif-panel');
    const notifBtn = e.target.closest('button[onclick="toggleNotif()"]');
    if (!notifBtn && !e.target.closest('#notif-panel') && AppState.notifOpen) { AppState.notifOpen = false; if (notifPanel) notifPanel.classList.add('hidden'); }
});
document.addEventListener('DOMContentLoaded', initApp);
