import Button3D from '../ui/Button3D';

export { Button3D };

export default function Button({
  children,
  title,
  onClick,
  disabled = false,
  variant = 'pink',
  size = 'md',
  className = '',
  type = 'button',
}) {
  return (
    <Button3D
      type={type}
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children || title}
    </Button3D>
  );
}
