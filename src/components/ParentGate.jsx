import { useState } from 'react';
import { Lock } from 'lucide-react';
import { createPinRecord, verifyPin } from '../lib/parentPin';
import { useAppStore } from '../store/appStore';

// Math lock generator
const makeLockQuestion = () => {
  const num1 = Math.floor(Math.random() * 8) + 6;
  const num2 = Math.floor(Math.random() * 7) + 4;
  return {
    q: `What is ${num1} + ${num2}?`,
    a: num1 + num2
  };
};

// The speed bump in front of the parents' room.
//
// It is mounted only while a request is pending — the store's gateTarget holds
// which view is being asked for — so the answer field and the math question are
// component state that starts fresh on every challenge, which is exactly what
// requestParentView used to reset by hand. Passing the gate dispatches
// gate/open, which navigates to the target and closes this in one action.
export default function ParentGate() {
  const {
    gateType,
    parentPinRecord, setParentPinRecord,
    dispatch,
    playSound
  } = useAppStore();

  const [lockAnswer, setLockAnswer] = useState('');
  const [lockQuestion, setLockQuestion] = useState(makeLockQuestion);

  const generateLockQuestion = () => {
    setLockQuestion(makeLockQuestion());
    setLockAnswer('');
  };

  const openParentView = () => {
    dispatch({ type: 'gate/open' });
  };

  const handleParentLockVerify = async (e) => {
    e.preventDefault();
    if (gateType === 'math') {
      if (parseInt(lockAnswer, 10) === lockQuestion.a) {
        openParentView();
        return;
      }
      playSound('wrong');
      alert("Incorrect answer! Try again.");
      generateLockQuestion();
      return;
    }

    // First run on the PIN gate: there is no stored passcode to check against,
    // so whatever is typed here becomes it. PR 11 gives this its own screen
    // with a confirmation field; this keeps the gate usable without shipping a
    // passcode that is the same on every install.
    if (!parentPinRecord) {
      if (!/^\d{4}$/.test(lockAnswer)) {
        playSound('wrong');
        alert("Choose a 4-digit passcode for this section.");
        return;
      }
      try {
        setParentPinRecord(await createPinRecord(lockAnswer));
      } catch (err) {
        console.error('Could not hash the parent passcode', err);
        alert("This device cannot store a passcode securely. Use the math gate instead.");
        return;
      }
      openParentView();
      return;
    }

    let matches = false;
    try {
      matches = await verifyPin(lockAnswer, parentPinRecord);
    } catch (err) {
      console.error('Could not check the parent passcode', err);
      alert("This device cannot check the passcode. Use the math gate instead.");
      return;
    }

    if (matches) {
      openParentView();
      return;
    }

    playSound('wrong');
    alert("Incorrect Passcode! Try again.");
    setLockAnswer('');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border-4 border-amber-400">
        <div className="flex items-center gap-3 mb-4 text-amber-600">
          <Lock size={28} />
          <h3 className="text-2xl font-bold">Parents Section</h3>
        </div>
        <p className="text-slate-600 mb-4 font-medium text-lg">
          {gateType === 'math'
            ? 'Solve this math sum to verify:'
            : parentPinRecord
              ? 'Enter your 4-digit passcode:'
              : 'Choose a 4-digit passcode to protect this section:'}
        </p>
        
        <form onSubmit={handleParentLockVerify}>
          {gateType === 'math' ? (
            <div className="bg-slate-100 p-4 rounded-xl text-center mb-4">
              <span className="text-2xl font-bold text-slate-800">{lockQuestion.q}</span>
            </div>
          ) : null}
          <input 
            type={gateType === 'math' ? 'number' : 'password'}
            maxLength={gateType === 'pin' ? 4 : undefined}
            value={lockAnswer} 
            onChange={(e) => setLockAnswer(e.target.value)}
            placeholder={gateType === 'math' ? 'Enter answer' : (parentPinRecord ? 'Enter PIN' : 'Set a PIN')}
            className="w-full border-3 border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl px-4 py-3 text-center text-xl font-bold mb-6"
            autoFocus
          />
          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={() => dispatch({ type: 'gate/cancel' })}
              className="flex-1 border-3 border-slate-200 hover:border-slate-300 font-bold py-3 rounded-xl transition text-slate-600"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20"
            >
              Verify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
