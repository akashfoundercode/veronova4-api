// Plinko Arcade API Service Client
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || '';

function getAuthToken() {
  try {
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token') ||
      new URLSearchParams(window.location.search).get('token') ||
      ''
    );
  } catch (_) {
    return '';
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();
    return { data, status: response.status, ok: response.ok };
  } catch (error) {
    console.error(`Plinko API error on ${endpoint}:`, error);
    return { data: null, status: 500, error: error.message };
  }
}

export const api = {
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, payload, options) =>
    request(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
      ...options,
    }),

  // Config (Public)
  getConfig: () => api.get('/api/plinko/config'),

  // 1. Session Init
  initSession: () => api.post('/api/plinko/session/init', {}),

  // 2. Drop Ball
  dropBall: ({ amount = 5, tier = 0, isFree = false } = {}) =>
    api.post('/api/plinko/bet/drop', { amount, tier, is_free: isFree }),

  // 3. Settle Bet
  settleBet: ({ dropId, slot, mult, payout, isOut = false, tier = 0 }) =>
    api.post('/api/plinko/bet/settle', {
      drop_id: dropId,
      slot,
      mult,
      payout,
      is_out: isOut,
      tier,
    }),

  // 4. My History
  getMyHistory: ({ limit = 20, page = 1 } = {}) =>
    api.get(`/api/plinko/bets/my-history?limit=${limit}&page=${page}`),

  // 5. Live Bets
  getLiveBets: ({ limit = 20 } = {}) =>
    api.get(`/api/plinko/bets/live?limit=${limit}`),

  // 6. Game Action (cashout, ascend, invest, upgrade, sync)
  gameAction: (action, payload = {}) =>
    api.post('/api/plinko/game/action', { action, ...payload }),

  // Admin APIs
  adminGetSettings: () => api.get('/api/admin/plinko/settings'),
  adminUpdateSettings: (settings) => api.post('/api/admin/plinko/settings', settings),
  adminSetControl: ({ control_mode, forced_target, forced_rounds }) =>
    api.post('/api/admin/plinko/control', { control_mode, forced_target, forced_rounds }),
  adminGetBets: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.get(`/api/admin/plinko/bets${qs ? `?${qs}` : ''}`);
  },
  adminGetDashboard: () => api.get('/api/admin/plinko/dashboard'),
};

export default api;
