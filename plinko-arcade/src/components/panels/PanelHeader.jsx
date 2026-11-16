import { motion } from 'framer-motion';

// Framed banner at the top of every right-hand tab.
export default function PanelHeader({ icon: Icon, title, subtitle, note }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl sm:rounded-2xl border-2 sm:border-[3px] border-[#c9a23c] bg-gradient-to-b from-[#3a3228] to-[#2b2630] p-3 sm:p-4 shadow-[0_4px_0_#15112a,0_0_18px_rgba(255,201,74,0.18),inset_0_2px_0_rgba(255,255,255,0.08)]"
    >
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        <div className="grid place-items-center w-11 h-11 sm:w-13 sm:h-13 shrink-0 rounded-xl sm:rounded-2xl bg-gradient-to-b from-[#FFE27A] to-[#F2A81D] border-2 sm:border-[3px] border-[#B8801A] shadow-[0_3px_0_#7A5210] text-[#5B3A00]">
          <Icon className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg sm:text-2xl md:text-3xl tracking-wide leading-tight text-white [text-shadow:0_2px_0_#000] truncate">
            {title}
          </h2>
          <p className="text-xs sm:text-sm md:text-base mt-0.5 text-white/90 leading-snug">
            {subtitle}
          </p>
        </div>
      </div>
      {note && (
        <>
          <hr className="dashed-rule my-2 sm:my-2.5" />
          <p className="text-center italic text-xs sm:text-sm text-white/85 leading-snug">{note}</p>
        </>
      )}
    </motion.div>
  );
}
