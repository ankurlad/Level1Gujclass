import { useAppStore } from '../store/appStore';

// The developer waypoint builder, rendered inside the tracing card when the
// parent has switched the editor on. It is pure chrome over the state and the
// operations in src/hooks/useWaypointEditor.js: this file draws the buttons,
// that file knows what a waypoint is.
//
// `initCanvas` is the tracing canvas' own reset, which "Start New Record" runs
// after clearing the points; it belongs to TraceView, so it arrives as a prop.
export default function WaypointEditor({ editor, initCanvas }) {
  const { playSound } = useAppStore();
  const {
    saveStatus,
    editorActive,
    setEditorActive,
    editorRecordMode,
    setEditorRecordMode,
    editorMoveTo,
    setEditorMoveTo,
    editorWaypoints,
    handleEditorUndo,
    handleEditorClear,
    handleEditorReset,
    handleEditorSave,
    handleAutoCenterRows,
    exportCurrentLetterWaypoints,
    jsonDraft,
    setJsonDraft,
    jsonNotice,
    loadWaypointsJson,
    stringifyWaypointsArray
  } = editor;

  return (
    <div className="w-full mt-3 p-4 bg-amber-50/60 border border-amber-200 rounded-2xl text-left">
      <div className="flex flex-col gap-2 mb-3">
        <span className="font-extrabold text-sm text-amber-800 flex items-center gap-1.5 justify-between">
          <span>🔧 Waypoint Builder Tool</span>
          {saveStatus && <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md animate-pulse">{saveStatus}</span>}
        </span>
        
        {/* Editor Active Toggle */}
        <div className="flex gap-2 font-sans">
          <button
            onClick={() => setEditorActive(true)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${editorActive ? 'bg-amber-600 border-amber-600 text-ink shadow-sm' : 'bg-white border-amber-200 text-amber-700'}`}
          >
            Editor Active
          </button>
          <button
            onClick={() => setEditorActive(false)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${!editorActive ? 'bg-amber-600 border-amber-600 text-ink shadow-sm' : 'bg-white border-amber-200 text-amber-700'}`}
          >
            Test Tracing
          </button>
        </div>
      </div>

      {/* Waypoint placement mode toggle */}
      {editorActive && (
        <div className="flex gap-2 mb-3 font-sans">
          <button
            onClick={() => {
              setEditorRecordMode(false);
              playSound('waypoint');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${!editorRecordMode ? 'bg-amber-600 border-amber-600 text-ink shadow-sm' : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-50'}`}
          >
            👆 Manual Click
          </button>
          <button
            onClick={() => {
              setEditorRecordMode(true);
              playSound('waypoint');
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition flex justify-center items-center gap-1.5 ${editorRecordMode ? 'bg-rose-600 border-rose-600 text-white shadow-sm animate-pulse' : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-50'}`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white inline-block flex-shrink-0 animate-ping" />
            Draw to Record
          </button>
        </div>
      )}

      {editorActive ? (
        <div className="bg-slate-100/50 p-2.5 rounded-xl border border-slate-200/50 mb-3 text-xs text-slate-700 font-medium">
          {editorRecordMode ? (
            <p className="text-rose-700">
              🔴 <strong>Record Mode:</strong> Draw directly on the canvas guidelines to trace the letter shape. Waypoints will generate automatically under your touch path.
            </p>
          ) : (
            <p className="text-amber-800">
              👉 <strong>Manual Click Mode:</strong> Click or tap directly on the canvas grid above to place coordinates point-by-point.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-amber-700 font-medium mb-3">
          ✍️ Test tracing your custom waypoints using the brush below.
        </p>
      )}

      {/* Editor Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-3 font-sans">
        {!editorRecordMode ? (
          <button
            onClick={() => setEditorMoveTo(!editorMoveTo)}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition flex justify-center items-center ${editorMoveTo ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm animate-pulse' : 'bg-amber-100 border-amber-300 text-amber-800'}`}
          >
            {editorMoveTo ? '✏️ New Stroke Ready' : '✨ Start New Stroke'}
          </button>
        ) : (
          <button
            onClick={() => {
              handleEditorClear();
              initCanvas();
            }}
            className="bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 py-2.5 rounded-xl text-xs font-bold transition flex justify-center items-center gap-1"
          >
            🔄 Start New Record
          </button>
        )}
        <button
          onClick={handleEditorUndo}
          className="bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 py-2.5 rounded-xl text-xs font-bold transition"
        >
          Undo Point
        </button>
        <button
          onClick={handleEditorClear}
          className="bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 py-2.5 rounded-xl text-xs font-bold transition"
        >
          Clear All
        </button>
        <button
          onClick={handleEditorReset}
          className="bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 py-2.5 rounded-xl text-xs font-bold transition"
        >
          Reset Default
        </button>
        <button
          onClick={handleAutoCenterRows}
          className="bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 py-2.5 rounded-xl text-xs font-bold transition col-span-2 flex justify-center items-center gap-1.5"
          title="Auto-center horizontal coordinates 1-10 on letter strokes"
        >
          ⚖️ Auto-Center Rows
        </button>
      </div>

      {/* Device Storage Persistence Save Button */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleEditorSave}
          className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold py-3 px-2 rounded-xl text-xs flex justify-center items-center gap-1.5 transition shadow font-sans"
        >
          💾 Save Waypoints
        </button>
        <button
          onClick={exportCurrentLetterWaypoints}
          className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold py-3 px-2 rounded-xl text-xs flex justify-center items-center gap-1.5 transition shadow font-sans animate-pulse"
          title="Download waypoints for this alphabet as a JSON file"
        >
          📥 Export Letter
        </button>
      </div>

      {/* JSON Code Copy block */}
      <div className="font-sans">
        <label className="text-xxs font-extrabold text-amber-800 uppercase tracking-wider block mb-1">
          Live Waypoints JSON Code:
        </label>
        <textarea
          readOnly
          value={stringifyWaypointsArray(editorWaypoints)}
          className="w-full h-32 font-mono text-xxs border-2 border-amber-200 p-2 rounded-xl bg-white focus:outline-none focus:border-amber-400 select-all cursor-pointer"
          onClick={(e) => e.target.select()}
          title="Click to select all"
        />
      </div>

      {/* Load JSON block — the way back in for an exported file, a block from
          curriculum.js, or waypoints from an older build. Nothing is applied
          until it validates, and what went wrong is the line under the box
          (role="alert", so a screen reader announces it) rather than an
          alert() or a letter that quietly stops working. */}
      <div className="font-sans mt-4">
        <label
          htmlFor="waypoint-json-paste"
          className="text-xxs font-extrabold text-amber-800 uppercase tracking-wider block mb-1"
        >
          Load Waypoints From JSON:
        </label>
        <textarea
          id="waypoint-json-paste"
          value={jsonDraft}
          onChange={(e) => setJsonDraft(e.target.value)}
          placeholder='[ { "x": 52.89, "y": 27.19, "label": "1" }, … ]'
          className="w-full h-24 font-mono text-xxs border-2 border-amber-200 p-2 rounded-xl bg-white focus:outline-none focus:border-amber-400"
        />

        {jsonNotice && (
          <p
            key={jsonNotice.seq}
            role="alert"
            className={`mt-1.5 text-xs font-bold ${jsonNotice.tone === 'error' ? 'text-rose-700' : 'text-emerald-700'}`}
          >
            {jsonNotice.message}
          </p>
        )}

        <button
          onClick={loadWaypointsJson}
          className="w-full mt-2 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 font-extrabold py-2.5 px-3 rounded-xl text-xs transition"
        >
          📤 Load JSON
        </button>
      </div>
    </div>
  );
}
