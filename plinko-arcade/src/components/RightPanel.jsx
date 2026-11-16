import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Banknote, BarChart3, ChevronLeft, ChevronRight, LayoutGrid, Radio, Rocket } from 'lucide-react';
import { sfx } from '../utils/sound';
import LiveBetsPanel from './panels/LiveBetsPanel';
import CashoutPanel from './panels/CashoutPanel';
import StatsPanel from './panels/StatsPanel';
import AscendPanel from './panels/AscendPanel';
import SlotsPanel from './panels/SlotsPanel';

const TABS = [
  { id: 'live', label: 'LIVE BETS', icon: Radio, Panel: LiveBetsPanel, live: true },
  { id: 'stats', label: 'STATS', icon: BarChart3, Panel: StatsPanel },
  { id: 'cashout', label: 'CASHOUT', icon: Banknote, Panel: CashoutPanel },
  { id: 'ascend', label: 'ASCEND', icon: Rocket, Panel: AscendPanel },
];

export default function RightPanel() {
  const [tab, setTab] = useState('live');
  const scroller = useRef(null);
  const Active = TABS.find((t) => t.id === tab)?.Panel || LiveBetsPanel;

  const scroll = (dir) => scroller.current?.scrollBy({ left: dir * 180, behavior: 'smooth' });

  const arrow = (dir, Icon, label) => (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        sfx.click();
        scroll(dir);
      }}
      className="grid place-items-center w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-[#231b40] border-2 border-[#392e66] text-white shadow-[0_2px_0_#120e24] hover:bg-[#2d2252] active:translate-y-[1px] transition"
    >
      <Icon size={18} strokeWidth={2.6} />
    </button>
  );

  return (
    <section className="panel h-full flex flex-col p-2.5 sm:p-3 min-w-0 overflow-hidden bg-[#1c1538] border-2 border-[#332a58]">
      {/* Tab bar matching the screenshot with left & right arrows */}
      <div className="flex items-center gap-1.5 mb-2 shrink-0">
        {arrow(-1, ChevronLeft, 'Scroll tabs left')}
        <div
          ref={scroller}
          className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5 overscroll-x-contain"
          role="tablist"
        >
          {TABS.map(({ id, label, icon: Icon, live: isLive }) => {
            const on = id === tab;
            return (
              <motion.button
                key={id}
                role="tab"
                aria-selected={on}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  sfx.click();
                  setTab(id);
                  e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
                }}
                className={`relative shrink-0 flex items-center gap-1.5 h-8 sm:h-9 px-3 rounded-xl border-2 text-xs font-display tracking-wide transition-all select-none ${
                  on
                    ? 'bg-gradient-to-b from-[#ffe27a] to-[#f59e0b] border-[#d99f14] text-[#451a03] shadow-[0_2px_0_#92660a]'
                    : 'bg-[#231b40] border-[#392e66] text-white shadow-[0_2px_0_#120e24] hover:bg-[#2d2252]'
                }`}
              >
                {isLive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block shrink-0" />
                )}
                <Icon size={15} strokeWidth={2.4} className={on ? 'text-[#451a03]' : 'text-arcade-green'} />
                <span>{label}</span>
              </motion.button>
            );
          })}
        </div>
        {arrow(1, ChevronRight, 'Scroll tabs right')}
      </div>

      {/* Tab Content Panel */}
      <div className="flex-1 min-h-0 overflow-y-auto thin-scroll pr-0.5 pb-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            <Active />
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
