import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, Flame, Trophy, User, Users } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { TIERS } from '../../config/gameConfig';
import { fmt, fmtMult } from '../../utils/format';
import { sfx } from '../../utils/sound';

const SAMPLE_NAMES = [
  'Vikram_Ace', 'Kavya_R', 'CryptoBull', 'PlinkoKing', 'LuckyStrike',
  'ShadowNinja', 'Alex_Pro', 'Zara_B', 'DragonDrop', 'Aarav_7',
  'QueenBee', 'CyberNeon', 'GoldRush_88', 'Rohit_X', 'StarGazer',
  'TitanDrop', 'Maya_99', 'NeonViper', 'Pooja_S', 'ApexHunter',
];

const MULT_WEIGHTS = [
  { mult: 1.7, weight: 12 },
  { mult: 1.4, weight: 16 },
  { mult: 1.2, weight: 22 },
  { mult: 1.0, weight: 24 },
  { mult: 0.8, weight: 16 },
  { mult: 0, isOut: true, weight: 10 },
];

function pickRandomResult() {
  const total = MULT_WEIGHTS.reduce((acc, cur) => acc + cur.weight, 0);
  let rnd = Math.random() * total;
  for (const item of MULT_WEIGHTS) {
    if (rnd < item.weight) return item;
    rnd -= item.weight;
  }
  return MULT_WEIGHTS[0];
}

const AVATAR_COLORS = [
  'from-pink-500 to-rose-600',
  'from-cyan-400 to-blue-600',
  'from-amber-400 to-orange-500',
  'from-purple-500 to-indigo-600',
  'from-emerald-400 to-teal-600',
  'from-yellow-400 to-amber-600',
];

export default function LiveBetsPanel() {
  const { state } = useGame();
  const [activeTab, setActiveTab] = useState('live'); // 'live' or 'my'
  const [liveBets, setLiveBets] = useState(() => {
    // Initial batch of realistic bets
    return Array.from({ length: 8 }, (_, i) => {
      const name = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
      const res = pickRandomResult();
      const bet = [5, 10, 20, 25, 50, 100][Math.floor(Math.random() * 6)];
      const tierId = Math.random() < 0.25 ? (Math.random() < 0.5 ? 1 : 2) : 0;
      const payout = res.isOut ? 0 : Math.round(bet * res.mult * (tierId === 1 ? 10 : tierId === 2 ? 100 : 1));
      return {
        id: `init-${i}`,
        player: name,
        bet,
        tier: tierId,
        mult: res.mult,
        isOut: res.isOut,
        payout,
        timeAgo: `${i * 3 + 2}s ago`,
        isUser: false,
      };
    });
  });

  const [onlineCount, setOnlineCount] = useState(2481);

  // Real-time simulated bets by other players
  useEffect(() => {
    const interval = setInterval(() => {
      const name = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
      const res = pickRandomResult();
      const bet = [5, 10, 20, 25, 50, 100, 200][Math.floor(Math.random() * 7)];
      const tierId = Math.random() < 0.2 ? (Math.random() < 0.6 ? 1 : 2) : 0;
      const payout = res.isOut ? 0 : Math.round(bet * res.mult * (tierId === 1 ? 10 : tierId === 2 ? 100 : 1));

      const newBet = {
        id: `bet-${Date.now()}-${Math.random()}`,
        player: name,
        bet,
        tier: tierId,
        mult: res.mult,
        isOut: res.isOut,
        payout,
        timeAgo: 'Just now',
        isUser: false,
      };

      setLiveBets((prev) => [newBet, ...prev.slice(0, 39)]);
      // Small online count jitter for realism
      setOnlineCount((c) => c + (Math.random() > 0.5 ? 1 : -1));
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  // When the user drops a ball, inject it into liveBets as "YOU ⭐"
  const latestUserBet = state.betHistory?.[0];
  useEffect(() => {
    if (!latestUserBet) return;
    const userBetEntry = {
      id: `user-${latestUserBet.id}`,
      player: 'YOU ⭐',
      bet: 5,
      tier: latestUserBet.tier || 0,
      mult: latestUserBet.mult,
      isOut: latestUserBet.isOut,
      payout: latestUserBet.payout,
      timeAgo: 'Just now',
      isUser: true,
    };
    setLiveBets((prev) => [userBetEntry, ...prev.filter((b) => b.id !== userBetEntry.id).slice(0, 39)]);
  }, [latestUserBet?.id]);

  // Statistics calculation
  const myStats = useMemo(() => {
    const history = state.betHistory || [];
    const totalDrops = history.length;
    const outDrops = history.filter((h) => h.isOut).length;
    const winRate = totalDrops > 0 ? Math.round(((totalDrops - outDrops) / totalDrops) * 100) : 0;
    const highestPayout = history.reduce((max, h) => Math.max(max, h.payout || 0), 0);
    return {
      drops: state.stats.drops,
      earned: state.stats.totalEarned,
      bestWin: state.stats.bestWin || highestPayout,
      winRate,
    };
  }, [state.betHistory, state.stats]);

  return (
    <div className="flex flex-col h-full space-y-2.5">
      {/* 2 Main Toggle Buttons matching user request: [ LIVE PLAYERS | MY HISTORY ] */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#140f29] rounded-2xl border-2 border-[#2f2454] shrink-0">
        <button
          type="button"
          onClick={() => {
            sfx.click();
            setActiveTab('live');
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-display text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${
            activeTab === 'live'
              ? 'bg-gradient-to-b from-[#6b5099] to-[#4d3674] border-2 border-[#8165af] text-white shadow-[0_2px_0_#2b1b44] font-bold'
              : 'text-white/60 hover:text-white hover:bg-[#1e173a]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="truncate">LIVE PLAYERS</span>
        </button>

        <button
          type="button"
          onClick={() => {
            sfx.click();
            setActiveTab('my');
          }}
          className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl font-display text-xs sm:text-sm tracking-wide transition-all cursor-pointer ${
            activeTab === 'my'
              ? 'bg-gradient-to-b from-[#fcd34d] to-[#f59e0b] border-2 border-[#d97706] text-[#451a03] shadow-[0_2px_0_#78350f] font-bold'
              : 'text-white/60 hover:text-white hover:bg-[#1e173a]'
          }`}
        >
          <User className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">MY HISTORY</span>
          {state.betHistory?.length > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] leading-tight">
              {state.betHistory.length}
            </span>
          )}
        </button>
      </div>

      {/* Dynamic Statistics Cards */}
      <div className="grid grid-cols-4 gap-1.5 shrink-0">
        {activeTab === 'live' ? (
          <>
            <div className="rounded-xl bg-[#1b1435] border border-[#2e2350] p-1.5 text-center shadow-inner">
              <span className="text-[9px] font-display text-white/50 block uppercase leading-none">Online</span>
              <span className="text-xs font-display text-emerald-400 font-bold block mt-0.5">{onlineCount}</span>
            </div>
            <div className="rounded-xl bg-[#1b1435] border border-[#2e2350] p-1.5 text-center shadow-inner">
              <span className="text-[9px] font-display text-white/50 block uppercase leading-none">High Edge</span>
              <span className="text-xs font-display text-amber-300 font-bold block mt-0.5">1.70X</span>
            </div>
            <div className="rounded-xl bg-[#1b1435] border border-[#2e2350] p-1.5 text-center shadow-inner">
              <span className="text-[9px] font-display text-white/50 block uppercase leading-none">Top Win</span>
              <span className="text-xs font-display text-arcade-gold font-bold block mt-0.5">🪙 4.2K</span>
            </div>
            <div className="rounded-xl bg-[#1b1435] border border-[#2e2350] p-1.5 text-center shadow-inner">
              <span className="text-[9px] font-display text-white/50 block uppercase leading-none">Payout</span>
              <span className="text-xs font-display text-purple-300 font-bold block mt-0.5">98.2%</span>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl bg-[#1b1435] border border-[#2e2350] p-1.5 text-center shadow-inner">
              <span className="text-[9px] font-display text-white/50 block uppercase leading-none">Drops</span>
              <span className="text-xs font-display text-white font-bold block mt-0.5">{myStats.drops}</span>
            </div>
            <div className="rounded-xl bg-[#1b1435] border border-[#2e2350] p-1.5 text-center shadow-inner">
              <span className="text-[9px] font-display text-white/50 block uppercase leading-none">Earned</span>
              <span className="text-xs font-display text-arcade-gold font-bold block mt-0.5">+{fmt(myStats.earned)}</span>
            </div>
            <div className="rounded-xl bg-[#1b1435] border border-[#2e2350] p-1.5 text-center shadow-inner">
              <span className="text-[9px] font-display text-white/50 block uppercase leading-none">Best Win</span>
              <span className="text-xs font-display text-emerald-400 font-bold block mt-0.5">+{fmt(myStats.bestWin)}</span>
            </div>
            <div className="rounded-xl bg-[#1b1435] border border-[#2e2350] p-1.5 text-center shadow-inner">
              <span className="text-[9px] font-display text-white/50 block uppercase leading-none">Win Rate</span>
              <span className="text-xs font-display text-cyan-400 font-bold block mt-0.5">{myStats.winRate}%</span>
            </div>
          </>
        )}
      </div>

      {/* Feed List Container */}
      <div className="flex-1 min-h-0 overflow-y-auto thin-scroll space-y-1.5 pr-0.5">
        <AnimatePresence initial={false}>
          {activeTab === 'live' ? (
            // LIVE PLAYERS FEED
            liveBets.map((item, idx) => {
              const tierInfo = TIERS[item.tier] || TIERS[0];
              const colorIdx = Math.abs(item.player.charCodeAt(0)) % AVATAR_COLORS.length;
              const avatarGradient = AVATAR_COLORS[colorIdx];

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`rounded-xl border p-2 flex items-center justify-between gap-2 transition ${
                    item.isUser
                      ? 'bg-gradient-to-r from-[#2f1b4a] to-[#25173f] border-amber-400/80 shadow-[0_0_10px_rgba(251,191,36,0.25)]'
                      : 'bg-[#1c1538] border-[#2e2350] hover:bg-[#221a42]'
                  }`}
                >
                  {/* Left: Player Avatar + Name + Bet */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full bg-gradient-to-tr ${avatarGradient} flex items-center justify-center font-display text-[10px] text-white font-bold shrink-0 shadow-sm`}
                    >
                      {item.isUser ? '⭐' : item.player.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-display text-xs truncate leading-tight ${
                            item.isUser ? 'text-arcade-gold font-bold' : 'text-white/90'
                          }`}
                        >
                          {item.player}
                        </span>
                        {item.tier > 0 && (
                          <span
                            className="px-1 py-0.2 rounded-sm text-[8px] font-display font-bold leading-none"
                            style={{ backgroundColor: tierInfo.color, color: '#000' }}
                          >
                            {tierInfo.roman}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-display text-white/50 block leading-none mt-0.5">
                        Bet: {item.bet} coins • {item.timeAgo}
                      </span>
                    </div>
                  </div>

                  {/* Right: Multiplier badge + Payout */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`px-2 py-0.5 rounded-lg font-display text-xs font-bold ${
                        item.isOut
                          ? 'bg-red-950/80 border border-red-500/60 text-red-400'
                          : item.mult >= 1.4
                          ? 'bg-amber-950/80 border border-amber-500/60 text-amber-300'
                          : item.mult >= 1.0
                          ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300'
                          : 'bg-purple-950/80 border border-purple-500/60 text-purple-300'
                      }`}
                    >
                      {item.isOut ? 'OUT ❌' : `${item.mult.toFixed(2)}X`}
                    </div>

                    <div className="text-right min-w-[55px]">
                      <span
                        className={`font-display text-xs font-bold block leading-none ${
                          item.isOut ? 'text-red-400' : 'text-arcade-gold'
                        }`}
                      >
                        {item.isOut ? '0' : `+${fmt(item.payout)}`}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            // MY HISTORY FEED ("Apna History")
            (state.betHistory && state.betHistory.length > 0) ? (
              state.betHistory.map((item, idx) => {
                const tierInfo = TIERS[item.tier] || TIERS[0];
                const date = new Date(item.time || Date.now());
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return (
                  <motion.div
                    key={item.id || idx}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.015 }}
                    className="rounded-xl bg-[#1e163b] border-2 border-[#332658] p-2 flex items-center justify-between gap-2 shadow-[0_2px_0_#120d26]"
                  >
                    {/* Left: Drop badge + Tier Icon + Time */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                        style={{
                          background: `radial-gradient(circle at 35% 30%, #fff 0%, ${tierInfo.color} 55%, #111 100%)`,
                          border: `1px solid ${tierInfo.color}`,
                        }}
                      >
                        <span className="font-display text-[9px] font-bold text-white">
                          {tierInfo.id === 0 ? '1' : tierInfo.roman}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-display text-xs text-white leading-tight truncate">
                          Drop #{state.betHistory.length - idx} • {tierInfo.name}
                        </h4>
                        <span className="text-[10px] font-display text-white/50 block leading-none mt-0.5">
                          {timeStr}
                        </span>
                      </div>
                    </div>

                    {/* Right: Multiplier + Payout */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        className={`px-2 py-0.5 rounded-lg font-display text-xs font-bold ${
                          item.isOut
                            ? 'bg-red-950/80 border border-red-500/60 text-red-400'
                            : item.mult >= 1.4
                            ? 'bg-amber-950/80 border border-amber-500/60 text-amber-300'
                            : item.mult >= 1.0
                            ? 'bg-emerald-950/80 border border-emerald-500/60 text-emerald-300'
                            : 'bg-purple-950/80 border border-purple-500/60 text-purple-300'
                        }`}
                      >
                        {item.isOut ? 'OUT ❌' : `${(item.mult || 0).toFixed(2)}X`}
                      </div>

                      <div className="text-right min-w-[60px]">
                        <span
                          className={`font-display text-xs font-bold block leading-none ${
                            item.isOut ? 'text-red-400' : 'text-arcade-gold'
                          }`}
                        >
                          {item.isOut ? '0 COINS' : `+${fmt(item.payout)}`}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="text-center py-10 px-4 rounded-2xl bg-[#17112f] border border-[#2b214d]">
                <Clock className="w-8 h-8 mx-auto text-white/30 mb-2" />
                <h3 className="font-display text-sm text-white/80">No Drops Yet!</h3>
                <p className="text-xs font-display text-white/50 mt-1 max-w-[200px] mx-auto">
                  Click <span className="text-arcade-gold font-bold">DROP IT!</span> on the board to start playing and record your winning history.
                </p>
              </div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}