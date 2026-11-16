import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { fmt } from '../utils/format';
import { initAudio, sfx } from '../utils/sound';
import Button3D from './ui/Button3D';
import Modal from './ui/Modal';

function Toggle({ label, value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="w-full flex items-center justify-between py-2.5 sm:py-3 text-sm sm:text-base md:text-lg"
      aria-pressed={value}
    >
      <span className="font-display">{label}</span>
      <span
        className={`relative w-11 sm:w-13 h-6 sm:h-7 rounded-full border-2 transition-colors ${
          value ? 'bg-arcade-green border-[#178a5e]' : 'bg-[#15112a] border-[#352e57]'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4.5 sm:w-5 h-4.5 sm:h-5 rounded-full bg-white shadow transition-all ${
            value ? 'left-[22px] sm:left-[24px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

export default function SettingsModal({ onClose }) {
  const { state, actions, notify } = useGame();
  const { settings, stats } = state;
  const [confirmReset, setConfirmReset] = useState(false);

  const stat = (label, value) => (
    <div className="panel-inset px-2.5 sm:px-3.5 py-2 sm:py-2.5 min-w-0">
      <div className="text-[10px] sm:text-xs tracking-[0.14em] text-white/55 font-display truncate">{label}</div>
      <div className="text-base sm:text-xl md:text-2xl mt-0.5 font-display truncate">{value}</div>
    </div>
  );

  return (
    <Modal title="SETTINGS" onClose={onClose}>
      <div className="divide-y divide-white/10">
        <Toggle
          label="Sound effects"
          value={settings.sound}
          onChange={(v) => {
            initAudio();
            actions.setSetting('sound', v);
          }}
        />
        <Toggle label="Particle effects" value={settings.particles} onChange={(v) => actions.setSetting('particles', v)} />
        <Toggle label="Glowing ball trail" value={settings.trail} onChange={(v) => actions.setSetting('trail', v)} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 mt-3 sm:mt-4">
        {stat('BALLS DROPPED', fmt(stats.drops))}
        {stat('TOTAL EARNED', fmt(stats.totalEarned))}
        {stat('BEST WIN', fmt(stats.bestWin))}
        {stat('CASH OUTS', fmt(stats.cashouts))}
      </div>

      <div className="mt-4 sm:mt-5">
        {confirmReset ? (
          <div className="panel-inset p-3 sm:p-4">
            <p className="text-sm sm:text-base mb-2.5 text-center">Erase ALL progress, including investments and ascensions?</p>
            <div className="flex gap-2 sm:gap-3">
              <Button3D variant="gray" size="sm" className="flex-1 text-xs sm:text-sm py-2" onClick={() => setConfirmReset(false)}>
                CANCEL
              </Button3D>
              <Button3D
                variant="pink"
                size="sm"
                className="flex-1 text-xs sm:text-sm py-2"
                onClick={() => {
                  actions.resetAll();
                  sfx.error();
                  notify('Progress reset', 'bad');
                  onClose();
                }}
              >
                ERASE
              </Button3D>
            </div>
          </div>
        ) : (
          <Button3D variant="gray" size="sm" className="w-full text-xs sm:text-sm py-2 sm:py-2.5" onClick={() => setConfirmReset(true)}>
            <RotateCcw size={16} /> RESET PROGRESS
          </Button3D>
        )}
      </div>
    </Modal>
  );
}
