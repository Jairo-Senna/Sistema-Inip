import React, { useState, useEffect } from 'react';
import { getEffectiveLogoUrl, DEFAULT_INIP_LOGO } from '../../utils/logo';

interface InipLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  customLogoUrl?: string;
  className?: string;
}

export const InipLogo: React.FC<InipLogoProps> = ({
  size = 'md',
  showText = true,
  customLogoUrl,
  className = '',
}) => {
  const [logoSrc, setLogoSrc] = useState<string>(() => getEffectiveLogoUrl(customLogoUrl));
  const [useSvgFallback, setUseSvgFallback] = useState(false);

  useEffect(() => {
    setLogoSrc(getEffectiveLogoUrl(customLogoUrl));
    setUseSvgFallback(false);
  }, [customLogoUrl]);

  const handleImageError = () => {
    if (logoSrc !== DEFAULT_INIP_LOGO) {
      // Fallback to bundled asset
      setLogoSrc(DEFAULT_INIP_LOGO);
    } else {
      // If bundled asset also fails, fall back to SVG emblem
      setUseSvgFallback(true);
    }
  };

  const sizeMap = {
    xs: { icon: 'w-6 h-6', text: 'text-xs', sub: 'text-[8px]' },
    sm: { icon: 'w-9 h-9', text: 'text-sm', sub: 'text-[9px]' },
    md: { icon: 'w-11 h-11', text: 'text-base', sub: 'text-[10px]' },
    lg: { icon: 'w-16 h-16', text: 'text-xl', sub: 'text-xs' },
    xl: { icon: 'w-24 h-24', text: 'text-2xl', sub: 'text-sm' },
  };

  const dim = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 ${className}`} id="inip-brand-logo">
      {!useSvgFallback ? (
        <div className={`relative ${dim.icon} flex-shrink-0 flex items-center justify-center`}>
          <img
            src={logoSrc}
            alt="INIP – Instituto de Investigação e Perícia"
            className="w-full h-full object-contain filter drop-shadow-md"
            referrerPolicy="no-referrer"
            onError={handleImageError}
          />
        </div>
      ) : (
        <div className={`relative ${dim.icon} flex-shrink-0 flex items-center justify-center rounded-lg bg-gradient-to-br from-amber-600 via-yellow-700 to-amber-900 p-1.5 ring-1 ring-amber-500/40 shadow-md`}>
          {/* Fallback Forensic Shield & Iris Emblem */}
          <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full text-amber-200"
          >
            {/* Outer Hex/Shield */}
            <path
              d="M24 4L40 10V22C40 33 33 41 24 44C15 41 8 33 8 22V10L24 4Z"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-90"
            />
            {/* Inner Forensic Lens Rings */}
            <circle
              cx="24"
              cy="23"
              r="9"
              stroke="#fef08a"
              strokeWidth="2"
              strokeDasharray="4 2"
              className="opacity-80"
            />
            <circle
              cx="24"
              cy="23"
              r="4.5"
              fill="#ca8a04"
              className="opacity-60"
            />
            {/* Crosshair / Scales Target */}
            <line x1="24" y1="11" x2="24" y2="35" stroke="#fef9c3" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12" y1="23" x2="36" y2="23" stroke="#fef9c3" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="24" cy="23" r="1.5" fill="#ffffff" />
          </svg>
        </div>
      )}

      {showText && (
        <div className="flex flex-col select-none">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-wider uppercase text-slate-900 dark:text-white ${dim.text} leading-none`}>
              INIP
            </span>
            <span className="h-2.5 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest leading-none">
              INVESTIGAÇÃO E PERÍCIA
            </span>
          </div>
          <span className={`font-medium tracking-tight text-slate-500 dark:text-slate-400 ${dim.sub} mt-0.5 leading-tight`}>
            Inteligência em Investigação e Perícia
          </span>
        </div>
      )}
    </div>
  );
};
