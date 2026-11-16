import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../../context/GameContext';
import { TIERS } from '../../config/gameConfig';
import { sfx } from '../../utils/sound';

export default function UnifyPanel() {
  const { state, actions, notify } = useGame();
  const [mergeMode, setMergeMode] = useState('10'); // '10' or 'ALL'
  const selectedTier = state.selectedTier !== undefined ? state.selectedTier : 0;
  const tierBalls = state.tierBalls || {};

  const handleMerge = (tier) => {
    const count = tierBalls[tier] || 0;
    if (count < 10) {
      sfx.error();
      notify(`Need at least 10 balls to merge`, 'bad');
      return;
    }
    actions.mergeTier(tier, mergeMode === 'ALL');
    sfx.upgrade();
    notify(`Merged into ${TIERS[tier + 1]?.name || 'Next Tier'}!`, 'good');
  };

  const handleMergeAll = () => {
    let hasAny = false;
    for (let t = 0; t < 15; t++) {
      if ((tierBalls[t] || 0) >= 10) {
        hasAny = true;
        break;
      }
    }
    if (!hasAny) {
      sfx.error();
      notify(`No tiers have 10+ balls to merge`, 'bad');
      return;
    }
    actions.mergeAllTiers();
    sfx.cashout();
    notify(`All balls cascaded into higher tiers!`, 'good');
  };

  return (
    <div className="flex flex-col h-full space-y-2.5">
      {/* 16-Tier Grid Box (2 rows x 8 columns) matching reference screenshot */}
      <div className="rounded-2xl bg-[#140f28] border-2 border-[#2b224e] p-2 sm:p-2.5 shrink-0 shadow-inner">
        <div className="grid grid-cols-8 gap-1 sm:gap-1.5">
          {TIERS.map((tier) => {
            const count = tierBalls[tier.id] || 0;
            const isSelected = selectedTier === tier.id;
            const hasBalls = count > 0;

            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => actions.setSelectedTier(tier.id)}
                className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#291b4c] border-2 border-[#ff6fa9] shadow-[0_0_10px_rgba(255,111,169,0.4)] scale-[1.03]'
                    : 'bg-[#1b1435] border border-[#2d224e] hover:bg-[#251c44]'
                }`}
              >
                {/* 3D Ball Sphere (Glossy if owned, metallic dim with tint if 0) */}
                <div
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full shadow-sm flex items-center justify-center text-[9px] font-display font-bold relative overflow-hidden"
                  style={{
                    background: hasBalls
                      ? `radial-gradient(circle at 35% 28%, #ffffff 0%, ${tier.color} 55%, #160a24 100%)`
                      : `radial-gradient(circle at 35% 28%, #5a4f75 0%, #2e2448 60%, #151025 100%)`,
                    boxShadow: hasBalls
                      ? `0 2px 6px ${tier.color}66, inset 0 1px 1px rgba(255,255,255,0.6)`
                      : `0 1px 3px rgba(0,0,0,0.6), inset 0 1px 1px rgba(255,255,255,0.2)`,
                    border: hasBalls ? `1px solid ${tier.color}` : `1px solid #3c325c`,
                    color: hasBalls ? '#ffffff' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {/* Subtle glossy sheen highlight */}
                  <span className="absolute top-0.5 left-1 w-2 h-1 rounded-full bg-white/40 blur-[0.4px] pointer-events-none" />
                  {tier.symbol ? <span className="leading-none">{tier.symbol}</span> : ''}
                </div>

                {/* Roman Numeral / Tier Number */}
                <span
                  className={`text-[9px] sm:text-[10px] font-display leading-tight mt-1 ${
                    isSelected ? 'text-white font-bold' : 'text-white/80'
                  }`}
                >
                  {tier.roman}
                </span>

                {/* Count below */}
                <span className="text-[9px] sm:text-[10px] font-display text-white/60 leading-tight">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MERGE ALL BALLS Button */}
      <button
        type="button"
        onClick={handleMergeAll}
        className="w-full py-2 sm:py-2.5 rounded-2xl bg-gradient-to-b from-[#655088] to-[#4e3b6e] border-2 border-[#7a649f] shadow-[0_3px_0_#2b1f42] hover:brightness-110 active:translate-y-[1px] transition text-center flex flex-col items-center justify-center shrink-0 cursor-pointer"
      >
        <span className="font-display text-sm sm:text-base text-white tracking-wider [text-shadow:0_1px_0_#1b122c]">
          MERGE ALL BALLS
        </span>
        <span className="text-[10px] sm:text-[11px] font-display text-[#d8cded]">
          Cascade every tier in one tap
        </span>
      </button>

      {/* MERGE PER TAP Toggle */}
      <div className="flex items-center justify-end gap-2 px-1 shrink-0">
        <span className="text-[11px] font-display text-white/70 uppercase tracking-wider">
          MERGE PER TAP
        </span>
        <div className="bg-[#140f29] border border-[#34295e] rounded-full p-0.5 flex items-center shadow-inner">
          <button
            type="button"
            onClick={() => {
              sfx.click();
              setMergeMode('10');
            }}
            className={`px-2.5 py-0.5 rounded-full font-display text-xs transition-all flex items-center justify-center cursor-pointer ${
              mergeMode === '10'
                ? 'bg-gradient-to-b from-[#ffd359] to-[#f59e0b] text-[#3d1900] font-bold shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            10
          </button>
          <button
            type="button"
            onClick={() => {
              sfx.click();
              setMergeMode('ALL');
            }}
            className={`px-2.5 py-0.5 rounded-full font-display text-xs transition-all flex items-center justify-center cursor-pointer ${
              mergeMode === 'ALL'
                ? 'bg-gradient-to-b from-[#ffd359] to-[#f59e0b] text-[#3d1900] font-bold shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            ALL
          </button>
        </div>
      </div>

      {/* Scrollable Tier List matching reference screenshot */}
      <div className="flex-1 min-h-0 overflow-y-auto thin-scroll space-y-2 pr-1">
        {TIERS.slice(0, 15).map((tier, idx) => {
          const nextTier = TIERS[idx + 1];
          const count = tierBalls[tier.id] || 0;
          const canMerge = count >= 10;
          const neededBatches = mergeMode === 'ALL' ? Math.floor(count / 10) : 1;
          const mergeLabel = mergeMode === 'ALL' && neededBatches > 1 ? `MERGE ${neededBatches * 10}` : `MERGE 10`;

          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="rounded-2xl bg-[#1e163b] border-2 border-[#332658] p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-[0_2px_0_#120d26]"
            >
              {/* Left side: Glossy 3D Ball Icon + Title & Subtitle */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0 flex items-center justify-center shadow-md relative overflow-hidden"
                  style={{
                    background: `radial-gradient(circle at 35% 28%, #ffffff 0%, ${tier.color} 55%, #180b2a 100%)`,
                    border: `1.5px solid ${tier.color}`,
                    boxShadow: `0 0 12px ${tier.color}55, inset 0 2px 2px rgba(255,255,255,0.7)`,
                  }}
                >
                  <span className="absolute top-1 left-2 w-3 h-1.5 rounded-full bg-white/50 blur-[0.5px] pointer-events-none" />
                  {tier.symbol && (
                    <span className="font-display text-xs font-bold text-white relative z-10 drop-shadow">
                      {tier.symbol}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm sm:text-base leading-tight text-white tracking-wide uppercase truncate">
                    {tier.name}
                  </h3>
                  <p className="text-xs font-display text-white/70 mt-0.5">
                    <span className="text-white font-bold">0/{count}</span>
                    <span className="ml-2 text-white/70">{tier.multLabel} value</span>
                  </p>
                </div>
              </div>

              {/* Right side: MERGE 10 -> TIER Button */}
              <button
                type="button"
                onClick={() => handleMerge(tier.id)}
                disabled={!canMerge}
                className={`min-w-[100px] sm:min-w-[115px] h-10 px-3 rounded-xl border-2 font-display flex flex-col items-center justify-center leading-none transition-all ${
                  canMerge
                    ? 'bg-gradient-to-b from-[#655088] to-[#4e3b6e] border-[#7a649f] text-white shadow-[0_2px_0_#2b1f42] hover:brightness-110 active:translate-y-[1px] cursor-pointer'
                    : 'bg-[#271e3d] border-[#362a52] text-white/35 shadow-none cursor-not-allowed opacity-65'
                }`}
              >
                <span className="text-xs font-bold">{mergeLabel}</span>
                <span className="text-[9px] text-[#d8cded] mt-0.5">→ {nextTier.name}</span>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
