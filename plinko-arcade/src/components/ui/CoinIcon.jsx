import { motion } from 'framer-motion';

const STAR = '16,6.5 18.6,12.8 25.4,13.2 20.2,17.6 21.9,24.3 16,20.6 10.1,24.3 11.8,17.6 6.6,13.2 13.4,12.8';

// Gold coin with a star (Coins) or violet coin (Shop Points).
export function CoinIcon({ size = 28, spin = false, variant = 'coin' }) {
  const sp = variant === 'sp';
  const id = `g-${variant}`;
  return (
    <motion.span
      className="inline-flex shrink-0"
      style={{ width: size, height: size, perspective: 200 }}
      animate={spin ? { rotateY: [0, 360] } : undefined}
      transition={spin ? { duration: 5, repeat: Infinity, ease: 'linear' } : undefined}
    >
      <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
        <defs>
          <radialGradient id={id} cx="35%" cy="30%" r="80%">
            {sp ? (
              <>
                <stop offset="0%" stopColor="#C9B4FF" />
                <stop offset="55%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#5B34C0" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#FFF2B0" />
                <stop offset="55%" stopColor="#FFC94A" />
                <stop offset="100%" stopColor="#D98A00" />
              </>
            )}
          </radialGradient>
        </defs>
        <circle cx="16" cy="16" r="14.5" fill={`url(#${id})`} stroke={sp ? '#3B1F8F' : '#8A5200'} strokeWidth="2" />
        <circle cx="16" cy="16" r="10.5" fill="none" stroke={sp ? '#B69CFF' : '#FFE79A'} strokeWidth="1" opacity="0.7" />
        <polygon points={STAR} fill={sp ? '#fff' : '#7A4E00'} stroke={sp ? '#3B1F8F' : '#4B2E00'} strokeWidth="1" strokeLinejoin="round" />
      </svg>
    </motion.span>
  );
}

export default CoinIcon;
