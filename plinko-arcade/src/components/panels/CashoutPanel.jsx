import { Banknote } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { SP_RATE, START_COINS } from '../../config/gameConfig';
import { fmt } from '../../utils/format';
import { sfx } from '../../utils/sound';
import Button3D from '../ui/Button3D';
import { CoinIcon } from '../ui/CoinIcon';
import PanelHeader from './PanelHeader';

export default function CashoutPanel() {
  const { state, derived, actions, notify } = useGame();
  const gain = derived.spOnCashout;
  const toNext = Math.max(0, START_COINS + (gain + 1) * SP_RATE - state.coins);

  return (
    <div className="space-y-3 sm:space-y-4">
      <PanelHeader
        icon={Banknote}
        title="CASHOUT"
        subtitle="Turn your coins into Shop Points (SP)"
        note={`Every ${SP_RATE} coins above your starting ${START_COINS} becomes 1 SP. Your run then restarts.`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
        <div className="panel-inset p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs tracking-[0.16em] text-white/55 font-display">COINS ON HAND</div>
          <div className="flex items-center gap-2 text-xl sm:text-2xl md:text-3xl mt-1 font-display truncate">
            <CoinIcon size={24} className="w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
            <span className="truncate">{fmt(state.coins)}</span>
          </div>
        </div>
        <div className="panel-inset p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs tracking-[0.16em] text-white/55 font-display">YOU WOULD RECEIVE</div>
          <div className="flex items-center gap-2 text-xl sm:text-2xl md:text-3xl mt-1 text-arcade-purple font-display truncate">
            <CoinIcon size={24} variant="sp" className="w-5 h-5 sm:w-7 sm:h-7 shrink-0" />
            <span className="truncate">+{fmt(gain)} SP</span>
          </div>
          <div className="text-[11px] sm:text-xs text-white/55 mt-0.5 truncate">{fmt(toNext)} more coins for next SP</div>
        </div>
      </div>

      <div className="panel-inset p-3 sm:p-3.5 text-xs sm:text-sm text-white/85 space-y-1">
        <p>
          <span className="text-arcade-green font-bold">Kept:</span> Shop Points, investments, ascensions, stats.
        </p>
        <p>
          <span className="text-arcade-pink font-bold">Reset:</span> coins, slot levels, Unify upgrades.
        </p>
      </div>

      <Button3D
        variant="green"
        size="md"
        className="w-full text-sm sm:text-base md:text-lg py-2.5 sm:py-3"
        disabled={gain < 1}
        onClick={() => {
          actions.cashout();
          sfx.cashout();
          notify(`Cashed out for ${fmt(gain)} SP!`, 'good');
        }}
      >
        <Banknote className="w-5 h-5 shrink-0" />
        <span className="truncate">
          {gain < 1 ? `NEED ${fmt(toNext)} MORE COINS` : `CASH OUT +${fmt(gain)} SP`}
        </span>
      </Button3D>
    </div>
  );
}
