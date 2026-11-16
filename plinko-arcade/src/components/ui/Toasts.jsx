import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../../context/GameContext';

const KIND = {
  info: 'border-arcade-cyan text-arcade-cyan',
  good: 'border-arcade-green text-arcade-green',
  bad: 'border-arcade-pink text-arcade-pink',
  gold: 'border-arcade-gold text-arcade-gold',
};

export default function Toasts() {
  const { toasts } = useGame();
  return (
    <div className="fixed top-4 inset-x-0 z-[60] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ y: -30, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full bg-[#1a1530] border-2 text-sm sm:text-base md:text-lg shadow-lg max-w-[92vw] text-center font-display truncate ${KIND[t.kind] || KIND.info}`}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
