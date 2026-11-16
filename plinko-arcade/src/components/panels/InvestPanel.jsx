import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Bot, Coins, Flame, Gem, Layers, Magnet, Rocket, Sparkles, Star, Trophy, X, Zap } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { INVESTMENTS } from '../../config/gameConfig';
import { fmt } from '../../utils/format';
import { sfx } from '../../utils/sound';
import Button3D from '../ui/Button3D';
import Modal from '../ui/Modal';
import PanelHeader from './PanelHeader';
import UpgradeRow, { CostButton } from './UpgradeRow';

const ICONS = {
  'bonus-peg': Star,
  'mult-peg': X,
  'extra-ball': Layers,
  'auto-drop': Bot,
  'slot-boost': Magnet,
  'double-bonus': Sparkles,
  'gold-rush': Coins,
  combo: Flame,
  jackpot: Gem,
  cosmic: Rocket,
};

export default function InvestPanel() {
  const { state, actions, notify } = useGame();
  const [pending, setPending] = useState(null);
  const ownedCount = state.investments.length;
  const nextIdx = INVESTMENTS.findIndex((i) => !state.investments.includes(i.id));

  const click = (inv, idx, status) => {
    if (status === 'owned') return;
    if (status === 'locked') {
      sfx.error();
      notify(`Unlock ${INVESTMENTS[idx - 1].name} first`, 'bad');
    } else if (status === 'cant') {
      sfx.error();
      notify(`You need ${fmt(inv.cost)} SP — cash out to earn more`, 'bad');
    } else {
      sfx.click();
      setPending(inv);
    }
  };

  return (
    <div className="space-y-4">
      <PanelHeader
        icon={Trophy}
        title="INVESTMENTS"
        subtitle={`${ownedCount} / ${INVESTMENTS.length} milestones unlocked`}
        note="Each investment resets all progress except other investments"
      />

      {INVESTMENTS.map((inv, idx) => {
        const owned = state.investments.includes(inv.id);
        const prevOwned = idx === 0 || state.investments.includes(INVESTMENTS[idx - 1].id);
        const status = owned ? 'owned' : !prevOwned ? 'locked' : state.sp >= inv.cost ? 'buy' : 'cant';
        return (
          <UpgradeRow
            key={inv.id}
            index={idx}
            rank={idx + 1}
            icon={ICONS[inv.id] || Zap}
            tone={inv.tone}
            badge={inv.badge}
            title={inv.name}
            desc={inv.desc}
            highlight={idx === nextIdx}
            dim={status === 'locked'}
          >
            <CostButton currency="sp" cost={inv.cost} status={status} onClick={() => click(inv, idx, status)} />
          </UpgradeRow>
        );
      })}

      <AnimatePresence>
        {pending && (
          <Modal title="CONFIRM INVESTMENT" onClose={() => setPending(null)}>
            <p className="text-base sm:text-lg">
              Buy <span className="text-arcade-gold font-bold">{pending.name}</span> for{' '}
              <span className="text-arcade-purple font-bold">{fmt(pending.cost)} SP</span>?
            </p>
            <p className="text-white/70 mt-1.5 text-xs sm:text-sm">
              This resets your coins, slot levels and upgrades. Your other investments are kept.
            </p>
            <div className="flex gap-2.5 sm:gap-3 mt-4">
              <Button3D variant="gray" size="sm" className="flex-1 text-xs sm:text-sm py-2" onClick={() => setPending(null)}>
                CANCEL
              </Button3D>
              <Button3D
                variant="gold"
                size="sm"
                className="flex-1 text-xs sm:text-sm py-2"
                onClick={() => {
                  actions.invest(pending.id);
                  sfx.upgrade();
                  notify(`${pending.name} unlocked!`, 'gold');
                  setPending(null);
                }}
              >
                INVEST
              </Button3D>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
