type CloutCoLogoProps = {
  className?: string;
  variant?: 'horizontal' | 'mark';
  theme?: 'light' | 'dark';
};

export function CloutCoLogo({
  className = '',
  variant = 'horizontal',
  theme = 'light',
}: CloutCoLogoProps) {
  const src = variant === 'mark'
    ? '/brand/cloutco-mark.svg'
    : theme === 'dark'
      ? '/brand/cloutco-logo-dark.svg'
      : '/brand/cloutco-logo.svg';

  const alt = variant === 'mark' ? 'CloutCo' : 'CloutCo — Create Collaborate Grow';

  return <img src={src} alt={alt} className={`block w-auto ${className || 'h-9'}`} />;
}
