import { useState } from 'react';
import { motion } from 'framer-motion';
import { Anchor, Coins, Compass, Layers, Sparkles, Star, Zap } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { TONES, UPGRADES } from '../../config/gameConfig';
import { fmt } from '../../utils/format';
import { sfx } from '../../utils/sound';

const ICONS = {
  count: Layers,
  value: Coins,
  auto: Zap,
  weight: Anchor,
  xp: Star,
};

export default function UpgradesPanel() {
  const { state, derived, actions, notify } = useGame();
  const [buyMode, setBuyMode] = useState('1'); // '1' or 'MAX'

  const buy = (key) => {
    const def = UPGRADES[key];
    const lvl = state.unify[key] || 0;
    if (lvl >= def.max) return;

    const isMax = buyMode === 'MAX';
    const cost = def.cost(lvl);

    if (state.coins < cost) {
      sfx.error();
      notify(`Not enough coins — need ${cost}`, 'bad');
      return;
    }

    actions.upgradeUpgrade(key, isMax);
    sfx.upgrade();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Subheader: BUY PER TAP toggle */}
      <div className="flex items-center justify-end gap-2 mb-2.5 px-1 shrink-0">
        <span className="text-[11px] font-display text-white/70 uppercase tracking-wider">
          BUY PER TAP
        </span>
        <div className="bg-[#140f29] border border-[#34295e] rounded-full p-0.5 flex items-center shadow-inner">
          <button
            type="button"
            onClick={() => setBuyMode('1')}
            className={`w-6 h-6 rounded-full font-display text-xs transition-all flex items-center justify-center ${
              buyMode === '1'
                ? 'bg-gradient-to-b from-[#fcd34d] to-[#f59e0b] text-[#451a03] font-bold shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            1
          </button>
          <button
            type="button"
            onClick={() => setBuyMode('MAX')}
            className={`px-2 py-0.5 rounded-full font-display text-xs transition-all flex items-center justify-center ${
              buyMode === 'MAX'
                ? 'bg-gradient-to-b from-[#fcd34d] to-[#f59e0b] text-[#451a03] font-bold shadow'
                : 'text-white/60 hover:text-white'
            }`}
          >
            MAX
          </button>
        </div>
      </div>

      {/* Upgrades Rows */}
      <div className="flex-1 space-y-2 overflow-y-auto thin-scroll pr-1">
        {Object.entries(UPGRADES).map(([key, def], i) => {
          const lvl = state.unify[key] || 0;
          const max = lvl >= def.max;
          const cost = def.cost(lvl);
          const canBuy = state.coins >= cost && !max;
          const t = TONES[def.tone] || TONES.gold;
          const Icon = ICONS[def.iconType] || Sparkles;

          // calculate cost for MAX mode
          let maxCost = 0;
          let maxCount = 0;
          if (buyMode === 'MAX' && !max) {
            let tempCoins = state.coins;
            let tempLvl = lvl;
            while (tempLvl < def.max) {
              const c = def.cost(tempLvl);
              if (tempCoins >= c) {
                tempCoins -= c;
                maxCost += c;
                tempLvl++;
                maxCount++;
              } else {
                break;
              }
            }
          }

          const displayCost = buyMode === 'MAX' && maxCount > 1 ? maxCost : cost;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-2xl bg-[#221a42] border-2 border-[#33285c] p-2.5 sm:p-3 flex items-center justify-between gap-3 shadow-[0_3px_0_#140f2b]"
            >
              {/* Left side: Icon + Title & subtitle */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-white shadow-md border"
                  style={{
                    background: `linear-gradient(180deg, ${t.from}, ${t.to})`,
                    borderColor: t.edge,
                  }}
                >
                  <Icon size={22} strokeWidth={2.4} />
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-sm sm:text-base leading-tight text-white tracking-wide uppercase truncate">
                    {def.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs font-display text-white/70 mt-0.5">
                    <span className="text-white/90">{def.current(lvl)}</span>
                    {!max && (
                      <>
                        <span className="text-white/40">→</span>
                        <span className="text-arcade-gold font-bold">{def.next(lvl)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress dots (10 dots) */}
              <div className="hidden sm:flex items-center gap-1 shrink-0 px-2 opacity-80">
                {Array.from({ length: 10 }).map((_, dotIdx) => {
                  const filled = dotIdx < (lvl % 10 || (lvl > 0 ? 10 : 0));
                  return (
                    <span
                      key={dotIdx}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        filled ? 'bg-white shadow-[0_0_4px_#fff]' : 'bg-white/20'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Right side: Cost Button Pill */}
              <button
                type="button"
                onClick={() => buy(key)}
                disabled={max}
                className={`shrink-0 min-w-[72px] sm:min-w-[84px] h-9 sm:h-10 px-3 rounded-full border-2 flex items-center justify-center gap-1 font-display text-xs sm:text-sm transition-all shadow ${
                  max
                    ? 'bg-[#1d4a3a] border-[#2a8a68] text-arcade-green cursor-default'
                    : canBuy
                    ? 'hover:brightness-110 active:translate-y-[1px] cursor-pointer'
                    : 'opacity-70 cursor-pointer'
                }`}
                style={
                  !max
                    ? {
                        background: `linear-gradient(180deg, ${t.from}, ${t.to})`,
                        borderColor: t.edge,
                        color: t.text || '#fff',
                        boxShadow: `0 3px 0 ${t.shadow || t.edge}`,
                      }
                    : undefined
                }
              >
                {!max ? (
                  <>
                    <span className="text-xs">⭐</span>
                    <span>{fmt(displayCost)}</span>
                  </>
                ) : (
                  <span>MAX</span>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
