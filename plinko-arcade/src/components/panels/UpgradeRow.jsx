import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { TONES } from '../../config/gameConfig';
import { fmt } from '../../utils/format';
import { CoinIcon } from '../ui/CoinIcon';

// Right-hand price / status pill. status: buy | cant | locked | owned | max
export function CostButton({ currency = 'coins', cost, status, onClick }) {
  const base =
    'cost-button shrink-0 h-9 sm:h-10 md:h-11 px-3 sm:px-4 rounded-xl sm:rounded-2xl border-2 sm:border-[3px] flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base md:text-lg font-display transition';
  if (status === 'owned' || status === 'max') {
    return (
      <div
        className={`${base} bg-[#1d4a3a] border-[#2a8a68] text-arcade-green shadow-[0_3px_0_#0f2a20]`}
      >
        <Check size={16} className="sm:w-5 sm:h-5" strokeWidth={3} />
        <span className="text-xs sm:text-sm md:text-base">{status === 'max' ? 'MAX' : 'OWNED'}</span>
      </div>
    );
  }
  const icon =
    status === 'locked' ? (
      <Lock size={15} className="text-arcade-gold shrink-0" fill="#FFC94A" />
    ) : (
      <CoinIcon size={18} variant={currency === 'sp' ? 'sp' : 'coin'} className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
    );
  const style =
    status === 'buy'
      ? 'bg-gradient-to-b from-[#6EE7B0] to-[#35D399] border-[#178A5E] text-[#06382a] shadow-[0_3px_0_#178A5E] hover:brightness-110 active:translate-y-[2px] active:shadow-[0_1px_0_#178A5E] cursor-pointer'
      : 'bg-[#463F68] border-[#2A2445] text-white/90 shadow-[0_3px_0_#1b1633] cursor-pointer';
  return (
    <button type="button" onClick={onClick} className={`${base} ${style}`} aria-label={`Cost ${cost}`}>
      {icon}
      <span>{fmt(cost)}</span>
    </button>
  );
}

export default function UpgradeRow({ rank, icon: Icon, tone = 'gold', badge, title, desc, extra, highlight, dim, children, index = 0 }) {
  const t = TONES[tone] || TONES.gold;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: dim ? 0.75 : 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`upgrade-row flex flex-col xs:flex-row xs:items-center justify-between gap-2.5 sm:gap-3.5 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 md:p-4 border-2 sm:border-[3px] bg-gradient-to-b from-[#2a2440] to-[#241f38] ${
        highlight
          ? 'border-[#c9a23c] shadow-[0_3px_0_#15112a,0_0_18px_rgba(255,201,74,0.18)]'
          : 'border-[#3d3563] shadow-[0_3px_0_#15112a]'
      }`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        {rank !== undefined && (
          <span className="w-5 sm:w-6 shrink-0 text-base sm:text-lg text-white/80 font-display">
            #{rank}
          </span>
        )}
        <div
          className="relative grid place-items-center w-10 h-10 sm:w-12 sm:h-12 md:w-13 md:h-13 shrink-0 rounded-xl sm:rounded-2xl text-white"
          style={{
            background: `linear-gradient(180deg, ${t.from}, ${t.to})`,
            border: `2px solid ${t.edge}`,
            boxShadow: `0 3px 0 ${t.edge}, inset 0 2px 0 rgba(255,255,255,.5)`,
          }}
        >
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.4} />
          {badge && (
            <span
              className="absolute -bottom-1.5 -right-1.5 px-1 sm:px-1.5 rounded-full text-[9px] sm:text-[10px] leading-4 text-white font-display"
              style={{ background: t.edge, border: '1.5px solid rgba(255,255,255,.4)' }}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm sm:text-base md:text-lg leading-tight text-white [text-shadow:0_1px_0_#000] truncate">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-white/85 leading-snug mt-0.5">
            {desc}
          </p>
          {extra && <p className="text-[11px] sm:text-xs text-white/50 mt-0.5 truncate">{extra}</p>}
        </div>
      </div>

      <div className="xs:shrink-0 flex justify-end w-full xs:w-auto">
        {children}
      </div>
    </motion.div>
  );
}
