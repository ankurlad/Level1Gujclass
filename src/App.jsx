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
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';

const CURRICULUM = [
  {
    id: 'ka',
    letter: 'ક',
    english: 'Ka',
    word: 'કમળ',
    wordEnglish: 'Lotus',
    emoji: '🪷',
    instructions: 'Start from top-right, draw an S shape to bottom-left, then draw the crossbar.',
    waypoints: [
      { x: 260, y: 110, label: '1' },
      { x: 190, y: 110, label: '2' },
      { x: 130, y: 175, label: '3' },
      { x: 190, y: 240, label: '4' },
      { x: 120, y: 250, label: '5' },
      { x: 140, y: 180, label: '6' },
      { x: 240, y: 180, label: '7' }
    ]
  },
  {
    id: 'kha',
    letter: 'ખ',
    english: 'Kha',
    word: 'ખિસકોલી',
    wordEnglish: 'Squirrel',
    emoji: '🐿️',
    instructions: 'Start top-left, make a loop on the left, draw horizontal bar, and finish with vertical line.',
    waypoints: [
      { x: 150, y: 100, label: '1' },
      { x: 110, y: 140, label: '2' },
      { x: 150, y: 170, label: '3' },
      { x: 220, y: 170, label: '4' },
      { x: 250, y: 100, label: '5' },
      { x: 250, y: 260, label: '6' }
    ]
  },
  {
    id: 'ga',
    letter: 'ગ',
    english: 'Ga',
    word: 'ગાય',
    wordEnglish: 'Cow',
    emoji: '🐄',
    instructions: 'Draw a hook shape on the left, then a vertical line on the right.',
    waypoints: [
      { x: 180, y: 120, label: '1' },
      { x: 120, y: 150, label: '2' },
      { x: 120, y: 230, label: '3' },
      { x: 180, y: 230, label: '4' },
      { x: 260, y: 100, label: '5' },
      { x: 260, y: 260, label: '6' }
    ]
  },
  {
    id: 'gha',
    letter: 'ઘ',
    english: 'Gha',
    word: 'ઘર',
    wordEnglish: 'House',
    emoji: '🏠',
    instructions: 'Draw two curves starting from top-left, and finish with a vertical line on the right.',
    waypoints: [
      { x: 120, y: 110, label: '1' },
      { x: 120, y: 180, label: '2' },
      { x: 180, y: 180, label: '3' },
      { x: 200, y: 250, label: '4' },
      { x: 270, y: 100, label: '5' },
      { x: 270, y: 260, label: '6' }
    ]
  },
  {
    id: 'cha',
    letter: 'ચ',
    english: 'Cha',
    word: 'ચકલી',
    wordEnglish: 'Sparrow',
    emoji: '🐦',
    instructions: 'Start from left, make a middle loop, drop down to a curve, and draw the vertical line.',
    waypoints: [
      { x: 120, y: 160, label: '1' },
      { x: 190, y: 160, label: '2' },
      { x: 150, y: 240, label: '3' },
      { x: 250, y: 100, label: '4' },
      { x: 250, y: 260, label: '5' }
    ]
  },
  {
    id: 'chha',
    letter: 'છ',
    english: 'Chha',
    word: 'છત્રી',
    wordEnglish: 'Umbrella',
    emoji: '🌂',
    instructions: 'Draw consecutive loops descending, tie a knot at bottom-right, and draw a short hook up.',
    waypoints: [
      { x: 140, y: 110, label: '1' },
      { x: 130, y: 170, label: '2' },
      { x: 180, y: 230, label: '3' },
      { x: 240, y: 180, label: '4' },
      { x: 260, y: 140, label: '5' },
      { x: 260, y: 100, label: '6' }
    ]
  },
  {
    id: 'ja',
    letter: 'જ',
    english: 'Ja',
    word: 'જહાજ',
    wordEnglish: 'Ship',
    emoji: '🚢',
    instructions: 'Draw a top-left loop, curve down to center loop, loop at bottom, and end with right hook.',
    waypoints: [
      { x: 120, y: 120, label: '1' },
      { x: 160, y: 180, label: '2' },
      { x: 130, y: 240, label: '3' },
      { x: 220, y: 240, label: '4' },
      { x: 250, y: 200, label: '5' }
    ]
  },
  {
    id: 'jha',
    letter: 'ઝ',
    english: 'Jha',
    word: 'ઝાડ',
    wordEnglish: 'Tree',
    emoji: '🌳',
    instructions: 'Draw a left curve shape, then draw a right hook shape connected next to it.',
    waypoints: [
      { x: 160, y: 110, label: '1' },
      { x: 120, y: 150, label: '2' },
      { x: 180, y: 190, label: '3' },
      { x: 100, y: 250, label: '4' },
      { x: 250, y: 120, label: '5' },
      { x: 250, y: 260, label: '6' }
    ]
  },
  {
    id: 'ta',
    letter: 'ટ',
    english: 'Ta',
    word: 'ટામેટું',
    wordEnglish: 'Tomato',
    emoji: '🍅',
    instructions: 'Draw a top loop right and hook left like a backwards S.',
    waypoints: [
      { x: 140, y: 120, label: '1' },
      { x: 230, y: 140, label: '2' },
      { x: 190, y: 200, label: '3' },
      { x: 150, y: 240, label: '4' },
      { x: 230, y: 250, label: '5' }
    ]
  },
  {
    id: 'tha',
    letter: 'ઠ',
    english: 'Tha',
    word: 'ઠળીયો',
    wordEnglish: 'Peach seed',
    emoji: '🍑',
    instructions: 'Draw a full circle starting from the top.',
    waypoints: [
      { x: 190, y: 100, label: '1' },
      { x: 130, y: 180, label: '2' },
      { x: 190, y: 260, label: '3' },
      { x: 250, y: 180, label: '4' },
      { x: 195, y: 105, label: '5' }
    ]
  },
  {
    id: 'da',
    letter: 'ડ',
    english: 'Da',
    word: 'ડમરું',
    wordEnglish: 'Small Drum',
    emoji: '🪘',
    instructions: 'Draw an S shape from top to bottom.',
    waypoints: [
      { x: 240, y: 110, label: '1' },
      { x: 150, y: 150, label: '2' },
      { x: 240, y: 210, label: '3' },
      { x: 150, y: 250, label: '4' }
    ]
  },
  {
    id: 'dha',
    letter: 'ઢ',
    english: 'Dha',
    word: 'ઢાલ',
    wordEnglish: 'Shield',
    emoji: '🛡️',
    instructions: 'Start top-right, loop left, drop down, make a small circle at the end.',
    waypoints: [
      { x: 240, y: 120, label: '1' },
      { x: 150, y: 160, label: '2' },
      { x: 200, y: 250, label: '3' },
      { x: 240, y: 220, label: '4' },
      { x: 210, y: 200, label: '5' }
    ]
  },
  {
    id: 'ana',
    letter: 'ણ',
    english: 'Na',
    word: 'બાણ',
    wordEnglish: 'Arrow',
    emoji: '🏹',
    instructions: 'Draw a standing hook curve, then a vertical bar, and finish with a vertical line.',
    waypoints: [
      { x: 130, y: 100, label: '1' },
      { x: 130, y: 240, label: '2' },
      { x: 170, y: 200, label: '3' },
      { x: 210, y: 200, label: '4' },
      { x: 260, y: 100, label: '5' },
      { x: 260, y: 260, label: '6' }
    ]
  },
  {
    id: 'ta2',
    letter: 'ત',
    english: 'Ta',
    word: 'તડબૂચ',
    wordEnglish: 'Watermelon',
    emoji: '🍉',
    instructions: 'Start with a curve, make a sharp hook right, then a vertical line on the right.',
    waypoints: [
      { x: 130, y: 180, label: '1' },
      { x: 190, y: 180, label: '2' },
      { x: 190, y: 130, label: '3' },
      { x: 250, y: 100, label: '4' },
      { x: 250, y: 260, label: '5' }
    ]
  },
  {
    id: 'tha2',
    letter: 'થ',
    english: 'Tha',
    word: 'થર્મોસ',
    wordEnglish: 'Thermos',
    emoji: '🫙',
    instructions: 'Start with a small loop, curve up and down, then draw a vertical line on the right.',
    waypoints: [
      { x: 150, y: 130, label: '1' },
      { x: 130, y: 150, label: '2' },
      { x: 170, y: 180, label: '3' },
      { x: 150, y: 240, label: '4' },
      { x: 250, y: 100, label: '5' },
      { x: 250, y: 260, label: '6' }
    ]
  },
  {
    id: 'da2',
    letter: 'દ',
    english: 'Da',
    word: 'દ્રાક્ષ',
    wordEnglish: 'Grapes',
    emoji: '🍇',
    instructions: 'Draw a C shape, then draw another C shape connected below it.',
    waypoints: [
      { x: 240, y: 110, label: '1' },
      { x: 150, y: 140, label: '2' },
      { x: 210, y: 180, label: '3' },
      { x: 150, y: 220, label: '4' },
      { x: 240, y: 250, label: '5' }
    ]
  },
  {
    id: 'dha2',
    letter: 'ધ',
    english: 'Dha',
    word: 'ધનુષ',
    wordEnglish: 'Bow',
    emoji: '🏹',
    instructions: 'Start with a small loop, draw two curves, and finish with a short vertical line.',
    waypoints: [
      { x: 140, y: 130, label: '1' },
      { x: 120, y: 160, label: '2' },
      { x: 180, y: 180, label: '3' },
      { x: 140, y: 240, label: '4' },
      { x: 250, y: 140, label: '5' },
      { x: 250, y: 260, label: '6' }
    ]
  },
  {
    id: 'na',
    letter: 'ન',
    english: 'Na',
    word: 'નળ',
    wordEnglish: 'Tap',
    emoji: '🚰',
    instructions: 'Draw a small loop, a horizontal line to the right, and finish with a vertical line.',
    waypoints: [
      { x: 140, y: 220, label: '1' },
      { x: 120, y: 200, label: '2' },
      { x: 200, y: 200, label: '3' },
      { x: 250, y: 100, label: '4' },
      { x: 250, y: 260, label: '5' }
    ]
  },
  {
    id: 'pa',
    letter: 'પ',
    english: 'Pa',
    word: 'પતંગ',
    wordEnglish: 'Kite',
    emoji: '🪁',
    instructions: 'Draw a U shape, and finish with a vertical line on the right.',
    waypoints: [
      { x: 140, y: 100, label: '1' },
      { x: 140, y: 210, label: '2' },
      { x: 200, y: 210, label: '3' },
      { x: 260, y: 100, label: '4' },
      { x: 260, y: 260, label: '5' }
    ]
  },
  {
    id: 'pha',
    letter: 'ફ',
    english: 'Pha',
    word: 'ફળ',
    wordEnglish: 'Fruit',
    emoji: '🍎',
    instructions: 'Draw a Ka-like shape but loop it differently at the bottom-right.',
    waypoints: [
      { x: 150, y: 110, label: '1' },
      { x: 190, y: 160, label: '2' },
      { x: 130, y: 220, label: '3' },
      { x: 230, y: 220, label: '4' },
      { x: 250, y: 180, label: '5' },
      { x: 140, y: 180, label: '6' },
      { x: 240, y: 180, label: '7' }
    ]
  },
  {
    id: 'ba',
    letter: 'બ',
    english: 'Ba',
    word: 'બતક',
    wordEnglish: 'Duck',
    emoji: '🦆',
    instructions: 'Draw a curve on the left, make a loop, extend right, and draw a vertical line.',
    waypoints: [
      { x: 140, y: 150, label: '1' },
      { x: 180, y: 130, label: '2' },
      { x: 180, y: 220, label: '3' },
      { x: 220, y: 220, label: '4' },
      { x: 260, y: 100, label: '5' },
      { x: 260, y: 260, label: '6' }
    ]
  },
  {
    id: 'bha',
    letter: 'ભ',
    english: 'Bha',
    word: 'ભાલુ',
    wordEnglish: 'Bear',
    emoji: '🐻',
    instructions: 'Draw a top loop, go straight down, make a bottom loop, go right, and draw a vertical line.',
    waypoints: [
      { x: 140, y: 120, label: '1' },
      { x: 140, y: 220, label: '2' },
      { x: 200, y: 200, label: '3' },
      { x: 260, y: 100, label: '4' },
      { x: 260, y: 260, label: '5' }
    ]
  },
  {
    id: 'ma',
    letter: 'મ',
    english: 'Ma',
    word: 'મરચું',
    wordEnglish: 'Chilli',
    emoji: '🌶️',
    instructions: 'Start from top-left, go down, loop to the right, and finish with a vertical line.',
    waypoints: [
      { x: 140, y: 140, label: '1' },
      { x: 140, y: 220, label: '2' },
      { x: 210, y: 220, label: '3' },
      { x: 260, y: 100, label: '4' },
      { x: 260, y: 260, label: '5' }
    ]
  },
  {
    id: 'ya',
    letter: 'ય',
    english: 'Ya',
    word: 'યજ્ઞ',
    wordEnglish: 'Sage',
    emoji: '🧘',
    instructions: 'Draw a wide double curve on the left, and finish with a vertical line on the right.',
    waypoints: [
      { x: 130, y: 120, label: '1' },
      { x: 180, y: 170, label: '2' },
      { x: 140, y: 240, label: '3' },
      { x: 260, y: 100, label: '4' },
      { x: 260, y: 260, label: '5' }
    ]
  },
  {
    id: 'ra',
    letter: 'ર',
    english: 'Ra',
    word: 'રમકડું',
    wordEnglish: 'Toy',
    emoji: '🧸',
    instructions: 'Draw a curve, make a loop at center-left, and curve down to bottom-right.',
    waypoints: [
      { x: 140, y: 110, label: '1' },
      { x: 230, y: 110, label: '2' },
      { x: 190, y: 170, label: '3' },
      { x: 140, y: 240, label: '4' },
      { x: 240, y: 250, label: '5' }
    ]
  },
  {
    id: 'la',
    letter: 'લ',
    english: 'La',
    word: 'લસણ',
    wordEnglish: 'Garlic',
    emoji: '🧄',
    instructions: 'Draw a curve like a C, a horizontal connecting line, and finish with a vertical line.',
    waypoints: [
      { x: 180, y: 250, label: '1' },
      { x: 130, y: 180, label: '2' },
      { x: 180, y: 130, label: '3' },
      { x: 210, y: 180, label: '4' },
      { x: 260, y: 100, label: '5' },
      { x: 260, y: 260, label: '6' }
    ]
  },
  {
    id: 'va',
    letter: 'વ',
    english: 'Va',
    word: 'વડ',
    wordEnglish: 'Banyan Tree',
    emoji: '🌳',
    instructions: 'Draw a circular shape on the left, and finish with a vertical line on the right.',
    waypoints: [
      { x: 180, y: 130, label: '1' },
      { x: 130, y: 180, label: '2' },
      { x: 180, y: 230, label: '3' },
      { x: 260, y: 100, label: '4' },
      { x: 260, y: 260, label: '5' }
    ]
  },
  {
    id: 'sha',
    letter: 'શ',
    english: 'Sha',
    word: 'શરણાઈ',
    wordEnglish: 'Oboe',
    emoji: '🎺',
    instructions: 'Start with a loop, draw a shape like ર, and finish with a vertical line.',
    waypoints: [
      { x: 130, y: 120, label: '1' },
      { x: 170, y: 170, label: '2' },
      { x: 130, y: 240, label: '3' },
      { x: 260, y: 100, label: '4' },
      { x: 260, y: 260, label: '5' }
    ]
  },
  {
    id: 'ssa',
    letter: 'ષ',
    english: 'Ssa',
    word: 'ષટકોણ',
    wordEnglish: 'Hexagon',
    emoji: '⬡',
    instructions: 'Draw a Pa-like shape and draw a diagonal line inside it.',
    waypoints: [
      { x: 140, y: 100, label: '1' },
      { x: 140, y: 210, label: '2' },
      { x: 200, y: 210, label: '3' },
      { x: 260, y: 100, label: '4' },
      { x: 260, y: 260, label: '5' },
      { x: 150, y: 130, label: '6' },
      { x: 250, y: 230, label: '7' }
    ]
  },
  {
    id: 'sa',
    letter: 'સ',
    english: 'Sa',
    word: 'સસલું',
    wordEnglish: 'Rabbit',
    emoji: '🐇',
    instructions: 'Draw a Ra-like shape, draw a horizontal link, and finish with a vertical line.',
    waypoints: [
      { x: 140, y: 110, label: '1' },
      { x: 190, y: 170, label: '2' },
      { x: 140, y: 240, label: '3' },
      { x: 180, y: 180, label: '4' },
      { x: 260, y: 100, label: '5' },
      { x: 260, y: 260, label: '6' }
    ]
  },
  {
    id: 'ha',
    letter: 'હ',
    english: 'Ha',
    word: 'હાથી',
    wordEnglish: 'Elephant',
    emoji: '🐘',
    instructions: 'Draw a curve down, make a small loop, and curve to bottom-right.',
    waypoints: [
      { x: 140, y: 110, label: '1' },
      { x: 240, y: 130, label: '2' },
      { x: 170, y: 190, label: '3' },
      { x: 240, y: 250, label: '4' }
    ]
  },
  {
    id: 'la2',
    letter: 'ળ',
    english: 'La',
    word: 'જળ',
    wordEnglish: 'Water',
    emoji: '💧',
    instructions: 'Draw a left curve, loop to right, loop back, and draw a hook down.',
    waypoints: [
      { x: 140, y: 110, label: '1' },
      { x: 140, y: 240, label: '2' },
      { x: 200, y: 180, label: '3' },
      { x: 260, y: 240, label: '4' },
      { x: 260, y: 110, label: '5' }
    ]
  },
  {
    id: 'ksha',
    letter: 'ક્ષ',
    english: 'Ksha',
    word: 'ક્ષત્રિય',
    wordEnglish: 'Warrior',
    emoji: '🛡️',
    instructions: 'Start with a loop, make a double loop in center, and draw vertical line.',
    waypoints: [
      { x: 150, y: 150, label: '1' },
      { x: 190, y: 150, label: '2' },
      { x: 150, y: 230, label: '3' },
      { x: 260, y: 100, label: '4' },
      { x: 260, y: 260, label: '5' }
    ]
  },
  {
    id: 'gna',
    letter: 'જ્ઞ',
    english: 'Gna',
    word: 'જ્ઞાની',
    wordEnglish: 'Wise scholar',
    emoji: '🧠',
    instructions: 'Draw a loop like Ja, draw a horizontal line, and finish with a vertical line.',
    waypoints: [
      { x: 140, y: 150, label: '1' },
      { x: 180, y: 180, label: '2' },
      { x: 140, y: 220, label: '3' },
      { x: 200, y: 220, label: '4' },
      { x: 260, y: 100, label: '5' },
      { x: 260, y: 260, label: '6' }
    ]
  }
];

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

export default function App() {
  const [view, setView] = useState('home'); // home | learn | match | quiz | stickers | dashboard
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [points, setPoints] = useState(() => Number(localStorage.getItem('guj_points')) || 0);
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [completedWaypoints, setCompletedWaypoints] = useState([]);
  const [traceStartTime, setTraceStartTime] = useState(null);
  
  const [brushColor, setBrushColor] = useState(() => localStorage.getItem('guj_brush_color') || '#6366f1');
  const [brushWidth, setBrushWidth] = useState(() => Number(localStorage.getItem('guj_brush_width')) || 16);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const val = localStorage.getItem('guj_sound_enabled');
    return val === null ? true : val === 'true';
  });

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

  const currentLesson = CURRICULUM[currentLessonIndex];

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
      initCanvas();
    }
  }, [view, currentLessonIndex]);

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
    ctx.font = '220px Fredoka, sans-serif';
    ctx.fillStyle = 'rgba(226, 232, 240, 0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentLesson.letter, canvas.width / 2, canvas.height / 2 + 10);

    // Draw dashed guide paths connecting waypoints
    if (currentLesson.waypoints && currentLesson.waypoints.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.lineWidth = 4;
      ctx.setLineDash([6, 6]);
      ctx.moveTo(currentLesson.waypoints[0].x, currentLesson.waypoints[0].y);
      for (let i = 1; i < currentLesson.waypoints.length; i++) {
        ctx.lineTo(currentLesson.waypoints[i].x, currentLesson.waypoints[i].y);
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
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoords(e);
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
      const nextIndex = (currentLessonIndex + 1) % CURRICULUM.length;
      setCurrentLessonIndex(nextIndex);
      initCanvas();
    }, 1500);
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
    const correctIdx = Math.floor(Math.random() * CURRICULUM.length);
    setMatchIndex(correctIdx);
    setMatchSelected(null);
    setMatchFeedback(null);
    
    const correctItem = CURRICULUM[correctIdx];
    const options = [correctItem];
    const pool = CURRICULUM.filter(item => item.id !== correctItem.id);
    const wrong = pool.sort(() => 0.5 - Math.random()).slice(0, 2);
    options.push(...wrong);
    
    setMatchOptions(options.sort(() => 0.5 - Math.random()));
    setView('match');
  };

  const handleMatchAnswer = (item) => {
    if (matchSelected !== null) return;
    setMatchSelected(item.id);
    const isCorrect = item.id === CURRICULUM[matchIndex].id;
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
    const correctIdx = Math.floor(Math.random() * CURRICULUM.length);
    setQuizIndex(correctIdx);
    setSelectedAnswer(null);
    setQuizFeedback(null);
    
    const options = [CURRICULUM[correctIdx]];
    const pool = CURRICULUM.filter(item => item.id !== CURRICULUM[correctIdx].id);
    const wrong = pool.sort(() => 0.5 - Math.random()).slice(0, 2);
    options.push(...wrong);
    
    setQuizOptions(options.sort(() => 0.5 - Math.random()));
    setView('quiz');
  };

  const handleQuizAnswer = (item) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(item.id);
    const isCorrect = item.id === CURRICULUM[quizIndex].id;
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
                onClick={() => setView('learn')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-lg py-4 px-6 rounded-2xl flex items-center justify-between shadow-lg shadow-indigo-600/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={24} />
                  <span>Start Tracing Kakko</span>
                </div>
                <ChevronRight size={20} />
              </button>

              <button 
                onClick={startMatchGame}
                className="bg-purple-500 hover:bg-purple-600 text-white font-extrabold text-lg py-4 px-6 rounded-2xl flex items-center justify-between shadow-lg shadow-purple-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <div className="flex items-center gap-3">
                  <Grid size={24} />
                  <span>Play Match Game</span>
                </div>
                <ChevronRight size={20} />
              </button>

              <button 
                onClick={startQuiz}
                className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-lg py-4 px-6 rounded-2xl flex items-center justify-between shadow-lg shadow-rose-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <div className="flex items-center gap-3">
                  <Award size={24} />
                  <span>Sound Quiz Game</span>
                </div>
                <ChevronRight size={20} />
              </button>

              <button 
                onClick={() => setView('stickers')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-lg py-4 px-6 rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <div className="flex items-center gap-3">
                  <Sparkles size={24} />
                  <span>Sticker Locker</span>
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
            <div className="mt-8 mx-auto bg-white max-w-sm rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3 text-left">
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

        {view === 'learn' && (
          <div className="flex-1 flex flex-col">
            {/* Top Navigation Selector */}
            <div className="flex justify-between items-center mb-4">
              <button 
                onClick={() => setView('home')} 
                className="font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm shadow-sm"
              >
                Back Home
              </button>
              
              <div className="flex gap-1.5 overflow-x-auto max-w-[280px] no-scrollbar pb-1">
                {CURRICULUM.map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentLessonIndex(idx)}
                    className={`w-8 h-8 rounded-lg font-bold flex justify-center items-center border transition-all flex-shrink-0 text-sm ${currentLessonIndex === idx ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    {item.letter}
                  </button>
                ))}
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
              <div className="flex items-center gap-3 bg-indigo-50/50 w-full p-3 rounded-2xl border border-indigo-50 mb-4">
                <span className="text-4xl">{currentLesson.emoji}</span>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-base">{currentLesson.word}</h4>
                  <p className="text-indigo-600/80 font-bold text-sm">{currentLesson.wordEnglish}</p>
                </div>
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
                  
                  return (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        left: `${(wp.x / 380) * 100}%`,
                        top: `${(wp.y / 320) * 100}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className={`w-8 h-8 rounded-full flex justify-center items-center font-bold text-xs shadow border-2 transition-all ${isCompleted ? 'bg-emerald-500 border-emerald-600 text-white scale-90' : isNext ? 'bg-indigo-600 border-indigo-700 text-white pulse-glow-dot scale-110 z-10' : 'bg-white border-slate-300 text-slate-500'}`}
                    >
                      {wp.label}
                    </div>
                  );
                })}
              </div>

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
                  <div className="flex gap-1.5">
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
              <div className="flex gap-3 w-full mt-4">
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

        {view === 'match' && (
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-4">
              <button 
                onClick={() => setView('home')} 
                className="font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm shadow-sm"
              >
                Back Home
              </button>
              <span className="font-bold text-slate-700 text-lg">Match Game</span>
            </div>

            {/* Match Game card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex justify-center items-center font-bold text-5xl mb-4 shadow-sm animate-bounce-slow">
                {CURRICULUM[matchIndex].letter}
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Find the matching card!</h2>
              <p className="text-slate-500 mb-6 font-medium">Which picture starts with the Gujarati sound above?</p>

              {/* Option cards */}
              <div className="grid grid-cols-3 gap-3 w-full">
                {matchOptions.map((option) => {
                  const isSelected = matchSelected === option.id;
                  const isCorrect = option.id === CURRICULUM[matchIndex].id;
                  
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
                <div className={`mt-6 w-full p-4 rounded-xl font-bold flex justify-center items-center gap-2 ${matchFeedback === 'correct' ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200' : 'bg-rose-50 text-rose-700 border-2 border-rose-200'}`}>
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
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex justify-between items-center mb-4">
              <button 
                onClick={() => setView('home')} 
                className="font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm shadow-sm"
              >
                Back Home
              </button>
              <span className="font-bold text-slate-700 text-lg">Quiz Challenge</span>
            </div>

            {/* Quiz selection card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex justify-center items-center font-bold text-4xl mb-4">
                {CURRICULUM[quizIndex].letter}
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Which letter is this?</h2>
              <p className="text-slate-500 mb-6 font-medium">Identify the correct phonetic sound for the Gujarati character above.</p>

              <div className="grid gap-3 w-full">
                {quizOptions.map((option) => {
                  const isSelected = selectedAnswer === option.id;
                  const isCorrect = option.id === CURRICULUM[quizIndex].id;
                  
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
                <div className={`mt-6 w-full p-4 rounded-xl font-bold flex justify-center items-center gap-2 ${quizFeedback === 'correct' ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200' : 'bg-rose-50 text-rose-700 border-2 border-rose-200'}`}>
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

        {view === 'stickers' && (
          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <button 
                onClick={() => setView('home')} 
                className="font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm shadow-sm"
              >
                Back Home
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
                          className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs mt-2 transition shadow-sm ${canAfford ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/10' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
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
                className="font-bold text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm shadow-sm"
              >
                Exit Dashboard
              </button>
              <span className="font-bold text-slate-800 text-lg">Parents Room</span>
            </div>

            {/* Dashboard stats & settings */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex-1 flex flex-col gap-6">
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
                      {progressLog.completedLessons.length} / {CURRICULUM.length} Letters
                    </span>
                  </div>
                  
                  <div className="w-full bg-slate-200/60 h-3 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${(progressLog.completedLessons.length / CURRICULUM.length) * 100}%` }}
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
                      const item = CURRICULUM.find(l => l.id === id);
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
            onClick={() => setView('learn')} 
            className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition ${view === 'learn' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
          >
            <BookOpen size={18} />
            <span className="text-xxs font-bold">Trace</span>
          </button>

          <button 
            onClick={startMatchGame} 
            className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition ${view === 'match' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
          >
            <Grid size={18} />
            <span className="text-xxs font-bold">Match</span>
          </button>

          <button 
            onClick={startQuiz} 
            className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition ${view === 'quiz' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
          >
            <Award size={18} />
            <span className="text-xxs font-bold">Quiz</span>
          </button>

          <button 
            onClick={() => setView('stickers')} 
            className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition ${view === 'stickers' ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}
          >
            <Sparkles size={18} />
            <span className="text-xxs font-bold">Stickers</span>
          </button>
        </nav>
      )}
    </div>
  );
}
