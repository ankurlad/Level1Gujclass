import { useState } from 'react';
import { CheckCircle, ShieldAlert, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { speak } from '../lib/audio';
import { useAppStore } from '../store/appStore';

// The four games, and the menu that starts them.
//
// They are one component because they are one screen to the child — Back goes
// to the menu, the menu starts the next one — and because they share exactly
// the same shape: pick a target at random, offer it with two distractors,
// score +30 for right and -10 for wrong, then re-deal. Each keeps its own
// round state here; the points and the quiz total they move are the store's.
export default function GameZone() {
  const {
    view,
    sessionCurriculum,
    setPoints,
    setProgressLog,
    setView,
    playSound
  } = useAppStore();

  // Quiz Mode States
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [quizOptions, setQuizOptions] = useState([]);

  // Match Game States
  const [matchIndex, setMatchIndex] = useState(0);
  const [matchOptions, setMatchOptions] = useState([]);
  const [matchSelected, setMatchSelected] = useState(null);
  const [matchFeedback, setMatchFeedback] = useState(null);

  // Phonics Game States (Idea 3)
  const [phonicsTarget, setPhonicsTarget] = useState(null);
  const [phonicsOptions, setPhonicsOptions] = useState([]);
  const [phonicsSelected, setPhonicsSelected] = useState(null);
  const [phonicsFeedback, setPhonicsFeedback] = useState(null);

  // Memory Match Game States (Idea 4)
  const [memoryCards, setMemoryCards] = useState([]);
  const [flippedCardIndices, setFlippedCardIndices] = useState([]);
  const [memoryMatchesCount, setMemoryMatchesCount] = useState(0);

  // Match Game start
  const startMatchGame = () => {
    const correctIdx = Math.floor(Math.random() * sessionCurriculum.length);
    setMatchIndex(correctIdx);
    setMatchSelected(null);
    setMatchFeedback(null);
    
    const correctItem = sessionCurriculum[correctIdx];
    const options = [correctItem];
    const pool = sessionCurriculum.filter(item => item.id !== correctItem.id);
    const wrong = pool.sort(() => 0.5 - Math.random()).slice(0, 2);
    options.push(...wrong);
    
    setMatchOptions(options.sort(() => 0.5 - Math.random()));
    setView('match');
  };

  const handleMatchAnswer = (item) => {
    if (matchSelected !== null) return;
    setMatchSelected(item.id);
    const isCorrect = item.id === sessionCurriculum[matchIndex].id;
    if (isCorrect) {
      setPoints(p => p + 30);
      setMatchFeedback('correct');
      playSound('correct');
      confetti({ particleCount: 45, spread: 45 });
      speak(`સાચો જવાબ.`);
      setProgressLog(prev => ({
        ...prev,
        quizScore: prev.quizScore + 30
      }));
      setTimeout(() => {
        startMatchGame();
      }, 1500);
    } else {
      setMatchFeedback('wrong');
      setPoints(p => Math.max(0, p - 10));
      playSound('wrong');
      speak(`ફરીથી પ્રયાસ કરો.`);
      setTimeout(() => {
        setMatchSelected(null);
        setMatchFeedback(null);
      }, 1500);
    }
  };

  // Quiz Game start
  const startQuiz = () => {
    const correctIdx = Math.floor(Math.random() * sessionCurriculum.length);
    setQuizIndex(correctIdx);
    setSelectedAnswer(null);
    setQuizFeedback(null);
    
    const options = [sessionCurriculum[correctIdx]];
    const pool = sessionCurriculum.filter(item => item.id !== sessionCurriculum[correctIdx].id);
    const wrong = pool.sort(() => 0.5 - Math.random()).slice(0, 2);
    options.push(...wrong);
    
    setQuizOptions(options.sort(() => 0.5 - Math.random()));
    setView('quiz');
  };

  const handleQuizAnswer = (item) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(item.id);
    const isCorrect = item.id === sessionCurriculum[quizIndex].id;
    if (isCorrect) {
      setPoints(p => p + 30);
      setQuizFeedback('correct');
      playSound('correct');
      confetti({ particleCount: 40, spread: 45 });
      speak(`સાચો જવાબ.`);
      setProgressLog(prev => ({
        ...prev,
        quizScore: prev.quizScore + 30
      }));
      setTimeout(() => {
        startQuiz();
      }, 2000);
    } else {
      setQuizFeedback('wrong');
      setPoints(p => Math.max(0, p - 10));
      playSound('wrong');
      speak(`ફરીથી પ્રયાસ કરો.`);
      setTimeout(() => {
        setSelectedAnswer(null);
        setQuizFeedback(null);
      }, 1500);
    }
  };

  // Phonics Game start (Idea 3)
  const startPhonicsGame = () => {
    const targetIdx = Math.floor(Math.random() * sessionCurriculum.length);
    const target = sessionCurriculum[targetIdx];
    
    const distractors = [];
    while (distractors.length < 2) {
      const idx = Math.floor(Math.random() * sessionCurriculum.length);
      if (idx !== targetIdx && !distractors.some(d => d.id === sessionCurriculum[idx].id)) {
        distractors.push(sessionCurriculum[idx]);
      }
    }
    
    const options = [target, ...distractors].sort(() => Math.random() - 0.5);
    
    setPhonicsTarget(target);
    setPhonicsOptions(options);
    setPhonicsSelected(null);
    setPhonicsFeedback(null);
    setView('phonics_game');
    
    setTimeout(() => {
      speak(target.letter);
    }, 400);
  };

  const handlePhonicsAnswer = (option) => {
    if (phonicsSelected !== null) return;
    setPhonicsSelected(option.id);
    
    const isCorrect = option.id === phonicsTarget.id;
    if (isCorrect) {
      setPhonicsFeedback('correct');
      setPoints(p => p + 30);
      playSound('correct');
      confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
      speak(`સાચો જવાબ!`);
      
      setTimeout(() => {
        startPhonicsGame();
      }, 2000);
    } else {
      setPhonicsFeedback('wrong');
      setPoints(p => Math.max(0, p - 10));
      playSound('wrong');
      speak(`ફરીથી પ્રયાસ કરો.`);
      
      setTimeout(() => {
        setPhonicsSelected(null);
        setPhonicsFeedback(null);
      }, 1500);
    }
  };

  // Memory Match start (Idea 4)
  const startMemoryMatch = () => {
    const shuffledLessons = [...sessionCurriculum].sort(() => Math.random() - 0.5);
    const selectedLessons = shuffledLessons.slice(0, 6);
    
    const cards = [];
    selectedLessons.forEach((lesson) => {
      cards.push({
        id: `${lesson.id}-letter`,
        lessonId: lesson.id,
        type: 'letter',
        content: lesson.letter,
        isFlipped: false,
        isMatched: false
      });
      cards.push({
        id: `${lesson.id}-emoji`,
        lessonId: lesson.id,
        type: 'emoji',
        content: lesson.emoji,
        isFlipped: false,
        isMatched: false
      });
    });
    
    const shuffledCards = cards.sort(() => Math.random() - 0.5);
    
    setMemoryCards(shuffledCards);
    setFlippedCardIndices([]);
    setMemoryMatchesCount(0);
    setView('memory_match');
    playSound('waypoint');
  };

  const handleCardClick = (idx) => {
    const card = memoryCards[idx];
    if (card.isFlipped || card.isMatched) return;
    if (flippedCardIndices.length >= 2) return;
    
    playSound('waypoint');
    
    const updatedCards = [...memoryCards];
    updatedCards[idx] = { ...card, isFlipped: true };
    setMemoryCards(updatedCards);
    
    const newFlipped = [...flippedCardIndices, idx];
    setFlippedCardIndices(newFlipped);
    
    if (newFlipped.length === 2) {
      const idx1 = newFlipped[0];
      const idx2 = newFlipped[1];
      const card1 = memoryCards[idx1];
      const card2 = memoryCards[idx2];
      
      if (card1.lessonId === card2.lessonId) {
        setTimeout(() => {
          setMemoryCards(prev => {
            const finalCards = [...prev];
            finalCards[idx1].isMatched = true;
            finalCards[idx2].isMatched = true;
            
            const allMatched = finalCards.every(c => c.isMatched);
            if (allMatched) {
              confetti({ particleCount: 100, spread: 80, origin: { y: 0.7 } });
              setPoints(p => p + 50);
              playSound('correct');
              speak("અદ્ભુત! બધી જોડી મળી ગઈ!");
            }
            return finalCards;
          });
          
          setMemoryMatchesCount(c => c + 1);
          setFlippedCardIndices([]);
          playSound('correct');
        }, 600);
      } else {
        setTimeout(() => {
          setMemoryCards(prev => {
            const finalCards = [...prev];
            finalCards[idx1].isFlipped = false;
            finalCards[idx2].isFlipped = false;
            return finalCards;
          });
          setFlippedCardIndices([]);
        }, 1200);
      }
    }
  };

  return (
    <>
      {view === 'games' && (
        <div className="flex-1 flex flex-col text-center">
          <h2 className="text-2xl font-black text-slate-800 mb-1">🎮 Game Zone</h2>
          <p className="text-slate-500 font-medium mb-6 text-sm">Choose a game to play and earn stars!</p>
          
          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto w-full font-sans">
            {/* Phonics Listen & Tap */}
            <button
              onClick={startPhonicsGame}
              className="bg-gradient-to-tr from-amber-400 to-amber-500 text-ink p-5 rounded-3xl shadow-lg border border-amber-300 flex flex-col items-center gap-3 transition-transform hover:-translate-y-1 active:translate-y-0"
            >
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex justify-center items-center text-3xl">👂</div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm leading-tight">Listen & Tap</span>
                <span className="text-ink/80 font-bold text-xxs mt-1">Phonics sound quiz</span>
              </div>
            </button>

            {/* Memory Match */}
            <button
              onClick={startMemoryMatch}
              className="bg-gradient-to-tr from-rose-600 to-rose-700 text-white p-5 rounded-3xl shadow-lg border border-rose-500 flex flex-col items-center gap-3 transition-transform hover:-translate-y-1 active:translate-y-0"
            >
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex justify-center items-center text-3xl">🎴</div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm leading-tight">Memory Match</span>
                <span className="text-white font-bold text-xxs mt-1">Flip and match cards</span>
              </div>
            </button>

            {/* Picture Match */}
            <button
              onClick={startMatchGame}
              className="bg-gradient-to-tr from-purple-600 to-purple-700 text-white p-5 rounded-3xl shadow-lg border border-purple-500 flex flex-col items-center gap-3 transition-transform hover:-translate-y-1 active:translate-y-0"
            >
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex justify-center items-center text-3xl">🖼️</div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm leading-tight">Picture Match</span>
                <span className="text-white font-bold text-xxs mt-1">Find the matching image</span>
              </div>
            </button>

            {/* Translate Quiz */}
            <button
              onClick={startQuiz}
              className="bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white p-5 rounded-3xl shadow-lg border border-indigo-400 flex flex-col items-center gap-3 transition-transform hover:-translate-y-1 active:translate-y-0"
            >
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex justify-center items-center text-3xl">📝</div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm leading-tight">Translate Quiz</span>
                <span className="text-white font-bold text-xxs mt-1">Sound translation test</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {view === 'phonics_game' && (
        <div className="flex-1 flex flex-col text-center justify-center">
          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={() => setView('games')} 
              className="font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm shadow-sm flex-shrink-0"
            >
              Back
            </button>
            <span className="font-bold text-slate-700 text-lg">Listen & Tap</span>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center max-w-sm mx-auto w-full">
            <div className="text-center mb-6">
              <h3 className="text-xl font-black mb-1">Which letter makes this sound?</h3>
              <p className="text-slate-500 text-xs font-medium">Listen carefully and tap the matching letter!</p>
            </div>

            {/* Replay Sound Button */}
            <button
              onClick={() => speak(phonicsTarget.letter)}
              className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 py-3.5 px-6 rounded-2xl font-bold text-sm mb-8 flex items-center gap-2 shadow-sm border border-indigo-100 animate-pulse font-sans"
            >
              <Volume2 size={20} className="fill-indigo-100" />
              <span>Repeat Sound</span>
            </button>

            {/* Option cards */}
            <div className="grid grid-cols-3 gap-3.5 w-full">
              {phonicsOptions.map((option) => {
                const isSelected = phonicsSelected === option.id;
                const isCorrect = option.id === phonicsTarget.id;
                
                let cardClass = "border-2 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/10 bg-white shadow-sm text-slate-700 scale-100";
                if (phonicsSelected !== null) {
                  if (isCorrect) {
                    cardClass = "border-2 border-emerald-500 bg-emerald-50 text-emerald-700 scale-105 shadow z-10";
                  } else if (isSelected) {
                    cardClass = "border-2 border-rose-500 bg-rose-50 text-rose-700";
                  } else {
                    cardClass = "border-2 border-slate-100 opacity-40";
                  }
                }

                return (
                  <button
                    key={option.id}
                    onClick={() => handlePhonicsAnswer(option)}
                    disabled={phonicsSelected !== null}
                    className={`h-24 rounded-2xl flex justify-center items-center font-extrabold text-4xl transition-all duration-300 ${cardClass}`}
                  >
                    {option.letter}
                  </button>
                );
              })}
            </div>

            {/* Feedback alert */}
            {phonicsFeedback && (
              <div className={`mt-6 w-full p-4 rounded-2xl font-bold flex justify-center items-center gap-2 font-sans border-2 ${phonicsFeedback === 'correct' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                {phonicsFeedback === 'correct' ? (
                  <>
                    <CheckCircle size={20} />
                    <span>Sachu! Correct! +30 points</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={20} />
                    <span>Khoṭu! Try again (-10 points).</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'memory_match' && (
        <div className="flex-1 flex flex-col justify-center text-center">
          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={() => setView('games')} 
              className="font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm shadow-sm flex-shrink-0"
            >
              Back
            </button>
            <span className="font-bold text-slate-700 text-lg">Memory Match</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex-1 flex flex-col items-center max-w-sm mx-auto w-full">
            <div className="text-center mb-4">
              <h3 className="text-lg font-black text-slate-800">Match Letters & Emojis</h3>
              <p className="text-slate-500 text-xs font-medium">Flip cards to match the letter to its starting image!</p>
            </div>

            {/* Card Grid */}
            <div className="grid grid-cols-3 gap-3 w-full flex-1 justify-center items-center">
              {memoryCards.map((card, idx) => {
                const isFlipped = card.isFlipped || card.isMatched;
                
                let cardStyle = "bg-gradient-to-tr from-indigo-500 to-purple-500 border-indigo-400 text-white font-black text-4xl shadow-md";
                if (isFlipped) {
                  cardStyle = card.isMatched 
                    ? "bg-emerald-50 border-emerald-300 text-emerald-700 scale-95 opacity-90"
                    : "bg-white border-indigo-200 text-slate-800 scale-100 shadow-sm";
                }
                
                return (
                  <button
                    key={card.id}
                    onClick={() => handleCardClick(idx)}
                    disabled={isFlipped}
                    className={`h-24 rounded-2xl border-3 flex justify-center items-center transition-all duration-300 ${cardStyle}`}
                  >
                    {isFlipped ? (
                      <span className={card.type === 'emoji' ? 'text-4xl' : 'text-3xl font-extrabold'}>
                        {card.content}
                      </span>
                    ) : (
                      <span className="font-extrabold text-white text-3xl font-mono">?</span>
                    )}
                  </button>
                );
              })}
            </div>

            {memoryCards.every(c => c.isMatched) && (
              <button
                onClick={startMemoryMatch}
                className="w-full mt-4 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-3 px-4 rounded-xl text-sm transition shadow font-sans"
              >
                🎉 Play Again!
              </button>
            )}
          </div>
        </div>
      )}

      {view === 'match' && (
        <div className="flex-1 flex flex-col justify-center text-center">
          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={() => setView('games')} 
              className="font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm shadow-sm flex-shrink-0"
            >
              Back
            </button>
            <span className="font-bold text-slate-700 text-lg">Picture Match</span>
          </div>

          {/* Match Game card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center max-w-sm mx-auto w-full">
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-3xl p-6 mb-6 flex justify-center items-center shadow-inner">
              <span className="text-7xl font-gujarati text-indigo-600 animate-bounce-slow">
                {sessionCurriculum[matchIndex].letter}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Find the matching card!</h2>
            <p className="text-slate-500 mb-6 font-medium">Which picture starts with the Gujarati sound above?</p>

            {/* Option cards */}
            <div className="grid grid-cols-3 gap-3 w-full font-sans">
              {matchOptions.map((option) => {
                const isSelected = matchSelected === option.id;
                const isCorrect = option.id === sessionCurriculum[matchIndex].id;
                
                let cardClass = "border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 bg-white shadow-sm";
                if (matchSelected !== null) {
                  if (isCorrect) {
                    cardClass = "border-2 border-emerald-500 bg-emerald-50 text-emerald-700 scale-105 shadow";
                  } else if (isSelected) {
                    cardClass = "border-2 border-rose-500 bg-rose-50 text-rose-700";
                  } else {
                    cardClass = "border-2 border-slate-100 opacity-40";
                  }
                }

                return (
                  <button
                    key={option.id}
                    onClick={() => handleMatchAnswer(option)}
                    disabled={matchSelected !== null}
                    className={`p-4 rounded-2xl flex flex-col items-center gap-2 transition-all ${cardClass}`}
                  >
                    <span className="text-4xl">{option.emoji}</span>
                    <span className="font-bold text-xs text-slate-700 truncate w-full">{option.wordEnglish}</span>
                  </button>
                );
              })}
            </div>

            {/* Feedback alert */}
            {matchFeedback && (
              <div className={`mt-6 w-full p-4 rounded-xl font-bold flex justify-center items-center gap-2 font-sans ${matchFeedback === 'correct' ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200' : 'bg-rose-50 text-rose-700 border-2 border-rose-200'}`}>
                {matchFeedback === 'correct' ? (
                  <>
                    <CheckCircle size={20} />
                    <span>Sachu! Correct! +30 points</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={20} />
                    <span>Khoṭu! Try again (-10 points).</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'quiz' && (
        <div className="flex-1 flex flex-col justify-center text-center">
          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={() => setView('games')} 
              className="font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm shadow-sm flex-shrink-0"
            >
              Back
            </button>
            <span className="font-bold text-slate-700 text-lg">Translate Quiz</span>
          </div>

          {/* Quiz selection card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center max-w-sm mx-auto w-full">
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-3xl p-6 mb-6 flex justify-center items-center shadow-inner">
              <span className="text-7xl font-gujarati text-indigo-600">
                {sessionCurriculum[quizIndex].letter}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Which letter is this?</h2>
            <p className="text-slate-500 mb-6 font-medium">Identify the correct phonetic sound for the Gujarati character.</p>

            <div className="grid gap-3 w-full font-sans">
              {quizOptions.map((option) => {
                const isSelected = selectedAnswer === option.id;
                const isCorrect = option.id === sessionCurriculum[quizIndex].id;
                
                let buttonClass = "border-3 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700";
                if (selectedAnswer !== null) {
                  if (isCorrect) {
                    buttonClass = "border-3 border-emerald-500 bg-emerald-50 text-emerald-700";
                  } else if (isSelected) {
                    buttonClass = "border-3 border-rose-500 bg-rose-50 text-rose-700";
                  } else {
                    buttonClass = "border-3 border-slate-100 opacity-60 text-slate-500";
                  }
                }

                return (
                  <button
                    key={option.id}
                    onClick={() => handleQuizAnswer(option)}
                    disabled={selectedAnswer !== null}
                    className={`font-extrabold text-lg py-4 px-6 rounded-2xl transition flex items-center justify-between ${buttonClass}`}
                  >
                    <span>{option.english} ({option.wordEnglish})</span>
                    <span className="text-2xl">{option.emoji}</span>
                  </button>
                );
              })}
            </div>

            {quizFeedback && (
              <div className={`mt-6 w-full p-4 rounded-xl font-bold flex justify-center items-center gap-2 font-sans ${quizFeedback === 'correct' ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200' : 'bg-rose-50 text-rose-700 border-2 border-rose-200'}`}>
                {quizFeedback === 'correct' ? (
                  <>
                    <CheckCircle size={20} />
                    <span>Sachu! Correct Answer! +30 points</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={20} />
                    <span>Khoṭu! Try again next question (-10 points).</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
