import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Award, 
  Settings, 
  Volume2, 
  RotateCcw, 
  CheckCircle, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Sparkles, 
  TrendingUp, 
  Home, 
  Trophy, 
  Grid,
  ChevronRight,
  RefreshCw,
  Palette,
  Map,
  Smile,
  Gamepad2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CURRICULUM } from './curriculum';
const PHONICS_GUIDE = {
  ka: { phonic: "ka", pron: "k as in cup" },
  kha: { phonic: "kha", pron: "kh as in Khan (aspirated)" },
  ga: { phonic: "ga", pron: "g as in go" },
  gha: { phonic: "gha", pron: "gh as in ghost (aspirated)" },
  cha: { phonic: "cha", pron: "ch as in chin" },
  chha: { phonic: "chha", pron: "chh as in match-head (aspirated)" },
  ja: { phonic: "ja", pron: "j as in joy" },
  jha: { phonic: "jha", pron: "jh as in hedgehog (aspirated)" },
  ta: { phonic: "ta", pron: "t as in toy (hard retroflex t)" },
  tha: { phonic: "tha", pron: "th as in lighthouse (aspirated hard t)" },
  da: { phonic: "da", pron: "d as in dog (hard retroflex d)" },
  dha: { phonic: "dha", pron: "dh as in mud-hut (aspirated hard d)" },
  ana: { phonic: "na", pron: "n as in under (retroflex n)" },
  ta2: { phonic: "ta", pron: "t as in pasta (soft dental t)" },
  tha2: { phonic: "tha", pron: "th as in think (soft dental th)" },
  da2: { phonic: "da", pron: "th as in mother (soft dental d)" },
  dha2: { phonic: "dha", pron: "dh as in breathe (aspirated soft d)" },
  na: { phonic: "na", pron: "n as in net" },
  pa: { phonic: "pa", pron: "p as in pen" },
  pha: { phonic: "pha", pron: "ph as in phone / puff" },
  ba: { phonic: "ba", pron: "b as in boy" },
  bha: { phonic: "bha", pron: "bh as in abhor (aspirated b)" },
  ma: { phonic: "ma", pron: "m as in map" },
  ya: { phonic: "ya", pron: "y as in yes" },
  ra: { phonic: "ra", pron: "r as in run" },
  la: { phonic: "la", pron: "l as in lion" },
  va: { phonic: "va", pron: "v as in van / water" },
  sha: { phonic: "sha", pron: "sh as in show" },
  ssa: { phonic: "sha", pron: "sh as in sugar (retroflex sh)" },
  sa: { phonic: "sa", pron: "s as in sun" },
  ha: { phonic: "ha", pron: "h as in home" },
  la2: { phonic: "la", pron: "l as in pearl (retroflex l)" },
  ksha: { phonic: "ksha", pron: "ksh as in action" },
  gna: { phonic: "gna", pron: "gya as in gyan (nasalized)" }
};

const STICKERS = [
  { id: 'st1', emoji: '🦁', label: 'Simha (Lion)', cost: 50 },
  { id: 'st2', emoji: '🐵', label: 'Vanara (Monkey)', cost: 100 },
  { id: 'st3', emoji: '🦄', label: 'Unicorn', cost: 150 },
  { id: 'st4', emoji: '🚀', label: 'Yana (Rocket)', cost: 200 },
  { id: 'st5', emoji: '🦖', label: 'Dinosaur', cost: 250 },
  { id: 'st6', emoji: '🐼', label: 'Panda', cost: 300 },
  { id: 'st7', emoji: '🍉', label: 'Tarbuch (Watermelon)', cost: 350 },
  { id: 'st8', emoji: '🎈', label: 'Fuggo (Balloon)', cost: 400 }
];

// Helper to load curriculum with local overrides from localStorage
const loadSavedCurriculum = () => {
  return CURRICULUM.map(item => {
    const saved = localStorage.getItem(`guj_custom_waypoints_${item.id}`);
    if (saved) {
      try {
        return { ...item, waypoints: JSON.parse(saved) };
      } catch (e) {
        console.error("Failed to parse saved waypoints for " + item.id, e);
      }
    }
    return item;
  });
};

export default function App() {
  const [view, setView] = useState('home'); // home | learn | match | quiz | stickers | dashboard
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [points, setPoints] = useState(() => Number(localStorage.getItem('guj_points')) || 0);
  
  // Custom Session Curriculum with overrides loaded
  const [sessionCurriculum, setSessionCurriculum] = useState(loadSavedCurriculum);
  const [saveStatus, setSaveStatus] = useState(''); // Visual save feedback
  
  const [progressLog, setProgressLog] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('guj_progress')) || {
        tracedCount: 0,
        quizScore: 0,
        completedLessons: []
      };
    } catch {
      return { tracedCount: 0, quizScore: 0, completedLessons: [] };
    }
  });
  const [unlockedStickers, setUnlockedStickers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('guj_stickers')) || [];
    } catch {
      return [];
    }
  });

  // Canvas Drawing & Styling Customizations
  const canvasRef = useRef(null);
  const lastPointRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [completedWaypoints, setCompletedWaypoints] = useState([]);
  const [traceStartTime, setTraceStartTime] = useState(null);
  
  const [brushColor, setBrushColor] = useState(() => localStorage.getItem('guj_brush_color') || '#6366f1');
  const [brushWidth, setBrushWidth] = useState(() => Number(localStorage.getItem('guj_brush_width')) || 16);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const val = localStorage.getItem('guj_sound_enabled');
    return val === null ? true : val === 'true';
  });

  // Waypoint Editor Mode States
  const [editorMode, setEditorMode] = useState(() => localStorage.getItem('guj_editor_mode') === 'true');
  const [editorActive, setEditorActive] = useState(false);
  const [editorWaypoints, setEditorWaypoints] = useState([]);
  const [editorMoveTo, setEditorMoveTo] = useState(false);
  const [editorRecordMode, setEditorRecordMode] = useState(false);
  const [draggedWaypointIndex, setDraggedWaypointIndex] = useState(null);
  const [isDraggingWaypoint, setIsDraggingWaypoint] = useState(false);

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

  // Parent Gate & Security Configurations
  const [gateType, setGateType] = useState(() => localStorage.getItem('guj_gate_type') || 'math'); // math | pin
  const [parentPasscode, setParentPasscode] = useState(() => localStorage.getItem('guj_parent_pin') || '1234');
  const [tempPasscode, setTempPasscode] = useState('');
  
  const [showParentLock, setShowParentLock] = useState(false);
  const [parentLockTarget, setParentLockTarget] = useState(null);
  const [lockAnswer, setLockAnswer] = useState('');
  const [lockQuestion, setLockQuestion] = useState({ q: '', a: 0 });

  // PWA & Installation states
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [kioskPromptActive, setKioskPromptActive] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  // Phonics Game States (Idea 3)
  const [phonicsTarget, setPhonicsTarget] = useState(null);
  const [phonicsOptions, setPhonicsOptions] = useState([]);
  const [phonicsSelected, setPhonicsSelected] = useState(null);
  const [phonicsFeedback, setPhonicsFeedback] = useState(null);

  // Memory Match Game States (Idea 4)
  const [memoryCards, setMemoryCards] = useState([]);
  const [flippedCardIndices, setFlippedCardIndices] = useState([]);
  const [memoryMatchesCount, setMemoryMatchesCount] = useState(0);

  // Sandbox Mode States (Idea 5)
  const [sandboxTool, setSandboxTool] = useState('draw'); // draw | stamp
  const [selectedSandboxSticker, setSelectedSandboxSticker] = useState('🪷');
  const [sandboxIsDrawing, setSandboxIsDrawing] = useState(false);
  const sandboxCanvasRef = useRef(null);
  const sandboxLastPointRef = useRef(null);

  // Parent Lock Progression Toggle (Idea 2)
  const [parentUnlockAll, setParentUnlockAll] = useState(() => localStorage.getItem('guj_parent_unlock_all') === 'true');

  const currentLesson = sessionCurriculum[currentLessonIndex];

  // Local Storage sync hooks
  useEffect(() => {
    localStorage.setItem('guj_points', points);
  }, [points]);

  useEffect(() => {
    localStorage.setItem('guj_progress', JSON.stringify(progressLog));
  }, [progressLog]);

  useEffect(() => {
    localStorage.setItem('guj_stickers', JSON.stringify(unlockedStickers));
  }, [unlockedStickers]);

  useEffect(() => {
    localStorage.setItem('guj_brush_color', brushColor);
  }, [brushColor]);

  useEffect(() => {
    localStorage.setItem('guj_brush_width', brushWidth);
  }, [brushWidth]);

  useEffect(() => {
    localStorage.setItem('guj_sound_enabled', soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('guj_gate_type', gateType);
  }, [gateType]);

  useEffect(() => {
    localStorage.setItem('guj_parent_pin', parentPasscode);
  }, [parentPasscode]);

  // Keep developer editor waypoints synced when letter changes
  useEffect(() => {
    if (currentLesson) {
      setEditorWaypoints(currentLesson.waypoints || []);
      setEditorMoveTo(false);
      setSaveStatus('');
    }
  }, [currentLessonIndex]);

  const snapToCenterline = (x, y) => {
    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 380;
      tempCanvas.height = 320;
      const tempCtx = tempCanvas.getContext('2d');
      
      // Draw background
      tempCtx.fillStyle = '#f8fafc';
      tempCtx.fillRect(0, 0, 380, 320);
      
      // Draw letter text exactly like the main canvas
      tempCtx.font = '220px "Baloo Bhai 2", "Noto Sans Gujarati", sans-serif';
      tempCtx.fillStyle = 'rgba(226, 232, 240, 0.95)';
      tempCtx.textAlign = 'center';
      tempCtx.textBaseline = 'middle';
      tempCtx.fillText(currentLesson.letter, 190, 170); // Center is 190, 170
      
      const imgData = tempCtx.getImageData(0, 0, 380, 320).data;
      
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
          if (px >= 0 && px < 380 && py >= 0 && py < 320) {
            const pixelIndex = (py * 380 + px) * 4;
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

  const updateWaypointPosition = (index, x, y) => {
    const snapped = snapToCenterline(x, y);
    const clampedX = Math.max(0, Math.min(380, snapped.x));
    const clampedY = Math.max(0, Math.min(320, snapped.y));
    
    setEditorWaypoints(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        x: clampedX,
        y: clampedY
      };
      
      setSessionCurriculum(prevCurriculum => {
        const newCurriculum = [...prevCurriculum];
        newCurriculum[currentLessonIndex] = {
          ...newCurriculum[currentLessonIndex],
          waypoints: updated
        };
        return newCurriculum;
      });
      
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

  // Listen to installation prompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Synthesize Sound Effects using Web Audio API
  const playSound = (type) => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      if (type === 'waypoint') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(820, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'success') {
        const now = ctx.currentTime;
        const playNote = (freq, start, duration) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(0.12, start);
          gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
          osc.start(start);
          osc.stop(start + duration);
        };
        playNote(523.25, now, 0.12);
        playNote(659.25, now + 0.1, 0.12);
        playNote(783.99, now + 0.2, 0.12);
        playNote(1046.50, now + 0.3, 0.35);
      } else if (type === 'correct') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'wrong') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.error("Web Audio API failed to synthesize sound", e);
    }
  };

  // Voice Pronunciation Speech Synthesis
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'gu-IN';
      const voices = window.speechSynthesis.getVoices();
      const guVoice = voices.find(v => v.lang.toLowerCase().includes('gu'));
      if (guVoice) {
        utterance.voice = guVoice;
      }
      utterance.rate = 0.75;
      utterance.pitch = 1.15;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleLessonSpeech = () => {
    speak(`${currentLesson.letter}. ${currentLesson.word}.`);
  };

  // Canvas Tracing Draw setup
  useEffect(() => {
    if (view === 'learn') {
      if (document.fonts) {
        document.fonts.ready.then(() => {
          initCanvas();
        });
      } else {
        initCanvas();
      }
    }
  }, [view, currentLessonIndex, editorWaypoints]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background Grid paper style
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Guide letter in huge light grey font
    ctx.font = '220px "Baloo Bhai 2", "Noto Sans Gujarati", sans-serif';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentLesson.letter, canvas.width / 2, canvas.height / 2 + 10);

    // Draw dashed guide paths connecting waypoints (respecting moveTo skips)
    if (currentLesson.waypoints && currentLesson.waypoints.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = editorMode && editorActive ? 'rgba(245, 158, 11, 0.45)' : 'rgba(99, 102, 241, 0.15)';
      ctx.lineWidth = 4;
      ctx.setLineDash([6, 6]);
      ctx.moveTo(currentLesson.waypoints[0].x, currentLesson.waypoints[0].y);
      for (let i = 1; i < currentLesson.waypoints.length; i++) {
        const wp = currentLesson.waypoints[i];
        if (wp.moveTo) {
          ctx.moveTo(wp.x, wp.y);
        } else {
          ctx.lineTo(wp.x, wp.y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    setCompletedWaypoints([]);
    setTraceStartTime(performance.now());
  };

  const getCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = e.clientX;
    let clientY = e.clientY;
    
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }
    
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  };

  // Click to place coordinates inside Waypoint Editor mode
  const handleCanvasClick = (e) => {
    if (!editorMode || !editorActive) return;
    const { x, y } = getCoords(e);
    const snapped = snapToCenterline(x, y);
    
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
      
      setSessionCurriculum(prevCurriculum => {
        const newCurriculum = [...prevCurriculum];
        newCurriculum[currentLessonIndex] = {
          ...newCurriculum[currentLessonIndex],
          waypoints: updated
        };
        return newCurriculum;
      });
      
      return updated;
    });
    
    playSound('waypoint');
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoords(e);

    if (editorMode && editorActive) {
      if (editorRecordMode) {
        // Record path drawing mode
        const snapped = snapToCenterline(x, y);
        
        setEditorWaypoints(prev => {
          const newPoint = {
            x: snapped.x,
            y: snapped.y,
            label: (prev.length + 1).toString()
          };
          if (prev.length > 0) {
            newPoint.moveTo = true;
          }
          const updated = [...prev, newPoint];
          
          setSessionCurriculum(prevCurriculum => {
            const newCurriculum = [...prevCurriculum];
            newCurriculum[currentLessonIndex] = {
              ...newCurriculum[currentLessonIndex],
              waypoints: updated
            };
            return newCurriculum;
          });
          
          return updated;
        });

        // Save the unsnapped coordinates for relative distance checks!
        lastPointRef.current = { x, y };
        setIsDrawing(true);
        playSound('waypoint');

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineWidth = brushWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#f59e0b'; // Amber color trail for recording
      } else {
        handleCanvasClick(e);
      }
      return;
    }

    // Normal kids tracing mode
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = brushWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = brushColor;
    setIsDrawing(true);
    checkWaypoint(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoords(e);

    if (editorMode && editorActive && editorRecordMode) {
      const lastPoint = lastPointRef.current;
      if (lastPoint) {
        const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
        // Spacing downsampling threshold (35px) between unsnapped points
        if (dist >= 35) {
          const snapped = snapToCenterline(x, y);
          
          setEditorWaypoints(prev => {
            const newPoint = {
              x: snapped.x,
              y: snapped.y,
              label: (prev.length + 1).toString()
            };
            const updated = [...prev, newPoint];
            
            setSessionCurriculum(prevCurriculum => {
              const newCurriculum = [...prevCurriculum];
              newCurriculum[currentLessonIndex] = {
                ...newCurriculum[currentLessonIndex],
                waypoints: updated
              };
              return newCurriculum;
            });
            
            return updated;
          });

          // Save the unsnapped coordinates for relative distance checks!
          lastPointRef.current = { x, y };
          playSound('waypoint');
        }
      }

      const ctx = canvasRef.current.getContext('2d');
      ctx.lineTo(x, y);
      ctx.stroke();
      return;
    }

    // Normal kids tracing mode
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    checkWaypoint(x, y);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const checkWaypoint = (x, y) => {
    const nextIndex = completedWaypoints.length;
    if (nextIndex >= currentLesson.waypoints.length) return;
    
    const target = currentLesson.waypoints[nextIndex];
    const dist = Math.hypot(x - target.x, y - target.y);
    
    if (dist < 28) {
      const newWaypoints = [...completedWaypoints, nextIndex];
      setCompletedWaypoints(newWaypoints);
      
      playSound('waypoint');
      if (navigator.vibrate) navigator.vibrate(40);
      
      if (newWaypoints.length === currentLesson.waypoints.length) {
        handleSuccess();
      }
    }
  };

  const handleSuccess = () => {
    const timeTaken = ((performance.now() - traceStartTime) / 1000).toFixed(1);
    const speedBonus = Number(timeTaken) < 7 ? 15 : 5;
    const basePoints = 25;
    const totalGained = basePoints + speedBonus;
    
    setPoints(p => p + totalGained);
    
    setProgressLog(prev => {
      const isAlreadyCompleted = prev.completedLessons.includes(currentLesson.id);
      const completed = isAlreadyCompleted ? prev.completedLessons : [...prev.completedLessons, currentLesson.id];
      return {
        tracedCount: prev.tracedCount + 1,
        quizScore: prev.quizScore,
        completedLessons: completed
      };
    });

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 }
    });

    playSound('success');
    speak(`અદ્ભુત! સાચું છે!`);

    setTimeout(() => {
      const nextIndex = (currentLessonIndex + 1) % sessionCurriculum.length;
      setCurrentLessonIndex(nextIndex);
      initCanvas();
    }, 1500);
  };

  // Save waypoints to Local Storage device memory
  const handleEditorSave = () => {
    localStorage.setItem(`guj_custom_waypoints_${currentLesson.id}`, JSON.stringify(editorWaypoints));
    
    // Update local state curriculum
    const updatedCurriculum = [...sessionCurriculum];
    updatedCurriculum[currentLessonIndex].waypoints = editorWaypoints;
    setSessionCurriculum(updatedCurriculum);
    
    playSound('success');
    setSaveStatus('Saved to device memory! 💾');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Revert all customized coordinates back to default database settings
  const clearAllCustomWaypoints = () => {
    if (confirm("Are you sure you want to revert all custom-drawn letter waypoints back to default? This cannot be undone!")) {
      sessionCurriculum.forEach(item => {
        localStorage.removeItem(`guj_custom_waypoints_${item.id}`);
      });
      // Load standard curriculum back
      setSessionCurriculum(CURRICULUM);
      playSound('success');
      alert("All waypoints successfully reverted to default! 🔄");
    }
  };

  // Helper to serialize a waypoint array with one coordinate object per line (matching curriculum.js formatting)
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

  // Export entire curriculum (with custom waypoints merged) as a single JSON file
  const exportAllCustomWaypoints = () => {
    try {
      const fullCurriculumExport = sessionCurriculum.map(item => {
        const saved = localStorage.getItem(`guj_custom_waypoints_${item.id}`);
        if (saved) {
          try {
            return { ...item, waypoints: JSON.parse(saved) };
          } catch (e) {
            console.error("Failed to parse saved waypoints for " + item.id, e);
          }
        }
        return item;
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

  // Waypoint Editor Controls
  const handleEditorUndo = () => {
    if (editorWaypoints.length === 0) return;
    const updated = editorWaypoints.slice(0, -1);
    setEditorWaypoints(updated);

    const newCurriculum = [...sessionCurriculum];
    newCurriculum[currentLessonIndex] = {
      ...newCurriculum[currentLessonIndex],
      waypoints: updated
    };
    setSessionCurriculum(newCurriculum);
  };

  const handleEditorClear = () => {
    setEditorWaypoints([]);

    const newCurriculum = [...sessionCurriculum];
    newCurriculum[currentLessonIndex] = {
      ...newCurriculum[currentLessonIndex],
      waypoints: []
    };
    setSessionCurriculum(newCurriculum);
  };

  const handleEditorReset = () => {
    // Clear item specific localstorage override
    localStorage.removeItem(`guj_custom_waypoints_${currentLesson.id}`);
    
    const originalWaypoints = CURRICULUM[currentLessonIndex].waypoints;
    setEditorWaypoints(originalWaypoints);

    const newCurriculum = [...sessionCurriculum];
    newCurriculum[currentLessonIndex] = {
      ...newCurriculum[currentLessonIndex],
      waypoints: originalWaypoints
    };
    setSessionCurriculum(newCurriculum);
    
    playSound('success');
    setSaveStatus('Reset to default! 🔄');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Auto-centers coordinates horizontally based on letter strokes for points 1-10
  const handleAutoCenterRows = () => {
    if (editorWaypoints.length === 0) return;
    
    try {
      const wps = [...editorWaypoints];
      const letter = currentLesson.letter;
      const canvasWidth = 380;
      const canvasHeight = 320;
      
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
          const y = Math.floor(point.y);
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
            point.x = Math.round((minX + maxX) / 2);
          }
        }
      });
      
      setEditorWaypoints(wps);
      
      const newCurriculum = [...sessionCurriculum];
      newCurriculum[currentLessonIndex] = {
        ...newCurriculum[currentLessonIndex],
        waypoints: wps
      };
      setSessionCurriculum(newCurriculum);
      
      playSound('success');
      setSaveStatus('Auto-centered rows! ⚖️');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (e) {
      console.error("Auto centering failed", e);
      alert("Failed to auto-center waypoints.");
    }
  };

  // Math lock generator
  const generateLockQuestion = () => {
    const num1 = Math.floor(Math.random() * 8) + 6;
    const num2 = Math.floor(Math.random() * 7) + 4;
    setLockQuestion({
      q: `What is ${num1} + ${num2}?`,
      a: num1 + num2
    });
    setLockAnswer('');
  };

  const handleParentLockVerify = (e) => {
    e.preventDefault();
    if (gateType === 'math') {
      if (parseInt(lockAnswer) === lockQuestion.a) {
        setShowParentLock(false);
        setView(parentLockTarget);
        setLockAnswer('');
      } else {
        playSound('wrong');
        alert("Incorrect answer! Try again.");
        generateLockQuestion();
      }
    } else {
      if (lockAnswer === parentPasscode) {
        setShowParentLock(false);
        setView(parentLockTarget);
        setLockAnswer('');
      } else {
        playSound('wrong');
        alert("Incorrect Passcode! Try again.");
        setLockAnswer('');
      }
    }
  };

  const requestParentView = (targetView) => {
    setParentLockTarget(targetView);
    setLockAnswer('');
    setTempPasscode('');
    if (gateType === 'math') {
      generateLockQuestion();
    }
    setShowParentLock(true);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setFullscreenActive(true);
      }).catch(err => {
        console.error("Fullscreen lock failed", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setFullscreenActive(false);
      });
    }
  };

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

  // Sandbox Mode Canvas logic (Idea 5)
  const initSandboxCanvas = () => {
    const canvas = sandboxCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const startSandboxDrawing = (e) => {
    e.preventDefault();
    const canvas = sandboxCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? (e.touches[0] ? e.touches[0].clientX : e.changedTouches[0].clientX) : e.clientX;
    const clientY = e.touches ? (e.touches[0] ? e.touches[0].clientY : e.changedTouches[0].clientY) : e.clientY;
    
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    
    if (sandboxTool === 'stamp') {
      const ctx = canvas.getContext('2d');
      ctx.font = '44px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(selectedSandboxSticker, x, y);
      playSound('waypoint');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = brushWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = brushColor;
    
    setSandboxIsDrawing(true);
    sandboxLastPointRef.current = { x, y };
  };

  const drawSandbox = (e) => {
    if (!sandboxIsDrawing || sandboxTool !== 'draw') return;
    e.preventDefault();
    const canvas = sandboxCanvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? (e.touches[0] ? e.touches[0].clientX : e.changedTouches[0].clientX) : e.clientX;
    const clientY = e.touches ? (e.touches[0] ? e.touches[0].clientY : e.changedTouches[0].clientY) : e.clientY;
    
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    sandboxLastPointRef.current = { x, y };
  };

  const stopSandboxDrawing = () => {
    setSandboxIsDrawing(false);
  };

  useEffect(() => {
    if (view === 'sandbox') {
      setTimeout(() => {
        initSandboxCanvas();
      }, 50);
    }
  }, [view]);

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
    <div className="app-container">
      {/* Kiosk Mode Simulation */}
      {kioskPromptActive && (
        <div className="kiosk-lock-overlay">
          <div className="bg-white text-slate-800 p-6 rounded-2xl max-w-sm w-full mx-4 shadow-2xl">
            <ShieldAlert size={48} className="text-rose-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-xl font-bold mb-2">Device is Locked!</h3>
            <p className="text-slate-600 mb-6">Ask your parents to enter the passcode to exit Kiosk / Single App mode.</p>
            <button 
              onClick={() => setKioskPromptActive(false)} 
              className="bg-indigo-600 text-white font-bold py-2.5 px-6 rounded-xl hover:bg-indigo-700 transition"
            >
              Continue Learning
            </button>
          </div>
        </div>
      )}

      {/* Parent Verification Modal */}
      {showParentLock && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border-4 border-amber-400">
            <div className="flex items-center gap-3 mb-4 text-amber-600">
              <Lock size={28} />
              <h3 className="text-2xl font-bold">Parents Section</h3>
            </div>
            <p className="text-slate-600 mb-4 font-medium text-lg">
              {gateType === 'math' ? 'Solve this math sum to verify:' : 'Enter your 4-digit passcode:'}
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
                placeholder={gateType === 'math' ? 'Enter answer' : 'Enter PIN'}
                className="w-full border-3 border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl px-4 py-3 text-center text-xl font-bold mb-6"
                autoFocus
              />
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowParentLock(false)}
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
      )}

      {/* Header bar */}
      <header className="bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-30 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
          <div className="bg-gradient-to-tr from-indigo-500 to-rose-400 text-white w-9 h-9 rounded-xl flex justify-center items-center font-black text-xl shadow-md">
            અ
          </div>
          <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Akshar PWA
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-amber-50 text-amber-700 border-2 border-amber-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 font-bold text-sm shadow-sm animate-float">
            <Trophy size={16} className="text-amber-500 fill-amber-300" />
            <span>{points} Pts</span>
          </div>

          <button 
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl transition-all border-2 ${fullscreenActive ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
            title="Lock Single App Mode"
          >
            {fullscreenActive ? <Lock size={18} /> : <Unlock size={18} />}
          </button>

          <button 
            onClick={() => requestParentView('dashboard')}
            className={`p-2 rounded-xl border-2 ${view === 'dashboard' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
            title="Parents Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col p-4 bg-slate-50 overflow-y-auto">
        {view === 'home' && (
          <div className="flex-1 flex flex-col justify-center py-6 text-center">
            <div className="mb-8">
              <div className="w-28 h-28 mx-auto rounded-3xl overflow-hidden shadow-xl mb-4 border-4 border-white animate-bounce-slow bg-gradient-to-tr from-indigo-500 to-pink-500 flex justify-center items-center">
                <span className="text-white font-black text-6xl">ક</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Kem Chho! 👋</h1>
              <p className="text-slate-500 font-medium text-lg px-6">Ready to learn the Gujarati alphabet and earn lovely stickers?</p>
            </div>

            {/* Menu options */}
            <div className="grid gap-4 max-w-sm w-full mx-auto px-4">
              <button 
                onClick={() => setView('map')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-lg py-4 px-6 rounded-2xl flex items-center justify-between shadow-lg shadow-indigo-600/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <div className="flex items-center gap-3">
                  <Map size={24} />
                  <span>Start Akshar Path</span>
                </div>
                <ChevronRight size={20} />
              </button>

              <button 
                onClick={() => setView('games')}
                className="bg-purple-500 hover:bg-purple-600 text-white font-extrabold text-lg py-4 px-6 rounded-2xl flex items-center justify-between shadow-lg shadow-purple-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <div className="flex items-center gap-3">
                  <Gamepad2 size={24} />
                  <span>Interactive Game Zone</span>
                </div>
                <ChevronRight size={20} />
              </button>

              <button 
                onClick={() => setView('sandbox')}
                className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-lg py-4 px-6 rounded-2xl flex items-center justify-between shadow-lg shadow-rose-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <div className="flex items-center gap-3">
                  <Palette size={24} />
                  <span>Creative Sandbox</span>
                </div>
                <ChevronRight size={20} />
              </button>

              <button 
                onClick={() => setView('stickers')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-lg py-4 px-6 rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <div className="flex items-center gap-3">
                  <Sparkles size={24} />
                  <span>Sticker Shop</span>
                </div>
                <ChevronRight size={20} />
              </button>
            </div>

            {/* PWA Promo Install Prompt */}
            {installPrompt && (
              <div className="mt-8 mx-auto bg-gradient-to-tr from-indigo-500 to-pink-500 max-w-sm rounded-2xl p-4 border border-indigo-400 shadow-md flex items-center justify-between text-left text-white animate-float">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Sparkles size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm">Install Akshar App!</h4>
                    <p className="text-white/80 text-xs">Run offline directly on your screen.</p>
                  </div>
                </div>
                <button
                  onClick={handleInstallClick}
                  className="bg-white text-indigo-700 font-extrabold text-xs py-2 px-3.5 rounded-xl hover:bg-slate-100 transition shadow"
                >
                  Install
                </button>
              </div>
            )}

            {/* Offline notification card */}
            <div className="mt-8 mx-auto bg-white max-w-sm rounded-2xl p-4 border border-slate-100 shadow-sm flex-center gap-3 text-left">
              <div className="bg-emerald-100 text-emerald-600 w-10 h-10 rounded-full flex justify-center items-center flex-shrink-0">
                <CheckCircle size={20} />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">Works Completely Offline!</h4>
                <p className="text-slate-400 text-xs">Practice Kakko and trace letters anywhere without internet access.</p>
              </div>
            </div>
          </div>
        )}

        {view === 'map' && (
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <span>🗺️ Akshar Path</span>
              </h2>
              <div className="text-xs bg-indigo-100 text-indigo-700 font-extrabold px-3 py-1.5 rounded-full font-sans">
                {progressLog.completedLessons.length} / 34 Cleared
              </div>
            </div>
            
            {/* Scrollable Map Container */}
            <div className="flex-1 overflow-y-auto pr-1 pb-10 relative bg-slate-50/50 rounded-3xl border border-slate-100 p-4 shadow-inner max-w-md mx-auto w-full min-h-[400px]">
              {/* Adventure Path Line */}
              <div className="absolute left-1/2 top-4 bottom-10 w-1.5 border-l-4 border-dashed border-indigo-200 -translate-x-1/2 z-0" />
              
              <div className="flex flex-col gap-10 relative z-10">
                {sessionCurriculum.map((item, idx) => {
                  const isCompleted = progressLog.completedLessons.includes(item.id);
                  const isLocked = idx > 0 && 
                                   !progressLog.completedLessons.includes(sessionCurriculum[idx - 1].id) && 
                                   parentUnlockAll !== true;
                  const isActive = !isLocked && !isCompleted;
                  
                  const alignment = idx % 2 === 0 ? 'flex-row' : 'flex-row-reverse';
                  const translateOffset = idx % 2 === 0 ? 'translate-x-6' : '-translate-x-6';
                  
                  let stoneStyle = "bg-white border-slate-200 text-slate-700 shadow-md hover:scale-105 active:scale-95";
                  let badgeIcon = null;
                  
                  if (isLocked) {
                    stoneStyle = "bg-slate-200/90 border-slate-300 text-slate-400 cursor-not-allowed opacity-80";
                    badgeIcon = <Lock size={12} className="text-slate-400" />;
                  } else if (isActive) {
                    stoneStyle = "bg-indigo-600 border-indigo-700 text-white scale-110 shadow-lg shadow-indigo-600/30 animate-bounce-slow cursor-pointer ring-4 ring-indigo-100";
                    badgeIcon = <Sparkles size={12} className="text-white" />;
                  } else if (isCompleted) {
                    stoneStyle = "bg-emerald-500 border-emerald-600 text-white shadow-md cursor-pointer hover:bg-emerald-600";
                    badgeIcon = <CheckCircle size={12} className="text-white" />;
                  }
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`flex items-center justify-center w-full ${alignment}`}
                    >
                      <button
                        disabled={isLocked}
                        onClick={() => {
                          setCurrentLessonIndex(idx);
                          setView('learn');
                          playSound('waypoint');
                        }}
                        className={`w-16 h-16 rounded-full flex flex-col justify-center items-center font-extrabold text-2xl border-4 transition-all duration-300 relative ${stoneStyle}`}
                      >
                        <span>{item.letter}</span>
                        {badgeIcon && (
                          <div className="absolute -top-1 -right-1 bg-slate-800 rounded-full p-1 border-2 border-white shadow-sm flex items-center justify-center">
                            {badgeIcon}
                          </div>
                        )}
                      </button>
                      
                      <div className={`w-32 px-3 py-2 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-2 ${translateOffset} transition-all duration-300 ${isLocked ? 'opacity-50' : 'opacity-100'}`}>
                        <span className="text-xl">{item.emoji}</span>
                        <div className="flex flex-col text-left font-sans">
                          <span className="font-extrabold text-xs text-slate-800 leading-tight">{item.english}</span>
                          <span className="text-xxs text-slate-400 font-bold truncate leading-none mt-0.5">{item.wordEnglish}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {view === 'learn' && (
          <div className="flex-1 flex flex-col">
            {/* Top Navigation Selector */}
            <div className="flex justify-between items-center mb-4">
              <button 
                onClick={() => setView('map')} 
                className="font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm shadow-sm flex-shrink-0"
              >
                🗺️ Map
              </button>
              
              <div className="flex gap-1.5 overflow-x-auto max-w-[280px] no-scrollbar pb-1">
                {sessionCurriculum.map((item, idx) => {
                  const isLocked = idx > 0 && 
                                   !progressLog.completedLessons.includes(sessionCurriculum[idx - 1].id) && 
                                   parentUnlockAll !== true;
                  return (
                    <button
                      key={item.id}
                      disabled={isLocked}
                      onClick={() => setCurrentLessonIndex(idx)}
                      className={`w-8 h-8 rounded-lg font-bold flex justify-center items-center border transition-all flex-shrink-0 text-sm ${currentLessonIndex === idx ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105' : isLocked ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                      {item.letter}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tracing Content Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex-1 flex flex-col items-center">
              <div className="flex justify-between items-center w-full mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-extrabold text-indigo-600">{currentLesson.letter}</span>
                  <span className="text-slate-400 font-bold text-lg">({currentLesson.english})</span>
                </div>
                
                <button 
                  onClick={handleLessonSpeech}
                  className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 p-3 rounded-2xl transition shadow-sm"
                  title="Listen Pronunciation"
                >
                  <Volume2 size={22} className="fill-indigo-100" />
                </button>
              </div>

              {/* Word association card */}
              <div className="flex items-center gap-3 bg-indigo-50/50 w-full p-3 rounded-2xl border border-indigo-50 mb-3">
                <span className="text-4xl">{currentLesson.emoji}</span>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-base">{currentLesson.word}</h4>
                  <p className="text-indigo-600/80 font-bold text-sm">{currentLesson.wordEnglish}</p>
                </div>
              </div>

              {/* Phonics Helper Card */}
              <div className="flex items-center justify-between w-full p-3 mb-4 bg-amber-50/60 border border-amber-100 rounded-2xl">
                <div className="flex flex-col text-left font-sans">
                  <span className="text-xs font-extrabold text-amber-800 uppercase tracking-wide">Pronunciation Helper</span>
                  <span className="text-xs font-bold text-slate-700 mt-0.5">
                    <strong>"{PHONICS_GUIDE[currentLesson.id]?.phonic || currentLesson.english}"</strong> — {PHONICS_GUIDE[currentLesson.id]?.pron || ''}
                  </span>
                </div>
                <button
                  onClick={() => speak(currentLesson.letter)}
                  className="bg-amber-500 hover:bg-amber-600 text-white p-2.5 rounded-xl shadow-sm transition flex-shrink-0"
                  title="Listen Pronunciation"
                >
                  <Volume2 size={16} className="fill-white" />
                </button>
              </div>

              {/* Canvas draw field */}
              <div 
                style={{ position: 'relative', aspectRatio: '380/320' }}
                className="border-4 border-slate-200 rounded-3xl overflow-hidden shadow-inner bg-slate-100 w-full max-w-[380px] flex-1 flex items-center justify-center"
              >
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={320}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair touch-none"
                />

                {/* Guidance Waypoints */}
                {currentLesson.waypoints.map((wp, idx) => {
                  const isCompleted = completedWaypoints.includes(idx);
                  const isNext = completedWaypoints.length === idx;
                  
                  let dotClass = "bg-white border-slate-300 text-slate-500";
                  if (editorMode && editorActive) {
                    dotClass = "bg-amber-500 border-amber-600 text-white scale-105 shadow z-20 animate-pulse cursor-move select-none";
                  } else if (isCompleted) {
                    dotClass = "bg-emerald-500 border-emerald-600 text-white scale-90";
                  } else if (isNext) {
                    dotClass = "bg-indigo-600 border-indigo-700 text-white pulse-glow-dot scale-110 z-10";
                  }

                  // Dash border indicator for moveTo starting new strokes
                  const strokeStyle = wp.moveTo ? { borderStyle: 'dashed', borderWidth: '3px', borderColor: '#4f46e5' } : {};
                  
                  return (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        left: `${(wp.x / 380) * 100}%`,
                        top: `${(wp.y / 320) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        ...strokeStyle
                      }}
                      onMouseDown={(e) => handleWaypointMouseDown(e, idx)}
                      onTouchStart={(e) => handleWaypointTouchStart(e, idx)}
                      className={`w-8 h-8 rounded-full flex justify-center items-center font-bold text-xs shadow border-2 transition-all ${dotClass}`}
                    >
                      {wp.label}
                    </div>
                  );
                })}
              </div>

              {/* Developer Waypoint Editor Section */}
              {editorMode && (
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
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${editorActive ? 'bg-amber-600 border-amber-600 text-white shadow-sm' : 'bg-white border-amber-200 text-amber-700'}`}
                      >
                        Editor Active
                      </button>
                      <button
                        onClick={() => setEditorActive(false)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${!editorActive ? 'bg-amber-600 border-amber-600 text-white shadow-sm' : 'bg-white border-amber-200 text-amber-700'}`}
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
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${!editorRecordMode ? 'bg-amber-600 border-amber-600 text-white shadow-sm' : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-50'}`}
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
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3 px-2 rounded-xl text-xs flex justify-center items-center gap-1.5 transition shadow font-sans"
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
                </div>
              )}

              {/* Kid friendly Brush toolbar */}
              <div className="flex flex-col gap-3 w-full mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">Brush Color:</span>
                  <div className="flex gap-2">
                    {[
                      { hex: '#6366f1', label: 'Indigo' },
                      { hex: '#f43f5e', label: 'Rose' },
                      { hex: '#10b981', label: 'Emerald' },
                      { hex: '#f59e0b', label: 'Amber' },
                      { hex: '#a855f7', label: 'Purple' }
                    ].map(c => (
                      <button
                        key={c.hex}
                        onClick={() => setBrushColor(c.hex)}
                        style={{ backgroundColor: c.hex }}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${brushColor === c.hex ? 'border-slate-800 scale-110 shadow-sm' : 'border-white hover:scale-105'}`}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">Brush Size:</span>
                  <div className="flex gap-1.5 font-sans">
                    {[
                      { width: 8, label: 'Thin' },
                      { width: 16, label: 'Medium' },
                      { width: 24, label: 'Thick' }
                    ].map(s => (
                      <button
                        key={s.width}
                        onClick={() => setBrushWidth(s.width)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${brushWidth === s.width ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-slate-400 text-sm mt-3 text-center px-4 font-medium italic">
                {currentLesson.instructions}
              </p>

              {/* Clear and voice actions */}
              <div className="flex gap-3 w-full mt-4 font-sans">
                <button
                  onClick={initCanvas}
                  className="flex-1 border-3 border-slate-200 hover:border-slate-300 text-slate-600 font-extrabold py-3.5 px-4 rounded-2xl flex justify-center items-center gap-2 transition"
                >
                  <RotateCcw size={18} />
                  <span>Clear</span>
                </button>
                <button
                  onClick={handleLessonSpeech}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3.5 px-4 rounded-2xl flex justify-center items-center gap-2 transition shadow-lg shadow-emerald-500/20"
                >
                  <Volume2 size={18} />
                  <span>Speak</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'games' && (
          <div className="flex-1 flex flex-col text-center">
            <h2 className="text-2xl font-black text-slate-800 mb-1">🎮 Game Zone</h2>
            <p className="text-slate-500 font-medium mb-6 text-sm">Choose a game to play and earn stars!</p>
            
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto w-full font-sans">
              {/* Phonics Listen & Tap */}
              <button
                onClick={startPhonicsGame}
                className="bg-gradient-to-tr from-amber-400 to-amber-500 text-white p-5 rounded-3xl shadow-lg border border-amber-300 flex flex-col items-center gap-3 transition-transform hover:-translate-y-1 active:translate-y-0"
              >
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex justify-center items-center text-3xl">👂</div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm leading-tight">Listen & Tap</span>
                  <span className="text-white/80 font-bold text-xxs mt-1">Phonics sound quiz</span>
                </div>
              </button>

              {/* Memory Match */}
              <button
                onClick={startMemoryMatch}
                className="bg-gradient-to-tr from-rose-400 to-rose-500 text-white p-5 rounded-3xl shadow-lg border border-rose-300 flex flex-col items-center gap-3 transition-transform hover:-translate-y-1 active:translate-y-0"
              >
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex justify-center items-center text-3xl">🎴</div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm leading-tight">Memory Match</span>
                  <span className="text-white/80 font-bold text-xxs mt-1">Flip and match cards</span>
                </div>
              </button>

              {/* Picture Match */}
              <button
                onClick={startMatchGame}
                className="bg-gradient-to-tr from-purple-400 to-purple-500 text-white p-5 rounded-3xl shadow-lg border border-purple-300 flex flex-col items-center gap-3 transition-transform hover:-translate-y-1 active:translate-y-0"
              >
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex justify-center items-center text-3xl">🖼️</div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm leading-tight">Picture Match</span>
                  <span className="text-white/80 font-bold text-xxs mt-1">Find the matching image</span>
                </div>
              </button>

              {/* Translate Quiz */}
              <button
                onClick={startQuiz}
                className="bg-gradient-to-tr from-indigo-400 to-indigo-500 text-white p-5 rounded-3xl shadow-lg border border-indigo-300 flex flex-col items-center gap-3 transition-transform hover:-translate-y-1 active:translate-y-0"
              >
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex justify-center items-center text-3xl">📝</div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm leading-tight">Translate Quiz</span>
                  <span className="text-white/80 font-bold text-xxs mt-1">Sound translation test</span>
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
                <p className="text-slate-400 text-xs font-medium">Listen carefully and tap the matching letter!</p>
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
                      <span>Khoṭu! Try again.</span>
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
                <p className="text-slate-400 text-xs font-medium">Flip cards to match the letter to its starting image!</p>
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
                  className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3 px-4 rounded-xl text-sm transition shadow font-sans"
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
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex justify-center items-center font-bold text-5xl mb-4 shadow-sm animate-bounce-slow">
                {sessionCurriculum[matchIndex].letter}
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
                      <span>Khoṭu! Try again.</span>
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
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex justify-center items-center font-bold text-4xl mb-4">
                {sessionCurriculum[quizIndex].letter}
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
                      buttonClass = "border-3 border-slate-100 opacity-60 text-slate-400";
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
                      <span>Khoṭu! Try again next question.</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'sandbox' && (
          <div className="flex-1 flex flex-col text-center justify-center">
            <div className="flex justify-between items-center mb-4">
              <button 
                onClick={() => setView('home')} 
                className="font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm shadow-sm flex-shrink-0"
              >
                Back
              </button>
              <span className="font-bold text-slate-700 text-lg">Sticker Sandbox</span>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex-1 flex flex-col items-center max-w-sm mx-auto w-full">
              {/* Tool Mode selector */}
              <div className="flex gap-2 mb-3 w-full font-sans">
                <button
                  onClick={() => setSandboxTool('draw')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${sandboxTool === 'draw' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  ✏️ Brush Draw
                </button>
                <button
                  onClick={() => setSandboxTool('stamp')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${sandboxTool === 'stamp' ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  🖼️ Sticker Stamp
                </button>
              </div>

              {/* Blank canvas field */}
              <div 
                style={{ position: 'relative', aspectRatio: '380/320' }}
                className="border-4 border-slate-200 rounded-3xl overflow-hidden shadow-inner bg-white w-full max-w-[380px] flex-1 flex items-center justify-center"
              >
                <canvas
                  ref={sandboxCanvasRef}
                  width={380}
                  height={320}
                  onMouseDown={startSandboxDrawing}
                  onMouseMove={drawSandbox}
                  onMouseUp={stopSandboxDrawing}
                  onMouseLeave={stopSandboxDrawing}
                  onTouchStart={startSandboxDrawing}
                  onTouchMove={drawSandbox}
                  onTouchEnd={stopSandboxDrawing}
                  className="w-full h-full cursor-crosshair touch-none"
                />
              </div>

              {/* Draw Toolbar config */}
              {sandboxTool === 'draw' ? (
                <div className="flex flex-col gap-3 w-full mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Brush Color:</span>
                    <div className="flex gap-2">
                      {[
                        { hex: '#6366f1', label: 'Indigo' },
                        { hex: '#f43f5e', label: 'Rose' },
                        { hex: '#10b981', label: 'Emerald' },
                        { hex: '#f59e0b', label: 'Amber' },
                        { hex: '#a855f7', label: 'Purple' }
                      ].map(c => (
                        <button
                          key={c.hex}
                          onClick={() => setBrushColor(c.hex)}
                          style={{ backgroundColor: c.hex }}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${brushColor === c.hex ? 'border-slate-800 scale-110 shadow-sm' : 'border-white hover:scale-105'}`}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Brush Size:</span>
                    <div className="flex gap-1.5 font-sans">
                      {[
                        { width: 8, label: 'Thin' },
                        { width: 16, label: 'Medium' },
                        { width: 24, label: 'Thick' }
                      ].map(s => (
                        <button
                          key={s.width}
                          onClick={() => setBrushWidth(s.width)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${brushWidth === s.width ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Sticker Stamp Selection grid */
                <div className="w-full mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 block text-left mb-2">Select Stamp Emoji:</span>
                  <div className="flex gap-2 overflow-x-auto pb-1 max-w-full no-scrollbar">
                    {sessionCurriculum.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedSandboxSticker(item.emoji)}
                        className={`text-2xl p-2 rounded-xl border transition flex-shrink-0 ${selectedSandboxSticker === item.emoji ? 'bg-indigo-50 border-indigo-300 scale-105 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                      >
                        {item.emoji}
                      </button>
                    ))}
                    {unlockedStickers.map(id => {
                      const sticker = STICKERS.find(s => s.id === id);
                      return sticker ? (
                        <button
                          key={sticker.id}
                          onClick={() => setSelectedSandboxSticker(sticker.emoji)}
                          className={`text-2xl p-2 rounded-xl border transition flex-shrink-0 ${selectedSandboxSticker === sticker.emoji ? 'bg-indigo-50 border-indigo-300 scale-105 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                        >
                          {sticker.emoji}
                        </button>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* Clear and save actions */}
              <div className="flex gap-3 w-full mt-4 font-sans">
                <button
                  onClick={initSandboxCanvas}
                  className="flex-1 border-3 border-slate-200 hover:border-slate-300 text-slate-600 font-extrabold py-3 px-4 rounded-2xl flex justify-center items-center gap-2 transition"
                >
                  <RotateCcw size={18} />
                  <span>Clear Board</span>
                </button>
                <button
                  onClick={() => {
                    confetti({ particleCount: 50, spread: 60 });
                    playSound('success');
                    speak("તમારું ચિત્ર સુંદર છે!"); // Your picture is beautiful!
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-4 rounded-2xl flex justify-center items-center gap-2 transition shadow-lg shadow-indigo-600/20"
                >
                  <Sparkles size={18} />
                  <span>Brag Art!</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'stickers' && (
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
                          className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs mt-2 transition shadow-sm font-sans ${canAfford ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                          Buy for {sticker.cost} Pts
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {view === 'dashboard' && (
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
                  <p className="text-slate-400 text-xs font-medium">Verify kid's daily progress and records</p>
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

              {/* Parents config settings */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 flex flex-col gap-4">
                <h4 className="font-extrabold text-sm text-slate-700 uppercase tracking-wider">Parental Controls & Settings</h4>
                
                {/* Gate type selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500">Security Gate Type:</label>
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

                {/* PIN value editing */}
                {gateType === 'pin' && (
                  <div className="flex flex-col gap-1.5 border-t border-slate-200/60 pt-3">
                    <label className="text-xs font-bold text-slate-500">Set Custom 4-Digit Passcode PIN:</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="password"
                        maxLength={4}
                        placeholder="e.g. 1234"
                        value={tempPasscode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setTempPasscode(val);
                        }}
                        className="w-24 border-2 border-slate-200 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2 text-center text-sm font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (tempPasscode.length === 4) {
                            setParentPasscode(tempPasscode);
                            alert(`Passcode saved: ${tempPasscode}`);
                            setTempPasscode('');
                          } else {
                            alert("Passcode must be exactly 4 digits.");
                          }
                        }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 px-3.5 rounded-xl transition"
                      >
                        Save PIN
                      </button>
                      <span className="text-xs text-slate-400">Active: {parentPasscode}</span>
                    </div>
                  </div>
                )}

                {/* Audio sound settings */}
                <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-slate-700">App Sound Effects</span>
                    <span className="text-xs text-slate-400">Toggle sound signals for quiz & tracing</span>
                  </div>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-12 h-6 rounded-full transition-all relative ${soundEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${soundEnabled ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>

                {/* Waypoint Editor Mode Toggle */}
                <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">Developer Waypoint Editor</span>
                    <span className="text-xs text-slate-400">Enable click-to-place waypoint builder tool</span>
                  </div>
                  <button
                    onClick={() => {
                      const next = !editorMode;
                      setEditorMode(next);
                      localStorage.setItem('guj_editor_mode', next);
                    }}
                    className={`w-12 h-6 rounded-full transition-all relative ${editorMode ? 'bg-amber-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${editorMode ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>

                {/* Unlock All Letters Toggle */}
                <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">Unlock All Tracing Letters</span>
                    <span className="text-xs text-slate-400">Bypass sequential progression requirement</span>
                  </div>
                  <button
                    onClick={() => {
                      const next = !parentUnlockAll;
                      setParentUnlockAll(next);
                      localStorage.setItem('guj_parent_unlock_all', next);
                    }}
                    className={`w-12 h-6 rounded-full transition-all relative ${parentUnlockAll ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${parentUnlockAll ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>

                {/* Wipe custom waypoints */}
                <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">Revert All Custom Waypoints</span>
                    <span className="text-xs text-slate-400">Clear all recorded paths and revert to default</span>
                  </div>
                  <button
                    onClick={clearAllCustomWaypoints}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs py-2.5 px-4 rounded-xl border border-rose-200 transition"
                  >
                    Revert All
                  </button>
                </div>

                {/* Export all custom waypoints */}
                <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">Export Full Curriculum JSON</span>
                    <span className="text-xs text-slate-400">Download the entire curriculum including custom waypoints</span>
                  </div>
                  <button
                    onClick={exportAllCustomWaypoints}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs py-2.5 px-4 rounded-xl border border-indigo-200 transition"
                  >
                    Export JSON
                  </button>
                </div>
              </div>

              {/* Sync status card */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-700">Database Sync Status</h4>
                  <p className="text-xs text-slate-400">IndexedDB local offline storage active</p>
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
                          <span>{item.letter}</span>
                          <span className="text-xs text-slate-400">({item.english})</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm font-medium italic">No letters successfully completed yet.</p>
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
                  <p className="text-slate-400 text-sm font-medium italic">No stickers purchased yet.</p>
                )}
              </div>

              {/* Danger Zone */}
              <div className="mt-auto border-t border-slate-100 pt-6">
                <button
                  onClick={resetAllProgress}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold py-3.5 px-4 rounded-2xl flex justify-center items-center gap-2 transition"
                >
                  <RefreshCw size={16} />
                  <span>Reset All Progress</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer Nav Bar */}
      {view !== 'dashboard' && (
        <nav className="bg-white border-t border-slate-100 px-1 py-2 flex justify-around items-center sticky bottom-0 z-30 shadow-md">
          <button 
            onClick={() => setView('home')} 
            className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition ${view === 'home' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
          >
            <Home size={18} />
            <span className="text-xxs font-bold">Home</span>
          </button>
          
          <button 
            onClick={() => setView('map')} 
            className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition ${view === 'map' || view === 'learn' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
          >
            <Map size={18} />
            <span className="text-xxs font-bold">Trace</span>
          </button>

          <button 
            onClick={() => setView('games')} 
            className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition ${['games', 'match', 'quiz', 'phonics_game', 'memory_match'].includes(view) ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
          >
            <Gamepad2 size={18} />
            <span className="text-xxs font-bold">Games</span>
          </button>

          <button 
            onClick={() => setView('sandbox')} 
            className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition ${view === 'sandbox' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
          >
            <Palette size={18} />
            <span className="text-xxs font-bold">Sandbox</span>
          </button>

          <button 
            onClick={() => setView('stickers')} 
            className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition ${view === 'stickers' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
          >
            <Sparkles size={18} />
            <span className="text-xxs font-bold">Shop</span>
          </button>
        </nav>
      )}
    </div>
  );
}
