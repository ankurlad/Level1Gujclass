// The 34 Gujarati consonants, in the traditional varga order.
//
// `waypoints` are in the 0-100 path space defined by src/lib/waypoints.js: a
// percentage of the tracing box on each axis, not pixels. They were calibrated
// against Noto Sans Gujarati at 220px in a 380x320 box, so the numbers here are
// the old pixel values divided by 3.8 (x) and 3.2 (y) and rounded to
// hundredths. `label` is the 1-based order the child traces them in; `moveTo`
// lifts the pen before that point, starting a new stroke.
export const CURRICULUM = [
  {
    id: 'ka',
    letter: 'ક',
    english: 'Ka',
    word: 'કમળ',
    wordEnglish: 'Lotus',
    emoji: '🪷',
    instructions: 'Start from top-right, draw an S shape to bottom-left, then draw the crossbar.',
    waypoints: [
	  { "x": 52.89, "y": 27.19, "label": "1" },
	  { "x": 46.05, "y": 32.5, "label": "2" },
	  { "x": 46.58, "y": 43.44, "label": "3" },
	  { "x": 53.42, "y": 49.69, "label": "4" },
	  { "x": 59.74, "y": 57.81, "label": "5" },
	  { "x": 60, "y": 67.19, "label": "6" },
	  { "x": 52.37, "y": 72.5, "label": "7" },
	  { "x": 45, "y": 71.88, "label": "8" },
	  { "x": 37.89, "y": 66.56, "label": "9" },
	  { "x": 61.84, "y": 42.81, "label": "10", "moveTo": true },
	  { "x": 55.79, "y": 47.5, "label": "11" },
	  { "x": 47.63, "y": 50.94, "label": "12" },
	  { "x": 42.37, "y": 52.81, "label": "13" }
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
	  { "x": 26.71, "y": 27.62, "label": "1" },
	  { "x": 31.71, "y": 29.5, "label": "2" },
	  { "x": 32.76, "y": 38.56, "label": "3" },
	  { "x": 31.97, "y": 47, "label": "4" },
	  { "x": 33.29, "y": 56.06, "label": "5" },
	  { "x": 37.24, "y": 62, "label": "6" },
	  { "x": 44.61, "y": 60.43, "label": "7" },
	  { "x": 49.08, "y": 52.93, "label": "8" },
	  { "x": 49.87, "y": 39.18, "label": "9" },
	  { "x": 51.97, "y": 50.12, "label": "10" },
	  { "x": 56.97, "y": 55.43, "label": "11" },
	  { "x": 64.34, "y": 53.25, "label": "12" },
	  { "x": 66.45, "y": 27, "label": "13" },
	  { "x": 66.18, "y": 70.43, "label": "14" },
	  { "x": 71.97, "y": 68.87, "label": "15" }
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
	  { "x": 35.66, "y": 28.56, "label": "1" },
	  { "x": 41.97, "y": 27.62, "label": "2" },
	  { "x": 48.03, "y": 30.43, "label": "3" },
	  { "x": 51.18, "y": 36.06, "label": "4" },
	  { "x": 52.24, "y": 43.25, "label": "5" },
	  { "x": 50.39, "y": 50.75, "label": "6" },
	  { "x": 46.45, "y": 56.68, "label": "7" },
	  { "x": 40.66, "y": 57.93, "label": "8" },
	  { "x": 35.39, "y": 56.37, "label": "9" },
	  { "x": 32.24, "y": 52.31, "label": "10" },
	  { "x": 60.92, "y": 27.31, "label": "11", "moveTo": true },
	  { "x": 61.18, "y": 37.62, "label": "12" },
	  { "x": 60.92, "y": 48.87, "label": "13" },
	  { "x": 60.92, "y": 60.12, "label": "14" },
	  { "x": 61.18, "y": 71.68, "label": "15" },
	  { "x": 66.71, "y": 70.43, "label": "16" }
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
	  { "x": 44.61, "y": 27.31, "label": "1" },
	  { "x": 39.08, "y": 29.81, "label": "2" },
	  { "x": 36.18, "y": 35.75, "label": "3" },
	  { "x": 39.08, "y": 42, "label": "4" },
	  { "x": 50.39, "y": 44.18, "label": "5" },
	  { "x": 42.24, "y": 46.68, "label": "6" },
	  { "x": 37.5, "y": 50.75, "label": "7" },
	  { "x": 38.82, "y": 61.68, "label": "8" },
	  { "x": 44.34, "y": 64.5, "label": "9" },
	  { "x": 51.45, "y": 65.12, "label": "10" },
	  { "x": 58.03, "y": 60.43, "label": "11" },
	  { "x": 60.13, "y": 43.56, "label": "12" },
	  { "x": 59.87, "y": 27.93, "label": "13" },
	  { "x": 60.39, "y": 71.06, "label": "14" },
	  { "x": 66.18, "y": 69.5, "label": "15" }
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
	  { "x": 35.39, "y": 28.25, "label": "1" },
	  { "x": 43.55, "y": 29.5, "label": "2" },
	  { "x": 46.45, "y": 36.37, "label": "3" },
	  { "x": 44.87, "y": 44.81, "label": "4" },
	  { "x": 38.82, "y": 50.43, "label": "5" },
	  { "x": 33.55, "y": 49.81, "label": "6" },
	  { "x": 39.87, "y": 53.87, "label": "7" },
	  { "x": 43.29, "y": 59.81, "label": "8" },
	  { "x": 49.34, "y": 62.31, "label": "9" },
	  { "x": 55.13, "y": 60.75, "label": "10" },
	  { "x": 59.34, "y": 57.93, "label": "11" },
	  { "x": 60.39, "y": 27, "label": "12" },
	  { "x": 60.13, "y": 72.31, "label": "13" },
	  { "x": 65.66, "y": 69.5, "label": "14" }
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
	  { "x": 44.08, "y": 26.68, "label": "1" },
	  { "x": 36.97, "y": 30.43, "label": "2" },
	  { "x": 34.61, "y": 37.62, "label": "3" },
	  { "x": 36.97, "y": 45.75, "label": "4" },
	  { "x": 43.55, "y": 48.25, "label": "5" },
	  { "x": 49.87, "y": 47.93, "label": "6" },
	  { "x": 39.61, "y": 50.12, "label": "7" },
	  { "x": 36.97, "y": 55.75, "label": "8" },
	  { "x": 36.97, "y": 65.75, "label": "9" },
	  { "x": 41.18, "y": 71.68, "label": "10" },
	  { "x": 49.87, "y": 72.31, "label": "11" },
	  { "x": 56.97, "y": 68.87, "label": "12" },
	  { "x": 62.5, "y": 63.25, "label": "13" },
	  { "x": 67.5, "y": 48.87, "label": "14" },
	  { "x": 66.71, "y": 32.62, "label": "15" },
	  { "x": 61.18, "y": 27, "label": "16" },
	  { "x": 55.39, "y": 31.37, "label": "17" },
	  { "x": 54.61, "y": 40.12, "label": "18" },
	  { "x": 57.24, "y": 46.06, "label": "19" },
	  { "x": 61.71, "y": 53.56, "label": "20" }
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
	  { "x": 33.55, "y": 27.93, "label": "1" },
	  { "x": 41.45, "y": 26.68, "label": "2" },
	  { "x": 47.5, "y": 30.75, "label": "3" },
	  { "x": 49.87, "y": 38.56, "label": "4" },
	  { "x": 49.34, "y": 46.37, "label": "5" },
	  { "x": 48.03, "y": 54.5, "label": "6" },
	  { "x": 43.55, "y": 57.62, "label": "7" },
	  { "x": 36.97, "y": 59.5, "label": "8" },
	  { "x": 32.24, "y": 57.93, "label": "9" },
	  { "x": 51.18, "y": 41.68, "label": "10", "moveTo": true },
	  { "x": 56.97, "y": 42, "label": "11" },
	  { "x": 61.71, "y": 42.62, "label": "12" },
	  { "x": 65.13, "y": 47.31, "label": "13" },
	  { "x": 65.39, "y": 54.5, "label": "14" },
	  { "x": 63.29, "y": 58.87, "label": "15" },
	  { "x": 58.82, "y": 62.62, "label": "16" },
	  { "x": 61.71, "y": 24.81, "label": "17", "moveTo": true },
	  { "x": 61.97, "y": 31.68, "label": "18" },
	  { "x": 61.45, "y": 36.68, "label": "19" },
	  { "x": 60.92, "y": 40.12, "label": "20" }
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
      { x: 42.11, y: 34.38, label: '1' },
      { x: 31.58, y: 46.88, label: '2' },
      { x: 47.37, y: 59.38, label: '3' },
      { x: 26.32, y: 78.13, label: '4' },
      { x: 65.79, y: 37.5, label: '5', moveTo: true },
      { x: 65.79, y: 81.25, label: '6' }
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
      { x: 36.84, y: 37.5, label: '1' },
      { x: 60.53, y: 43.75, label: '2' },
      { x: 50, y: 62.5, label: '3' },
      { x: 39.47, y: 75, label: '4' },
      { x: 60.53, y: 78.13, label: '5' }
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
      { x: 50, y: 31.25, label: '1' },
      { x: 34.21, y: 56.25, label: '2' },
      { x: 50, y: 81.25, label: '3' },
      { x: 65.79, y: 56.25, label: '4' },
      { x: 51.32, y: 32.81, label: '5' }
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
      { x: 63.16, y: 34.38, label: '1' },
      { x: 39.47, y: 46.88, label: '2' },
      { x: 63.16, y: 65.63, label: '3' },
      { x: 39.47, y: 78.13, label: '4' }
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
      { x: 63.16, y: 37.5, label: '1' },
      { x: 39.47, y: 50, label: '2' },
      { x: 52.63, y: 78.13, label: '3' },
      { x: 63.16, y: 68.75, label: '4' },
      { x: 55.26, y: 62.5, label: '5' }
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
      { x: 34.21, y: 31.25, label: '1' },
      { x: 34.21, y: 75, label: '2' },
      { x: 44.74, y: 62.5, label: '3', moveTo: true },
      { x: 55.26, y: 62.5, label: '4' },
      { x: 68.42, y: 31.25, label: '5', moveTo: true },
      { x: 68.42, y: 81.25, label: '6' }
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
      { x: 34.21, y: 56.25, label: '1' },
      { x: 50, y: 56.25, label: '2' },
      { x: 50, y: 40.63, label: '3' },
      { x: 65.79, y: 31.25, label: '4', moveTo: true },
      { x: 65.79, y: 81.25, label: '5' }
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
      { x: 39.47, y: 40.63, label: '1' },
      { x: 34.21, y: 46.88, label: '2' },
      { x: 44.74, y: 56.25, label: '3' },
      { x: 39.47, y: 75, label: '4' },
      { x: 65.79, y: 31.25, label: '5', moveTo: true },
      { x: 65.79, y: 81.25, label: '6' }
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
      { x: 63.16, y: 34.38, label: '1' },
      { x: 39.47, y: 43.75, label: '2' },
      { x: 55.26, y: 56.25, label: '3' },
      { x: 39.47, y: 68.75, label: '4' },
      { x: 63.16, y: 78.13, label: '5' }
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
      { x: 36.84, y: 40.63, label: '1' },
      { x: 31.58, y: 50, label: '2' },
      { x: 47.37, y: 56.25, label: '3' },
      { x: 36.84, y: 75, label: '4' },
      { x: 65.79, y: 43.75, label: '5', moveTo: true },
      { x: 65.79, y: 81.25, label: '6' }
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
      { x: 36.84, y: 68.75, label: '1' },
      { x: 31.58, y: 62.5, label: '2' },
      { x: 52.63, y: 62.5, label: '3' },
      { x: 65.79, y: 31.25, label: '4', moveTo: true },
      { x: 65.79, y: 81.25, label: '5' }
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
      { x: 36.84, y: 31.25, label: '1' },
      { x: 36.84, y: 65.63, label: '2' },
      { x: 52.63, y: 65.63, label: '3' },
      { x: 68.42, y: 31.25, label: '4', moveTo: true },
      { x: 68.42, y: 81.25, label: '5' }
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
      { x: 39.47, y: 34.38, label: '1' },
      { x: 50, y: 50, label: '2' },
      { x: 34.21, y: 68.75, label: '3' },
      { x: 60.53, y: 68.75, label: '4' },
      { x: 65.79, y: 56.25, label: '5' },
      { x: 36.84, y: 56.25, label: '6', moveTo: true },
      { x: 63.16, y: 56.25, label: '7' }
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
      { x: 36.84, y: 46.88, label: '1' },
      { x: 47.37, y: 40.63, label: '2' },
      { x: 47.37, y: 68.75, label: '3' },
      { x: 57.89, y: 68.75, label: '4' },
      { x: 68.42, y: 31.25, label: '5', moveTo: true },
      { x: 68.42, y: 81.25, label: '6' }
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
      { x: 36.84, y: 37.5, label: '1' },
      { x: 36.84, y: 68.75, label: '2' },
      { x: 52.63, y: 62.5, label: '3' },
      { x: 68.42, y: 31.25, label: '4', moveTo: true },
      { x: 68.42, y: 81.25, label: '5' }
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
      { x: 36.84, y: 43.75, label: '1' },
      { x: 36.84, y: 68.75, label: '2' },
      { x: 55.26, y: 68.75, label: '3' },
      { x: 68.42, y: 31.25, label: '4', moveTo: true },
      { x: 68.42, y: 81.25, label: '5' }
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
      { x: 34.21, y: 37.5, label: '1' },
      { x: 47.37, y: 53.13, label: '2' },
      { x: 36.84, y: 75, label: '3' },
      { x: 68.42, y: 31.25, label: '4', moveTo: true },
      { x: 68.42, y: 81.25, label: '5' }
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
      { x: 36.84, y: 34.38, label: '1' },
      { x: 60.53, y: 34.38, label: '2' },
      { x: 50, y: 53.13, label: '3' },
      { x: 36.84, y: 75, label: '4' },
      { x: 63.16, y: 78.13, label: '5' }
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
      { x: 47.37, y: 78.13, label: '1' },
      { x: 34.21, y: 56.25, label: '2' },
      { x: 47.37, y: 40.63, label: '3' },
      { x: 55.26, y: 56.25, label: '4' },
      { x: 68.42, y: 31.25, label: '5', moveTo: true },
      { x: 68.42, y: 81.25, label: '6' }
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
      { x: 47.37, y: 40.63, label: '1' },
      { x: 34.21, y: 56.25, label: '2' },
      { x: 47.37, y: 71.88, label: '3' },
      { x: 68.42, y: 31.25, label: '4', moveTo: true },
      { x: 68.42, y: 81.25, label: '5' }
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
      { x: 34.21, y: 37.5, label: '1' },
      { x: 44.74, y: 53.13, label: '2' },
      { x: 34.21, y: 75, label: '3' },
      { x: 68.42, y: 31.25, label: '4', moveTo: true },
      { x: 68.42, y: 81.25, label: '5' }
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
      { x: 36.84, y: 31.25, label: '1' },
      { x: 36.84, y: 65.63, label: '2' },
      { x: 52.63, y: 65.63, label: '3' },
      { x: 68.42, y: 31.25, label: '4', moveTo: true },
      { x: 68.42, y: 81.25, label: '5' },
      { x: 39.47, y: 40.63, label: '6', moveTo: true },
      { x: 65.79, y: 71.88, label: '7' }
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
      { x: 36.84, y: 34.38, label: '1' },
      { x: 50, y: 53.13, label: '2' },
      { x: 36.84, y: 75, label: '3' },
      { x: 47.37, y: 56.25, label: '4', moveTo: true },
      { x: 68.42, y: 31.25, label: '5', moveTo: true },
      { x: 68.42, y: 81.25, label: '6' }
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
      { x: 36.84, y: 34.38, label: '1' },
      { x: 63.16, y: 40.63, label: '2' },
      { x: 44.74, y: 59.38, label: '3' },
      { x: 63.16, y: 78.13, label: '4' }
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
      { x: 36.84, y: 34.38, label: '1' },
      { x: 36.84, y: 75, label: '2' },
      { x: 52.63, y: 56.25, label: '3' },
      { x: 68.42, y: 75, label: '4' },
      { x: 68.42, y: 34.38, label: '5' }
    ]
  },
  {
    id: 'ksha',
    letter: 'ક્ષ',
    english: 'Ksha',
    word: 'ક્ષત્રિય',
    wordEnglish: 'Warrior',
    emoji: '⚔️',
    instructions: 'Start with a loop, make a double loop in center, and draw vertical line.',
    waypoints: [
      { x: 39.47, y: 46.88, label: '1' },
      { x: 50, y: 46.88, label: '2' },
      { x: 39.47, y: 71.88, label: '3' },
      { x: 68.42, y: 31.25, label: '4', moveTo: true },
      { x: 68.42, y: 81.25, label: '5' }
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
      { x: 36.84, y: 46.88, label: '1' },
      { x: 47.37, y: 56.25, label: '2' },
      { x: 36.84, y: 68.75, label: '3' },
      { x: 52.63, y: 68.75, label: '4' },
      { x: 68.42, y: 31.25, label: '5', moveTo: true },
      { x: 68.42, y: 81.25, label: '6' }
    ]
  }
];
