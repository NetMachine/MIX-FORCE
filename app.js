// ==============================================
// CONFIGURACIÓN DE SUPABASE (Renombrado a 'sb' para evitar errores)
// ==============================================
const SUPABASE_URL = 'https://smdxexgrtdpniphtnvab.supabase.co';

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtZHhleGdydGRwbmlwaHRudmFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczNjY0MjcsImV4cCI6MjEwMjk0MjQyN30.f7-gHQynQiI4yE9XH9k6yZA_a-x9tlo93jjq3vwQm3g';
// const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 




/* ============================================================
   BCPREDICT - APP.JS
   Logica completa migrada de Firebase a Supabase
   Autenticacion, Predicciones, Ranking, Bots y mas
   ============================================================ */

// ============================================================
// SECCION 1: CONFIGURACION DE SUPABASE
// ============================================================
// IMPORTANTE: Reemplaza estos valores con los de tu proyecto Supabase
// Ve a Settings > API en tu dashboard de Supabase

//const SUPABASE_URL = 'https://TU-PROJECT-URL.supabase.co';
//const SUPABASE_ANON_KEY = 'TU-ANON-KEY';

// Inicializar cliente Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
// SECCION 2: ESTADO GLOBAL DE LA APLICACION
// ============================================================

const AppState = {
    // Usuario actual
    currentUser: null,
    userProfile: null,
    
    // Datos de mercado
    currentPrice: 65000,
    previousPrice: 65000,
    priceHistory: [],
    marketData: null,
    
    // Predicciones
    periodoSeleccionado: null,
    miPrediccionActiva: null,
    misPredicciones: [],
    todasLasPredicciones: [],
    
    // Ranking
    ranking: [],
    
    // Logros
    logrosDesbloqueados: [],
    
    // Bots
    bots: [],
    botInterval: null,
    botLogs: [],
    
    // UI
    tabActiva: 'predict',
    filtroGlobal: 'todos',
    filtroMisPreds: 'todos',
    timeframeChart: '1s',
    notificaciones: [],
    notifOpen: false,
    
    // Graficos
    candleChart: null,
    candleSeries: null,
    
    // Suscripciones en tiempo real
    subscriptions: []
};

// ============================================================
// SECCION 3: CONFIGURACION DE PERIODOS
// ============================================================

const PERIODOS = {
    '5m':   { nombre: '5 minutos',    puntos: 1,  multiplicador: 1.0,  ms: 5 * 60 * 1000 },
    '15m':  { nombre: '15 minutos',   puntos: 2,  multiplicador: 1.2,  ms: 15 * 60 * 1000 },
    '30m':  { nombre: '30 minutos',   puntos: 3,  multiplicador: 1.5,  ms: 30 * 60 * 1000 },
    '1h':   { nombre: '1 hora',       puntos: 4,  multiplicador: 2.0,  ms: 60 * 60 * 1000 },
    '4h':   { nombre: '4 horas',      puntos: 5,  multiplicador: 2.5,  ms: 4 * 60 * 60 * 1000 },
    '24h':  { nombre: '24 horas',     puntos: 8,  multiplicador: 3.0,  ms: 24 * 60 * 60 * 1000 },
    '1sem': { nombre: '7 dias',       puntos: 15, multiplicador: 4.0,  ms: 7 * 24 * 60 * 60 * 1000 },
    '1mes': { nombre: '30 dias',      puntos: 30, multiplicador: 5.0,  ms: 30 * 24 * 60 * 60 * 1000 }
};

// ============================================================
// SECCION 4: DEFINICION DE LOGROS
// ============================================================

const LOGROS_DEF = [
    { id: 'primera_prediccion', nombre: 'Primer Paso', desc: 'Realiza tu primera prediccion', icon: '👶', cond: (u) => u.total_votos >= 1 },
    { id: 'primer_acierto', nombre: 'Acierto Inicial', desc: 'Acierta tu primera prediccion', icon: '🎯', cond: (u) => u.aciertos >= 1 },
    { id: 'racha_3', nombre: 'Racha de 3', desc: 'Acierta 3 predicciones seguidas', icon: '🔥', cond: (u) => u.mejor_racha >= 3 },
    { id: 'racha_5', nombre: 'Racha de 5', desc: 'Acierta 5 predicciones seguidas', icon: '⚡', cond: (u) => u.mejor_racha >= 5 },
    { id: 'racha_10', nombre: 'Racha de 10', desc: 'Acierta 10 predicciones seguidas', icon: '👑', cond: (u) => u.mejor_racha >= 10 },
    { id: 'racha_20', nombre: 'Racha de 20', desc: 'Acierta 20 predicciones seguidas', icon: '🏆', cond: (u) => u.mejor_racha >= 20 },
    { id: 'racha_50', nombre: 'Racha de 50', desc: 'Acierta 50 predicciones seguidas', icon: '💎', cond: (u) => u.mejor_racha >= 50 },
    { id: 'racha_100', nombre: 'Racha de 100', desc: 'Acierta 100 predicciones seguidas', icon: '🌟', cond: (u) => u.mejor_racha >= 100 },
    { id: 'puntos_100', nombre: 'Centenar', desc: 'Alcanza 100 puntos', icon: '💯', cond: (u) => u.puntos >= 100 },
    { id: 'puntos_500', nombre: 'Quinientos', desc: 'Alcanza 500 puntos', icon: '🚀', cond: (u) => u.puntos >= 500 },
    { id: 'puntos_1000', nombre: 'Millar', desc: 'Alcanza 1,000 puntos', icon: '🔱', cond: (u) => u.puntos >= 1000 },
    { id: 'puntos_5000', nombre: 'Cinco Mil', desc: 'Alcanza 5,000 puntos', icon: '🏅', cond: (u) => u.puntos >= 5000 },
    { id: 'puntos_10000', nombre: 'Diez Mil', desc: 'Alcanza 10,000 puntos', icon: '🎖️', cond: (u) => u.puntos >= 10000 },
    { id: 'nivel_oro', nombre: 'Nivel Oro', desc: 'Alcanza el nivel Oro', icon: '🥇', cond: (u) => u.puntos >= 200 },
    { id: 'nivel_leyenda', nombre: 'Nivel Leyenda', desc: 'Alcanza el nivel Leyenda', icon: '👑', cond: (u) => u.puntos >= 5000 }
];

// ============================================================
// SECCION 5: UTILIDADES GENERALES
// ============================================================

/**
 * Muestra un mensaje toast temporal
 * @param {string} msg - Mensaje a mostrar
 * @param {string} tipo - Tipo: 'success', 'error', 'info', 'warning'
 */
function showToast(msg, tipo = 'info') {
    const toast = document.getElementById('toast');
    const colores = {
        success: 'border-green-500/30 text-green-400',
        error: 'border-red-500/30 text-red-400',
        info: 'border-blue-500/30 text-blue-400',
        warning: 'border-amber-500/30 text-amber-400'
    };
    toast.className = `fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[100] px-6 py-3 rounded-xl text-sm font-medium ${colores[tipo] || colores.info}`;
    toast.style.cssText = 'background:rgba(0,0,0,0.9); backdrop-filter:blur(10px); border:1px solid; box-shadow:0 10px 40px rgba(0,0,0,0.5);';
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

/**
 * Formatea un numero como moneda USD
 * @param {number} num - Numero a formatear
 * @returns {string}
 */
function formatUSD(num) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num);
}

/**
 * Formatea un numero grande (K, M, B)
 * @param {number} num - Numero a formatear
 * @returns {string}
 */
function formatCompact(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toString();
}

/**
 * Formatea una fecha relativa
 * @param {Date|string} date - Fecha a formatear
 * @returns {string}
 */
function timeAgo(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'hace ' + diff + 's';
    if (diff < 3600) return 'hace ' + Math.floor(diff / 60) + 'm';
    if (diff < 86400) return 'hace ' + Math.floor(diff / 3600) + 'h';
    return 'hace ' + Math.floor(diff / 86400) + 'd';
}

/**
 * Calcula el tiempo restante en formato HH:MM:SS
 * @param {Date} endDate - Fecha de cierre
 * @returns {string}
 */
function tiempoRestante(endDate) {
    const diff = new Date(endDate) - new Date();
    if (diff <= 0) return '00:00:00';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/**
 * Obtiene el tier/nivel del usuario segun sus puntos
 * @param {number} puntos - Puntos del usuario
 * @returns {Object}
 */
function getTier(puntos) {
    if (puntos >= 5000) return { nombre: 'Leyenda', clase: 'tier-legend', color: '#fbbf24', next: null, max: 5000 };
    if (puntos >= 1000) return { nombre: 'Maestro', clase: 'tier-master', color: '#8b5cf6', next: 5000, max: 1000 };
    if (puntos >= 500) return { nombre: 'Platino', clase: 'tier-platinum', color: '#06b6d4', next: 1000, max: 500 };
    if (puntos >= 200) return { nombre: 'Oro', clase: 'tier-gold', color: '#eab308', next: 500, max: 200 };
    if (puntos >= 50) return { nombre: 'Plata', clase: 'tier-silver', color: '#9ca3af', next: 200, max: 50 };
    return { nombre: 'Bronce', clase: 'tier-bronze', color: '#d97706', next: 50, max: 0 };
}

/**
 * Obtiene el multiplicador de racha
 * @param {number} racha - Racha actual
 * @returns {number}
 */
function getRachaMultiplier(racha) {
    if (racha >= 10) return 3.0;
    if (racha >= 5) return 2.0;
    if (racha >= 3) return 1.5;
    return 1.0;
}

/**
 * Genera un color unico basado en un string
 * @param {string} str - String para generar el color
 * @returns {string}
 */
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
}

/**
 * Genera iniciales de un nombre
 * @param {string} name - Nombre completo
 * @returns {string}
 */
function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ============================================================
// SECCION 6: GESTION DE TABS
// ============================================================

/**
 * Cambia entre tabs de navegacion
 * @param {string} tabId - ID del tab a mostrar
 * @param {Event} event - Evento del click
 */
function switchTab(tabId, event) {
    AppState.tabActiva = tabId;
    
    // Ocultar todas las secciones
    document.querySelectorAll('section[id^="tab-"]').forEach(s => s.classList.add('hidden'));
    document.getElementById('tab-' + tabId).classList.remove('hidden');
    
    // Actualizar botones activos
    const buttons = event?.target?.parentElement?.children || document.querySelectorAll('[onclick^="switchTab"]');
    Array.from(buttons).forEach(btn => {
        btn.classList.remove('tab-active');
        btn.classList.add('text-gray-500');
    });
    if (event?.target) {
        event.target.classList.add('tab-active');
        event.target.classList.remove('text-gray-500');
    }
    
    // Cargar datos especificos del tab
    if (tabId === 'ranking') cargarRanking();
    if (tabId === 'global') cargarPrediccionesGlobal();
    if (tabId === 'analisis') cargarAnalisis();
    if (tabId === 'orderbook') actualizarOrderBook();
    if (tabId === 'calculadora') actualizarConversiones();
    if (tabId === 'achievements') renderizarLogros();
    if (tabId === 'bots') renderizarBots();
    if (tabId === 'mercado') inicializarChart();
}

// ============================================================
// SECCION 7: GESTION DEL MODAL DE AUTENTICACION
// ============================================================

/**
 * Abre el modal de autenticacion
 * @param {string} tipo - 'login' o 'register'
 */
function openModal(tipo) {
    document.getElementById('auth-modal').classList.remove('hidden');
    document.getElementById('auth-modal').classList.add('flex');
    switchAuth(tipo);
}

/**
 * Cierra el modal de autenticacion
 */
function closeModal() {
    document.getElementById('auth-modal').classList.add('hidden');
    document.getElementById('auth-modal').classList.remove('flex');
}

/**
 * Cambia entre formulario de login y registro
 * @param {string} tipo - 'login' o 'register'
 */
function switchAuth(tipo) {
    document.getElementById('login-form').classList.toggle('hidden', tipo !== 'login');
    document.getElementById('register-form').classList.toggle('hidden', tipo !== 'register');
}




// ============================================================
// SECCION 8: AUTENTICACION CON SUPABASE
// ============================================================

/**
 * Registra un nuevo usuario en Supabase Auth
 * Crea automaticamente el perfil en la tabla profiles
 */
async function register() {
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    
    if (!username || !email || !password) {
        showToast('Completa todos los campos', 'error');
        return;
    }
    if (password.length < 6) {
        showToast('La contrasena debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    try {
        // Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username } }
        });
        
        if (authError) throw authError;
        
        // El perfil se crea automaticamente via trigger en la BD
        // Pero actualizamos el username si es necesario
        if (authData.user) {
            await supabase.from('profiles').update({ username }).eq('id', authData.user.id);
        }
        
        showToast('Cuenta creada correctamente! Revisa tu email para confirmar.', 'success');
        closeModal();
        
    } catch (err) {
        console.error('Error registro:', err);
        showToast(err.message || 'Error al registrarse', 'error');
    }
}

/**
 * Inicia sesion con email y password
 */
async function login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showToast('Completa todos los campos', 'error');
        return;
    }
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        
        AppState.currentUser = data.user;
        await cargarPerfilUsuario();
        actualizarUIAuth();
        showToast('Sesion iniciada correctamente', 'success');
        closeModal();
        
        // Cargar datos del usuario
        await cargarMisPredicciones();
        await cargarPrediccionesGlobal();
        
    } catch (err) {
        console.error('Error login:', err);
        showToast(err.message || 'Credenciales incorrectas', 'error');
    }
}

/**
 * Cierra la sesion del usuario
 */
async function logout() {
    try {
        await supabase.auth.signOut();
        AppState.currentUser = null;
        AppState.userProfile = null;
        AppState.miPrediccionActiva = null;
        AppState.misPredicciones = [];
        AppState.logrosDesbloqueados = [];
        
        actualizarUIAuth();
        document.getElementById('mis-predicciones').innerHTML = '<p class="text-gray-600 text-center py-6 text-sm">Inicia sesion para ver tus predicciones</p>';
        showToast('Sesion cerrada', 'info');
        
    } catch (err) {
        console.error('Error logout:', err);
    }
}

/**
 * Carga el perfil del usuario desde Supabase
 */
async function cargarPerfilUsuario() {
    if (!AppState.currentUser) return;
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', AppState.currentUser.id)
            .single();
        
        if (error) throw error;
        AppState.userProfile = data;
        
        // Cargar logros desbloqueados
        await cargarLogrosUsuario();
        
    } catch (err) {
        console.error('Error cargando perfil:', err);
    }
}

/**
 * Actualiza la UI segun el estado de autenticacion
 */
function actualizarUIAuth() {
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const userName = document.getElementById('user-name');
    const userTier = document.getElementById('user-tier');
    const userStats = document.getElementById('user-pred-stats');
    
    if (AppState.currentUser && AppState.userProfile) {
        authButtons.classList.add('hidden');
        userMenu.classList.remove('hidden');
        userMenu.classList.add('flex');
        
        userName.textContent = AppState.userProfile.username || 'Usuario';
        const tier = getTier(AppState.userProfile.puntos || 0);
        userTier.innerHTML = `<span class="${tier.clase} px-2 py-0.5 rounded-md">${tier.nombre}</span>`;
        
        userStats.classList.remove('hidden');
        actualizarStatsUsuario();
        
    } else {
        authButtons.classList.remove('hidden');
        userMenu.classList.add('hidden');
        userMenu.classList.remove('flex');
        userStats.classList.add('hidden');
    }
}

/**
 * Actualiza las estadisticas del usuario en la UI
 */
function actualizarStatsUsuario() {
    if (!AppState.userProfile) return;
    
    const p = AppState.userProfile;
    document.getElementById('stats-puntos').textContent = p.puntos || 0;
    document.getElementById('stats-aciertos').textContent = p.aciertos || 0;
    document.getElementById('stats-fallos').textContent = (p.total_votos || 0) - (p.aciertos || 0);
    document.getElementById('stats-winrate').textContent = p.total_votos > 0 
        ? Math.round((p.aciertos / p.total_votos) * 100) + '%' 
        : '0%';
    
    document.getElementById('user-total-preds').textContent = p.total_votos || 0;
    document.getElementById('user-win-preds').textContent = p.aciertos || 0;
    document.getElementById('user-winrate-preds').textContent = p.total_votos > 0 
        ? Math.round((p.aciertos / p.total_votos) * 100) + '%' 
        : '0%';
}

/**
 * Verifica si hay una sesion activa al cargar la pagina
 */
async function checkSession() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            AppState.currentUser = session.user;
            await cargarPerfilUsuario();
            actualizarUIAuth();
            await cargarMisPredicciones();
        }
    } catch (err) {
        console.error('Error checking session:', err);
    }
}

// ============================================================
// SECCION 9: GESTION DE NOTIFICACIONES
// ============================================================

/**
 * Alterna la visibilidad del panel de notificaciones
 */
function toggleNotif() {
    AppState.notifOpen = !AppState.notifOpen;
    document.getElementById('notif-panel').classList.toggle('hidden', !AppState.notifOpen);
    if (AppState.notifOpen) cargarNotificaciones();
}

/**
 * Carga las notificaciones del usuario desde Supabase
 */
async function cargarNotificaciones() {
    if (!AppState.currentUser) return;
    
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', AppState.currentUser.id)
            .order('created_at', { ascending: false })
            .limit(20);
        
        if (error) throw error;
        
        AppState.notificaciones = data || [];
        renderizarNotificaciones();
        
        // Actualizar badge
        const noLeidas = AppState.notificaciones.filter(n => !n.read).length;
        const badge = document.getElementById('notif-badge');
        badge.textContent = noLeidas;
        badge.classList.toggle('hidden', noLeidas === 0);
        
    } catch (err) {
        console.error('Error cargando notificaciones:', err);
    }
}

/**
 * Renderiza las notificaciones en el panel
 */
function renderizarNotificaciones() {
    const container = document.getElementById('notif-list');
    if (!AppState.notificaciones.length) {
        container.innerHTML = '<p class="text-gray-600 text-sm text-center py-4">Sin notificaciones</p>';
        return;
    }
    
    container.innerHTML = AppState.notificaciones.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'} cursor-pointer" onclick="marcarNotifLeida('${n.id}')">
            <p class="text-xs text-gray-300">${n.message}</p>
            <span class="text-[10px] text-gray-600">${timeAgo(n.created_at)}</span>
        </div>
    `).join('');
}

/**
 * Marca una notificacion como leida
 * @param {string} id - ID de la notificacion
 */
async function marcarNotifLeida(id) {
    try {
        await supabase.from('notifications').update({ read: true }).eq('id', id);
        await cargarNotificaciones();
    } catch (err) {
        console.error('Error marcando notificacion:', err);
    }
}






// ============================================================
// SECCION 10: DATOS DE MERCADO Y PRECIOS
// ============================================================

/**
 * Obtiene el precio actual de Bitcoin desde CoinGecko
 * Actualiza todas las referencias de precio en la UI
 */
async function fetchBTCPrice() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true');
        const data = await response.json();
        
        if (data.bitcoin) {
            AppState.previousPrice = AppState.currentPrice;
            AppState.currentPrice = data.bitcoin.usd;
            
            // Guardar en historial para sparkline
            AppState.priceHistory.push(AppState.currentPrice);
            if (AppState.priceHistory.length > 50) AppState.priceHistory.shift();
            
            actualizarPrecioUI(data.bitcoin);
            actualizarSparkline();
            actualizarConversiones();
            
            // Actualizar prediccion activa si existe
            if (AppState.miPrediccionActiva) {
                document.getElementById('pred-precio-actual').textContent = formatUSD(AppState.currentPrice);
                const diff = AppState.currentPrice - AppState.miPrediccionActiva.precio_inicial;
                const diffPct = (diff / AppState.miPrediccionActiva.precio_inicial * 100).toFixed(2);
                const diffEl = document.getElementById('pred-diferencia');
                diffEl.textContent = (diff >= 0 ? '+' : '') + diffPct + '%';
                diffEl.className = diff >= 0 ? 'text-green-400' : 'text-red-400';
            }
        }
    } catch (err) {
        console.error('Error fetching BTC price:', err);
    }
}

/**
 * Actualiza todos los elementos de precio en la UI
 * @param {Object} data - Datos de CoinGecko
 */
function actualizarPrecioUI(data) {
    const price = data.usd;
    const change = data.usd_24h_change || 0;
    const isUp = change >= 0;
    
    // Formatear precio
    const priceStr = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const [whole, dec] = priceStr.split('.');
    
    // Navbar
    document.getElementById('price-value').textContent = '$' + priceStr;
    const changeEl = document.getElementById('price-change');
    changeEl.textContent = (isUp ? '+' : '') + change.toFixed(2) + '%';
    changeEl.className = `text-xs px-2.5 py-1 rounded-lg font-bold ${isUp ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`;
    
    // Mobile
    document.getElementById('price-value-movil').textContent = '$' + priceStr;
    const changeMovil = document.getElementById('price-change-movil');
    changeMovil.textContent = (isUp ? '+' : '') + change.toFixed(2) + '%';
    changeMovil.className = `text-xs px-2 py-0.5 rounded-lg font-medium ${isUp ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`;
    
    // Hero
    document.getElementById('hero-price').textContent = '$' + whole;
    document.getElementById('hero-price-dec').textContent = '.' + dec;
    
    const heroChange = document.getElementById('hero-change');
    heroChange.textContent = (isUp ? '+' : '') + change.toFixed(2) + '%';
    heroChange.className = `text-sm px-4 py-1.5 rounded-lg font-bold font-mono ${isUp ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`;
    
    document.getElementById('hero-time').textContent = new Date().toLocaleTimeString();
}

/**
 * Actualiza el sparkline SVG con el historial de precios
 */
function actualizarSparkline() {
    const history = AppState.priceHistory;
    if (history.length < 2) return;
    
    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min || 1;
    
    const points = history.map((p, i) => {
        const x = (i / (history.length - 1)) * 80;
        const y = 30 - ((p - min) / range) * 25 - 2.5;
        return `${x},${y}`;
    }).join(' ');
    
    const areaPoints = `0,30 ${points} 80,30`;
    
    document.getElementById('sparkline-path').setAttribute('points', points);
    document.getElementById('sparkline-area').setAttribute('points', areaPoints);
}

/**
 * Obtiene datos detallados del mercado desde CoinGecko
 */
async function fetchMarketData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false');
        const data = await response.json();
        AppState.marketData = data;
        
        const md = data.market_data;
        
        // Quick stats
        document.getElementById('quick-mcap').textContent = formatCompact(md.market_cap.usd);
        document.getElementById('quick-vol').textContent = formatCompact(md.total_volume.usd);
        document.getElementById('quick-dom').textContent = (md.market_cap_dominance || 0).toFixed(1) + '%';
        document.getElementById('quick-ath').textContent = formatUSD(md.ath.usd);
        
        // Detailed stats
        document.getElementById('det-mcap').textContent = formatCompact(md.market_cap.usd);
        document.getElementById('det-vol').textContent = formatCompact(md.total_volume.usd);
        document.getElementById('det-high').textContent = formatUSD(md.high_24h.usd);
        document.getElementById('det-low').textContent = formatUSD(md.low_24h.usd);
        document.getElementById('det-ath').textContent = formatUSD(md.ath.usd);
        document.getElementById('det-ath-date').textContent = new Date(md.ath_date.usd).toLocaleDateString();
        document.getElementById('det-supply').textContent = formatCompact(md.circulating_supply);
        document.getElementById('det-supply-bar').style.width = ((md.circulating_supply / md.max_supply) * 100) + '%';
        document.getElementById('det-dom').textContent = (md.market_cap_dominance || 0).toFixed(1) + '%';
        document.getElementById('det-dom-bar').style.width = (md.market_cap_dominance || 0) + '%';
        
        const sentiment = md.sentiment_votes_up_percentage || 50;
        document.getElementById('det-sentiment').textContent = sentiment > 50 ? 'Alcista ' + sentiment.toFixed(0) + '%' : 'Bajista ' + (100 - sentiment).toFixed(0) + '%';
        document.getElementById('det-sentiment').className = 'text-base font-bold ' + (sentiment > 50 ? 'text-green-400' : 'text-red-400');
        
        // Price range
        const rangeText = `H: ${formatUSD(md.high_24h.usd)}  L: ${formatUSD(md.low_24h.usd)}`;
        document.getElementById('price-range').textContent = rangeText;
        document.getElementById('hero-range').textContent = rangeText;
        
    } catch (err) {
        console.error('Error fetching market data:', err);
    }
}

/**
 * Obtiene datos del ticker de mercado (top 10 criptos)
 */
async function fetchMarketTicker() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h,7d');
        const data = await response.json();
        
        // Renderizar ticker
        const ticker = document.getElementById('market-ticker');
        const items = data.map(c => {
            const change = c.price_change_percentage_24h || 0;
            const color = change >= 0 ? 'text-green-400' : 'text-red-400';
            const arrow = change >= 0 ? '▲' : '▼';
            return `<span class="ticker-item ${color}">${c.symbol.toUpperCase()} ${arrow} ${Math.abs(change).toFixed(2)}%  $${c.current_price.toLocaleString()}</span>`;
        }).join('');
        ticker.innerHTML = items + items; // Duplicar para scroll infinito
        
        // Renderizar tabla top 10
        const tbody = document.getElementById('top-crypto-table');
        tbody.innerHTML = data.map((c, i) => {
            const change24 = c.price_change_percentage_24h || 0;
            const change7 = c.price_change_percentage_7d_in_currency || 0;
            return `
                <tr class="border-b border-white/5">
                    <td class="py-2 px-3 text-gray-500 font-mono">${i + 1}</td>
                    <td class="py-2 px-3">
                        <div class="flex items-center gap-2">
                            <img src="${c.image}" alt="${c.name}" class="w-5 h-5 rounded-full">
                            <span class="font-medium">${c.name}</span>
                            <span class="text-gray-500 text-xs">${c.symbol.toUpperCase()}</span>
                        </div>
                    </td>
                    <td class="py-2 px-3 text-right font-mono">$${c.current_price.toLocaleString()}</td>
                    <td class="py-2 px-3 text-right font-mono ${change24 >= 0 ? 'text-green-400' : 'text-red-400'}">${change24 >= 0 ? '+' : ''}${change24.toFixed(2)}%</td>
                    <td class="py-2 px-3 text-right font-mono hidden sm:table-cell">$${formatCompact(c.market_cap)}</td>
                    <td class="py-2 px-3 text-right font-mono hidden md:table-cell">$${formatCompact(c.total_volume)}</td>
                    <td class="py-2 px-3 text-right font-mono hidden lg:table-cell ${change7 >= 0 ? 'text-green-400' : 'text-red-400'}">${change7 >= 0 ? '+' : ''}${change7.toFixed(2)}%</td>
                </tr>
            `;
        }).join('');
        
    } catch (err) {
        console.error('Error fetching ticker:', err);
    }
}

/**
 * Obtiene el indice de Miedo y Codicia
 */
async function fetchFearGreed() {
    try {
        const response = await fetch('https://api.alternative.me/fng/?limit=1');
        const data = await response.json();
        
        if (data.data && data.data[0]) {
            const value = parseInt(data.data[0].value);
            const label = data.data[0].value_classification;
            
            document.getElementById('fear-greed-value').textContent = value;
            document.getElementById('fear-greed-bar').style.width = value + '%';
            
            const labelEl = document.getElementById('fear-greed-label');
            labelEl.textContent = label;
            
            // Color segun valor
            if (value <= 25) labelEl.className = 'text-xs font-bold px-2 py-1 rounded-md bg-red-500/20 text-red-400';
            else if (value <= 45) labelEl.className = 'text-xs font-bold px-2 py-1 rounded-md bg-orange-500/20 text-orange-400';
            else if (value <= 55) labelEl.className = 'text-xs font-bold px-2 py-1 rounded-md bg-yellow-500/20 text-yellow-400';
            else if (value <= 75) labelEl.className = 'text-xs font-bold px-2 py-1 rounded-md bg-green-500/20 text-green-400';
            else labelEl.className = 'text-xs font-bold px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400';
        }
    } catch (err) {
        console.error('Error fetching fear & greed:', err);
    }
}

/**
 * Actualiza las conversiones rapidas en la calculadora
 */
function actualizarConversiones() {
    const price = AppState.currentPrice;
    document.getElementById('conv-01').textContent = formatUSD(price * 0.1);
    document.getElementById('conv-05').textContent = formatUSD(price * 0.5);
    document.getElementById('conv-1').textContent = formatUSD(price);
    document.getElementById('conv-5').textContent = formatUSD(price * 5);
    
    // Inputs de calculadora
    document.getElementById('calc-entry').placeholder = price.toFixed(0);
    document.getElementById('sim-current').placeholder = price.toFixed(0);
}





// ============================================================
// SECCION 11: GESTION DE PREDICCIONES
// ============================================================

/**
 * Selecciona un periodo para la prediccion
 * @param {string} periodo - ID del periodo (5m, 15m, etc.)
 * @param {HTMLElement} btn - Boton clickeado
 */
function selectPeriodo(periodo, btn) {
    if (!AppState.currentUser) {
        showToast('Debes iniciar sesion para predecir', 'error');
        openModal('login');
        return;
    }
    
    // Verificar si ya hay prediccion activa
    if (AppState.miPrediccionActiva) {
        showToast('Ya tienes una prediccion activa. Espera a que cierre.', 'warning');
        return;
    }
    
    AppState.periodoSeleccionado = periodo;
    
    // Actualizar UI de botones
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    
    const p = PERIODOS[periodo];
    document.getElementById('instruccion').textContent = `Periodo seleccionado: ${p.nombre}`;
    document.getElementById('periodo-activo').textContent = `Periodo: ${p.nombre} | +${p.puntos} pts | x${p.multiplicador} multiplicador`;
    document.getElementById('periodo-activo').classList.remove('hidden');
    document.getElementById('botones-voto').classList.remove('hidden');
}

/**
 * Registra un voto del usuario en Supabase
 * @param {string} voto - 'sube' o 'baja'
 */
async function votar(voto) {
    if (!AppState.currentUser || !AppState.periodoSeleccionado) return;
    if (AppState.miPrediccionActiva) {
        showToast('Ya tienes una prediccion activa', 'warning');
        return;
    }
    
    const periodo = AppState.periodoSeleccionado;
    const precioInicial = AppState.currentPrice;
    const cierre = new Date(Date.now() + PERIODOS[periodo].ms);
    
    try {
        const { data, error } = await supabase
            .from('predictions')
            .insert([{
                user_id: AppState.currentUser.id,
                periodo: periodo,
                voto: voto,
                precio_inicial: precioInicial,
                cierre: cierre.toISOString(),
                estado: 'activo'
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        AppState.miPrediccionActiva = data;
        AppState.periodoSeleccionado = null;
        
        // Resetear UI
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('selected'));
        document.getElementById('botones-voto').classList.add('hidden');
        document.getElementById('instruccion').textContent = 'Prediccion registrada! Espera el cierre.';
        
        showToast(`Votaste: ${voto.toUpperCase()} - Periodo: ${PERIODOS[periodo].nombre}`, 'success');
        
        // Mostrar prediccion activa
        mostrarPrediccionActiva();
        await cargarMisPredicciones();
        await cargarPrediccionesGlobal();
        
    } catch (err) {
        console.error('Error votando:', err);
        showToast('Error al registrar voto: ' + err.message, 'error');
    }
}

/**
 * Muestra la prediccion activa del usuario en la UI
 */
function mostrarPrediccionActiva() {
    const pred = AppState.miPrediccionActiva;
    if (!pred) {
        document.getElementById('prediccion-activa').classList.add('hidden');
        return;
    }
    
    document.getElementById('prediccion-activa').classList.remove('hidden');
    document.getElementById('mi-voto').textContent = pred.voto.toUpperCase();
    document.getElementById('mi-voto').className = 'font-bold text-base mt-1 ' + (pred.voto === 'sube' ? 'text-green-400' : 'text-red-400');
    document.getElementById('pred-precio-inicial').textContent = formatUSD(pred.precio_inicial);
    document.getElementById('pred-precio-actual').textContent = formatUSD(AppState.currentPrice);
    document.getElementById('estado-prediccion').innerHTML = '<span class="px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs font-bold">ACTIVO</span>';
    
    // Iniciar countdown
    actualizarTiempoRestante();
}

/**
 * Actualiza el tiempo restante de la prediccion activa
 */
function actualizarTiempoRestante() {
    if (!AppState.miPrediccionActiva) return;
    
    const tr = document.getElementById('tiempo-restante');
    if (!tr) return;
    
    const diff = new Date(AppState.miPrediccionActiva.cierre) - new Date();
    if (diff <= 0) {
        tr.textContent = 'Cerrando...';
        return;
    }
    
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    tr.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

/**
 * Carga las predicciones del usuario desde Supabase
 */
async function cargarMisPredicciones() {
    if (!AppState.currentUser) return;
    
    try {
        const { data, error } = await supabase
            .from('predictions')
            .select('*')
            .eq('user_id', AppState.currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        AppState.misPredicciones = data || [];
        
        // Verificar si hay prediccion activa
        const activa = AppState.misPredicciones.find(p => p.estado === 'activo');
        AppState.miPrediccionActiva = activa || null;
        
        if (activa) {
            mostrarPrediccionActiva();
        } else {
            document.getElementById('prediccion-activa').classList.add('hidden');
            document.getElementById('instruccion').textContent = 'Selecciona un periodo para comenzar a predecir';
            document.getElementById('periodo-activo').classList.add('hidden');
        }
        
        renderizarMisPredicciones();
        
    } catch (err) {
        console.error('Error cargando predicciones:', err);
    }
}

/**
 * Renderiza las predicciones del usuario en la lista
 */
function renderizarMisPredicciones() {
    const container = document.getElementById('mis-predicciones');
    let preds = AppState.misPredicciones;
    
    // Aplicar filtro
    if (AppState.filtroMisPreds === 'activos') preds = preds.filter(p => p.estado === 'activo');
    if (AppState.filtroMisPreds === 'cerrados') preds = preds.filter(p => p.estado === 'cerrado');
    
    if (!preds.length) {
        container.innerHTML = '<p class="text-gray-600 text-center py-6 text-sm">No tienes predicciones registradas</p>';
        return;
    }
    
    container.innerHTML = preds.map(p => {
        const isUp = p.voto === 'sube';
        const isActivo = p.estado === 'activo';
        const isAcierto = p.resultado === 'acierto';
        
        let estadoClass = isActivo ? 'activo' : (isAcierto ? 'acierto' : 'fallo');
        let estadoText = isActivo ? 'ACTIVO' : (isAcierto ? 'ACIERTO +' + p.puntos_ganados + ' pts' : 'FALLO');
        let estadoColor = isActivo ? 'text-amber-400' : (isAcierto ? 'text-green-400' : 'text-red-400');
        
        return `
            <div class="pred-card ${estadoClass}">
                <div class="flex justify-between items-center flex-wrap gap-2">
                    <div class="flex items-center gap-3">
                        <span class="text-lg ${isUp ? 'text-green-400' : 'text-red-400'}">${isUp ? '▲' : '▼'}</span>
                        <div>
                            <div class="font-bold text-sm">${p.voto.toUpperCase()}</div>
                            <div class="text-xs text-gray-500">${PERIODOS[p.periodo]?.nombre || p.periodo}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs font-bold ${estadoColor}">${estadoText}</div>
                        <div class="text-[10px] text-gray-600">${timeAgo(p.created_at)}</div>
                    </div>
                </div>
                <div class="mt-2 pt-2 border-t border-white/5 flex justify-between text-xs text-gray-500 font-mono">
                    <span>Entrada: ${formatUSD(p.precio_inicial)}</span>
                    ${p.precio_final ? `<span>Salida: ${formatUSD(p.precio_final)}</span>` : ''}
                    ${!isActivo && p.precio_final ? `<span class="${isAcierto ? 'text-green-400' : 'text-red-400'}">${((p.precio_final - p.precio_inicial) / p.precio_inicial * 100).toFixed(2)}%</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Filtra las predicciones del usuario
 * @param {string} filtro - 'todos', 'activos', 'cerrados'
 */
function filtrarMisPreds(filtro) {
    AppState.filtroMisPreds = filtro;
    
    // Actualizar botones
    ['todos', 'activos', 'cerrados'].forEach(f => {
        const btn = document.getElementById('misfiltro-' + f);
        if (f === filtro) {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs bg-amber-500/20 text-amber-400 font-medium no-select';
        } else {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-500 hover:text-gray-300 transition no-select';
        }
    });
    
    renderizarMisPredicciones();
}

// ============================================================
// SECCION 12: PREDICCIONES GLOBALES
// ============================================================

/**
 * Carga todas las predicciones de todos los usuarios
 */
async function cargarPrediccionesGlobal() {
    try {
        const { data, error } = await supabase
            .from('predictions')
            .select('*, profiles(username, puntos)')
            .order('created_at', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        
        AppState.todasLasPredicciones = data || [];
        renderizarPrediccionesGlobal();
        
    } catch (err) {
        console.error('Error cargando predicciones globales:', err);
    }
}

/**
 * Renderiza las predicciones globales
 */
function renderizarPrediccionesGlobal() {
    const container = document.getElementById('global-predicciones');
    let preds = AppState.todasLasPredicciones;
    
    // Aplicar filtro
    if (AppState.filtroGlobal === 'activos') preds = preds.filter(p => p.estado === 'activo');
    if (AppState.filtroGlobal === 'cerrados') preds = preds.filter(p => p.estado === 'cerrado');
    if (AppState.filtroGlobal === 'sube') preds = preds.filter(p => p.voto === 'sube');
    if (AppState.filtroGlobal === 'baja') preds = preds.filter(p => p.voto === 'baja');
    
    const activas = preds.filter(p => p.estado === 'activo').length;
    document.getElementById('global-count').textContent = preds.length + ' predicciones';
    document.getElementById('global-activas-count').textContent = activas + ' activas';
    
    if (!preds.length) {
        container.innerHTML = '<p class="text-gray-600 text-center py-6 text-sm">No hay predicciones registradas</p>';
        return;
    }
    
    container.innerHTML = preds.slice(0, 50).map(p => {
        const isUp = p.voto === 'sube';
        const isActivo = p.estado === 'activo';
        const isAcierto = p.resultado === 'acierto';
        const username = p.profiles?.username || 'Usuario';
        const color = stringToColor(username);
        
        let estadoClass = isActivo ? 'activo' : (isAcierto ? 'acierto' : 'fallo');
        let estadoText = isActivo ? 'ACTIVO' : (isAcierto ? 'ACIERTO' : 'FALLO');
        let estadoColor = isActivo ? 'text-amber-400' : (isAcierto ? 'text-green-400' : 'text-red-400');
        
        return `
            <div class="pred-card ${estadoClass}">
                <div class="flex justify-between items-center flex-wrap gap-2">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style="background:${color}20; color:${color}; border:1px solid ${color}40;">
                            ${getInitials(username)}
                        </div>
                        <div>
                            <div class="font-bold text-sm">${username}</div>
                            <div class="text-xs text-gray-500">${PERIODOS[p.periodo]?.nombre || p.periodo}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-lg ${isUp ? 'text-green-400' : 'text-red-400'}">${isUp ? '▲ SUBE' : '▼ BAJA'}</div>
                        <div class="text-[10px] font-bold ${estadoColor}">${estadoText}</div>
                    </div>
                </div>
                ${!isActivo ? `<div class="mt-2 text-xs text-gray-500">${p.puntos_ganados > 0 ? '+' + p.puntos_ganados + ' pts' : '0 pts'}</div>` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Filtra las predicciones globales
 * @param {string} filtro - Filtro a aplicar
 */
function filtrarGlobal(filtro) {
    AppState.filtroGlobal = filtro;
    
    const filtros = ['todos', 'activos', 'cerrados', 'sube', 'baja'];
    filtros.forEach(f => {
        const btn = document.getElementById('filtro-' + f);
        if (f === filtro) {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs bg-amber-500/20 text-amber-400 font-medium no-select';
        } else {
            btn.className = 'px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-500 hover:text-gray-300 transition font-medium no-select';
        }
    });
    
    renderizarPrediccionesGlobal();
}







// ============================================================
// SECCION 13: RANKING
// ============================================================

/**
 * Carga el ranking global de usuarios desde Supabase
 */
async function cargarRanking() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('es_bot', false)
            .order('puntos', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        
        AppState.ranking = data || [];
        renderizarRanking();
        
    } catch (err) {
        console.error('Error cargando ranking:', err);
    }
}

/**
 * Renderiza la tabla de ranking
 */
function renderizarRanking() {
    const tbody = document.getElementById('ranking-body');
    
    if (!AppState.ranking.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="py-6 text-center text-gray-600 text-sm">No hay usuarios en el ranking</td></tr>';
        return;
    }
    
    tbody.innerHTML = AppState.ranking.map((u, i) => {
        const tier = getTier(u.puntos || 0);
        const winrate = u.total_votos > 0 ? Math.round((u.aciertos / u.total_votos) * 100) : 0;
        const color = stringToColor(u.username || 'U');
        const isMe = AppState.currentUser && u.id === AppState.currentUser.id;
        
        return `
            <tr class="${isMe ? 'bg-amber-500/5' : ''}">
                <td class="py-3 px-4">
                    ${i < 3 ? '<span class="text-lg">' + ['🥇','🥈','🥉'][i] + '</span>' : `<span class="text-gray-500 font-mono">${i + 1}</span>`}
                </td>
                <td class="py-3 px-4">
                    <div class="flex items-center gap-2">
                        <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style="background:${color}20; color:${color}; border:1px solid ${color}40;">
                            ${getInitials(u.username || 'U')}
                        </div>
                        <span class="font-medium text-sm ${isMe ? 'text-amber-400' : ''}">${u.username || 'Usuario'}</span>
                        ${isMe ? '<span class="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">TU</span>' : ''}
                    </div>
                </td>
                <td class="py-3 px-4 text-center"><span class="${tier.clase} px-2 py-0.5 rounded text-[10px] font-bold">${tier.nombre}</span></td>
                <td class="py-3 px-4 text-center font-bold font-mono text-amber-400">${u.puntos || 0}</td>
                <td class="py-3 px-4 text-center font-mono text-green-400">${u.aciertos || 0}</td>
                <td class="py-3 px-4 text-center font-mono text-gray-500">${u.total_votos || 0}</td>
                <td class="py-3 px-4 text-center font-mono ${winrate >= 50 ? 'text-green-400' : 'text-red-400'}">${winrate}%</td>
                <td class="py-3 px-4 text-center font-mono text-orange-400 hidden sm:table-cell">${u.racha || 0}</td>
            </tr>
        `;
    }).join('');
    
    // Mostrar posicion del usuario
    if (AppState.currentUser && AppState.userProfile) {
        const miPos = AppState.ranking.findIndex(u => u.id === AppState.currentUser.id);
        if (miPos >= 0) {
            document.getElementById('mi-posicion').classList.remove('hidden');
            document.getElementById('mi-rank-pos').textContent = '#' + (miPos + 1);
            
            const tier = getTier(AppState.userProfile.puntos || 0);
            if (tier.next) {
                const progreso = ((AppState.userProfile.puntos - tier.max) / (tier.next - tier.max)) * 100;
                document.getElementById('tier-progreso-bar').style.width = Math.min(progreso, 100) + '%';
                document.getElementById('tier-progreso-text').textContent = `${AppState.userProfile.puntos}/${tier.next} pts`;
            } else {
                document.getElementById('tier-progreso-bar').style.width = '100%';
                document.getElementById('tier-progreso-text').textContent = 'Nivel Maximo!';
            }
        }
    }
}

// ============================================================
// SECCION 14: LOGROS
// ============================================================

/**
 * Carga los logros desbloqueados del usuario
 */
async function cargarLogrosUsuario() {
    if (!AppState.currentUser) return;
    
    try {
        const { data, error } = await supabase
            .from('user_achievements')
            .select('achievement_id')
            .eq('user_id', AppState.currentUser.id);
        
        if (error) throw error;
        AppState.logrosDesbloqueados = (data || []).map(l => l.achievement_id);
        
    } catch (err) {
        console.error('Error cargando logros:', err);
    }
}

/**
 * Verifica y desbloquea logros nuevos
 */
async function verificarLogros() {
    if (!AppState.userProfile) return;
    
    const nuevosLogros = [];
    
    for (const logro of LOGROS_DEF) {
        if (!AppState.logrosDesbloqueados.includes(logro.id) && logro.cond(AppState.userProfile)) {
            nuevosLogros.push(logro);
        }
    }
    
    if (nuevosLogros.length > 0) {
        // Insertar en BD
        const inserts = nuevosLogros.map(l => ({
            user_id: AppState.currentUser.id,
            achievement_id: l.id
        }));
        
        try {
            await supabase.from('user_achievements').insert(inserts);
            AppState.logrosDesbloqueados.push(...nuevosLogros.map(l => l.id));
            
            // Notificar
            for (const l of nuevosLogros) {
                showToast(`Logro desbloqueado: ${l.nombre} ${l.icon}`, 'success');
                await supabase.from('notifications').insert([{
                    user_id: AppState.currentUser.id,
                    message: `Logro desbloqueado: ${l.nombre} ${l.icon} - ${l.desc}`,
                    tipo: 'success'
                }]);
            }
            
            // Celebracion
            if (typeof confetti !== 'undefined') {
                confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#f7931a', '#eab308', '#fbbf24'] });
            }
            
        } catch (err) {
            console.error('Error guardando logros:', err);
        }
    }
}

/**
 * Renderiza el grid de logros
 */
function renderizarLogros() {
    const grid = document.getElementById('achievements-grid');
    
    // Actualizar stats
    document.getElementById('ach-unlocked').textContent = `${AppState.logrosDesbloqueados.length}/${LOGROS_DEF.length}`;
    document.getElementById('ach-best-streak').textContent = AppState.userProfile?.mejor_racha || 0;
    document.getElementById('ach-current-streak').textContent = AppState.userProfile?.racha || 0;
    document.getElementById('ach-multiplier').textContent = 'x' + getRachaMultiplier(AppState.userProfile?.racha || 0).toFixed(1);
    
    grid.innerHTML = LOGROS_DEF.map(l => {
        const unlocked = AppState.logrosDesbloqueados.includes(l.id);
        return `
            <div class="achievement-card ${unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon" style="background: ${unlocked ? 'rgba(247,147,26,0.1)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${unlocked ? 'rgba(247,147,26,0.3)' : 'rgba(255,255,255,0.05)'};">
                    ${l.icon}
                </div>
                <h4 class="font-bold text-sm ${unlocked ? 'text-amber-400' : 'text-gray-500'}">${l.nombre}</h4>
                <p class="text-xs text-gray-600 mt-1">${l.desc}</p>
                ${unlocked ? '<span class="text-[10px] text-green-400 mt-2 inline-block">Desbloqueado</span>' : '<span class="text-[10px] text-gray-700 mt-2 inline-block">Bloqueado</span>'}
            </div>
        `;
    }).join('');
}

// ============================================================
// SECCION 15: ANALISIS
// ============================================================

/**
 * Carga y renderiza el analisis de la comunidad
 */
async function cargarAnalisis() {
    const preds = AppState.todasLasPredicciones;
    const cerrados = preds.filter(p => p.estado === 'cerrado');
    const aciertos = cerrados.filter(p => p.resultado === 'acierto');
    
    document.getElementById('anal-total').textContent = preds.length;
    document.getElementById('anal-winrate').textContent = cerrados.length > 0 ? Math.round((aciertos.length / cerrados.length) * 100) + '%' : '0%';
    document.getElementById('anal-activas').textContent = preds.filter(p => p.estado === 'activo').length;
    
    // Contar usuarios unicos
    const uniqueUsers = new Set(preds.map(p => p.user_id));
    document.getElementById('anal-usuarios').textContent = uniqueUsers.size;
    
    // Distribucion de votos
    const suben = preds.filter(p => p.voto === 'sube').length;
    const bajan = preds.filter(p => p.voto === 'baja').length;
    const total = suben + bajan || 1;
    
    document.getElementById('dist-sube-bar').style.width = (suben / total * 100) + '%';
    document.getElementById('dist-sube-pct').textContent = Math.round(suben / total * 100) + '%';
    document.getElementById('dist-baja-bar').style.width = (bajan / total * 100) + '%';
    document.getElementById('dist-baja-pct').textContent = Math.round(bajan / total * 100) + '%';
    
    // Mejores periodos
    const periodosStats = {};
    for (const p of cerrados) {
        if (!periodosStats[p.periodo]) periodosStats[p.periodo] = { total: 0, aciertos: 0 };
        periodosStats[p.periodo].total++;
        if (p.resultado === 'acierto') periodosStats[p.periodo].aciertos++;
    }
    
    const mejores = Object.entries(periodosStats)
        .map(([periodo, stats]) => ({ periodo, ...stats, winrate: stats.total > 0 ? (stats.aciertos / stats.total * 100) : 0 }))
        .sort((a, b) => b.winrate - a.winrate)
        .slice(0, 5);
    
    document.getElementById('mejores-periodos').innerHTML = mejores.length ? mejores.map(m => `
        <div class="flex justify-between items-center p-2 rounded-lg bg-black/20">
            <span class="text-sm font-medium">${PERIODOS[m.periodo]?.nombre || m.periodo}</span>
            <div class="text-right">
                <span class="text-xs font-bold ${m.winrate >= 50 ? 'text-green-400' : 'text-red-400'}">${m.winrate.toFixed(1)}%</span>
                <span class="text-[10px] text-gray-600 ml-2">${m.aciertos}/${m.total}</span>
            </div>
        </div>
    `).join('') : '<p class="text-gray-600 text-sm">Sin datos suficientes</p>';
    
    // Ultimos resultados
    const ultimos = cerrados.slice(0, 20);
    document.getElementById('ultimos-resultados').innerHTML = ultimos.map(p => {
        const isAcierto = p.resultado === 'acierto';
        const username = p.profiles?.username || 'Usuario';
        return `
            <div class="flex justify-between items-center p-2 rounded-lg ${isAcierto ? 'bg-green-500/5' : 'bg-red-500/5'} border-l-2 ${isAcierto ? 'border-green-500' : 'border-red-500'}">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-medium">${username}</span>
                    <span class="text-[10px] text-gray-500">${PERIODOS[p.periodo]?.nombre || p.periodo}</span>
                </div>
                <span class="text-xs font-bold ${isAcierto ? 'text-green-400' : 'text-red-400'}">${isAcierto ? '+' + p.puntos_ganados + ' pts' : 'FALLO'}</span>
            </div>
        `;
    }).join('');
}

// ============================================================
// SECCION 16: CALCULADORA DE TRADING
// ============================================================

/**
 * Calcula ganancias/perdidas de una operacion
 */
function calcularGanancia() {
    const entry = parseFloat(document.getElementById('calc-entry').value) || 0;
    const exit = parseFloat(document.getElementById('calc-exit').value) || 0;
    const amount = parseFloat(document.getElementById('calc-amount').value) || 0;
    const leverage = parseFloat(document.getElementById('calc-leverage').value) || 1;
    
    if (!entry || !amount) return;
    
    const pnl = (exit - entry) * amount * leverage;
    const roi = ((exit - entry) / entry) * 100 * leverage;
    const liquidation = entry * (1 - 1 / leverage);
    
    const resultEl = document.getElementById('calc-result');
    resultEl.textContent = (pnl >= 0 ? '+' : '') + formatUSD(Math.abs(pnl));
    resultEl.className = 'text-xl font-bold font-mono ' + (pnl >= 0 ? 'text-green-400' : 'text-red-400');
    
    const roiEl = document.getElementById('calc-roi');
    roiEl.textContent = (roi >= 0 ? '+' : '') + roi.toFixed(2) + '%';
    roiEl.className = 'text-lg font-bold font-mono ' + (roi >= 0 ? 'text-green-400' : 'text-red-400');
    
    document.getElementById('calc-liquidation').textContent = leverage > 1 ? formatUSD(liquidation) : 'N/A';
}

/**
 * Simula una prediccion y calcula puntos potenciales
 */
function simularPrediccion() {
    const current = parseFloat(document.getElementById('sim-current').value) || AppState.currentPrice;
    const target = parseFloat(document.getElementById('sim-target').value) || 0;
    const periodo = document.getElementById('sim-periodo').value;
    
    if (!current || !target) return;
    
    const change = ((target - current) / current) * 100;
    const p = PERIODOS[periodo];
    
    document.getElementById('sim-change').textContent = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
    document.getElementById('sim-change').className = 'text-xl font-bold font-mono ' + (change >= 0 ? 'text-green-400' : 'text-red-400');
    document.getElementById('sim-puntos').textContent = '+' + p.puntos + ' pts (x' + p.multiplicador + ')';
    
    const advice = document.getElementById('sim-advice');
    if (Math.abs(change) < 1) {
        advice.textContent = 'El cambio es muy pequeno. Considera un periodo mas corto para mayor precision.';
        advice.className = 'text-xs text-yellow-400';
    } else if (Math.abs(change) > 20) {
        advice.textContent = 'El cambio es muy grande. Considera un periodo mas largo para dar tiempo al mercado.';
        advice.className = 'text-xs text-amber-400';
    } else {
        advice.textContent = 'El cambio parece razonable para el periodo seleccionado. Buena suerte!';
        advice.className = 'text-xs text-green-400';
    }
}





// ============================================================
// SECCION 17: ORDER BOOK SIMULADO
// ============================================================

/**
 * Genera y renderiza el order book simulado
 */
function actualizarOrderBook() {
    const price = AppState.currentPrice;
    const spread = price * 0.0005; // 0.05% spread
    
    // Generar bids (compras)
    const bids = [];
    let bidTotal = 0;
    for (let i = 0; i < 15; i++) {
        const p = price - spread - (i * price * 0.0002);
        const size = (Math.random() * 2 + 0.1).toFixed(4);
        bids.push({ price: p, size: parseFloat(size) });
        bidTotal += parseFloat(size);
    }
    
    // Generar asks (ventas)
    const asks = [];
    let askTotal = 0;
    for (let i = 0; i < 15; i++) {
        const p = price + spread + (i * price * 0.0002);
        const size = (Math.random() * 2 + 0.1).toFixed(4);
        asks.push({ price: p, size: parseFloat(size) });
        askTotal += parseFloat(size);
    }
    
    const maxSize = Math.max(...bids.map(b => b.size), ...asks.map(a => a.size));
    
    // Renderizar bids
    document.getElementById('orderbook-bids').innerHTML = bids.map(b => `
        <div class="order-row">
            <div class="bar bg-green-500" style="width:${(b.size / maxSize * 100)}%"></div>
            <div class="content">
                <span class="text-green-400">${b.price.toFixed(2)}</span>
                <span class="text-gray-500">${b.size.toFixed(4)}</span>
            </div>
        </div>
    `).join('');
    
    // Renderizar asks
    document.getElementById('orderbook-asks').innerHTML = asks.map(a => `
        <div class="order-row">
            <div class="bar bg-red-500" style="width:${(a.size / maxSize * 100)}%"></div>
            <div class="content">
                <span class="text-red-400">${a.price.toFixed(2)}</span>
                <span class="text-gray-500">${a.size.toFixed(4)}</span>
            </div>
        </div>
    `).join('');
    
    // Stats
    document.getElementById('bid-total').textContent = bidTotal.toFixed(4) + ' BTC';
    document.getElementById('ask-total').textContent = askTotal.toFixed(4) + ' BTC';
    document.getElementById('orderbook-spread').textContent = formatUSD(spread);
    
    const ratio = bidTotal / (askTotal || 1);
    const ratioEl = document.getElementById('orderbook-ratio');
    ratioEl.textContent = ratio.toFixed(2);
    ratioEl.className = 'text-lg font-bold font-mono ' + (ratio > 1 ? 'text-green-400' : 'text-red-400');
    
    const buyPressure = (bidTotal / (bidTotal + askTotal)) * 100;
    document.getElementById('buy-pressure-pct').textContent = buyPressure.toFixed(1) + '%';
    document.getElementById('buy-pressure-bar').style.width = buyPressure + '%';
    
    // Mapa de calor de liquidaciones
    const heatmap = document.getElementById('liquidation-heatmap');
    heatmap.innerHTML = '';
    for (let i = 0; i < 25; i++) {
        const intensity = Math.random();
        const isLong = i < 12;
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        cell.style.background = isLong 
            ? `rgba(239, 68, 68, ${intensity * 0.5})` 
            : `rgba(34, 197, 94, ${intensity * 0.5})`;
        heatmap.appendChild(cell);
    }
}

// ============================================================
// SECCION 18: GRAFICO DE VELAS (Lightweight Charts)
// ============================================================

/**
 * Inicializa el grafico de velas
 */
function inicializarChart() {
    if (AppState.candleChart) return; // Ya inicializado
    
    const chartContainer = document.getElementById('candlestick-chart');
    if (!chartContainer) return;
    
    AppState.candleChart = LightweightCharts.createChart(chartContainer, {
        layout: {
            background: { type: 'solid', color: 'transparent' },
            textColor: '#9ca3af',
        },
        grid: {
            vertLines: { color: 'rgba(255,255,255,0.03)' },
            horzLines: { color: 'rgba(255,255,255,0.03)' },
        },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.1)' },
        timeScale: { borderColor: 'rgba(255,255,255,0.1)' },
        width: chartContainer.clientWidth,
        height: 400,
    });
    
    AppState.candleSeries = AppState.candleChart.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
    });
    
    // Generar datos iniciales
    generarDatosCandle();
    
    // Responsive
    window.addEventListener('resize', () => {
        if (AppState.candleChart) {
            AppState.candleChart.applyOptions({ width: chartContainer.clientWidth });
        }
    });
}

/**
 * Genera datos de velas simulados
 */
function generarDatosCandle() {
    const data = [];
    let price = AppState.currentPrice * 0.95;
    const now = new Date();
    
    for (let i = 100; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60000);
        const open = price;
        const change = (Math.random() - 0.48) * price * 0.005;
        const close = price + change;
        const high = Math.max(open, close) + Math.random() * price * 0.002;
        const low = Math.min(open, close) - Math.random() * price * 0.002;
        
        data.push({
            time: { year: time.getFullYear(), month: time.getMonth() + 1, day: time.getDate(), hour: time.getHours(), minute: time.getMinutes() },
            open, high, low, close
        });
        
        price = close;
    }
    
    if (AppState.candleSeries) {
        AppState.candleSeries.setData(data);
        AppState.candleChart.timeScale().fitContent();
    }
}

/**
 * Cambia el timeframe del grafico
 * @param {string} tf - Timeframe ('1s', '1m', '5m', etc.)
 */
function cambiarTimeframe(tf) {
    AppState.timeframeChart = tf;
    
    // Actualizar botones
    ['1s', '1m', '5m', '15m', '1h', '4h'].forEach(t => {
        const btn = document.getElementById('tf-' + t);
        if (t === tf) {
            btn.className = 'px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-amber-500/20 text-amber-400 no-select';
        } else {
            btn.className = 'px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-white/5 text-gray-500 hover:text-gray-300 transition no-select';
        }
    });
    
    generarDatosCandle();
}

// ============================================================
// SECCION 19: FONDO DE PARTICULAS (Three.js)
// ============================================================

/**
 * Inicializa el fondo de particulas animado con Three.js
 */
function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas || !window.THREE) return;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Crear particulas
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
        
        // Colores ambar/naranja
        colors[i * 3] = 0.97 + Math.random() * 0.03;
        colors[i * 3 + 1] = 0.55 + Math.random() * 0.2;
        colors[i * 3 + 2] = 0.1 + Math.random() * 0.1;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
    });
    
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    
    camera.position.z = 5;
    
    // Animacion
    function animate() {
        requestAnimationFrame(animate);
        particles.rotation.y += 0.0005;
        particles.rotation.x += 0.0002;
        renderer.render(scene, camera);
    }
    animate();
    
    // Responsive
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// ============================================================
// SECCION 20: SUSCRIPCIONES EN TIEMPO REAL (Supabase Realtime)
// ============================================================

/**
 * Configura las suscripciones en tiempo real de Supabase
 * Escucha cambios en predicciones y perfiles
 */
function setupRealtimeSubscriptions() {
    // Suscripcion a nuevas predicciones
    const predChannel = supabase
        .channel('predictions-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'predictions' }, (payload) => {
            console.log('Cambio en predicciones:', payload);
            cargarPrediccionesGlobal();
            if (AppState.currentUser) cargarMisPredicciones();
            if (AppState.tabActiva === 'analisis') cargarAnalisis();
        })
        .subscribe();
    
    // Suscripcion a cambios en perfiles (ranking)
    const profileChannel = supabase
        .channel('profiles-channel')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
            console.log('Cambio en perfiles:', payload);
            if (AppState.tabActiva === 'ranking') cargarRanking();
        })
        .subscribe();
    
    AppState.subscriptions.push(predChannel, profileChannel);
}

// ============================================================
// SECCION 21: INICIALIZACION Y LOOP PRINCIPAL
// ============================================================

/**
 * Inicializa la aplicacion completa
 */
async function initApp() {
    console.log('Iniciando BCPredict Pro...');
    
    // Verificar sesion
    await checkSession();
    
    // Cargar datos iniciales
    await fetchBTCPrice();
    await fetchMarketData();
    await fetchMarketTicker();
    await fetchFearGreed();
    await cargarPrediccionesGlobal();
    
    // Inicializar componentes visuales
    initParticles();
    
    // Configurar suscripciones en tiempo real
    setupRealtimeSubscriptions();
    
    // Loop de actualizacion de precio
    setInterval(() => {
        fetchBTCPrice();
        actualizarTiempoRestante();
    }, 5000);
    
    // Actualizar datos de mercado cada 30 segundos
    setInterval(() => {
        fetchMarketData();
        fetchMarketTicker();
    }, 30000);
    
    // Actualizar fear & greed cada 5 minutos
    setInterval(fetchFearGreed, 300000);
    
    // Actualizar order book cada 3 segundos si esta visible
    setInterval(() => {
        if (AppState.tabActiva === 'orderbook') actualizarOrderBook();
    }, 3000);
    
    // Verificar predicciones vencidas cada 10 segundos
    setInterval(verificarPrediccionesVencidas, 10000);
    
    console.log('BCPredict Pro iniciado correctamente');
}

/**
 * Verifica y cierra predicciones que han vencido
 * Llama a la funcion de PostgreSQL que calcula resultados
 */
async function verificarPrediccionesVencidas() {
    try {
        // Llamar a la funcion de PostgreSQL
        const { data, error } = await supabase.rpc('check_expired_predictions');
        
        if (error) {
            // Si la funcion no existe, hacerlo manualmente
            await cerrarPrediccionesManual();
            return;
        }
        
        if (data && data.length > 0) {
            console.log('Predicciones cerradas:', data);
            
            // Recargar datos
            await cargarMisPredicciones();
            await cargarPrediccionesGlobal();
            await cargarPerfilUsuario();
            actualizarStatsUsuario();
            await verificarLogros();
            
            // Notificar al usuario si gano
            for (const result of data) {
                if (result.acierto && result.user_id === AppState.currentUser?.id) {
                    showToast(`Prediccion acertada! +${result.puntos} puntos`, 'success');
                    if (typeof confetti !== 'undefined') {
                        confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
                    }
                }
            }
        }
        
    } catch (err) {
        console.error('Error verificando predicciones:', err);
    }
}

/**
 * Cierra predicciones vencidas manualmente (fallback si la funcion RPC no existe)
 */
async function cerrarPrediccionesManual() {
    try {
        // Obtener predicciones vencidas
        const { data: vencidas, error } = await supabase
            .from('predictions')
            .select('*')
            .eq('estado', 'activo')
            .lt('cierre', new Date().toISOString());
        
        if (error || !vencidas?.length) return;
        
        const currentPrice = AppState.currentPrice;
        
        for (const pred of vencidas) {
            const subio = currentPrice > pred.precio_inicial;
            const acierto = (pred.voto === 'sube' && subio) || (pred.voto === 'baja' && !subio);
            
            const basePts = PERIODOS[pred.periodo]?.puntos || 1;
            const mult = PERIODOS[pred.periodo]?.multiplicador || 1;
            
            // Obtener racha del usuario
            const { data: profile } = await supabase
                .from('profiles')
                .select('racha')
                .eq('id', pred.user_id)
                .single();
            
            const streakMult = getRachaMultiplier(profile?.racha || 0);
            const puntos = acierto ? Math.round(basePts * mult * streakMult) : 0;
            
            // Actualizar prediccion
            await supabase.from('predictions').update({
                estado: 'cerrado',
                resultado: acierto ? 'acierto' : 'fallo',
                puntos_ganados: puntos,
                precio_final: currentPrice,
                cerrado_at: new Date().toISOString()
            }).eq('id', pred.id);
            
            // Actualizar perfil
            if (acierto) {
                await supabase.rpc('increment_user_stats', {
                    user_uuid: pred.user_id,
                    pts: puntos
                });
            } else {
                await supabase.from('profiles').update({
                    total_votos: supabase.rpc('increment', { x: 1 }),
                    racha: 0
                }).eq('id', pred.user_id);
            }
        }
        
        if (vencidas.length > 0) {
            await cargarMisPredicciones();
            await cargarPrediccionesGlobal();
            await cargarPerfilUsuario();
            actualizarStatsUsuario();
        }
        
    } catch (err) {
        console.error('Error cerrando predicciones manual:', err);
    }
}

// ============================================================
// SECCION 22: EVENT LISTENERS GLOBALES
// ============================================================

// Cerrar modal con Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// Cerrar notificaciones al hacer click fuera
document.addEventListener('click', (e) => {
    const notifPanel = document.getElementById('notif-panel');
    const notifBtn = e.target.closest('button[onclick="toggleNotif()"]');
    if (!notifBtn && !e.target.closest('#notif-panel') && AppState.notifOpen) {
        AppState.notifOpen = false;
        notifPanel.classList.add('hidden');
    }
});

// Iniciar aplicacion cuando el DOM este listo
document.addEventListener('DOMContentLoaded', initApp);

-- ============================================================
-- BCPREDICT - SUPABASE SETUP
-- Configuracion completa de base de datos para migracion desde Firebase
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- ============================================================
-- 1. TABLAS PRINCIPALES
-- ============================================================

-- Tabla de perfiles de usuario (se vincula con auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    puntos INTEGER DEFAULT 0,
    aciertos INTEGER DEFAULT 0,
    total_votos INTEGER DEFAULT 0,
    racha INTEGER DEFAULT 0,
    mejor_racha INTEGER DEFAULT 0,
    logros JSONB DEFAULT '[]'::jsonb,
    es_bot BOOLEAN DEFAULT FALSE,
    personality TEXT DEFAULT 'balanced',
    skill NUMERIC(3,2) DEFAULT 0.50,
    activity_level NUMERIC(3,2) DEFAULT 0.70,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    avatar_url TEXT
);

-- Tabla de predicciones
CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    periodo TEXT NOT NULL,
    voto TEXT NOT NULL CHECK (voto IN ('sube', 'baja')),
    precio_inicial NUMERIC(18,2) NOT NULL,
    precio_final NUMERIC(18,2),
    cierre TIMESTAMPTZ NOT NULL,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'cerrado')),
    resultado TEXT CHECK (resultado IN ('acierto', 'fallo')),
    puntos_ganados INTEGER DEFAULT 0,
    es_bot BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cerrado_at TIMESTAMPTZ
);

-- Tabla de logros desbloqueados
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    tipo TEXT DEFAULT 'info' CHECK (tipo IN ('info', 'success', 'error', 'warning')),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de actividad de bots (log)
CREATE TABLE IF NOT EXISTS public.bot_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. INDICES PARA RENDIMIENTO
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_estado ON public.predictions(estado);
CREATE INDEX IF NOT EXISTS idx_predictions_user_estado ON public.predictions(user_id, estado);
CREATE INDEX IF NOT EXISTS idx_predictions_creado ON public.predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_puntos ON public.profiles(puntos DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_es_bot ON public.profiles(es_bot);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_bot_logs_bot ON public.bot_logs(bot_id);

-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_logs ENABLE ROW LEVEL SECURITY;

-- Politicas para profiles
CREATE POLICY "Profiles visibles para todos" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Usuarios pueden editar su propio perfil" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Sistema puede insertar perfiles" ON public.profiles
    FOR INSERT WITH CHECK (true);

-- Politicas para predictions
CREATE POLICY "Predicciones visibles para todos" ON public.predictions
    FOR SELECT USING (true);

CREATE POLICY "Usuarios pueden crear sus predicciones" ON public.predictions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sistema puede actualizar predicciones" ON public.predictions
    FOR UPDATE USING (true);

-- Politicas para user_achievements
CREATE POLICY "Logros visibles para todos" ON public.user_achievements
    FOR SELECT USING (true);

CREATE POLICY "Sistema puede gestionar logros" ON public.user_achievements
    FOR ALL USING (true);

-- Politicas para notifications
CREATE POLICY "Usuarios ven sus notificaciones" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Sistema puede crear notificaciones" ON public.notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Usuarios pueden marcar como leidas" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Politicas para bot_logs
CREATE POLICY "Logs visibles para todos" ON public.bot_logs
    FOR SELECT USING (true);

CREATE POLICY "Sistema puede crear logs" ON public.bot_logs
    FOR INSERT WITH CHECK (true);

-- ============================================================
-- 4. FUNCIONES Y TRIGGERS
-- ============================================================

-- Funcion para actualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para predictions
CREATE TRIGGER update_predictions_updated_at
    BEFORE UPDATE ON public.predictions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Funcion para crear perfil automaticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email, puntos, aciertos, total_votos, racha, mejor_racha, logros, es_bot, is_active)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.email,
        0, 0, 0, 0, 0, '[]'::jsonb, FALSE, TRUE
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear perfil al registrar usuario
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 5. FUNCIONES PARA EL MOTOR DE BOTS (Edge Functions)
-- ============================================================

-- Funcion para verificar y cerrar predicciones vencidas
CREATE OR REPLACE FUNCTION public.check_expired_predictions()
RETURNS TABLE (
    prediction_id UUID,
    user_id UUID,
    acierto BOOLEAN,
    puntos INTEGER
) AS $$
DECLARE
    current_price NUMERIC(18,2);
    pred RECORD;
    subio BOOLEAN;
    es_acierto BOOLEAN;
    pts INTEGER;
    base_pts INTEGER;
    mult NUMERIC(3,1);
    streak_mult NUMERIC(3,1);
    user_streak INTEGER;
BEGIN
    -- Obtener precio actual de Bitcoin (simulado, en produccion se obtiene de API)
    current_price := 65000;
    
    FOR pred IN 
        SELECT * FROM public.predictions 
        WHERE estado = 'activo' AND cierre <= NOW()
    LOOP
        subio := current_price > pred.precio_inicial;
        es_acierto := (pred.voto = 'sube' AND subio) OR (pred.voto = 'baja' AND NOT subio);
        
        -- Calcular puntos
        base_pts := CASE pred.periodo
            WHEN '5m' THEN 1 WHEN '15m' THEN 2 WHEN '30m' THEN 3
            WHEN '1h' THEN 4 WHEN '4h' THEN 5 WHEN '24h' THEN 8
            WHEN '1sem' THEN 15 WHEN '1mes' THEN 30 ELSE 1
        END;
        
        mult := CASE pred.periodo
            WHEN '5m' THEN 1.0 WHEN '15m' THEN 1.2 WHEN '30m' THEN 1.5
            WHEN '1h' THEN 2.0 WHEN '4h' THEN 2.5 WHEN '24h' THEN 3.0
            WHEN '1sem' THEN 4.0 WHEN '1mes' THEN 5.0 ELSE 1.0
        END;
        
        -- Obtener racha actual del usuario
        SELECT racha INTO user_streak FROM public.profiles WHERE id = pred.user_id;
        streak_mult := CASE 
            WHEN user_streak >= 10 THEN 3.0
            WHEN user_streak >= 5 THEN 2.0
            WHEN user_streak >= 3 THEN 1.5
            ELSE 1.0
        END;
        
        pts := CASE WHEN es_acierto THEN ROUND(base_pts * mult * streak_mult)::INTEGER ELSE 0 END;
        
        -- Actualizar prediccion
        UPDATE public.predictions SET
            estado = 'cerrado',
            resultado = CASE WHEN es_acierto THEN 'acierto' ELSE 'fallo' END,
            puntos_ganados = pts,
            precio_final = current_price,
            cerrado_at = NOW()
        WHERE id = pred.id;
        
        -- Actualizar perfil del usuario
        IF es_acierto THEN
            UPDATE public.profiles SET
                puntos = puntos + pts,
                aciertos = aciertos + 1,
                total_votos = total_votos + 1,
                racha = racha + 1,
                mejor_racha = GREATEST(mejor_racha, racha + 1),
                updated_at = NOW()
            WHERE id = pred.user_id;
        ELSE
            UPDATE public.profiles SET
                total_votos = total_votos + 1,
                racha = 0,
                updated_at = NOW()
            WHERE id = pred.user_id;
        END IF;
        
        prediction_id := pred.id;
        user_id := pred.user_id;
        acierto := es_acierto;
        puntos := pts;
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. DATOS INICIALES
-- ============================================================

-- Insertar algunos logros de ejemplo si la tabla esta vacia
-- (Los logros se manejan principalmente en el frontend)

-- ============================================================
-- 7. CONFIGURACION DE STORAGE (opcional)
-- ============================================================

-- Crear bucket para avatares si se necesita
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- ============================================================
-- INSTRUCCIONES POST-INSTALACION
-- ============================================================
-- 1. Ve a Authentication > Providers y habilita Email provider
-- 2. Ve a Settings > API y copia la URL y anon key para el frontend
-- 3. Configura las Edge Functions para el motor de bots
-- 4. Configura un cron job para ejecutar check_expired_predictions cada minuto
-- ============================================================

