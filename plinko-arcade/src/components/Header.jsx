import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Settings as SettingsIcon, Volume2, VolumeX, Wallet } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { initAudio, sfx } from '../utils/sound';
import AnimatedNumber from './ui/AnimatedNumber';
import { CoinIcon } from './ui/CoinIcon';
import SettingsModal from './SettingsModal';
import WalletModal from './WalletModal';

function CurrencyPill({ label, value, variant, onClick }) {
  const sp = variant === 'sp';
  return (
    <div
      onClick={onClick}
      className={`currency-pill flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border-2 transition ${
        sp ? 'border-[#4a3a8a] bg-[#1a1338]' : 'border-[#5a4826] bg-[#1d1633] cursor-pointer hover:border-amber-400/80 hover:bg-[#261c42]'
      } shadow-[0_2px_0_#0f0b20,inset_0_1px_0_rgba(255,255,255,0.08)]`}
    >
      <span
        className={`grid place-items-center w-7 h-7 shrink-0 rounded-full ${
          sp ? 'bg-gradient-to-b from-[#a855f7] to-[#7c3aed] ring-1 ring-purple-400' : 'bg-gradient-to-b from-[#fcd34d] to-[#f59e0b] ring-1 ring-amber-300'
        }`}
      >
        <CoinIcon size={18} variant={variant} spin={false} className="w-4 h-4" />
      </span>
      <div className="leading-tight min-w-0">
        <div className="text-[9px] uppercase font-display text-white/60 tracking-wider whitespace-nowrap flex items-center gap-1">
          <span>{label}</span>
          {!sp && <span className="text-emerald-400 font-bold leading-none">+</span>}
        </div>
        <motion.div
          key={Math.floor(value)}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="text-base font-display text-white leading-none"
        >
          <AnimatedNumber value={value} />
        </motion.div>
      </div>
    </div>
  );
}

export default function Header() {
  const { state, actions } = useGame();
  const [showSettings, setShowSettings] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const soundOn = state.settings.sound;

  return (
    <header className="h-[52px] shrink-0 rounded-2xl bg-[#191333] border-2 border-[#2f2557] px-3 sm:px-4 py-1.5 flex items-center justify-between shadow-[0_3px_0_#100c24]">
      {/* Left: PLINKO! Logo */}
      <motion.h1
        className="logo text-2xl sm:text-3xl leading-none -rotate-[1deg] select-none cursor-default font-display"
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        PLINKO!
      </motion.h1>

      {/* Right: Currency Pills + Wallet Button + Sound + Settings */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        <CurrencyPill
          label="COINS"
          value={state.coins}
          variant="coin"
          onClick={() => {
            sfx.click();
            setShowWallet(true);
          }}
        />

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => {
            sfx.click();
            setShowWallet(true);
          }}
          className="flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-full bg-gradient-to-b from-[#10b981] to-[#059669] border border-[#34d399] font-display text-xs text-white shadow-[0_2px_0_#065f46] hover:brightness-110 active:translate-y-[1px] transition cursor-pointer"
        >
          <Wallet size={14} className="text-[#06382a]" />
          <span className="font-bold hidden sm:inline">WALLET</span>
          <span className="font-bold sm:hidden">+</span>
        </motion.button>

        <CurrencyPill label="SHOP PTS (SP)" value={state.sp} variant="sp" />

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.06 }}
          aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
          onClick={() => {
            initAudio();
            actions.setSetting('sound', !soundOn);
            if (!soundOn) setTimeout(sfx.click, 30);
          }}
          className="grid place-items-center w-8 h-8 rounded-full bg-[#241c46] border-2 border-[#3a2d6c] shadow-[0_2px_0_#100c24] text-arcade-purple shrink-0 hover:bg-[#2e2358] transition"
        >
          {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} className="text-white/40" />}
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.06, rotate: 45 }}
          aria-label="Settings"
          onClick={() => {
            initAudio();
            sfx.click();
            setShowSettings(true);
          }}
          className="grid place-items-center w-8 h-8 rounded-full bg-[#241c46] border-2 border-[#3a2d6c] shadow-[0_2px_0_#100c24] text-arcade-purple shrink-0 hover:bg-[#2e2358] transition"
        >
          <SettingsIcon size={16} />
        </motion.button>
      </div>

      <AnimatePresence>{showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}</AnimatePresence>
      <WalletModal open={showWallet} onClose={() => setShowWallet(false)} />
    </header>
  );
}