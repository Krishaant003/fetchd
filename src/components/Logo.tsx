interface LogoProps {
  variant?: 'stacked' | 'row';
}

export function Logo({ variant = 'row' }: LogoProps) {
  const isStacked = variant === 'stacked';
  const Word = isStacked ? 'h1' : 'div';

  return (
    <div className={`flex items-center ${isStacked ? 'flex-col gap-2' : 'flex-row gap-3'}`}>
      <svg viewBox="0 0 78 78" fill="#c67139" stroke="none" className={isStacked ? 'h-19.5 w-19.5' : 'h-10 w-10'}>
        <ellipse cx="39" cy="52" rx="21" ry="17.5" />
        <ellipse cx="14.5" cy="30" rx="9.5" ry="12" transform="rotate(-20 14.5 30)" />
        <ellipse cx="31" cy="17" rx="9" ry="11.5" transform="rotate(-6 31 17)" />
        <ellipse cx="49" cy="17" rx="9" ry="11.5" transform="rotate(6 49 17)" />
        <ellipse cx="65" cy="30" rx="9.5" ry="12" transform="rotate(20 65 30)" />
      </svg>
      <Word className={`font-heading ${isStacked ? 'text-[52px]' : 'text-[22px]'}`}>Fetch'd</Word>
    </div>
  );
}
