import confetti from 'canvas-confetti';
import { speak } from '../lib/audio';
import { STICKERS } from '../lib/stickers';
import { useAppStore } from '../store/appStore';

// The sticker shop: the whole of the reward economy's spending side.
//
// Everything it reads is the store's — the points the child has, the stickers
// already bought — so the only thing this file adds is what a purchase costs
// and what it feels like.
export default function StickerShop() {
  const {
    points, setPoints,
    unlockedStickers, setUnlockedStickers,
    setView,
    playSound
  } = useAppStore();

  const buySticker = (sticker) => {
    if (unlockedStickers.includes(sticker.id)) return;
    if (points >= sticker.cost) {
      setPoints(p => p - sticker.cost);
      setUnlockedStickers([...unlockedStickers, sticker.id]);
      confetti({ particleCount: 30, spread: 30 });
      playSound('success');
      speak(`અભિનંદન.`);
    } else {
      playSound('wrong');
      alert("Not enough points! Keep tracing and playing quizzes to earn more points! 🌟");
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={() => setView('home')} 
          className="font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm shadow-sm flex-shrink-0"
        >
          Back
        </button>
        <span className="font-bold text-slate-700 text-lg">Sticker Locker</span>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex-1">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold mb-1">Digital Sticker Box 🎁</h3>
          <p className="text-slate-500 text-sm font-medium">Purchase funny stickers with the points you earned from tracing!</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {STICKERS.map((sticker) => {
            const isUnlocked = unlockedStickers.includes(sticker.id);
            const canAfford = points >= sticker.cost;

            return (
              <div 
                key={sticker.id}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center text-center transition-all ${isUnlocked ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' : 'bg-slate-50 border-slate-100'}`}
              >
                <span className={`text-5xl mb-2 filter ${isUnlocked ? 'drop-shadow' : 'grayscale opacity-40'}`}>
                  {sticker.emoji}
                </span>
                <h4 className="font-extrabold text-sm text-slate-800 mb-1">{sticker.label}</h4>
                
                {isUnlocked ? (
                  <span className="bg-indigo-100 text-indigo-700 font-extrabold text-xs px-2.5 py-1 rounded-full mt-2">
                    Unlocked!
                  </span>
                ) : (
                  <button
                    onClick={() => buySticker(sticker)}
                    disabled={!canAfford}
                    className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs mt-2 transition shadow-sm font-sans ${canAfford ? 'bg-amber-500 hover:bg-amber-600 text-ink shadow-amber-500/10' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
                  >
                    Buy for {sticker.cost} Pts
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>  );
}
