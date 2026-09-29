import React from 'react';

export function BrandMark({ size = 32 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      aria-hidden="true"
      focusable="false"
      className="brand-mark"
    >
      <rect
        x="8"
        y="8"
        width="496"
        height="496"
        rx="112"
        fill="currentColor"
        fillOpacity="0.06"
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="8"
      />
      <g fill="none" stroke="currentColor" strokeWidth="52" strokeLinecap="butt">
        <circle cx="256" cy="262" r="102" />
        <line x1="328" y1="190" x2="184" y2="334" />
      </g>
    </svg>
  );
}
