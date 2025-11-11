import React from 'react';
import { PowerPayload, ShieldPayload, XpPayload } from '../types';

interface HUDProps {
  scrap: number;
  aetherium: number;
  coreHealth: number;
  power: PowerPayload;
  shield: ShieldPayload;
  level: number;
  xp: XpPayload;
}

const HUD: React.FC<HUDProps> = ({ scrap, coreHealth, power, shield, level, xp, aetherium }) => {
  const healthPercentage = Math.max(0, coreHealth);
  const healthColor = healthPercentage > 60 ? 'bg-green-500' : healthPercentage > 30 ? 'bg-yellow-500' : 'bg-red-500';
  const shieldPercentage = shield.max > 0 ? Math.max(0, (shield.current / shield.max) * 100) : 0;
  const xpPercentage = xp.required > 0 ? Math.max(0, (xp.current / xp.required) * 100) : 0;

  return (
    <div className="z-10">
      {/* Player Level & XP - Top Center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center space-x-3 p-2 bg-slate-900/70 border border-slate-700 rounded-md w-96">
        <div className="bg-slate-800 border-2 border-cyan-400 rounded-full h-10 w-10 flex items-center justify-center font-bold text-cyan-300 text-lg">
          {level}
        </div>
        <div className="flex-grow">
            <div className="text-xs text-slate-300 mb-1">에이전트 진화</div>
            <div className="w-full bg-slate-700 rounded-full h-3">
                <div className="bg-cyan-400 h-3 rounded-full transition-all duration-300" style={{ width: `${xpPercentage}%` }}></div>
            </div>
        </div>
      </div>

      {/* Core Health - Top Left */}
      <div className="absolute top-4 left-4 p-3 bg-slate-900/70 border border-slate-700 rounded-md w-72">
        <div className="flex items-center space-x-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div className="flex-grow">
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>코어 무결성</span>
              <span>{Math.round(healthPercentage)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 relative">
              {shieldPercentage > 0 && (
                <div className="absolute top-0 left-0 h-full bg-cyan-500/50 rounded-full" style={{ width: `${shieldPercentage}%` }}></div>
              )}
              <div className={`${healthColor} h-3 rounded-full transition-all duration-300`} style={{ width: `${healthPercentage}%` }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Resources - Top Right */}
      <div className="absolute top-4 right-4 p-3 bg-slate-900/70 border border-slate-700 rounded-md flex items-center space-x-6">
         <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="text-xl font-bold">{scrap}</div>
         </div>
         <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 2 4.9 4.9-2.8 2.8-2.1-2.1-2.8 2.8L12 2z"/>
                <path d="m2 12 4.9-4.9 2.8 2.8-2.1 2.1-2.8-2.8L2 12z"/>
                <path d="m12 22-4.9-4.9 2.8-2.8 2.1 2.1 2.8-2.8L12 22z"/>
                <path d="m22 12-4.9 4.9-2.8-2.8 2.1-2.1 2.8 2.8L22 12z"/>
            </svg>
            <div className="text-xl font-bold">{aetherium}</div>
         </div>
         <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <div className="text-xl font-bold">{power.usage} / {power.max}</div>
         </div>
      </div>
    </div>
  );
};

export default HUD;
