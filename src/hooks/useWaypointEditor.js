import { useEffect, useState } from 'react';
import { CURRICULUM } from '../curriculum';
import { canvasRefCoords } from '../lib/canvas';
import { waypointsKey } from '../lib/curriculumStorage';
import {
  CANVAS_H,
  CANVAS_W,
  canvasToPath,
  canvasToPathX,
  pathToCanvasY
} from '../lib/waypoints';
import { useAppStore } from '../store/appStore';
import { removeStored, writeStored } from './useLocalStorage';

// Everything the waypoint editor does, minus the buttons that trigger it.
//
// The editor is the one part of the tracing screen that writes to the
// curriculum, so it needs the letter, the session curriculum and the tracing
// canvas all at once — which is exactly why it used to be inlined in App. It
// lives here rather than in src/views/WaypointEditor.jsx because TraceView
// drives half of it: the canvas itself is where points are placed, recorded and
// dragged, and only the panel is the editor's own UI.
//
// Takes the tracing canvas ref so the drag listener and the click-to-place path
// can turn a window event into a logical canvas coordinate.
export function useWaypointEditor({ canvasRef }) {
  const {
    currentLesson,
    currentLessonIndex,
    editorMode,
    dispatch,
    playSound
  } = useAppStore();

  // Waypoint Editor Mode States
  const [editorActive, setEditorActive] = useState(false);
  const [editorWaypoints, setEditorWaypoints] = useState([]);
  const [editorMoveTo, setEditorMoveTo] = useState(false);
  const [editorRecordMode, setEditorRecordMode] = useState(false);
  const [draggedWaypointIndex, setDraggedWaypointIndex] = useState(null);
  const [isDraggingWaypoint, setIsDraggingWaypoint] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // Visual save feedback

  // Every write below lands on the same lesson: the one being edited.
  const setLessonWaypoints = (waypoints) =>
    dispatch({ type: 'curriculum/setLessonWaypoints', index: currentLessonIndex, waypoints });

  const getCoords = (e) => canvasRefCoords(canvasRef, e);

  // Keep developer editor waypoints synced when letter changes
  useEffect(() => {
    if (currentLesson) {
      setEditorWaypoints(currentLesson.waypoints || []);
      setEditorMoveTo(false);
      setSaveStatus('');
    }
  }, [currentLessonIndex]);

  // Pulls a logical-pixel point onto the centre of mass of the guide glyph
  // under it. In and out are both logical pixels: the probe below is a pixel
  // grid, so conversion to the path space happens in the callers.
  const snapToCenterline = (x, y) => {
    try {
      // Offscreen probe in the logical space — no DPR scaling, the result is a
      // logical coordinate either way.
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = CANVAS_W;
      tempCanvas.height = CANVAS_H;
      const tempCtx = tempCanvas.getContext('2d');

      // Draw background. These two greys are snap calibration constants, not
      // theme colours: the pixel test below keys off the exact RGB distance
      // between them, and drawTraceGuide paints the visible canvas with the
      // same pair. Retheming either one moves every snapped waypoint.
      // oxlint-disable-next-line theme/no-raw-hex
      tempCtx.fillStyle = '#f8fafc';
      tempCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Draw letter text exactly like the main canvas
      tempCtx.font = '220px "Noto Sans Gujarati", "Baloo Bhai 2", sans-serif';
      tempCtx.fillStyle = 'rgba(226, 232, 240, 0.95)';
      tempCtx.textAlign = 'center';
      tempCtx.textBaseline = 'middle';
      tempCtx.fillText(currentLesson.letter, CANVAS_W / 2, CANVAS_H / 2 + 10);

      const imgData = tempCtx.getImageData(0, 0, CANVAS_W, CANVAS_H).data;
      
      let sumX = 0;
      let sumY = 0;
      let count = 0;
      const radius = 22; // 22px search radius
      
      const ix = Math.round(x);
      const iy = Math.round(y);
      
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const px = ix + dx;
          const py = iy + dy;
          if (px >= 0 && px < CANVAS_W && py >= 0 && py < CANVAS_H) {
            const pixelIndex = (py * CANVAS_W + px) * 4;
            const r = imgData[pixelIndex];
            const g = imgData[pixelIndex + 1];
            const b = imgData[pixelIndex + 2];
            
            // The background is 248, 250, 252. The letter is darker: 226, 232, 240
            if (r < 240 && g < 240 && b < 240) {
              sumX += px;
              sumY += py;
              count++;
            }
          }
        }
      }
      
      if (count > 0) {
        return {
          x: Math.round(sumX / count),
          y: Math.round(sumY / count)
        };
      }
    } catch (e) {
      console.error("Centerline snapping failed", e);
    }
    return { x, y };
  };

  // x/y arrive as logical pixels from the drag listener; canvasToPath clamps to
  // the box and rounds, so what lands in state is already storable.
  const updateWaypointPosition = (index, x, y) => {
    const point = canvasToPath(snapToCenterline(x, y));

    setEditorWaypoints(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        x: point.x,
        y: point.y
      };

      setLessonWaypoints(updated);

      return updated;
    });
  };

  const handleWaypointMouseDown = (e, idx) => {
    if (!editorMode || !editorActive) return;
    e.stopPropagation();
    e.preventDefault();
    setDraggedWaypointIndex(idx);
    setIsDraggingWaypoint(true);
  };

  const handleWaypointTouchStart = (e, idx) => {
    if (!editorMode || !editorActive) return;
    e.stopPropagation();
    setDraggedWaypointIndex(idx);
    setIsDraggingWaypoint(true);
  };

  // Dragging event listener for moving waypoints
  useEffect(() => {
    if (!isDraggingWaypoint || draggedWaypointIndex === null) return;
    
    const handleDragMove = (e) => {
      if (e.cancelable) e.preventDefault();
      const { x, y } = getCoords(e);
      updateWaypointPosition(draggedWaypointIndex, x, y);
    };
    
    const handleDragEnd = () => {
      setIsDraggingWaypoint(false);
      setDraggedWaypointIndex(null);
    };
    
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('touchend', handleDragEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDraggingWaypoint, draggedWaypointIndex]);

  // Click to place coordinates inside Waypoint Editor mode
  const handleCanvasClick = (e) => {
    if (!editorMode || !editorActive) return;
    const { x, y } = getCoords(e);
    const snapped = canvasToPath(snapToCenterline(x, y));

    setEditorWaypoints(prev => {
      const newPoint = {
        x: snapped.x,
        y: snapped.y,
        label: (prev.length + 1).toString()
      };
      if (editorMoveTo) {
        newPoint.moveTo = true;
        setEditorMoveTo(false); // Reset
      }
      const updated = [...prev, newPoint];

      setLessonWaypoints(updated);

      return updated;
    });
    
    playSound('waypoint');
  };

  // Save waypoints to device memory
  const handleEditorSave = () => {
    writeStored(waypointsKey(currentLesson.id), editorWaypoints);

    // Update local state curriculum
    setLessonWaypoints(editorWaypoints);

    playSound('success');
    setSaveStatus('Saved to device memory! 💾');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Helper to serialize a waypoint array with one coordinate object per line
  // (matching curriculum.js formatting). Coordinates go out in the same 0-100
  // path space they are held in, so the block pastes straight into
  // curriculum.js and a file exported here re-imports without rescaling.
  const stringifyWaypointsArray = (arr) => {
    if (!arr || arr.length === 0) return "[]";
    const lines = arr.map(wp => {
      const parts = [];
      parts.push(`"x": ${wp.x}`);
      parts.push(`"y": ${wp.y}`);
      parts.push(`"label": "${wp.label}"`);
      if (wp.moveTo) {
        parts.push(`"moveTo": true`);
      }
      return `  { ${parts.join(', ')} }`;
    });
    return `[\n${lines.join(',\n')}\n]`;
  };

  // Export current letter waypoints as single JSON file
  const exportCurrentLetterWaypoints = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(stringifyWaypointsArray(editorWaypoints));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `waypoints_${currentLesson.id}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      playSound('success');
    } catch (e) {
      console.error("Export current waypoints failed", e);
      alert("Failed to export waypoints.");
    }
  };

  // Waypoint Editor Controls
  const handleEditorUndo = () => {
    if (editorWaypoints.length === 0) return;
    const updated = editorWaypoints.slice(0, -1);
    setEditorWaypoints(updated);

    setLessonWaypoints(updated);
  };

  const handleEditorClear = () => {
    setEditorWaypoints([]);

    setLessonWaypoints([]);
  };

  const handleEditorReset = () => {
    // Clear item specific stored override
    removeStored(waypointsKey(currentLesson.id));
    
    const originalWaypoints = CURRICULUM[currentLessonIndex].waypoints;
    setEditorWaypoints(originalWaypoints);

    setLessonWaypoints(originalWaypoints);

    playSound('success');
    setSaveStatus('Reset to default! 🔄');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Auto-centers coordinates horizontally based on letter strokes for points 1-10
  const handleAutoCenterRows = () => {
    if (editorWaypoints.length === 0) return;

    try {
      const wps = editorWaypoints.map(wp => ({ ...wp }));
      const letter = currentLesson.letter;
      // The probe is a pixel raster, so it runs in the logical canvas size and
      // each waypoint crosses into pixels and back per row.
      const canvasWidth = CANVAS_W;
      const canvasHeight = CANVAS_H;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasWidth;
      tempCanvas.height = canvasHeight;
      const tempCtx = tempCanvas.getContext('2d');
      
      tempCtx.font = '220px "Baloo Bhai 2", "Noto Sans Gujarati", sans-serif';
      tempCtx.fillStyle = 'black';
      tempCtx.textAlign = 'center';
      tempCtx.textBaseline = 'middle';
      tempCtx.fillText(letter, canvasWidth / 2, canvasHeight / 2 + 10);
      
      wps.forEach(point => {
        const labelNum = parseInt(point.label);
        if (labelNum >= 1 && labelNum <= 10) {
          const y = Math.floor(pathToCanvasY(point.y));
          const imageData = tempCtx.getImageData(0, y, canvasWidth, 1).data;
          
          let minX = -1;
          let maxX = -1;
          const alphaThreshold = 10;
          
          for (let x = 0; x < canvasWidth; x++) {
            const alphaIndex = (x * 4) + 3;
            const alpha = imageData[alphaIndex];
            if (alpha > alphaThreshold) {
              if (minX === -1) minX = x;
              maxX = x;
            }
          }
          
          if (minX !== -1 && maxX !== -1) {
            point.x = canvasToPathX((minX + maxX) / 2);
          }
        }
      });
      
      setEditorWaypoints(wps);

      setLessonWaypoints(wps);

      playSound('success');
      setSaveStatus('Auto-centered rows! ⚖️');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (e) {
      console.error("Auto centering failed", e);
      alert("Failed to auto-center waypoints.");
    }
  };

  // Record mode: the same append the click path does, from a pen that is
  // already down. `breakStroke` is the pen-lift marker — the first point of a
  // recorded stroke carries moveTo unless it is the very first point of the
  // letter, which is the rule startDrawing has always applied.
  const appendRecordedWaypoint = (x, y, breakStroke) => {
    const snapped = canvasToPath(snapToCenterline(x, y));

    setEditorWaypoints(prev => {
      const newPoint = {
        x: snapped.x,
        y: snapped.y,
        label: (prev.length + 1).toString()
      };
      if (breakStroke && prev.length > 0) {
        newPoint.moveTo = true;
      }
      const updated = [...prev, newPoint];

      setLessonWaypoints(updated);

      return updated;
    });
  };

  const startRecordedStroke = (x, y) => appendRecordedWaypoint(x, y, true);
  const recordWaypoint = (x, y) => appendRecordedWaypoint(x, y, false);

  return {
    editorActive, setEditorActive,
    editorWaypoints,
    editorMoveTo, setEditorMoveTo,
    editorRecordMode, setEditorRecordMode,
    saveStatus,
    handleWaypointMouseDown,
    handleWaypointTouchStart,
    handleCanvasClick,
    startRecordedStroke,
    recordWaypoint,
    handleEditorSave,
    handleEditorUndo,
    handleEditorClear,
    handleEditorReset,
    handleAutoCenterRows,
    exportCurrentLetterWaypoints,
    stringifyWaypointsArray
  };
}
