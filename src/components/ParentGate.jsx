import { useEffect, useRef, useState } from 'react';
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

// How long the first-run confirmation stays on screen before the gate opens.
// The passcode is already stored by then; this is only so the parent reads the
// one line that tells them a passcode now exists.
export const SETUP_SUCCESS_MS = 900;

const PIN_PATTERN = /^\d{4}$/;

// The speed bump in front of the parents' room.
//
// It is mounted only while a request is pending — the store's gateTarget holds
// which view is being asked for — so the answer fields and the math question
// are component state that starts fresh on every challenge, which is exactly
// what requestParentView used to reset by hand. Passing the gate dispatches
// gate/open, which navigates to the target and closes this in one action.
//
// Nothing here talks to the parent through alert(). Every outcome — a wrong
// sum, a wrong passcode, two passcodes that disagree, a device that cannot
// hash — is one line under the fields, marked role="alert" so a screen reader
// announces it, carrying the same playSound('wrong') cue it always did. The
// message is keyed by a sequence number so the same message twice in a row is
// a fresh node, and therefore a fresh announcement.
export default function ParentGate() {
  const {
    gateType,
    parentPinRecord, setParentPinRecord,
    dispatch,
    playSound
  } = useAppStore();

  // First run on the PIN gate: there is no stored passcode to check against,
  // so this visit sets one. Two fields, and a typo in either is a passcode
  // nobody knows — hence the confirmation.
  const isFirstRun = gateType === 'pin' && !parentPinRecord;

  const [lockAnswer, setLockAnswer] = useState('');
  const [confirmAnswer, setConfirmAnswer] = useState('');
  const [lockQuestion, setLockQuestion] = useState(makeLockQuestion);
  const [feedback, setFeedback] = useState(null);
  const [setupDone, setSetupDone] = useState(false);

  const firstFieldRef = useRef(null);
  const feedbackSeq = useRef(0);

  const say = (tone, message) => {
    feedbackSeq.current += 1;
    setFeedback({ tone, message, seq: feedbackSeq.current });
  };

  const reject = (message) => {
    playSound('wrong');
    say('error', message);
  };

  const generateLockQuestion = () => {
    setLockQuestion(makeLockQuestion());
    setLockAnswer('');
  };

  const openParentView = () => {
    dispatch({ type: 'gate/open' });
  };

  // The first-run passcode is stored the moment it is confirmed; this only
  // holds the modal open long enough to say so before it navigates.
  useEffect(() => {
    if (!setupDone) return undefined;
    const timer = setTimeout(() => dispatch({ type: 'gate/open' }), SETUP_SUCCESS_MS);
    return () => clearTimeout(timer);
  }, [setupDone, dispatch]);

  const handleFirstRun = async () => {
    if (!PIN_PATTERN.test(lockAnswer)) {
      reject('A passcode is exactly 4 digits — numbers only.');
      firstFieldRef.current?.focus();
      return;
    }
    if (lockAnswer !== confirmAnswer) {
      reject('Those passcodes do not match. Enter the same 4 digits in both fields.');
      setLockAnswer('');
      setConfirmAnswer('');
      firstFieldRef.current?.focus();
      return;
    }

    let record;
    try {
      record = await createPinRecord(lockAnswer);
    } catch (err) {
      console.error('Could not hash the parent passcode', err);
      reject('This device cannot store a passcode securely — it needs https or localhost. Use the math challenge instead.');
      return;
    }

    setParentPinRecord(record);
    say('success', 'Saved. This passcode now protects the parents’ section.');
    setSetupDone(true);
  };

  const handleParentLockVerify = async (e) => {
    e.preventDefault();
    if (setupDone) return;

    if (gateType === 'math') {
      if (parseInt(lockAnswer, 10) === lockQuestion.a) {
        openParentView();
        return;
      }
      reject('That is not the answer. Here is a new sum.');
      generateLockQuestion();
      return;
    }

    if (isFirstRun) {
      await handleFirstRun();
      return;
    }

    let matches = false;
    try {
      matches = await verifyPin(lockAnswer, parentPinRecord);
    } catch (err) {
      console.error('Could not check the parent passcode', err);
      reject('This device cannot check the passcode — it needs https or localhost. Use the math challenge instead.');
      return;
    }

    if (matches) {
      openParentView();
      return;
    }

    reject('That passcode is not right. Try again.');
    setLockAnswer('');
    firstFieldRef.current?.focus();
  };

  const prompt = gateType === 'math'
    ? 'Solve this math sum to verify:'
    : isFirstRun
      ? 'Choose a 4-digit passcode to protect this section. Enter it twice — a typo here is the passcode.'
      : 'Enter your 4-digit passcode:';

  const fieldClass = 'w-full border-3 border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl px-4 py-3 text-center text-xl font-bold';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border-4 border-amber-400">
        <div className="flex items-center gap-3 mb-4 text-amber-600">
          <Lock size={28} />
          <h3 className="text-2xl font-bold">Parents Section</h3>
        </div>
        <p className="text-slate-600 mb-4 font-medium text-lg">{prompt}</p>

        <form onSubmit={handleParentLockVerify}>
          {gateType === 'math' ? (
            <div className="bg-slate-100 p-4 rounded-xl text-center mb-4">
              <span className="text-2xl font-bold text-slate-800">{lockQuestion.q}</span>
            </div>
          ) : null}

          {isFirstRun ? (
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-500 text-left">
                New passcode
                <input
                  ref={firstFieldRef}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={lockAnswer}
                  onChange={(e) => setLockAnswer(e.target.value.replace(/\D/g, ''))}
                  placeholder="4 digits"
                  className={fieldClass}
                  autoFocus
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold text-slate-500 text-left">
                Confirm passcode
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={confirmAnswer}
                  onChange={(e) => setConfirmAnswer(e.target.value.replace(/\D/g, ''))}
                  placeholder="the same 4 digits"
                  className={fieldClass}
                />
              </label>
            </div>
          ) : (
            <input
              ref={firstFieldRef}
              type={gateType === 'math' ? 'number' : 'password'}
              maxLength={gateType === 'pin' ? 4 : undefined}
              value={lockAnswer}
              onChange={(e) => setLockAnswer(e.target.value)}
              placeholder={gateType === 'math' ? 'Enter answer' : 'Enter PIN'}
              className={fieldClass}
              autoFocus
            />
          )}

          {feedback && (
            <p
              key={feedback.seq}
              role="alert"
              className={`mt-3 text-sm font-bold text-left ${feedback.tone === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}
            >
              {feedback.message}
            </p>
          )}

          <div className="flex gap-3 mt-6">
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
