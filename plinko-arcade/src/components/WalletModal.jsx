import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Coins, Gift, Plus, Sparkles, Wallet, X } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { fmt } from '../utils/format';
import { sfx } from '../utils/sound';

const TOP_UP_PACKAGES = [
  { coins: 1000, label: 'Starter Pack', badge: 'Fast', color: 'from-amber-400 to-amber-600' },
  { coins: 5000, label: 'Pro Pack', badge: 'Popular ⭐', color: 'from-cyan-400 to-blue-600' },
  { coins: 25000, label: 'High Roller', badge: 'Best Value 👑', color: 'from-purple-500 to-indigo-600' },
  { coins: 100000, label: 'Whale Vault', badge: 'Max Coins 🚀', color: 'from-rose-500 to-pink-600' },
];

export default function WalletModal({ open, onClose }) {
  const { state, actions, notify } = useGame();
  const [customAmount, setCustomAmount] = useState('2500');
  const [claimedBonus, setClaimedBonus] = useState(false);

  if (!open) return null;

  const handleDeposit = (amount) => {
    if (amount <= 0) return;
    sfx.cashout();
    actions.addCoins(amount);
    notify(`Deposited +${fmt(amount)} Coins to Wallet! 🎉`, 'good');
  };

  const handleClaimFreeBonus = () => {
    sfx.bonus();
    actions.addCoins(500);
    setClaimedBonus(true);
    notify('Claimed +500 FREE Coins Daily Bonus! 🎁', 'good');
    setTimeout(() => setClaimedBonus(false), 5000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 15 }}
          transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          className="relative w-full max-w-md rounded-3xl bg-[#191333] border-2 border-[#3d2f70] p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.8)] text-white overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#241a45] hover:bg-[#322460] border border-[#3b2b68] flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-black shadow-md">
              <Wallet size={22} className="text-[#06382a]" />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl text-white leading-tight">PLINKO WALLET</h2>
              <p className="text-xs font-display text-white/60">Manage balance, deposits & free bonuses</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto thin-scroll space-y-3.5 pr-0.5">
            {/* Balance Card */}
            <div className="rounded-2xl bg-gradient-to-br from-[#271a4f] to-[#1a1236] border-2 border-[#473485] p-3.5 shadow-inner text-center relative overflow-hidden">
              <span className="text-[10px] font-display uppercase tracking-wider text-white/50 block">
                Total Available Balance
              </span>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-2xl sm:text-3xl font-display text-arcade-gold font-bold">
                  🪙 {fmt(state.coins)}
                </span>
                <span className="text-xs font-display text-white/60">COINS</span>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2 text-[11px] font-display text-white/60">
                <span>Shop Pts: <strong className="text-purple-300 font-bold">{state.sp} SP</strong></span>
                <span>•</span>
                <span>Drops: <strong className="text-white font-bold">{state.stats.drops}</strong></span>
              </div>
            </div>

            {/* Instant Free Bonus Faucet */}
            <div className="rounded-2xl bg-[#140f29] border border-amber-500/40 p-3 flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow">
                  <Gift size={20} className="text-[#451a03]" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-display text-xs sm:text-sm text-white font-bold leading-tight">
                    Instant Free Bonus
                  </h4>
                  <p className="text-[10px] font-display text-white/60 leading-none mt-0.5">
                    Never run out of coins to play
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClaimFreeBonus}
                className="px-3 py-2 rounded-xl bg-gradient-to-b from-[#ffd359] to-[#f59e0b] hover:brightness-110 active:translate-y-[1px] font-display text-xs text-[#3d1900] font-bold shadow-[0_2px_0_#92660a] shrink-0 cursor-pointer flex items-center gap-1"
              >
                {claimedBonus ? (
                  <>
                    <Check size={14} />
                    <span>CLAIMED!</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>+500 FREE</span>
                  </>
                )}
              </button>
            </div>

            {/* Top-up Packages */}
            <div>
              <span className="text-xs font-display text-white/80 uppercase tracking-wider block mb-2">
                Quick Top-Up Packages
              </span>

              <div className="grid grid-cols-2 gap-2">
                {TOP_UP_PACKAGES.map((pkg) => (
                  <button
                    key={pkg.coins}
                    type="button"
                    onClick={() => handleDeposit(pkg.coins)}
                    className="rounded-2xl bg-[#20183e] hover:bg-[#281f4a] border-2 border-[#36285c] hover:border-[#4d3a82] p-2.5 text-left transition active:translate-y-[1px] shadow-[0_2px_0_#120d26] flex flex-col justify-between cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-1 w-full mb-1">
                      <span className="text-[9px] font-display px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
                        {pkg.badge}
                      </span>
                      <Plus size={14} className="text-emerald-400 group-hover:scale-110 transition" />
                    </div>

                    <div className="my-1">
                      <span className="text-base sm:text-lg font-display text-arcade-gold font-bold block leading-none">
                        +{fmt(pkg.coins)}
                      </span>
                      <span className="text-[10px] font-display text-white/50 block mt-0.5">
                        {pkg.label}
                      </span>
                    </div>

                    <div className="w-full py-1 text-center rounded-lg bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 font-display text-[11px] font-bold mt-1">
                      Add to Wallet
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Amount Deposit */}
            <div className="rounded-2xl bg-[#140f29] border border-[#2f2454] p-3">
              <span className="text-[11px] font-display text-white/70 uppercase tracking-wider block mb-1.5">
                Custom Deposit Amount
              </span>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1c1438] border border-[#3f3070]">
                  <span className="text-arcade-gold font-bold">🪙</span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full bg-transparent font-display text-sm text-white focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const amt = parseInt(customAmount, 10);
                    if (!isNaN(amt) && amt > 0) handleDeposit(amt);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#10b981] to-[#059669] hover:brightness-110 active:translate-y-[1px] font-display text-xs sm:text-sm text-white font-bold shadow-[0_2px_0_#065f46] shrink-0 cursor-pointer"
                >
                  DEPOSIT
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}