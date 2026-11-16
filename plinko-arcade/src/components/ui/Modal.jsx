import { motion } from 'framer-motion';
import { X } from 'lucide-react';

// Render inside <AnimatePresence> so the exit animation plays.
export default function Modal({ title, onClose, children, width = 'max-w-md' }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        className={`panel w-full ${width} max-h-[90vh] overflow-y-auto thin-scroll p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-[26px] border-2 sm:border-[3px]`}
        initial={{ scale: 0.9, y: 15, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 15, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
          <h2 className="font-display text-lg sm:text-xl md:text-2xl text-arcade-gold tracking-wide truncate">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid place-items-center w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full bg-[#463F68] border-2 border-[#2A2445] hover:bg-[#5A5380] transition"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
