import React from 'react';
import logoImage from '../assets/images/matale_fresh_logo_1792347959774.jpg';

export { logoImage };

interface LogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
  subtextColor?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textColor = 'text-gray-950',
  subtextColor = 'text-gray-500',
}) => {
  const sizeMap = {
    xs: { img: 'w-7 h-7', text: 'text-sm', sub: 'text-[9px]' },
    sm: { img: 'w-9 h-9', text: 'text-base', sub: 'text-[10px]' },
    md: { img: 'w-11 h-11', text: 'text-lg sm:text-xl', sub: 'text-[11px]' },
    lg: { img: 'w-14 h-14', text: 'text-2xl', sub: 'text-xs' },
    xl: { img: 'w-20 h-20', text: 'text-3xl', sub: 'text-sm' },
  };

  const { img, text, sub } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`relative ${img} rounded-2xl overflow-hidden bg-white shadow-xs border border-emerald-100 flex items-center justify-center shrink-0`}>
        <img
          src={logoImage}
          alt="Matale Fresh Logo"
          className="w-full h-full object-cover"
          loading="eager"
        />
      </div>

      {showText && (
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <span className={`font-black tracking-tight ${text} ${textColor}`}>
              Matale Fresh
            </span>
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              SL
            </span>
          </div>
          <p className={`font-semibold ${sub} ${subtextColor}`}>
            මාතලේ එළවළු & සුපර්මාකට්
          </p>
        </div>
      )}
    </div>
  );
};
