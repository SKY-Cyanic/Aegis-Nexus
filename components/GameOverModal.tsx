import React from 'react';

interface GameOverModalProps {
  onRestart: () => void;
  onOpenLaboratory: () => void;
  dataCoresEarned: number;
}

const GameOverModal: React.FC<GameOverModalProps> = ({ onRestart, onOpenLaboratory, dataCoresEarned }) => {
  return (
    <div className="pointer-events-auto absolute inset-0 bg-black/80 flex justify-center items-center backdrop-blur-sm z-50">
      <div className="bg-slate-900/80 border-2 border-red-500 rounded-lg p-10 text-center flex flex-col items-center gap-6 shadow-2xl shadow-red-500/20">
        <h1 className="text-6xl font-bold text-red-500 glitch-effect" style={{ textShadow: '0 0 10px #ef4444' }}>
          코어 파괴됨
        </h1>
        <p className="text-slate-300 text-xl">이지스가 함락되었습니다. 섹터는 소실되었습니다.</p>
        <div className="mt-2 p-3 bg-slate-800 rounded-lg border border-slate-600">
            <span className="text-slate-300">획득한 데이터 코어: </span>
            <span className="font-bold text-2xl text-amber-400">{dataCoresEarned}</span>
        </div>
        <div className="flex items-center space-x-4 mt-6">
            <button
              onClick={onOpenLaboratory}
              className="px-10 py-4 bg-slate-700 text-cyan-300 font-bold rounded-lg text-2xl 
                         hover:bg-slate-600 hover:shadow-lg hover:shadow-cyan-400/30 
                         transition-all duration-300 transform hover:scale-105"
            >
              연구소
            </button>
            <button
              onClick={onRestart}
              className="px-10 py-4 bg-cyan-500 text-slate-900 font-bold rounded-lg text-2xl 
                         hover:bg-cyan-400 hover:shadow-lg hover:shadow-cyan-400/50 
                         transition-all duration-300 transform hover:scale-105"
            >
              시퀀스 재시작
            </button>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;