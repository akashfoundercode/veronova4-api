const VARIANTS = {
  pink: { top: '#FF9CC6', face: '#FF6FA9', edge: '#B83A72', text: '#fff' },
  green: { top: '#6EE7B0', face: '#35D399', edge: '#178A5E', text: '#fff' },
  gold: { top: '#FFE27A', face: '#FFC94A', edge: '#B8801A', text: '#4B2E00' },
  purple: { top: '#B79CFF', face: '#8B5CF6', edge: '#5230B8', text: '#fff' },
  cyan: { top: '#8BEBFF', face: '#48D8FF', edge: '#1A8FB0', text: '#06344A' },
  gray: { top: '#5A5380', face: '#463F68', edge: '#2A2445', text: '#fff' },
};

const SIZES = {
  sm: 'px-4 py-2 text-base rounded-2xl',
  md: 'px-6 py-3 text-xl',
  lg: 'px-8 py-4 text-2xl',
};

export default function Button3D({ variant = 'pink', size = 'md', className = '', style, children, ...props }) {
  const v = VARIANTS[variant] || VARIANTS.pink;
  return (
    <button
      type="button"
      className={`btn3d ${SIZES[size]} ${className}`}
      style={{ '--top': v.top, '--face': v.face, '--edge': v.edge, color: v.text, ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
