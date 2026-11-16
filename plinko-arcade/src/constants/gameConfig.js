// ---------------------------------------------------------------------------
// Central game configuration.
// ---------------------------------------------------------------------------

export const SAVE_KEY = 'plinko-arcade-save-v1';

export const COLORS = {
  bg: '#0D091E',
  panel: '#1C1538',
  panel2: '#15102C',
  purple: '#8B5CF6',
  pink: '#FF6FA9',
  gold: '#FFC94A',
  green: '#35D399',
  cyan: '#48D8FF',
  white: '#FFFFFF',
};

// Logical physics/canvas size.
export const BOARD = {
  W: 440,
  H: 430,
  rows: 9, // 9 rows of pegs (2 .. 10 pegs)
  spacingX: 38,
  spacingY: 33,
  startY: 72,
  pegR: 5,
  ballR: 9.5,
  spawnX: 220,
  spawnY: 26,
  slotCount: 9, // Total 9 multiplier slots
  outGutterW: 36, // Left and Right OUT gutters width
  slotTop: 366, // y where the slot dividers start
  settleY: 382, // ball is scored once it passes this y
};

// 9 peg row colors matching the reference screenshot:
// Row 1: Pink, Row 2: Yellow, Row 3: Green/Mint, Row 4: Blue/Cyan, Row 5: Purple,
// Row 6: Pink, Row 7: Yellow, Row 8: Green/Mint, Row 9: Blue/Cyan
export const ROW_COLORS = [
  '#FF6FA9', // row 1 (2 pegs)
  '#FFC94A', // row 2 (3 pegs)
  '#35D399', // row 3 (4 pegs)
  '#48D8FF', // row 4 (5 pegs)
  '#A78BFA', // row 5 (6 pegs)
  '#FF6FA9', // row 6 (7 pegs)
  '#FFC94A', // row 7 (8 pegs)
  '#35D399', // row 8 (9 pegs)
  '#48D8FF', // row 9 (10 pegs)
];

// ----- Economy ------------------------------------------------------------
export const START_COINS = 1000;
export const BALL_COST = 5;
export const BASE_BALL_VALUE = 5;
export const BONUS_PEG_VALUE = 10;
export const MULT_PEG_FACTOR = 2;
export const SP_RATE = 25;
export const ASCEND_REQ = 5;
export const ASCEND_BONUS = 0.25;

export const spGain = (coins) => Math.max(0, Math.floor((coins - START_COINS) / SP_RATE));

// ----- Multiplier slots (Total 9 slots matching exact spec: 1.70, 1.40, 1.20, 1.20, 1, 1.20, 1.20, 1.40, 1.70) -----------
export const SLOT_BASE = [1.7, 1.4, 1.2, 1.2, 1.0, 1.2, 1.2, 1.4, 1.7];
export const SLOT_START_LEVELS = [0, 0, 0, 0, 0, 0, 0, 0, 0];
export const SLOT_STEP = 0.2; // +0.20X per level
export const SLOT_MAX_LEVEL = 25;
export const SLOT_COST_BASE = [25, 20, 20, 25, 35, 25, 20, 20, 25];
export const slotUpgradeCost = (i, level) => Math.round(SLOT_COST_BASE[i] * Math.pow(1.7, level));

export const SLOT_THEMES = [
  { from: '#FFE27A', to: '#F2A81D', edge: '#9A6400', bar: '#35D399', text: '1.70X' },
  { from: '#FCD34D', to: '#F59E0B', edge: '#B45309', bar: '#35D399', text: '1.40X' },
  { from: '#6EE7B7', to: '#10B981', edge: '#047857', bar: '#35D399', text: '1.20X' },
  { from: '#6EE7B7', to: '#10B981', edge: '#047857', bar: '#35D399', text: '1.20X' },
  { from: '#5EEAD4', to: '#14B8A6', edge: '#0F766E', bar: '#35D399', text: '1X' },
  { from: '#6EE7B7', to: '#10B981', edge: '#047857', bar: '#35D399', text: '1.20X' },
  { from: '#6EE7B7', to: '#10B981', edge: '#047857', bar: '#35D399', text: '1.20X' },
  { from: '#FCD34D', to: '#F59E0B', edge: '#B45309', bar: '#35D399', text: '1.40X' },
  { from: '#FFE27A', to: '#F2A81D', edge: '#9A6400', bar: '#35D399', text: '1.70X' },
];

// ----- Ball Tiers (16 Tiers matching reference screenshot UNIFY tab) -------
export const TIERS = [
  { id: 0, roman: '0', name: 'BASE', mult: 1, multLabel: 'x1', color: '#FFD700', bg: 'from-[#FFE27A] to-[#F59E0B]', ring: '#F59E0B' },
  { id: 1, roman: 'I', name: 'TIER I', mult: 10, multLabel: 'x10', color: '#38BDF8', bg: 'from-[#38BDF8] to-[#0284C7]', ring: '#0284C7' },
  { id: 2, roman: 'II', name: 'TIER II', mult: 100, multLabel: 'x100', color: '#C084FC', bg: 'from-[#C084FC] to-[#9333EA]', ring: '#9333EA' },
  { id: 3, roman: 'III', name: 'TIER III', mult: 1000, multLabel: 'x1.0K', color: '#F43F5E', bg: 'from-[#FB7185] to-[#E11D48]', ring: '#E11D48' },
  { id: 4, roman: 'IV', name: 'TIER IV', mult: 10000, multLabel: 'x10K', color: '#34D399', bg: 'from-[#34D399] to-[#059669]', ring: '#059669' },
  { id: 5, roman: 'V', name: 'TIER V', mult: 100000, multLabel: 'x100K', color: '#FBBF24', bg: 'from-[#FDE68A] to-[#D97706]', ring: '#D97706' },
  { id: 6, roman: 'VI', name: 'TIER VI', mult: 1000000, multLabel: 'x1.0M', color: '#A78BFA', bg: 'from-[#A78BFA] to-[#6D28D9]', ring: '#6D28D9' },
  { id: 7, roman: 'VII', name: 'TIER VII', mult: 10000000, multLabel: 'x10M', color: '#F97316', bg: 'from-[#FB923C] to-[#EA580C]', ring: '#EA580C' },
  { id: 8, roman: 'VIII', name: 'TIER VIII', mult: 100000000, multLabel: 'x100M', color: '#60A5FA', bg: 'from-[#60A5FA] to-[#2563EB]', ring: '#2563EB' },
  { id: 9, roman: 'IX', name: 'TIER IX', mult: 1000000000, multLabel: 'x1.0B', color: '#E879F9', bg: 'from-[#E879F9] to-[#C026D3]', ring: '#C026D3' },
  { id: 10, roman: 'X', name: 'TIER X', mult: 10000000000, multLabel: 'x10B', color: '#2DD4BF', bg: 'from-[#2DD4BF] to-[#0D9488]', ring: '#0D9488' },
  { id: 11, roman: 'XI', name: 'TIER XI', mult: 100000000000, multLabel: 'x100B', symbol: 'Ω', color: '#CBD5E1', bg: 'from-[#E2E8F0] to-[#64748B]', ring: '#64748B' },
  { id: 12, roman: 'XII', name: 'TIER XII', mult: 1000000000000, multLabel: 'x1.0T', symbol: '✛', color: '#94A3B8', bg: 'from-[#CBD5E1] to-[#475569]', ring: '#475569' },
  { id: 13, roman: 'XIII', name: 'TIER XIII', mult: 10000000000000, multLabel: 'x10T', symbol: '✺', color: '#818CF8', bg: 'from-[#A5B4FC] to-[#4F46E5]', ring: '#4F46E5' },
  { id: 14, roman: 'XIV', name: 'TIER XIV', mult: 100000000000000, multLabel: 'x100T', symbol: '☠', color: '#FCA5A5', bg: 'from-[#FCA5A5] to-[#DC2626]', ring: '#DC2626' },
  { id: 15, roman: 'XV', name: 'TIER XV', mult: 1000000000000000, multLabel: 'x1.0Q', symbol: '👑', color: '#FDE047', bg: 'from-[#FEF08A] to-[#CA8A04]', ring: '#CA8A04' },
];

// ----- Upgrades (Matches screenshot UPGRADES tab) -------------------------
export const UPGRADES = {
  ballCount: {
    id: 'ballCount',
    title: 'BALL COUNT',
    iconType: 'count',
    tone: 'pink',
    max: 10,
    cost: (lvl) => Math.round(10 * Math.pow(1.8, lvl)),
    current: (lvl) => `${1 + lvl}`,
    next: (lvl) => `${1 + lvl + 1}`,
  },
  ballValue: {
    id: 'ballValue',
    title: 'BALL VALUE',
    iconType: 'value',
    tone: 'gold',
    max: 25,
    cost: (lvl) => Math.round(2 * Math.pow(1.5, lvl)),
    current: (lvl) => `${1 + lvl}¢`,
    next: (lvl) => `${1 + lvl + 1}¢`,
  },
  autoSpeed: {
    id: 'autoSpeed',
    title: 'AUTO DROP',
    iconType: 'auto',
    tone: 'cyan',
    max: 10,
    cost: (lvl) => Math.round(30 * Math.pow(1.6, lvl)),
    current: (lvl) => `${((3500 - lvl * 250) / 1000).toFixed(1)}s`,
    next: (lvl) => `${((3500 - (lvl + 1) * 250) / 1000).toFixed(1)}s`,
  },
  ballWeight: {
    id: 'ballWeight',
    title: 'BALL WEIGHT',
    iconType: 'weight',
    tone: 'orange',
    max: 10,
    cost: (lvl) => Math.round(10 * Math.pow(1.7, lvl)),
    current: (lvl) => `${(1 + lvl * 0.3).toFixed(1)}X GRAVITY`,
    next: (lvl) => `${(1 + (lvl + 1) * 0.3).toFixed(1)}x gravity`,
  },
  ballXp: {
    id: 'ballXp',
    title: 'BALL XP',
    iconType: 'xp',
    tone: 'purple',
    max: 10,
    cost: (lvl) => Math.round(25 * Math.pow(1.7, lvl)),
    current: (lvl) => `${1 + lvl} XP`,
    next: (lvl) => `${1 + lvl + 1} xp`,
  },
};

// Legacy UNIFY mapping
export const UNIFY = {
  ballValue: {
    title: 'Ball Value',
    desc: (lvl) => `Base ball value ${BASE_BALL_VALUE + lvl} → ${BASE_BALL_VALUE + lvl + 1}`,
    max: 40,
    cost: (lvl) => Math.round(15 * Math.pow(1.55, lvl)),
  },
  cooldown: {
    title: 'Free Ball Cooldown',
    desc: (lvl) => `Tier I ball every ${30 - lvl * 2}s → ${30 - (lvl + 1) * 2}s`,
    max: 10,
    cost: (lvl) => Math.round(40 * Math.pow(1.8, lvl)),
  },
  autoSpeed: {
    title: 'Auto Drop Speed',
    desc: (lvl) =>
      `Auto-drop every ${((3500 - lvl * 250) / 1000).toFixed(1)}s → ${((3500 - (lvl + 1) * 250) / 1000).toFixed(1)}s`,
    max: 10,
    cost: (lvl) => Math.round(60 * Math.pow(1.9, lvl)),
  },
};

// ----- Investments --------------------------------------------------------
export const INVESTMENTS = [
  { id: 'bonus-peg', name: 'Bonus Peg', desc: '+10 ball value when hit', cost: 30, tone: 'green', badge: '+10' },
  { id: 'mult-peg', name: 'Multiplier Peg', desc: '×2 ball value when hit', cost: 60, tone: 'pink', badge: '×2' },
  { id: 'extra-ball', name: 'Twin Drop', desc: '+1 ball can be active at once', cost: 100, tone: 'cyan', badge: '+1' },
  { id: 'auto-drop', name: 'Auto Dropper', desc: 'Unlocks automatic ball drops', cost: 160, tone: 'purple', badge: 'AUTO' },
  { id: 'slot-boost', name: 'Slot Booster', desc: '+0.25X on every slot', cost: 250, tone: 'gold', badge: '+.25' },
  { id: 'double-bonus', name: 'Bonus Cluster', desc: '3 extra Bonus Pegs appear', cost: 400, tone: 'green', badge: '+3' },
  { id: 'gold-rush', name: 'Gold Rush', desc: '+1 coin for every peg hit', cost: 600, tone: 'gold', badge: '+1' },
  { id: 'combo', name: 'Combo Chain', desc: '+1 ball value on every peg hit', cost: 900, tone: 'pink', badge: 'COMBO' },
  { id: 'jackpot', name: 'Jackpot Slot', desc: 'Center slot pays ×3', cost: 1300, tone: 'purple', badge: '×3' },
  { id: 'cosmic', name: 'Cosmic Ball', desc: 'All rewards ×2', cost: 2000, tone: 'cyan', badge: '×2' },
];

export const BONUS_PEGS_BASE = ['3-1', '5-4'];
export const BONUS_PEGS_EXTRA = ['7-2', '4-3', '8-7'];
export const MULT_PEGS = ['4-2', '6-4', '8-5'];

export const TONES = {
  green: { from: '#8CF5CB', to: '#35D399', edge: '#177A5A', shadow: '#0f4835', text: '#06382a' },
  pink: { from: '#FF9CC6', to: '#FF6FA9', edge: '#B03A74', shadow: '#7e1d4b', text: '#fff' },
  purple: { from: '#C4B0FF', to: '#8B5CF6', edge: '#5A34B8', shadow: '#3f1f8a', text: '#fff' },
  cyan: { from: '#9BEBFF', to: '#48D8FF', edge: '#1A8FB0', shadow: '#10566d', text: '#06344a' },
  gold: { from: '#FFE27A', to: '#FFC94A', edge: '#B8801A', shadow: '#7a5210', text: '#4b2e00' },
  orange: { from: '#FFAC5F', to: '#EA580C', edge: '#9A3412', shadow: '#6c2207', text: '#fff' },
};
