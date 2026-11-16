import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Coins, Flame, Percent, Rocket, Target, Trophy, Zap } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { fmt, fmtMult } from '../../utils/format';
import { SLOT_BASE, TIERS } from '../../config/gameConfig';
import PanelHeader from './PanelHeader';

export default function StatsPanel() {
  const { state, derived } = useGame();
  const history = state.betHistory || [];

  // Compute detailed analytics from history & stats
  const analytics = useMemo(() => {
    const totalDrops = state.stats.drops || 0;
    const historyDrops = history.length;
    const outDrops = history.filter((h) => h.isOut).length;
    const scoredDrops = history.filter((h) => !h.isOut);

    const winRate = historyDrops > 0 ? Math.round(((historyDrops - outDrops) / historyDrops) * 100) : 100;
    const outRate = historyDrops > 0 ? Math.round((outDrops / historyDrops) * 100) : 0;

    const avgMult = scoredDrops.length > 0
      ? (scoredDrops.reduce((acc, h) => acc + (h.mult || 1), 0) / scoredDrops.length).toFixed(2)
      : '1.20';

    // Count slot hits
    const slotHits = Array(9).fill(0);
    history.forEach((h) => {
      if (typeof h.slot === 'number' && h.slot >= 0 && h.slot < 9) {
        slotHits[h.slot]++;
      }
    });

    const maxSlotHit = Math.max(...slotHits, 1);

    return {
      totalDrops,
      winRate,
      outRate,
      avgMult,
      slotHits,
      maxSlotHit,
    };
  }, [history, state.stats.drops]);

  return (
    <div className="space-y-3 pb-2">
      <PanelHeader
        icon={BarChart3}
        title="CAREER STATS"
        subtitle="Real-time game analytics and drop performance"
        note="Every drop and multiplier hit is tracked in real-time."
      />

      {/* Top 4 Hero Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-gradient-to-br from-[#241a4a] to-[#1a1236] border-2 border-[#3d2c70] p-3 shadow-[0_2px_0_#120d26]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Coins size={16} />
            </div>
            <span className="text-[11px] font-display text-white/60 uppercase tracking-wider">Total Won</span>
          </div>
          <span className="text-lg sm:text-xl font-display text-arcade-gold font-bold block leading-tight">
            +{fmt(state.stats.totalEarned)}
          </span>
          <span className="text-[10px] font-display text-white/40 block mt-0.5">Coins earned lifetime</span>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-[#241a4a] to-[#1a1236] border-2 border-[#3d2c70] p-3 shadow-[0_2px_0_#120d26]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Trophy size={16} />
            </div>
            <span className="text-[11px] font-display text-white/60 uppercase tracking-wider">Best Win</span>
          </div>
          <span className="text-lg sm:text-xl font-display text-emerald-400 font-bold block leading-tight">
            +{fmt(state.stats.bestWin)}
          </span>
          <span className="text-[10px] font-display text-white/40 block mt-0.5">Single drop record</span>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-[#241a4a] to-[#1a1236] border-2 border-[#3d2c70] p-3 shadow-[0_2px_0_#120d26]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Target size={16} />
            </div>
            <span className="text-[11px] font-display text-white/60 uppercase tracking-wider">Total Drops</span>
          </div>
          <span className="text-lg sm:text-xl font-display text-white font-bold block leading-tight">
            {state.stats.drops}
          </span>
          <span className="text-[10px] font-display text-white/40 block mt-0.5">Balls dropped</span>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-[#241a4a] to-[#1a1236] border-2 border-[#3d2c70] p-3 shadow-[0_2px_0_#120d26]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400">
              <Percent size={16} />
            </div>
            <span className="text-[11px] font-display text-white/60 uppercase tracking-wider">Win Rate</span>
          </div>
          <span className="text-lg sm:text-xl font-display text-arcade-pink font-bold block leading-tight">
            {analytics.winRate}%
          </span>
          <span className="text-[10px] font-display text-white/40 block mt-0.5">{analytics.outRate}% OUT rate</span>
        </div>
      </div>

      {/* Secondary Metrics Bar */}
      <div className="rounded-2xl bg-[#1c1538] border-2 border-[#332658] p-3 shadow-[0_2px_0_#120d26]">
        <h4 className="text-xs font-display text-white/80 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Zap size={14} className="text-amber-400" />
          <span>Game Performance Summary</span>
        </h4>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-[#140f28] rounded-xl p-2 border border-[#2b214d]">
            <span className="text-[10px] font-display text-white/50 block leading-tight">Avg Multiplier</span>
            <span className="text-sm font-display text-amber-300 font-bold mt-1 block">
              {analytics.avgMult}X
            </span>
          </div>

          <div className="bg-[#140f28] rounded-xl p-2 border border-[#2b214d]">
            <span className="text-[10px] font-display text-white/50 block leading-tight">Cash Outs</span>
            <span className="text-sm font-display text-cyan-400 font-bold mt-1 block">
              {state.stats.cashouts || 0}
            </span>
          </div>

          <div className="bg-[#140f28] rounded-xl p-2 border border-[#2b214d]">
            <span className="text-[10px] font-display text-white/50 block leading-tight">Ascensions</span>
            <span className="text-sm font-display text-purple-400 font-bold mt-1 block">
              {state.ascensions || 0}
            </span>
          </div>
        </div>
      </div>

      {/* 9 Slots Hit Distribution Breakdown */}
      <div className="rounded-2xl bg-[#1c1538] border-2 border-[#332658] p-3 shadow-[0_2px_0_#120d26]">
        <h4 className="text-xs font-display text-white/80 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Flame size={14} className="text-rose-400" />
            <span>9-Slot Hit Frequency</span>
          </span>
          <span className="text-[10px] text-white/40">Recent drops</span>
        </h4>

        <div className="space-y-1.5 mt-2">
          {derived.slotMults.map((mult, i) => {
            const hits = analytics.slotHits[i];
            const pct = Math.round((hits / analytics.maxSlotHit) * 100);
            const isEdge = i === 0 || i === 8;

            return (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-14 text-[10px] font-display shrink-0 ${isEdge ? 'text-amber-300 font-bold' : 'text-white/70'}`}>
                  Slot {i + 1} ({fmtMult(mult)})
                </span>
                <div className="flex-1 h-3 rounded-full bg-[#130f28] border border-[#2b214d] overflow-hidden p-0.5">
                  <motion.div
                    className={`h-full rounded-full ${
                      isEdge
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_6px_rgba(251,191,36,0.5)]'
                        : i === 4
                        ? 'bg-gradient-to-r from-purple-400 to-indigo-500'
                        : 'bg-gradient-to-r from-teal-400 to-emerald-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(pct, hits > 0 ? 6 : 0)}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
                <span className="w-8 text-right text-[10px] font-display text-white/60 font-bold shrink-0">
                  {hits} hits
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}