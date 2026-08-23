import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Users } from 'lucide-react';
import { CHILD_NAME_MAX, childName } from '../lib/validate';
import { useAppStore } from '../store/appStore';

// Who is playing, next to the app's name.
//
// One device, more than one child (PR 13b): this is the only control that
// changes which child's points, stickers and completed letters the app is
// showing. It sits in the brand area of the header rather than in the parents'
// room on purpose — handing the tablet to a sibling is not a parental setting,
// and a gate in front of it would mean a parent has to be in the room for the
// other child to start.
//
// It cannot reach anything the gate protects. The store's switchChild changes
// one device key, `guj:active_child`; the passcode digest and the gate type are
// not per-child and are not touched, and the gate re-challenges on every entry
// regardless. Switching child never opens the parents' section.
//
// Every target here is 44px (WCAG 2.2 AA): the trigger, each child row, the New
// child button, the name field and Add.
export default function ChildSwitcher() {
  const { childProfiles, activeChild, activeChildId, switchChild, addChild } = useAppStore();

  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState(null);

  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const nameRef = useRef(null);

  const close = () => {
    setOpen(false);
    setAdding(false);
    setName('');
    setNotice(null);
  };

  // A popover a child opened by accident has to be closeable by tapping the
  // page, which is the gesture they will try, and by Escape for a keyboard.
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) close();
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      close();
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (adding) nameRef.current?.focus();
  }, [adding]);

  const choose = (childId) => {
    switchChild(childId);
    close();
  };

  const submitName = () => {
    const result = addChild(name);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    close();
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Playing as ${activeChild?.name ?? 'Child 1'} — switch child`}
        title="Switch child"
        className="min-h-[44px] min-w-[44px] px-2 rounded-xl border border-slate-200/80 bg-slate-100/80 hover:bg-slate-200/80 flex items-center gap-1.5 transition"
      >
        <span aria-hidden="true" className="text-base leading-none">{activeChild?.avatar ?? '🦚'}</span>
        <span className="font-extrabold text-xs text-slate-700 max-w-[72px] truncate">
          {activeChild?.name ?? 'Child 1'}
        </span>
        <ChevronDown size={14} className="text-slate-500 flex-shrink-0" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Children on this device"
          className="absolute left-0 top-full mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-40 flex flex-col gap-1 text-left"
        >
          <div className="flex items-center gap-2 px-2 pt-1 pb-2 text-slate-500">
            <Users size={14} />
            <span className="text-xxs font-extrabold uppercase tracking-wider">Who is playing?</span>
          </div>

          {childProfiles.map((child) => {
            const isActive = child.id === activeChildId;
            return (
              <button
                key={child.id}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => choose(child.id)}
                className={`min-h-[44px] w-full px-3 rounded-xl flex items-center gap-2.5 border transition text-left ${isActive ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:bg-slate-50'}`}
              >
                <span aria-hidden="true" className="text-lg leading-none">{child.avatar ?? '🙂'}</span>
                <span className="font-bold text-sm text-slate-800 flex-1 truncate">{child.name}</span>
                {isActive && <Check size={16} className="text-indigo-600 flex-shrink-0" />}
              </button>
            );
          })}

          {adding ? (
            <div className="border-t border-slate-100 mt-1 pt-2 flex flex-col gap-2">
              <label className="text-xxs font-extrabold uppercase tracking-wider text-slate-500 px-1 flex flex-col gap-1.5">
                New child's name
                <input
                  ref={nameRef}
                  type="text"
                  value={name}
                  maxLength={CHILD_NAME_MAX}
                  placeholder="e.g. Meera"
                  onChange={(e) => { setName(e.target.value); setNotice(null); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitName(); }}
                  className="min-h-[44px] w-full border-2 border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl px-3 text-sm font-bold text-slate-800 normal-case"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={submitName}
                  className="min-h-[44px] flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition"
                >
                  Add child
                </button>
                <button
                  type="button"
                  onClick={() => { setAdding(false); setName(''); setNotice(null); }}
                  className="min-h-[44px] px-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
              </div>
              {/* Refusals are the name rules in src/lib/validate.js: an empty
                  name, a duplicate, or a device that already holds the most
                  profiles it keeps. */}
              {notice && (
                <p role="alert" className="text-xs font-bold text-rose-700 px-1">{notice}</p>
              )}
              {childName(name, '') !== '' && (
                <p className="text-xxs text-slate-500 px-1">
                  {childName(name, '')} starts at 0 points with no letters traced.
                </p>
              )}
            </div>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => setAdding(true)}
              className="min-h-[44px] w-full px-3 mt-1 border-t border-slate-100 rounded-xl flex items-center gap-2.5 text-indigo-700 hover:bg-indigo-50 font-extrabold text-sm transition"
            >
              <Plus size={16} />
              <span>New child</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
