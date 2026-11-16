import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Rocket } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { ASCEND_BONUS, ASCEND_REQ } from '../../config/gameConfig';
import { sfx } from '../../utils/sound';
import Button3D from '../ui/Button3D';
import Modal from '../ui/Modal';
import PanelHeader from './PanelHeader';

export default function AscendPanel() {
  const { state, actions, notify } = useGame();
  const [confirm, setConfirm] = useState(false);
  const owned = state.investments.length;
  const ready = owned >= ASCEND_REQ;
  const bonus = (a) => `+${Math.round(a * ASCEND_BONUS * 100)}%`;

  return (
    <div className="space-y-3 sm:space-y-4">
      <PanelHeader
        icon={Rocket}
        title="ASCEND"
        subtitle={`Ascension ${state.ascensions} · all rewards ${bonus(state.ascensions)}`}
        note="Ascending resets EVERYTHING, even investments, for a permanent reward boost."
      />

      <div className="panel-inset p-3 sm:p-4">
        <div className="flex justify-between text-xs sm:text-sm mb-1.5 font-display">
          <span>Investments owned</span>
          <span className={ready ? 'text-arcade-green' : 'text-white/80'}>
            {Math.min(owned, ASCEND_REQ)} / {ASCEND_REQ}
          </span>
        </div>
        <div className="h-3.5 sm:h-4 rounded-full bg-[#15112a] border border-[#352e57] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-arcade-pink to-arcade-purple"
            animate={{ width: `${(Math.min(owned, ASCEND_REQ) / ASCEND_REQ) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
        <div className="panel-inset p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs tracking-[0.16em] text-white/55 font-display">CURRENT BONUS</div>
          <div className="text-xl sm:text-2xl md:text-3xl mt-1 text-arcade-gold font-display">{bonus(state.ascensions)}</div>
        </div>
        <div className="panel-inset p-3 sm:p-4">
          <div className="text-[10px] sm:text-xs tracking-[0.16em] text-white/55 font-display">AFTER ASCENDING</div>
          <div className="text-xl sm:text-2xl md:text-3xl mt-1 text-arcade-cyan font-display">{bonus(state.ascensions + 1)}</div>
        </div>
      </div>

      <Button3D
        variant="purple"
        size="md"
        className="w-full text-sm sm:text-base md:text-lg py-2.5 sm:py-3"
        disabled={!ready}
        onClick={() => {
          sfx.click();
          setConfirm(true);
        }}
      >
        <Rocket className="w-5 h-5 shrink-0" />
        <span className="truncate">
          {ready ? 'ASCEND NOW' : `NEED ${ASCEND_REQ - owned} MORE INVESTMENTS`}
        </span>
      </Button3D>

      <AnimatePresence>
        {confirm && (
          <Modal title="ASCEND?" onClose={() => setConfirm(false)}>
            <p className="text-base sm:text-lg">
              You will lose all coins, Shop Points, upgrades and investments, and gain a permanent{' '}
              <span className="text-arcade-gold font-bold">{bonus(state.ascensions + 1)}</span> reward multiplier.
            </p>
            <div className="flex gap-2.5 sm:gap-3 mt-4">
              <Button3D variant="gray" size="sm" className="flex-1 text-sm py-2" onClick={() => setConfirm(false)}>
                CANCEL
              </Button3D>
              <Button3D
                variant="purple"
                size="sm"
                className="flex-1 text-sm py-2"
                onClick={() => {
                  actions.ascend();
                  sfx.ascend();
                  notify('You ascended! 🚀', 'gold');
                  setConfirm(false);
                }}
              >
                ASCEND
              </Button3D>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
