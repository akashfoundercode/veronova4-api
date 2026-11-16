import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  ASCEND_BONUS,
  ASCEND_REQ,
  BALL_COST,
  BASE_BALL_VALUE,
  BONUS_PEGS_BASE,
  BONUS_PEGS_EXTRA,
  BONUS_PEG_VALUE,
  INVESTMENTS,
  MULT_PEGS,
  MULT_PEG_FACTOR,
  SAVE_KEY,
  SLOT_BASE,
  SLOT_MAX_LEVEL,
  SLOT_START_LEVELS,
  SLOT_STEP,
  START_COINS,
  UNIFY,
  UPGRADES,
  slotUpgradeCost,
  spGain,
} from '../config/gameConfig';
import { setSoundEnabled } from '../utils/sound';

const GameContext = createContext(null);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const defaultTierBalls = { 0: 25, 1: 2, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0 };

const freshRun = () => ({
  coins: START_COINS,
  slotLevels: [...SLOT_START_LEVELS],
  unify: { ballValue: 0, cooldown: 0, autoSpeed: 0, ballCount: 0, ballWeight: 0, ballXp: 0 },
  tierBalls: { ...defaultTierBalls },
  selectedTier: 0,
  freeReadyAt: 0,
  betHistory: [],
});

const initialState = () => ({
  version: 1,
  ...freshRun(),
  sp: 0,
  investments: [],
  ascensions: 0,
  settings: { sound: true, particles: true, trail: true },
  stats: { drops: 0, totalEarned: 0, bestWin: 0, cashouts: 0, totalSpEarned: 0 },
});

function loadState() {
  const base = initialState();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return base;
    const s = JSON.parse(raw);
    return {
      ...base,
      ...s,
      coins: Math.max(s.coins || 0, 1000),
      tierBalls: { ...defaultTierBalls, ...(s.tierBalls || {}) },
      selectedTier: s.selectedTier !== undefined ? s.selectedTier : 0,
      slotLevels: Array.isArray(s.slotLevels) && s.slotLevels.length === 9 ? s.slotLevels : base.slotLevels,
      unify: { ...base.unify, ...(s.unify || {}) },
      settings: { ...base.settings, ...(s.settings || {}) },
      stats: { ...base.stats, ...(s.stats || {}) },
      investments: Array.isArray(s.investments) ? s.investments : [],
      betHistory: Array.isArray(s.betHistory) ? s.betHistory : [],
    };
  } catch {
    return base;
  }
}

const round2 = (n) => Math.round(n * 100) / 100;

function reducer(s, a) {
  switch (a.type) {
    case 'ADD_COINS':
      return {
        ...s,
        coins: round2(s.coins + a.amount),
        stats: {
          ...s.stats,
          totalEarned: round2(s.stats.totalEarned + a.amount),
          bestWin: Math.max(s.stats.bestWin, a.amount),
        },
      };
    case 'SPEND':
      return { ...s, coins: round2(Math.max(0, s.coins - a.amount)) };
    case 'RECORD_DROP': {
      const tier = a.tier !== undefined ? a.tier : 0;
      return {
        ...s,
        stats: { ...s.stats, drops: s.stats.drops + 1 },
        tierBalls: {
          ...s.tierBalls,
          [tier]: (s.tierBalls?.[tier] || 0) + 1,
        },
      };
    }
    case 'RECORD_BET_RESULT': {
      const item = {
        id: (s.betHistory?.[0]?.id || 0) + 1,
        time: Date.now(),
        tier: a.tier !== undefined ? a.tier : 0,
        slot: a.slot,
        mult: a.mult,
        payout: a.payout,
        isOut: a.isOut,
      };
      return {
        ...s,
        betHistory: [item, ...(s.betHistory || [])].slice(0, 80),
      };
    }
    case 'MERGE_TIER': {
      const tier = a.tier;
      const current = s.tierBalls?.[tier] || 0;
      const needed = a.all ? Math.floor(current / 10) * 10 : 10;
      if (current < needed || needed === 0) return s;
      const gained = needed / 10;
      return {
        ...s,
        tierBalls: {
          ...s.tierBalls,
          [tier]: current - needed,
          [tier + 1]: (s.tierBalls?.[tier + 1] || 0) + gained,
        },
      };
    }
    case 'MERGE_ALL_TIERS': {
      const tb = { ...(s.tierBalls || defaultTierBalls) };
      let changed = false;
      for (let t = 0; t < 15; t++) {
        const count = tb[t] || 0;
        if (count >= 10) {
          const batches = Math.floor(count / 10);
          tb[t] = count - batches * 10;
          tb[t + 1] = (tb[t + 1] || 0) + batches;
          changed = true;
        }
      }
      if (!changed) return s;
      return { ...s, tierBalls: tb };
    }
    case 'SET_SELECTED_TIER': {
      return { ...s, selectedTier: a.tier };
    }
    case 'USE_FREE_BALL':
      return { ...s, freeReadyAt: a.readyAt };
    case 'UPGRADE_SLOT': {
      const lvl = s.slotLevels[a.index];
      if (lvl >= SLOT_MAX_LEVEL) return s;
      const cost = slotUpgradeCost(a.index, lvl);
      if (s.coins < cost) return s;
      const slotLevels = [...s.slotLevels];
      slotLevels[a.index] = lvl + 1;
      return { ...s, coins: round2(s.coins - cost), slotLevels };
    }
    case 'UPGRADE_UNIFY': {
      const def = UNIFY[a.key];
      const lvl = s.unify[a.key];
      if (!def || lvl >= def.max) return s;
      const cost = def.cost(lvl);
      if (s.coins < cost) return s;
      return { ...s, coins: round2(s.coins - cost), unify: { ...s.unify, [a.key]: lvl + 1 } };
    }
    case 'UPGRADE_UPGRADE': {
      const def = UPGRADES[a.key];
      const lvl = s.unify[a.key] || 0;
      if (!def || lvl >= def.max) return s;
      const count = a.max ? Math.min(def.max - lvl, 100) : 1;
      let costTotal = 0;
      let newLvl = lvl;
      for (let i = 0; i < count; i++) {
        const c = def.cost(newLvl);
        if (s.coins >= costTotal + c) {
          costTotal += c;
          newLvl++;
        } else {
          break;
        }
      }
      if (newLvl === lvl) return s;
      return { ...s, coins: round2(s.coins - costTotal), unify: { ...s.unify, [a.key]: newLvl } };
    }
    case 'CASHOUT': {
      const gain = spGain(s.coins);
      if (gain < 1) return s;
      return {
        ...s,
        ...freshRun(),
        sp: s.sp + gain,
        stats: { ...s.stats, cashouts: s.stats.cashouts + 1, totalSpEarned: s.stats.totalSpEarned + gain },
      };
    }
    case 'INVEST': {
      const idx = INVESTMENTS.findIndex((i) => i.id === a.id);
      if (idx < 0 || s.investments.includes(a.id)) return s;
      if (idx > 0 && !s.investments.includes(INVESTMENTS[idx - 1].id)) return s;
      if (s.sp < INVESTMENTS[idx].cost) return s;
      // Investing resets everything except other investments (and permanent stats).
      return { ...s, ...freshRun(), sp: s.sp - INVESTMENTS[idx].cost, investments: [...s.investments, a.id] };
    }
    case 'ASCEND': {
      if (s.investments.length < ASCEND_REQ) return s;
      return { ...initialState(), settings: s.settings, stats: s.stats, ascensions: s.ascensions + 1 };
    }
    case 'SET_SETTING':
      return { ...s, settings: { ...s.settings, [a.key]: a.value } };
    case 'RESET_ALL':
      return initialState();
    default:
      return s;
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
let toastId = 0;

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadState);
  const [toasts, setToasts] = useState([]);

  // Mirror of state for synchronous checks (e.g. two drops in the same tick).
  const live = useRef(state);
  live.current = state;

  // Persist progress.
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch {
      /* storage may be unavailable (private mode) */
    }
  }, [state]);

  useEffect(() => setSoundEnabled(state.settings.sound), [state.settings.sound]);

  // Values derived from state + owned investments.
  const derived = useMemo(() => {
    const own = (id) => state.investments.includes(id);
    const slotBoost = own('slot-boost') ? 0.25 : 0;
    const slotMults = SLOT_BASE.map((base, i) => {
      let m = base + SLOT_STEP * state.slotLevels[i] + slotBoost;
      if (own('jackpot') && i === 2) m *= 3;
      return Math.round(m * 100) / 100;
    });
    const globalMult = (1 + ASCEND_BONUS * state.ascensions) * (own('cosmic') ? 2 : 1);
    const bonusPegIds = new Set([
      ...(own('bonus-peg') ? BONUS_PEGS_BASE : []),
      ...(own('bonus-peg') && own('double-bonus') ? BONUS_PEGS_EXTRA : []),
    ]);
    const multPegIds = new Set(own('mult-peg') ? MULT_PEGS : []);
    return {
      own,
      slotMults,
      globalMult,
      bonusPegIds,
      multPegIds,
      bonusPegValue: BONUS_PEG_VALUE,
      multPegFactor: MULT_PEG_FACTOR,
      ballCost: BALL_COST,
      ballValue: BASE_BALL_VALUE + (state.unify.ballValue || 0),
      maxBalls: 1 + (state.unify.ballCount || 0) + (own('extra-ball') ? 1 : 0),
      autoUnlocked: true,
      autoIntervalMs: Math.max(800, 3500 - 250 * (state.unify.autoSpeed || 0)),
      ballWeight: 1 + 0.3 * (state.unify.ballWeight || 0),
      ballXp: 1 + (state.unify.ballXp || 0),
      freeCooldownMs: Math.max(10, 30 - 2 * (state.unify.cooldown || 0)) * 1000,
      flatPerHit: own('gold-rush') ? 1 : 0,
      perHitValue: own('combo') ? 1 : 0,
      spOnCashout: spGain(state.coins),
    };
  }, [state.investments, state.slotLevels, state.unify, state.ascensions, state.coins]);

  const notify = useCallback((text, kind = 'info') => {
    const id = ++toastId;
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2200);
  }, []);

  // Atomically check + deduct coins. Returns false if the player can't afford it.
  const trySpend = useCallback((amount) => {
    if (live.current.coins + 1e-9 < amount) return false;
    live.current = { ...live.current, coins: live.current.coins - amount };
    dispatch({ type: 'SPEND', amount });
    return true;
  }, []);

  const actions = useMemo(
    () => ({
      addCoins: (amount) => dispatch({ type: 'ADD_COINS', amount }),
      recordDrop: (tier = 0) => dispatch({ type: 'RECORD_DROP', tier }),
      recordBetResult: (data) => dispatch({ type: 'RECORD_BET_RESULT', ...data }),
      useFreeBall: (readyAt) => dispatch({ type: 'USE_FREE_BALL', readyAt }),
      upgradeSlot: (index) => dispatch({ type: 'UPGRADE_SLOT', index }),
      upgradeUnify: (key) => dispatch({ type: 'UPGRADE_UNIFY', key }),
      upgradeUpgrade: (key, max = false) => dispatch({ type: 'UPGRADE_UPGRADE', key, max }),
      mergeTier: (tier, all = false) => dispatch({ type: 'MERGE_TIER', tier, all }),
      mergeAllTiers: () => dispatch({ type: 'MERGE_ALL_TIERS' }),
      setSelectedTier: (tier) => dispatch({ type: 'SET_SELECTED_TIER', tier }),
      cashout: () => dispatch({ type: 'CASHOUT' }),
      invest: (id) => dispatch({ type: 'INVEST', id }),
      ascend: () => dispatch({ type: 'ASCEND' }),
      setSetting: (key, value) => dispatch({ type: 'SET_SETTING', key, value }),
      resetAll: () => dispatch({ type: 'RESET_ALL' }),
    }),
    []
  );

  const value = useMemo(
    () => ({ state, derived, actions, trySpend, notify, toasts }),
    [state, derived, actions, trySpend, notify, toasts]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
}
