import type { CSSProperties } from 'react';

export const CLOUTCO_MARK_OUTER_PATH =
  'M66 4c15 0 26 12 25 27-1 11-10 18-22 22 15 3 25 14 25 28 0 16-13 28-29 28-12 0-22-7-27-17-5 12-18 19-30 15-14-4-20-21-11-33 6-9 16-14 29-18-12-6-17-19-10-30 8-14 25-17 37-7 2-9 7-15 13-15Z';

export const CLOUTCO_MARK_OPENING_PATH =
  'M56 56c6 0 10 5 9 11-1 6-6 10-12 9-5-1-8-6-8-11 0-5 5-9 11-9Z';

type CloutCoMarkProps = {
  className?: string;
  style?: CSSProperties;
  title?: string;
};

export function CloutCoMark({ className, style, title }: CloutCoMarkProps) {
  return (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id="cloutco-mark-gradient" x1="20" y1="17" x2="108" y2="111" gradientUnits="userSpaceOnUse">
          <stop stopColor="#A78BFA" />
          <stop offset=".34" stopColor="#7C3AED" />
          <stop offset=".7" stopColor="#5B32E7" />
          <stop offset="1" stopColor="#6366F1" />
        </linearGradient>
      </defs>
      <path
        d={`${CLOUTCO_MARK_OUTER_PATH}${CLOUTCO_MARK_OPENING_PATH}`}
        fill="url(#cloutco-mark-gradient)"
        fillRule="evenodd"
      />
    </svg>
  );
}
