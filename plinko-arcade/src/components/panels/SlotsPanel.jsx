import { LayoutGrid } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { SLOT_BASE, SLOT_MAX_LEVEL, SLOT_STEP, slotUpgradeCost } from '../../config/gameConfig';
import { fmtMult } from '../../utils/format';
import { sfx } from '../../utils/sound';
import PanelHeader from './PanelHeader';
import UpgradeRow, { CostButton } from './UpgradeRow';

const TONES = ['gold', 'orange', 'green', 'cyan', 'purple', 'cyan', 'green', 'orange', 'gold'];

export default function SlotsPanel() {
  const { state, derived, actions, notify } = useGame();

  const buy = (i, status, cost) => {
    if (status === 'max') return;
    if (status === 'cant') {
      sfx.error();
      notify(`Not enough coins — need ${cost}`, 'bad');
      return;
    }
    actions.upgradeSlot(i);
    sfx.upgrade();
  };

  return (
    <div className="space-y-2.5 sm:space-y-3.5">
      <PanelHeader
        icon={LayoutGrid}
        title="MULTIPLIER SLOTS"
        subtitle="Level up slots to boost every ball that lands in them"
        note="Each level adds +0.20X to a slot. Spend coins here — upgrades reset on Cash Out and Invest."
      />
      {state.slotLevels.map((lvl, i) => {
        const max = lvl >= SLOT_MAX_LEVEL;
        const cost = slotUpgradeCost(i, lvl);
        const status = max ? 'max' : state.coins >= cost ? 'buy' : 'cant';
        const cur = derived.slotMults[i];
        const next = Math.round((cur + SLOT_STEP * (derived.own('jackpot') && i === 2 ? 3 : 1)) * 100) / 100;
        return (
          <UpgradeRow
            key={i}
            index={i}
            icon={LayoutGrid}
            tone={TONES[i]}
            badge={`LV${lvl}`}
            title={`Slot ${i + 1}`}
            desc={max ? `${fmtMult(cur)} — fully upgraded` : `${fmtMult(cur)} → ${fmtMult(next)}`}
            extra={`Base ${fmtMult(SLOT_BASE[i])}`}
          >
            <CostButton cost={cost} status={status} onClick={() => buy(i, status, cost)} />
          </UpgradeRow>
        );
      })}
    </div>
  );
}
