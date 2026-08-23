import { CheckCircle, Lock, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/appStore';

// The Akshar Path: every letter in the curriculum as a stepping stone, locked
// until the one before it is done — unless the parent has switched that off.
export default function LessonMap() {
  const {
    sessionCurriculum,
    progressLog,
    parentUnlockAll,
    dispatch,
    setView,
    playSound
  } = useAppStore();

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <span>🗺️ Akshar Path</span>
        </h2>
        <div className="text-xs bg-indigo-100 text-indigo-700 font-extrabold px-3 py-1.5 rounded-full font-sans">
          {progressLog.completedLessons.length} / {sessionCurriculum.length} Cleared
        </div>
      </div>
      
      {/* Scrollable Map Container */}
      <div className="flex-1 overflow-y-auto pr-1 pb-10 relative bg-slate-50/50 rounded-3xl border border-slate-100 p-4 shadow-inner max-w-md mx-auto w-full min-h-[400px]">
        {/* Adventure Path Line */}
        <div className="absolute left-1/2 top-4 bottom-10 w-1.5 border-l-4 border-dashed border-indigo-200 -translate-x-1/2 z-0" />
        
        <div className="flex flex-col gap-2.5 relative z-10">
          {sessionCurriculum.map((item, idx) => {
            const isCompleted = progressLog.completedLessons.includes(item.id);
            const isLocked = idx > 0 && 
                             !progressLog.completedLessons.includes(sessionCurriculum[idx - 1].id) && 
                             parentUnlockAll !== true;
            const isActive = !isLocked && !isCompleted;
            
            const alignment = idx % 2 === 0 ? 'flex-row' : 'flex-row-reverse';
            const translateOffset = idx % 2 === 0 ? 'translate-x-6' : '-translate-x-6';
            
            let stoneStyle = "bg-white border-slate-200 text-slate-800 shadow-md hover:scale-105 active:scale-95";
            let badgeIcon = null;
            
            if (isLocked) {
              stoneStyle = "bg-slate-200 border-slate-300 text-slate-600 cursor-not-allowed opacity-90";
              badgeIcon = <Lock size={12} className="text-slate-500" />;
            } else if (isActive) {
              stoneStyle = "bg-indigo-600 border-indigo-700 text-white scale-110 shadow-lg shadow-indigo-600/30 animate-bounce-slow cursor-pointer ring-4 ring-indigo-100";
              badgeIcon = <Sparkles size={12} className="text-white" />;
            } else if (isCompleted) {
              stoneStyle = "bg-emerald-700 border-emerald-800 text-white shadow-md cursor-pointer hover:bg-emerald-800";
              badgeIcon = <CheckCircle size={12} className="text-white" />;
            }
            
            return (
              <div 
                key={item.id} 
                className={`flex items-center justify-center w-full ${alignment}`}
              >
                <button
                  disabled={isLocked}
                  onClick={() => {
                    dispatch({ type: 'lesson/select', index: idx });
                    setView('learn');
                    playSound('waypoint');
                  }}
                  className={`w-16 h-16 rounded-full flex flex-col justify-center items-center text-2xl border-4 transition-all duration-300 relative ${stoneStyle}`}
                >
                  <span className="font-gujarati text-2xl">{item.letter}</span>
                  {badgeIcon && (
                    <div className="absolute -top-1 -right-1 bg-slate-800 rounded-full p-1 border-2 border-white shadow-sm flex items-center justify-center">
                      {badgeIcon}
                    </div>
                  )}
                </button>
                
                <div className={`w-32 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-2 ${translateOffset} transition-all duration-300 ${isLocked ? 'opacity-50' : 'opacity-100'}`}>
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex flex-col text-left font-sans">
                    <span className="font-extrabold text-xs text-slate-800 leading-tight">{item.english}</span>
                    <span className="text-xxs text-slate-500 font-bold truncate leading-none mt-0.5">{item.wordEnglish}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
