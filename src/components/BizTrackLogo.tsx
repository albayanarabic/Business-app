import React from 'react';

interface BizTrackLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BizTrackLogo: React.FC<BizTrackLogoProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={`${sizeMap[size]} rounded-xl bg-gradient-to-br from-navy-900 to-navy-950 border border-emerald-500/30 flex items-center justify-center p-1.5 shadow-md shadow-navy-950/40 shrink-0 ${className}`}
      title="BizTrack Nigeria"
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Ascending Growth Pillars */}
        {/* Bar 1: White (Records) */}
        <rect x="22" y="55" width="14" height="27" rx="7" fill="#FFFFFF" />
        {/* Bar 2: Emerald Green (Sales) */}
        <rect x="43" y="38" width="14" height="44" rx="7" fill="#10B981" />
        {/* Bar 3: Bright Emerald (Profit/Growth) */}
        <rect x="64" y="21" width="14" height="61" rx="7" fill="#34D399" />

        {/* Dynamic Upward Growth Arrow */}
        <path
          d="M 21 52 L 78 18"
          stroke="#FFFFFF"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          d="M 64 18 L 78 18 L 78 32"
          stroke="#FFFFFF"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Accent Pip */}
        <circle cx="73" cy="23" r="2.5" fill="#10B981" />
      </svg>
    </div>
  );
};
