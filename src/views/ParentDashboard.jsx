import { useState } from 'react';
import {
  CheckSquare,
  FileText,
  Grid,
  Printer,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { removeStored } from '../hooks/useLocalStorage';
import { readWaypointOverride, waypointsKey } from '../lib/curriculumStorage';
import { createPinRecord, verifyPin } from '../lib/parentPin';
import { STICKERS } from '../lib/stickers';
import { PASSCODE_LENGTH, isPasscode, passcodeDigits } from '../lib/validate';
import { CURRICULUM } from '../curriculum';
import { useAppStore } from '../store/appStore';

// The parents' room, reached only through the gate in src/components/ParentGate.jsx.
//
// Four things live here: the progress read-out, the worksheet studio entry
// points, the settings block (gate type, passcode, the three toggles, the two
// curriculum-wide waypoint operations) and the reset. Everything it changes is
// persisted state, so it changes it through the store; the passcode it sets
// goes through src/lib/parentPin.js and only the digest is ever held.
//
// The passcode manager below is the one part with steps, and every one of them
// is local state: which flow is open, what has been typed into it, whether the
// current passcode has been proved. None of it outlives the visit, so none of
// it belongs in the store — the store keeps the digest and nothing else.
//
// What a passcode field may hold, and what counts as a passcode, are
// src/lib/validate.js's to say — the same two rules the gate applies on its
// first run, written once (PR 12).

export default function ParentDashboard() {
  const {
    sessionCurriculum,
    progressLog, setProgressLog,
    unlockedStickers, setUnlockedStickers,
    setPoints,
    soundEnabled, setSoundEnabled,
    editorMode, setEditorMode,
    parentUnlockAll, setParentUnlockAll,
    gateType, setGateType,
    parentPinRecord, setParentPinRecord,
    dispatch,
    setView,
    playSound
  } = useAppStore();

  // null | 'set' | 'change' | 'remove'. 'change' and 'remove' both start on the
  // current passcode and only move on once verifyPin has accepted it: removing
  // the passcode is a management action, not a way past the gate.
  const [pinFlow, setPinFlow] = useState(null);
  const [currentProved, setCurrentProved] = useState(false);
  const [currentEntry, setCurrentEntry] = useState('');
  const [newEntry, setNewEntry] = useState('');
  const [confirmEntry, setConfirmEntry] = useState('');
  const [pinNotice, setPinNotice] = useState(null);

  const notify = (tone, message) => setPinNotice({ tone, message });

  const closePinFlow = (notice) => {
    setPinFlow(null);
    setCurrentProved(false);
    setCurrentEntry('');
    setNewEntry('');
    setConfirmEntry('');
    setPinNotice(notice ?? null);
  };

  const openPinFlow = (flow) => {
    setPinFlow(flow);
    setCurrentProved(false);
    setCurrentEntry('');
    setNewEntry('');
    setConfirmEntry('');
    setPinNotice(null);
  };

  // Step one of both 'change' and 'remove': prove the passcode already stored.
  const submitCurrentPasscode = async () => {
    let matches = false;
    try {
      matches = await verifyPin(currentEntry, parentPinRecord);
    } catch (err) {
      console.error('Could not check the parent passcode', err);
      notify('error', 'This device cannot check the passcode — it needs https or localhost.');
      return;
    }

    if (!matches) {
      playSound('wrong');
      notify('error', 'That is not the current passcode.');
      setCurrentEntry('');
      return;
    }

    if (pinFlow === 'remove') {
      setParentPinRecord(null);
      closePinFlow({
        tone: 'success',
        message: 'Passcode removed. The gate now asks the next parent to choose one.'
      });
      return;
    }

    setCurrentProved(true);
    setCurrentEntry('');
    setPinNotice(null);
  };

  // Step two of 'change', and the whole of 'set': the same two fields the gate
  // shows on its first run, with the same rule — 4 digits, twice, or nothing
  // is stored.
  const submitNewPasscode = async () => {
    if (!isPasscode(newEntry)) {
      playSound('wrong');
      notify('error', 'A passcode is exactly 4 digits — numbers only.');
      return;
    }
    if (newEntry !== confirmEntry) {
      playSound('wrong');
      notify('error', 'Those passcodes do not match. Enter the same 4 digits in both fields.');
      setNewEntry('');
      setConfirmEntry('');
      return;
    }

    let record;
    try {
      record = await createPinRecord(newEntry);
    } catch (err) {
      console.error('Could not hash the parent passcode', err);
      notify('error', 'This device cannot store a passcode securely — it needs https or localhost.');
      return;
    }

    setParentPinRecord(record);
    closePinFlow({ tone: 'success', message: 'Passcode saved. It protects this section from now on.' });
  };

  // Revert all customized coordinates back to default database settings
  const clearAllCustomWaypoints = () => {
    if (confirm("Are you sure you want to revert all custom-drawn letter waypoints back to default? This cannot be undone!")) {
      sessionCurriculum.forEach(item => {
        removeStored(waypointsKey(item.id));
      });
      // Load standard curriculum back
      dispatch({ type: 'curriculum/set', curriculum: CURRICULUM });
      playSound('success');
      alert("All waypoints successfully reverted to default! 🔄");
    }
  };

  // Export entire curriculum (with custom waypoints merged) as a single JSON file
  const exportAllCustomWaypoints = () => {
    try {
      const fullCurriculumExport = sessionCurriculum.map(item => {
        const saved = readWaypointOverride(item.id);
        return saved ? { ...item, waypoints: saved } : item;
      });

      const stringifyFullCurriculum = (curriculumArray) => {
        const items = curriculumArray.map(item => {
          const waypointsStr = item.waypoints && item.waypoints.length > 0 
            ? `[\n${item.waypoints.map(wp => {
                const parts = [`"x": ${wp.x}`, `"y": ${wp.y}`, `"label": "${wp.label}"`];
                if (wp.moveTo) parts.push(`"moveTo": true`);
                return `        { ${parts.join(', ')} }`;
              }).join(',\n')}\n      ]`
            : "[]";

          return `  {
    "id": "${item.id}",
    "letter": "${item.letter}",
    "english": "${item.english}",
    "word": "${item.word}",
    "wordEnglish": "${item.wordEnglish}",
    "emoji": "${item.emoji}",
    "instructions": "${item.instructions.replace(/"/g, '\\"')}",
    "waypoints": ${waypointsStr}
  }`;
        });
        return `[\n${items.join(',\n')}\n]`;
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(stringifyFullCurriculum(fullCurriculumExport));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "curriculum_custom.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      playSound('success');
    } catch (e) {
      console.error("Export all waypoints failed", e);
      alert("Failed to export all waypoints.");
    }
  };

  const resetAllProgress = () => {
    if (confirm("Are you sure you want to reset all points, unlocked stickers, and tracing records? This cannot be undone!")) {
      setPoints(0);
      setUnlockedStickers([]);
      setProgressLog({ tracedCount: 0, quizScore: 0, completedLessons: [] });
      setView('home');
    }
  };

  // Group progress breakdowns
  const getGroupProgress = () => {
    const groups = [
      { name: 'ક-ઘ (Ka-Gha)', ids: ['ka', 'kha', 'ga', 'gha'] },
      { name: 'ચ-ઝ (Cha-Jha)', ids: ['cha', 'chha', 'ja', 'jha'] },
      { name: 'ટ-ણ (Ta-Na)', ids: ['ta', 'tha', 'da', 'dha', 'ana'] },
      { name: 'ત-ન (Ta-Na)', ids: ['ta2', 'tha2', 'da2', 'dha2', 'na'] },
      { name: 'પ-મ (Pa-Ma)', ids: ['pa', 'pha', 'ba', 'bha', 'ma'] },
      { name: 'ય-વ (Ya-Va)', ids: ['ya', 'ra', 'la', 'va'] },
      { name: 'શ-જ્ઞ (Sha-Gna)', ids: ['sha', 'ssa', 'sa', 'ha', 'la2', 'ksha', 'gna'] }
    ];
    return groups.map(g => {
      const completedCount = g.ids.filter(id => progressLog.completedLessons.includes(id)).length;
      const totalCount = g.ids.length;
      const percent = Math.round((completedCount / totalCount) * 100) || 0;
      return { ...g, completed: completedCount, total: totalCount, percent };
    });
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
        <span className="font-bold text-slate-800 text-lg">Parents Room</span>
      </div>

      {/* Dashboard stats & settings */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex-1 flex flex-col gap-6 text-left">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="bg-indigo-50 text-indigo-600 w-12 h-12 rounded-2xl flex justify-center items-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800">Learning Analytics</h3>
            <p className="text-slate-500 text-xs font-medium">Verify kid's daily progress and records</p>
          </div>
        </div>

        {/* Grid cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-indigo-50/50 border border-indigo-50 p-4 rounded-2xl">
            <h5 className="text-slate-500 text-xs font-extrabold uppercase mb-1">Letters Traced</h5>
            <span className="text-3xl font-black text-indigo-700">{progressLog.tracedCount} times</span>
          </div>

          <div className="bg-rose-50/50 border border-rose-50 p-4 rounded-2xl">
            <h5 className="text-slate-500 text-xs font-extrabold uppercase mb-1">Quiz Points</h5>
            <span className="text-3xl font-black text-rose-700">{progressLog.quizScore} Pts</span>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-50 p-4 rounded-2xl col-span-2">
            <div className="flex justify-between items-center mb-2">
              <h5 className="text-slate-500 text-xs font-extrabold uppercase">Workbook Progress</h5>
              <span className="text-sm font-bold text-emerald-700">
                {progressLog.completedLessons.length} / {sessionCurriculum.length} Letters
              </span>
            </div>
            
            <div className="w-full bg-slate-200/60 h-3 rounded-full overflow-hidden">
              <div 
                style={{ width: `${(progressLog.completedLessons.length / sessionCurriculum.length) * 100}%` }}
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              />
            </div>
          </div>
        </div>

        {/* Group-by-Group breakdown */}
        <div className="flex flex-col gap-3">
          <h4 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">Group Progress Breakdown</h4>
          {getGroupProgress().map(group => (
            <div key={group.name} className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-sm text-slate-700">{group.name}</span>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {group.completed}/{group.total} ({group.percent}%)
                </span>
              </div>
              <div className="w-full bg-slate-200/60 h-2.5 rounded-full overflow-hidden">
                <div 
                  style={{ width: `${group.percent}%` }}
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Printable Worksheets Studio Card */}
        <div className="bg-gradient-to-r from-indigo-50/90 to-purple-50/90 border border-indigo-100 rounded-2xl p-5 flex flex-col gap-3.5">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white w-11 h-11 rounded-2xl flex items-center justify-center shadow-md">
              <Printer size={22} />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-slate-800">Printable Activity Worksheets</h4>
              <p className="text-slate-500 text-xs font-medium">Download & print handwriting practice sheets for offline study</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => dispatch({ type: 'worksheets/open', from: 'dashboard', mode: 'single' })}
              className="bg-white hover:bg-slate-50 border border-indigo-100 rounded-xl p-2.5 flex flex-col items-center gap-1 text-center shadow-xs transition"
            >
              <FileText size={16} className="text-indigo-600" />
              <span className="text-xxs font-extrabold text-slate-700">Single Letter</span>
            </button>

            <button
              onClick={() => dispatch({ type: 'worksheets/open', from: 'dashboard', mode: 'grid' })}
              className="bg-white hover:bg-slate-50 border border-indigo-100 rounded-xl p-2.5 flex flex-col items-center gap-1 text-center shadow-xs transition"
            >
              <Grid size={16} className="text-purple-600" />
              <span className="text-xxs font-extrabold text-slate-700">Kakko Grid</span>
            </button>

            <button
              onClick={() => dispatch({ type: 'worksheets/open', from: 'dashboard', mode: 'match' })}
              className="bg-white hover:bg-slate-50 border border-indigo-100 rounded-xl p-2.5 flex flex-col items-center gap-1 text-center shadow-xs transition"
            >
              <CheckSquare size={16} className="text-emerald-600" />
              <span className="text-xxs font-extrabold text-slate-700">Match Sheet</span>
            </button>
          </div>

          <button
            onClick={() => dispatch({ type: 'worksheets/open', from: 'dashboard' })}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Printer size={15} />
            <span>Open Printable Studio</span>
          </button>
        </div>

        {/* Parents config settings */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col gap-4">
          <h4 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">Parental Controls & Settings</h4>
          
          {/* Gate type selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500">Parent Gate Type:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setGateType('math')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${gateType === 'math' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                Math Challenge
              </button>
              <button
                onClick={() => setGateType('pin')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${gateType === 'pin' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600'}`}
              >
                4-Digit Passcode
              </button>
            </div>
          </div>

          {/* Passcode management */}
          {gateType === 'pin' && (
            <div className="flex flex-col gap-2.5 border-t border-slate-200/60 pt-3">
              <label className="text-xs font-bold text-slate-500">4-Digit Passcode:</label>

              <div className="flex gap-2 items-center flex-wrap">
                {/* Only the digest is stored, so there is no passcode to
                    echo back here — just whether one is set. */}
                <span className="text-xs text-slate-500 font-bold">{parentPinRecord ? 'Active: ••••' : 'Not set yet'}</span>

                {parentPinRecord ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openPinFlow('change')}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs py-2 px-3.5 rounded-xl transition"
                    >
                      Change passcode
                    </button>
                    <button
                      type="button"
                      onClick={() => openPinFlow('remove')}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs py-2 px-3.5 rounded-xl transition"
                    >
                      Remove passcode
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => openPinFlow('set')}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition"
                  >
                    Set passcode
                  </button>
                )}
              </div>

              {/* Step one of change/remove: the passcode already stored. There
                  is no path around it — removing needs it exactly as changing
                  does. */}
              {pinFlow !== null && pinFlow !== 'set' && !currentProved && (
                <div className="flex flex-col gap-2 bg-white border border-slate-200 rounded-xl p-3">
                  <label className="text-xs font-bold text-slate-500 flex flex-col gap-1.5">
                    {pinFlow === 'remove' ? 'Enter the current passcode to remove it' : 'Enter the current passcode'}
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={PASSCODE_LENGTH}
                      placeholder="4 digits"
                      value={currentEntry}
                      onChange={(e) => setCurrentEntry(passcodeDigits(e.target.value))}
                      className="w-28 border-2 border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-center text-sm font-bold"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={submitCurrentPasscode}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition"
                    >
                      {pinFlow === 'remove' ? 'Remove' : 'Continue'}
                    </button>
                    <button
                      type="button"
                      onClick={() => closePinFlow()}
                      className="bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold text-xs py-2 px-3.5 rounded-xl transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Step two of change, and all of set. */}
              {(pinFlow === 'set' || (pinFlow === 'change' && currentProved)) && (
                <div className="flex flex-col gap-2 bg-white border border-slate-200 rounded-xl p-3">
                  <label className="text-xs font-bold text-slate-500 flex flex-col gap-1.5">
                    New passcode
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={PASSCODE_LENGTH}
                      placeholder="4 digits"
                      value={newEntry}
                      onChange={(e) => setNewEntry(passcodeDigits(e.target.value))}
                      className="w-28 border-2 border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-center text-sm font-bold"
                    />
                  </label>
                  <label className="text-xs font-bold text-slate-500 flex flex-col gap-1.5">
                    Confirm new passcode
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={PASSCODE_LENGTH}
                      placeholder="the same 4 digits"
                      value={confirmEntry}
                      onChange={(e) => setConfirmEntry(passcodeDigits(e.target.value))}
                      className="w-28 border-2 border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-center text-sm font-bold"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={submitNewPasscode}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition"
                    >
                      Save passcode
                    </button>
                    <button
                      type="button"
                      onClick={() => closePinFlow()}
                      className="bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold text-xs py-2 px-3.5 rounded-xl transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {pinNotice && (
                <p
                  role="alert"
                  className={`text-xs font-bold ${pinNotice.tone === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}
                >
                  {pinNotice.message}
                </p>
              )}
            </div>
          )}

          {/* Audio sound settings */}
          <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-slate-700">App Sound Effects</span>
              <span className="text-xs text-slate-500">Toggle sound signals for quiz & tracing</span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              aria-label="Toggle App Sound Effects"
              className={`min-w-[44px] min-h-[44px] px-1 rounded-full transition-all relative flex items-center ${soundEnabled ? 'bg-indigo-600 justify-end' : 'bg-slate-500 justify-start'}`}
            >
              <div className="w-5 h-5 rounded-full bg-white ring-2 ring-slate-700 transition-all shadow-sm" />
            </button>
          </div>

          {/* Waypoint Editor Mode Toggle */}
          <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-700">Developer Waypoint Editor</span>
              <span className="text-xs text-slate-500">Enable click-to-place waypoint builder tool</span>
            </div>
            <button
              onClick={() => setEditorMode(!editorMode)}
              aria-label="Toggle Developer Waypoint Editor"
              className={`min-w-[44px] min-h-[44px] px-1 rounded-full transition-all relative flex items-center ${editorMode ? 'bg-amber-500 justify-end' : 'bg-slate-500 justify-start'}`}
            >
              <div className="w-5 h-5 rounded-full bg-white ring-2 ring-slate-700 transition-all shadow-sm" />
            </button>
          </div>

          {/* Unlock All Letters Toggle */}
          <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-700">Unlock All Tracing Letters</span>
              <span className="text-xs text-slate-500">Bypass sequential progression requirement</span>
            </div>
            <button
              onClick={() => setParentUnlockAll(!parentUnlockAll)}
              aria-label="Toggle Unlock All Tracing Letters"
              className={`min-w-[44px] min-h-[44px] px-1 rounded-full transition-all relative flex items-center ${parentUnlockAll ? 'bg-indigo-600 justify-end' : 'bg-slate-500 justify-start'}`}
            >
              <div className="w-5 h-5 rounded-full bg-white ring-2 ring-slate-700 transition-all shadow-sm" />
            </button>
          </div>

          {/* Wipe custom waypoints */}
          <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-700">Revert All Custom Waypoints</span>
              <span className="text-xs text-slate-500">Clear all recorded paths and revert to default</span>
            </div>
            <button
              onClick={clearAllCustomWaypoints}
              aria-label="Revert all custom waypoints"
              className="min-w-[44px] min-h-[44px] bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs py-2.5 px-4 rounded-xl border border-rose-200 transition flex items-center justify-center"
            >
              Revert All
            </button>
          </div>

          {/* Export all custom waypoints */}
          <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-700">Export Full Curriculum JSON</span>
              <span className="text-xs text-slate-500">Download the entire curriculum including custom waypoints</span>
            </div>
            <button
              onClick={exportAllCustomWaypoints}
              aria-label="Export curriculum JSON"
              className="min-w-[44px] min-h-[44px] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs py-2.5 px-4 rounded-xl border border-indigo-200 transition flex items-center justify-center"
            >
              Export JSON
            </button>
          </div>
        </div>

        {/* Sync status card */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-center">
          <div>
            <h4 className="font-extrabold text-sm text-slate-700">Database Sync Status</h4>
            <p className="text-xs text-slate-500">IndexedDB local offline storage active</p>
          </div>
          <span className="bg-emerald-100 text-emerald-700 font-extrabold text-xs px-2.5 py-1 rounded-full">
            Fully Cached
          </span>
        </div>

        {/* Completed letters log */}
        <div>
          <h4 className="font-extrabold text-sm text-slate-700 mb-3 uppercase tracking-wider">Traced Letters Locker</h4>
          {progressLog.completedLessons.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {progressLog.completedLessons.map(id => {
                const item = sessionCurriculum.find(l => l.id === id);
                return item ? (
                  <div key={id} className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl font-bold text-sm text-slate-800 flex items-center gap-1.5 shadow-sm">
                    <span className="font-gujarati">{item.letter}</span>
                    <span className="text-xs text-slate-500">({item.english})</span>
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-sm font-medium italic">No letters successfully completed yet.</p>
          )}
        </div>

        {/* Sticker Collection */}
        <div>
          <h4 className="font-extrabold text-sm text-slate-700 mb-3 uppercase tracking-wider">Unlocked Emojis ({unlockedStickers.length})</h4>
          {unlockedStickers.length > 0 ? (
            <div className="flex gap-3 text-3xl">
              {unlockedStickers.map(id => {
                const item = STICKERS.find(s => s.id === id);
                return item ? (
                  <span key={id} title={item.label} className="drop-shadow">
                    {item.emoji}
                  </span>
                ) : null;
              })}
            </div>
          ) : (
            <p className="text-slate-500 text-sm font-medium italic">No stickers purchased yet.</p>
          )}
        </div>

        {/* Danger Zone */}
        <div className="mt-auto border-t border-slate-100 pt-6">
          <button
            onClick={resetAllProgress}
            className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold py-3.5 px-4 rounded-2xl flex justify-center items-center gap-2 transition"
          >
            <RefreshCw size={16} />
            <span>Reset All Progress</span>
          </button>
        </div>
      </div>
    </div>
  );
}
