import { CheckSquare, FileText, Grid, Printer } from 'lucide-react';
import { useAppStore } from '../store/appStore';

const WORKSHEET_GROUPS = [
  { id: 'all', name: 'All Letters (૩૪)', filter: () => true },
  { id: 'guttural', name: 'Guttural / કંઠ્ય (ક-ઙ)', filter: (item) => ['ka', 'kha', 'ga', 'gha', 'nga'].includes(item.id) },
  { id: 'palatal', name: 'Palatal / તાલવ્ય (ચ-ઞ)', filter: (item) => ['cha', 'chha', 'ja', 'jha', 'nya'].includes(item.id) },
  { id: 'retroflex', name: 'Retroflex / મૂર્ધન્ય (ટ-ણ)', filter: (item) => ['ta', 'tha', 'da', 'dha', 'ana'].includes(item.id) },
  { id: 'dental', name: 'Dental / દંત્ય (ત-ન)', filter: (item) => ['ta2', 'tha2', 'da2', 'dha2', 'na'].includes(item.id) },
  { id: 'labial', name: 'Labial / ઓષ્ઠ્ય (પ-મ)', filter: (item) => ['pa', 'pha', 'ba', 'bha', 'ma'].includes(item.id) },
  { id: 'sibilants', name: 'Semi-vowels & Sibilants (ય-જ્ઞ)', filter: (item) => ['ya', 'ra', 'la', 'va', 'sha', 'ssa', 'sa', 'ha', 'la2', 'ksha', 'gna'].includes(item.id) }
];

// The printable studio: three A4 layouts (one letter, the whole kakko, a
// matching exercise) and the controls that pick one, all of which the print
// stylesheet hides. The selection is in the store because three other screens
// deep-link into it — the home menu, the tracing card's Sheet button and the
// dashboard — and because Back has to return to whichever one that was.
export default function WorksheetsView() {
  const {
    sessionCurriculum,
    worksheetMode,
    worksheetGroup,
    selectedWorksheetLetter,
    worksheetFromView,
    dispatch,
    setView
  } = useAppStore();

  const setWorksheetMode = (mode) => dispatch({ type: 'worksheets/setMode', worksheetMode: mode });
  const setWorksheetGroup = (group) => dispatch({ type: 'worksheets/setGroup', worksheetGroup: group });
  const setSelectedWorksheetLetter = (letter) =>
    dispatch({ type: 'worksheets/setLetter', selectedWorksheetLetter: letter });

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Interactive Controls (Hidden during print) */}
      <div className="no-print print-hide mb-4 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setView(worksheetFromView || 'dashboard')}
            className="font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm shadow-sm flex items-center gap-1.5"
          >
            <span>← Back</span>
          </button>
          <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
            <span>🖨️ Printable Worksheets</span>
          </h3>
          <button
            onClick={() => window.print()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition active:scale-95 text-sm"
            title="Print or Save as PDF"
          >
            <Printer size={16} />
            <span>Print</span>
          </button>
        </div>

        {/* Mode Selection Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
          <button
            onClick={() => setWorksheetMode('single')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 ${worksheetMode === 'single' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >
            <FileText size={14} />
            <span>Single Letter</span>
          </button>
          <button
            onClick={() => setWorksheetMode('grid')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 ${worksheetMode === 'grid' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >
            <Grid size={14} />
            <span>Kakko Grid</span>
          </button>
          <button
            onClick={() => setWorksheetMode('match')}
            className={`flex-1 py-2 px-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 ${worksheetMode === 'match' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
          >
            <CheckSquare size={14} />
            <span>Match Activity</span>
          </button>
        </div>

        {/* Category & Letter Selection (For Single Letter and Match modes) */}
        {worksheetMode !== 'grid' && (
          <div className="bg-white border border-slate-100 rounded-2xl p-3 flex flex-col gap-2.5 shadow-xs">
            {/* Category Pills */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {WORKSHEET_GROUPS.map(grp => (
                <button
                  key={grp.id}
                  onClick={() => setWorksheetGroup(grp.id)}
                  className={`text-xxs font-bold px-2.5 py-1 rounded-full whitespace-nowrap transition ${worksheetGroup === grp.id ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {grp.name}
                </button>
              ))}
            </div>

            {/* Letter Carousel (for Single mode) */}
            {worksheetMode === 'single' && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
                {sessionCurriculum
                  .filter(WORKSHEET_GROUPS.find(g => g.id === worksheetGroup)?.filter || (() => true))
                  .map(item => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedWorksheetLetter(item.id)}
                      className={`min-w-[44px] min-h-[44px] rounded-xl font-bold flex justify-center items-center border transition-all text-sm flex-shrink-0 ${selectedWorksheetLetter === item.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                    >
                      <span className="font-gujarati">{item.letter}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Printable Paper Area */}
      {(() => {
        const activeItem = sessionCurriculum.find(l => l.id === selectedWorksheetLetter) || sessionCurriculum[0];
        
        if (worksheetMode === 'single') {
          return (
            <div id="printable-worksheet" className="worksheet-a4-page text-slate-900 bg-white">
              {/* Header bar matching Gujarati Learner layout */}
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-300">
                <div className="w-10"></div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight text-center">
                  Gujarati Letter <span className="uppercase text-indigo-800">{activeItem.english}</span> Activity Sheet
                </h2>
                <div className="bg-slate-100 border border-slate-300 rounded-full w-9 h-9 flex items-center justify-center font-gujarati text-lg font-bold text-slate-700 shadow-xs">
                  {activeItem.letter}
                </div>
              </div>

              {/* Section 1: Color Activity */}
              <div className="flex items-stretch gap-3 my-1">
                <div className="worksheet-vertical-label text-slate-900 text-sm font-black py-4 w-7 flex items-center justify-center">
                  Color Activity
                </div>
                <div className="grid grid-cols-2 gap-3.5 flex-1">
                  {/* Box 1 */}
                  <div className="color-activity-box">
                    <div className="w-full text-right font-black text-2xl text-slate-900 tracking-wide pr-1">
                      {activeItem.english.toUpperCase()}
                    </div>
                    <div className="my-auto py-2 flex items-center justify-center">
                      <span className="hollow-gujarati-char">{activeItem.letter}</span>
                    </div>
                  </div>

                  {/* Box 2 */}
                  <div className="color-activity-box">
                    <div className="w-full text-right font-black text-2xl text-slate-900 tracking-wide pr-1">
                      {activeItem.english.toUpperCase()}
                    </div>
                    <div className="my-auto py-2 flex items-center justify-center">
                      <span className="hollow-gujarati-char">{activeItem.letter}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Tracing Activity */}
              <div className="flex items-stretch gap-3 my-1">
                <div className="worksheet-vertical-label text-slate-900 text-sm font-black py-4 w-7 flex items-center justify-center">
                  Tracing Activity
                </div>
                <div className="grid grid-cols-4 gap-2.5 flex-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                    <div key={i} className="tracing-cell">
                      <span className="tracing-gujarati-char">{activeItem.letter}</span>
                      {i === 1 && (
                        <span className="absolute top-1 left-2 text-xxs font-extrabold text-slate-500">1 ➔</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Educational Footer */}
              <div className="border-t border-slate-300 pt-2 mt-auto flex flex-col gap-1 text-center text-xs text-slate-700">
                <div className="flex justify-between items-center text-xs font-bold text-slate-800 px-2">
                  <span>Name: <span className="inline-block w-36 border-b border-slate-400"></span></span>
                  <span>Date: <span className="inline-block w-24 border-b border-slate-400"></span></span>
                  <span>Word: <strong className="font-gujarati text-sm text-indigo-700">{activeItem.word}</strong> ({activeItem.wordEnglish} {activeItem.emoji})</span>
                </div>
                <div className="text-xxs text-slate-500 font-semibold mt-1">
                  Akshar Gujarati Learner • Free Printable Handwriting Practice • https://level1gujclass.vercel.app
                </div>
              </div>
            </div>
          );
        }

        if (worksheetMode === 'grid') {
          return (
            <div id="printable-worksheet" className="worksheet-a4-page text-slate-900 bg-white">
              {/* Header */}
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-300">
                <div className="flex-1 text-center">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Complete Kakko Tracing Sheet (ક થી જ્ઞ)</h2>
                  <span className="text-xxs font-bold text-slate-500 uppercase tracking-wider">All 34 Gujarati Consonants</span>
                </div>
                <div className="text-right text-xs font-bold text-slate-700">
                  <div>Name: <span className="inline-block w-24 border-b border-slate-400"></span></div>
                  <div className="mt-1">Date: <span className="inline-block w-16 border-b border-slate-400"></span></div>
                </div>
              </div>

              {/* 6x6 Alphabet Grid */}
              <div className="grid grid-cols-6 gap-2 my-1">
                {sessionCurriculum.map(item => (
                  <div key={item.id} className="border border-slate-300 rounded-xl p-1.5 flex flex-col items-center justify-between text-center bg-white shadow-2xs min-h-[70px]">
                    <span className="text-xxs font-extrabold text-slate-500 leading-none">{item.english}</span>
                    <span className="tracing-gujarati-char text-3xl my-0.5" style={{ fontSize: '32px' }}>{item.letter}</span>
                    <span className="text-xxs text-slate-500 truncate max-w-full leading-none font-bold">{item.emoji} {item.word}</span>
                  </div>
                ))}
              </div>

              {/* Footer remarks */}
              <div className="mt-auto border-t border-slate-300 pt-2 flex justify-between items-center text-xs text-slate-600">
                <div>
                  <span>Teacher / Parent Signature: </span>
                  <span className="inline-block w-36 border-b border-slate-400"></span>
                </div>
                <div className="font-bold text-indigo-700">
                  <span>શાબાશ! Well Done! ⭐⭐⭐⭐⭐</span>
                </div>
              </div>
            </div>
          );
        }

        if (worksheetMode === 'match') {
          const groupFilter = WORKSHEET_GROUPS.find(g => g.id === worksheetGroup)?.filter || (() => true);
          const filtered = sessionCurriculum.filter(groupFilter);
          const list = filtered.length >= 6 ? filtered.slice(0, 6) : sessionCurriculum.slice(0, 6);
          // Deterministic reverse shuffle for matching exercise
          const shuffled = [...list].reverse();

          return (
            <div id="printable-worksheet" className="worksheet-a4-page text-slate-900 bg-white">
              {/* Header */}
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-300">
                <div className="flex-1 text-center">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">Match the Letter with Picture (અક્ષર અને ચિત્ર જોડો)</h2>
                  <span className="text-xxs font-bold text-slate-500 uppercase tracking-wider">Akshar Activity Series</span>
                </div>
                <div className="text-right text-xs font-bold text-slate-700">
                  <div>Name: <span className="inline-block w-24 border-b border-slate-400"></span></div>
                  <div className="mt-1">Date: <span className="inline-block w-16 border-b border-slate-400"></span></div>
                </div>
              </div>

              <p className="text-xs font-bold text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
                ✏️ Instructions: Draw a pencil line connecting each Gujarati letter on the left to its matching picture on the right.
              </p>

              {/* Matching Columns */}
              <div className="grid grid-cols-2 gap-8 my-2">
                {/* Left column: Letters */}
                <div className="flex flex-col gap-3">
                  {list.map(item => (
                    <div key={item.id} className="border-2 border-slate-300 rounded-2xl p-3 flex items-center justify-between bg-white shadow-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-gujarati text-2xl font-bold text-slate-900">{item.letter}</span>
                        <span className="text-xs text-slate-500 font-bold">({item.english})</span>
                      </div>
                      <div className="w-4 h-4 rounded-full border-2 border-indigo-600 bg-white" />
                    </div>
                  ))}
                </div>

                {/* Right column: Shuffled Pictures */}
                <div className="flex flex-col gap-3">
                  {shuffled.map(item => (
                    <div key={item.id} className="border-2 border-slate-300 rounded-2xl p-3 flex items-center justify-between bg-white shadow-xs">
                      <div className="w-4 h-4 rounded-full border-2 border-indigo-600 bg-white" />
                      <div className="flex items-center gap-2.5 text-right">
                        <div>
                          <div className="font-gujarati text-sm font-bold text-slate-800">{item.word}</div>
                          <div className="text-xxs text-slate-500 font-bold">{item.wordEnglish}</div>
                        </div>
                        <span className="text-3xl">{item.emoji}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer remarks */}
              <div className="mt-auto border-t border-slate-200 pt-3 flex justify-between items-center text-xs text-slate-600">
                <div>
                  <span>Teacher / Parent Signature: </span>
                  <span className="inline-block w-40 border-b border-slate-400 border-dashed"></span>
                </div>
                <div className="font-bold text-amber-700">
                  <span>Score: _____ / {list.length} ⭐</span>
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}
