import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, Video, Wallet } from 'lucide-react';
import { PlinkoEngine } from '../engine/PlinkoEngine';
import { BOARD, SLOT_MAX_LEVEL, SLOT_THEMES, TIERS } from '../config/gameConfig';
import { useGame } from '../context/GameContext';
import { fmt, fmtMult, round1 } from '../utils/format';
import { initAudio, sfx } from '../utils/sound';
import useNow from '../hooks/useNow';
import Button3D from './ui/Button3D';
import WalletModal from './WalletModal';

let floaterId = 0;

export default function BoardPanel() {
  const { state, derived, actions, trySpend, notify } = useGame();
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const pausedRef = useRef(false);

  const latest = useRef({});
  latest.current = { state, derived, actions, trySpend, notify };

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [autoOn, setAutoOn] = useState(false);
  const [betAmount, setBetAmount] = useState(10);
  const [showWallet, setShowWallet] = useState(false);
  const [lastHit, setLastHit] = useState({ slot: -1, key: 0 });
  const [floaters, setFloaters] = useState([]);
  const [autoProgress, setAutoProgress] = useState(0);
  const now = useNow(250);

  const betAmountRef = useRef(betAmount);
  betAmountRef.current = betAmount;

  const addFloater = useCallback((f) => {
    const id = ++floaterId;
    setFloaters((l) => [...l.slice(-14), { ...f, id }]);
    setTimeout(() => setFloaters((l) => l.filter((x) => x.id !== id)), 1300);
  }, []);

  // ----- engine lifecycle -------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const engine = new PlinkoEngine(canvas, {
      getDerived: () => latest.current.derived,
      getSettings: () => latest.current.state.settings,
      onPegHit: ({ x, y, kind, hits }) => {
        sfx.peg(hits);
        if (kind === 'bonus' || kind === 'mult') {
          sfx.bonus();
          const d = latest.current.derived;
          addFloater({
            type: 'peg',
            x: (x / BOARD.W) * 100,
            y: (y / BOARD.H) * 100,
            text: kind === 'bonus' ? `+${d.bonusPegValue}` : `×${d.multPegFactor}`,
            color: kind === 'bonus' ? '#FFC94A' : '#FF6FA9',
          });
        }
      },
      onSettle: ({ slot, value, flat, tier = 0, bet = 10, x }) => {
        const { derived: d, actions: a } = latest.current;
        const mult = d.slotMults[slot];
        const reward = round1((value * mult + flat) * d.globalMult);
        a.addCoins(reward);
        a.recordBetResult({ tier, slot, mult, bet, payout: reward, isOut: false });
        sfx.reward(mult);
        setActive(engine.activeCount());
        setLastHit((h) => ({ slot, key: h.key + 1 }));
        addFloater({
          type: 'peg',
          x: (x / BOARD.W) * 100,
          y: (BOARD.settleY / BOARD.H) * 100 - 4,
          text: `+${fmt(reward)}`,
          color: mult >= 1 ? '#FFC94A' : '#FF8FB8',
        });
      },
      onOut: ({ x, tier = 0, bet = 10 }) => {
        const { actions: a } = latest.current;
        a.recordBetResult({ tier, slot: -1, mult: 0, bet, payout: 0, isOut: true });
        sfx.error();
        setActive(engine.activeCount());
        addFloater({
          type: 'peg',
          x: (x / BOARD.W) * 100,
          y: (BOARD.settleY / BOARD.H) * 100 - 4,
          text: 'OUT! ❌',
          color: '#EF4444',
        });
      },
    });
    engineRef.current = engine;
    engine.start();

    const ro = new ResizeObserver(() => engine.resize());
    if (canvas) ro.observe(canvas);
    return () => {
      ro.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, [addFloater]);

  // ----- dropping balls ---------------------------------------------------
  const drop = useCallback(
    ({ free = false, auto = false, tier = null } = {}) => {
      initAudio();
      const eng = engineRef.current;
      const { derived: d, state: s, actions: a, trySpend: spend, notify: say } = latest.current;
      if (!eng || pausedRef.current) return false;

      if (eng.activeCount() >= d.maxBalls) {
        if (!auto) {
          sfx.error();
          say(d.maxBalls > 1 ? 'Max balls on the board!' : 'A ball is already falling!', 'bad');
        }
        return false;
      }

      const chosenTier = tier !== null ? tier : (s.selectedTier || 0);
      const tierMult = TIERS[chosenTier]?.mult || 1;
      const currentBet = free ? 0 : (betAmountRef.current || 10);

      if (free) {
        if (Date.now() < s.freeReadyAt) return false;
      } else if (!spend(currentBet)) {
        if (!auto) {
          sfx.error();
          say(`Need ${currentBet} coins for bet! Top up in Wallet`, 'bad');
          setShowWallet(true);
        }
        return false;
      }

      const ballValue = (free ? 5 : currentBet) * tierMult;
      eng.drop({ value: ballValue, free, tier: chosenTier, bet: currentBet });
      setActive(eng.activeCount());
      a.recordDrop(chosenTier);
      if (free) a.useFreeBall(Date.now() + d.freeCooldownMs);
      sfx.drop();
      return true;
    },
    []
  );

  // Auto drop timer & animated progress bar
  useEffect(() => {
    if (!autoOn || paused) {
      setAutoProgress(0);
      return undefined;
    }
    const interval = derived.autoIntervalMs || 3500;
    const startTime = Date.now();

    const tick = setInterval(() => {
      const elapsed = (Date.now() - startTime) % interval;
      setAutoProgress(elapsed / interval);
    }, 50);

    const dropTimer = setInterval(() => {
      drop({ auto: true });
    }, interval);

    return () => {
      clearInterval(tick);
      clearInterval(dropTimer);
    };
  }, [autoOn, paused, derived.autoIntervalMs, drop]);

  // Space bar drops a ball
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        drop();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drop]);

  const togglePause = () => {
    initAudio();
    sfx.click();
    pausedRef.current = !pausedRef.current;
    engineRef.current?.setPaused(pausedRef.current);
    setPaused(pausedRef.current);
  };

  const freeLeft = Math.max(0, Math.ceil((state.freeReadyAt - now) / 1000));
  const freeReady = freeLeft === 0;
  const slotAreaPct = ((BOARD.H - BOARD.slotTop) / BOARD.H) * 100;
  const autoSec = ((derived.autoIntervalMs || 3500) / 1000).toFixed(1);

  return (
    <section className="panel h-full flex flex-col p-2.5 sm:p-3 min-w-0 overflow-hidden bg-[#1c1538] border-2 border-[#332a58] justify-between">
      {/* Top bar: Pause button + Blue progress bar + Auto Drop • 3.5s status */}
      <div className="flex items-center gap-2 mb-2 bg-[#130f28] rounded-full p-1 border border-[#2b224e] shrink-0">
        <button
          type="button"
          onClick={togglePause}
          aria-label={paused ? 'Resume' : 'Pause'}
          className="grid place-items-center w-7 h-7 shrink-0 rounded-full bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] border border-[#1e40af] text-white shadow active:translate-y-[1px] transition"
        >
          {paused ? <Play size={12} fill="#fff" /> : <Pause size={12} fill="#fff" />}
        </button>

        <div className="relative flex-1 h-3 rounded-full bg-[#141b38] border border-[#23356e] overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#48d8ff] to-[#3b82f6] shadow-[0_0_8px_rgba(72,216,255,0.7)]"
            animate={{ width: `${Math.max(autoProgress * 100, 2)}%` }}
            transition={{ ease: 'linear', duration: 0.05 }}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            initAudio();
            sfx.click();
            setAutoOn((v) => !v);
          }}
          className={`font-display text-[11px] sm:text-xs flex items-center gap-1 shrink-0 px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
            autoOn
              ? 'bg-[#2a1d4a] text-amber-300 border border-amber-500/50 shadow-[0_0_8px_rgba(251,191,36,0.3)]'
              : 'bg-[#181230] text-white/50 border border-transparent hover:text-white/80'
          }`}
          title="Click to toggle Auto Drop"
        >
          <span className={autoOn ? 'text-amber-400' : 'text-white/40'}>⚡</span>
          <span>Auto Drop • {autoOn ? `${autoSec}s` : 'OFF'}</span>
        </button>
      </div>

      {/* Board container */}
      <div className="relative mx-auto w-full flex-1 min-h-0 rounded-2xl overflow-hidden border-2 border-[#332a58] shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] bg-[#120c2b]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

        {/* Active balls pill in top-left matching screenshot: 🟡 0/1 */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-[#130f28]/90 border border-[#3b3066] pl-1.5 pr-2.5 py-0.5 text-xs font-display">
          <span className="w-3.5 h-3.5 rounded-full bg-arcade-gold border border-amber-600 inline-block shrink-0 shadow-sm" />
          <span className="tracking-wide text-white font-display text-[11px]">
            {active}/{derived.maxBalls}
          </span>
        </div>

        {/* Multiplier slots matching reference: 9 slots with Left and Right OUT gutters */}
        <div
          className="absolute inset-x-0 bottom-0 flex pb-1.5 pointer-events-none"
          style={{ height: `${slotAreaPct}%` }}
        >
          {/* Left OUT zone (matches outGutterW: 36px / 440px = 8.18%) */}
          <div className="h-full flex flex-col justify-end px-1" style={{ width: '8.18%' }}>
            <div className="rounded-lg flex items-center justify-center border-2 border-[#ef4444]/80 bg-[#280c18] shadow text-center h-7 sm:h-8 w-full">
              <span className="font-display text-[9px] sm:text-[10px] text-[#ef4444] font-bold tracking-tight leading-none">
                OUT
              </span>
            </div>
          </div>

          {/* 9 Multiplier slots (matches slotAreaW: 368px / 440px = 83.64%) */}
          <div className="h-full flex-1 flex" style={{ width: '83.64%' }}>
            {derived.slotMults.map((m, i) => {
              const th = SLOT_THEMES[i] || SLOT_THEMES[0];
              const hit = lastHit.slot === i;
              return (
                <div
                  key={i}
                  className="h-full flex flex-col justify-end px-0.5"
                  style={{ width: `${100 / 9}%` }}
                >
                  <motion.div
                    key={hit ? lastHit.key : 'idle'}
                    initial={hit ? { scale: 1.15, y: -4 } : false}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 14 }}
                    className="rounded-lg flex items-center justify-center overflow-hidden border shadow h-7 sm:h-8 w-full"
                    style={{
                      borderColor: th.edge,
                      background: `linear-gradient(180deg, ${th.from}, ${th.to})`,
                      boxShadow: `0 1px 0 ${th.edge}${hit ? `, 0 0 12px ${th.from}` : ''}`,
                    }}
                  >
                    <span className="font-display text-[9px] sm:text-[10px] text-black font-bold tracking-tight leading-none text-center px-0.5 truncate [text-shadow:0_1px_0_rgba(255,255,255,0.3)]">
                      {fmtMult(m)}
                    </span>
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* Right OUT zone (matches outGutterW: 36px / 440px = 8.18%) */}
          <div className="h-full flex flex-col justify-end px-1" style={{ width: '8.18%' }}>
            <div className="rounded-lg flex items-center justify-center border-2 border-[#ef4444]/80 bg-[#280c18] shadow text-center h-7 sm:h-8 w-full">
              <span className="font-display text-[9px] sm:text-[10px] text-[#ef4444] font-bold tracking-tight leading-none">
                OUT
              </span>
            </div>
          </div>
        </div>

        {/* Floating text */}
        <AnimatePresence>
          {floaters.map((f) => (
            <motion.div
              key={f.id}
              className="absolute pointer-events-none text-outline text-[4.5cqw] -translate-x-1/2 font-display"
              style={
                f.type === 'slot'
                  ? { left: `${(f.slot + 0.5) * 20}%`, bottom: `${slotAreaPct + 2}%`, color: f.good ? '#FFC94A' : '#FF8FB8', '--ol': '#1b1235' }
                  : { left: `${f.x}%`, top: `${f.y}%`, color: f.color, '--ol': '#1b1235' }
              }
              initial={{ opacity: 0, y: 0, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], y: f.type === 'slot' ? -48 : -28, scale: [0.6, 1.2, 1, 1] }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            >
              {f.text}
            </motion.div>
          ))}
        </AnimatePresence>

        {paused && (
          <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-[2px]">
            <span className="font-display text-2xl text-arcade-gold tracking-wider">PAUSED</span>
          </div>
        )}
      </div>

      {/* Bet Amount Controls Bar */}
      <div className="flex flex-col gap-1.5 mt-2 bg-[#140e29] border border-[#2f2454] rounded-2xl p-2 shrink-0 shadow-inner">
        {/* Row 1: Bet Label + Input with - / + and 1/2, 2X, MAX, + ADD */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-display text-white/60 uppercase tracking-wider shrink-0">
              BET:
            </span>
            <button
              type="button"
              onClick={() => {
                initAudio();
                sfx.click();
                setBetAmount((b) => Math.max(1, b > 100 ? b - 50 : b > 25 ? b - 10 : b - 5));
              }}
              className="w-6 h-6 rounded-lg bg-[#241a45] hover:bg-[#322460] text-white font-display text-xs flex items-center justify-center border border-[#3b2b68] cursor-pointer active:scale-95 transition"
            >
              -
            </button>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#1c1438] border border-[#3f3070]">
              <span className="text-arcade-gold font-bold text-xs">🪙</span>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1) setBetAmount(Math.min(val, 100000));
                }}
                className="w-12 sm:w-16 bg-transparent text-white font-display text-xs font-bold text-center focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                initAudio();
                sfx.click();
                setBetAmount((b) => Math.min(100000, b >= 100 ? b + 50 : b >= 25 ? b + 10 : b + 5));
              }}
              className="w-6 h-6 rounded-lg bg-[#241a45] hover:bg-[#322460] text-white font-display text-xs flex items-center justify-center border border-[#3b2b68] cursor-pointer active:scale-95 transition"
            >
              +
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                initAudio();
                sfx.click();
                setBetAmount((b) => Math.max(1, Math.floor(b / 2)));
              }}
              className="px-1.5 py-0.5 rounded-md bg-[#241a45] hover:bg-[#322460] text-[10px] font-display text-white/70 hover:text-white border border-[#3b2b68] cursor-pointer"
            >
              1/2
            </button>
            <button
              type="button"
              onClick={() => {
                initAudio();
                sfx.click();
                setBetAmount((b) => Math.min(Math.floor(state.coins) || 100000, b * 2));
              }}
              className="px-1.5 py-0.5 rounded-md bg-[#241a45] hover:bg-[#322460] text-[10px] font-display text-white/70 hover:text-white border border-[#3b2b68] cursor-pointer"
            >
              2X
            </button>
            <button
              type="button"
              onClick={() => {
                initAudio();
                sfx.click();
                setBetAmount(Math.max(1, Math.floor(state.coins)));
              }}
              className="px-1.5 py-0.5 rounded-md bg-gradient-to-b from-[#fcd34d] to-[#f59e0b] text-[10px] font-display text-[#451a03] font-bold shadow cursor-pointer"
            >
              MAX
            </button>
            <button
              type="button"
              onClick={() => {
                initAudio();
                sfx.click();
                setShowWallet(true);
              }}
              className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-[10px] font-display text-white font-bold flex items-center gap-0.5 shadow cursor-pointer ml-1"
              title="Add Coins / Wallet"
            >
              <Wallet size={10} />
              <span>+ ADD</span>
            </button>
          </div>
        </div>

        {/* Row 2: Quick Chips */}
        <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#231a40]">
          <span className="text-[9px] font-display text-white/40 uppercase tracking-wider">CHIPS:</span>
          <div className="flex items-center gap-1">
            {(derived.chips || [5, 10, 20, 50, 100, 200, 500, 1000]).map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  initAudio();
                  sfx.click();
                  setBetAmount(chip);
                }}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-display transition-all cursor-pointer ${
                  betAmount === chip
                    ? 'bg-arcade-gold text-[#451a03] font-bold shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                    : 'bg-[#1b1435] text-white/60 hover:text-white hover:bg-[#251c44] border border-[#2d224e]'
                }`}
              >
                🪙 {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drop Button (Full Width) */}
      <div className="mt-2 h-11 sm:h-12 shrink-0">
        <Button3D
          variant="pink"
          size="md"
          onClick={() => drop()}
          disabled={paused}
          className="w-full h-full !py-0 text-base sm:text-lg font-display rounded-2xl tracking-widest uppercase flex items-center justify-center gap-2 shadow-lg"
        >
          <span>DROP NOW!</span>
        </Button3D>
      </div>

      <WalletModal open={showWallet} onClose={() => setShowWallet(false)} />
    </section>
  );
}
