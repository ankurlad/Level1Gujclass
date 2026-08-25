import confetti from 'canvas-confetti';
import { speak } from '../lib/audio';
import { MASTERY_ACCURACY } from '../lib/mastery';
import { MASTERY_SHELF, POINTS_SHELF, STREAK_SHELF } from '../lib/stickers';
import { useAppStore } from '../store/appStore';

// The sticker shop: the whole of the reward economy's spending side, plus the
// shelf that cannot be spent on.
//
// Everything it reads is the store's — the points the child has, the stickers
// already bought or earned — so the only thing this file adds is what a
// purchase costs and what it feels like.
//
// TWO SHELVES, ONE LOCKER. The points shelf is unchanged: the same eight
// stickers at the same prices, bought the same way. The mastery shelf below it
// is not for sale at any price — its stickers arrive by tracing a letter neatly
// in Challenge mode, or by stringing neat letters together. Keeping them in one
// place is the point: a child who has run out of points can see the other way
// to fill the locker, and it is the way that asks them to trace well.
export default function StickerShop() {
  const {
    points, setPoints,
    unlockedStickers, setUnlockedStickers,
    setView,
    playSound
  } = useAppStore();

  const earnedMastery = MASTERY_SHELF.filter((sticker) => unlockedStickers.includes(sticker.id));
  const earnedStreaks = STREAK_SHELF.filter((sticker) => unlockedStickers.includes(sticker.id));

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
          {POINTS_SHELF.map((sticker) => {
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

        {/* The Mastery shelf. Deliberately below the fold of the shop and
            deliberately without a price: nothing here has a Buy button, because
            nothing here can be bought. */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold mb-1">Mastery Shelf ⭐</h3>
            <p className="text-slate-500 text-sm font-medium">
              These are earned, not bought. Trace a letter at {MASTERY_ACCURACY}% or better in
              Challenge mode to win its sticker.
            </p>
          </div>

          <div className="flex justify-center gap-4 mb-4 font-sans">
            <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-center">
              <span className="block text-2xl font-black text-primary">{earnedMastery.length}</span>
              <span className="text-xxs font-extrabold uppercase tracking-wider text-slate-500">
                Letters mastered
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-center">
              <span className="block text-2xl font-black text-primary">{earnedStreaks.length}</span>
              <span className="text-xxs font-extrabold uppercase tracking-wider text-slate-500">
                Streak badges
              </span>
            </div>
          </div>

          {earnedMastery.length + earnedStreaks.length > 0 ? (
            <div className="flex flex-wrap gap-2.5">
              {[...earnedMastery, ...earnedStreaks].map((sticker) => (
                <div
                  key={sticker.id}
                  title={sticker.label}
                  className="bg-indigo-50/50 border-2 border-indigo-200 rounded-2xl p-3 flex flex-col items-center gap-1 w-[86px] shadow-sm"
                >
                  <span className="text-3xl drop-shadow">{sticker.emoji}</span>
                  <span className="text-xxs font-extrabold text-slate-700 text-center leading-tight">
                    {sticker.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            /* The two streak milestones are shown locked so the goal is
               visible; the 42 letter stickers are not, because a grid of 42
               grey squares is a wall, not an invitation. */
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-2.5">
                {STREAK_SHELF.map((sticker) => (
                  <div
                    key={sticker.id}
                    title={sticker.label}
                    className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 flex flex-col items-center gap-1 w-[110px]"
                  >
                    <span className="text-3xl grayscale opacity-40">{sticker.emoji}</span>
                    <span className="text-xxs font-extrabold text-slate-500 text-center leading-tight">
                      {sticker.label}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-slate-500 text-sm font-medium italic text-center">
                No mastery stickers yet — switch the tracing screen to Challenge and go neatly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
