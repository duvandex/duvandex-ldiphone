import React from 'react';
import { cn } from '../lib/utils';
import { useData } from '../context/AppDataContext';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Logo({ className, size = 'md' }: LogoProps) {
  const { data } = useData();
  const { companyLogo, companyName } = data.settings;

  const sizes = {
    sm: 'h-6',
    md: 'h-10',
    lg: 'h-16',
    xl: 'h-24'
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className={cn("relative flex items-center justify-center overflow-hidden rounded-xl", sizes[size])}>
        {companyLogo ? (
          <img 
            src={companyLogo} 
            alt={`${companyName} Logo`} 
            className="h-full w-auto object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center leading-none font-black text-slate-900 uppercase tracking-tighter">
            <div className="bg-slate-900 text-white rounded-lg p-1.5 flex flex-col items-center min-w-[40px]">
              <span className={cn(size === 'sm' ? 'text-[8px]' : 'text-[10px]', "leading-none mb-0.5")}>
                {getInitials(companyName)}
              </span>
              <span className={cn(size === 'sm' ? 'text-[6px]' : 'text-[7px]', "text-rose-500 font-bold leading-none")}>
                Store
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
