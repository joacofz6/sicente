const NOTE_NAMES = ["C", "D", "E", "F", "G", "A", "B"];
const NOTE_NAMES_ES = { C: "DO", D: "RE", E: "MI", F: "FA", G: "SOL", A: "LA", B: "SI" };
const NOTE_TONE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_DURATIONS = ["w", "h", "q", "8", "16"];
const noteToneBuffers = new Map();
const END_GAME_SOUND = "./assets/tones/endgame.mp3";
const ALL_POSIBLE_NOTES = ["C/2", "D/2", "E/2", "F/2", "G/2", "A/2", "B/2", "C/3", "D/3", "E/3", "F/3", "G/3", "A/3", "B/3", "C/4", "D/4", "E/4", "F/4", "G/4", "A/4", "B/4", "C/5", "D/5", "E/5", "F/5", "G/5", "A/5", "B/5", "C/6", "D/6", "E/6", "F/6", "G/6", "A/6", "B/6"]
const CLEF_CENTRAL_NOTE = { treble: 20, alto: 14, bass: 8 };
let noteAudioContext = null;
let activeNoteSource = null;
const SCALE_FACTOR = 2;

const WIN_SOUNDS = [
  "./assets/tones/win/win1.mp3",
  "./assets/tones/win/win2.mp3",
];
const ERROR_SOUNDS = [
  "./assets/error-sounds/error1.mp3",
  "./assets/error-sounds/error2.mp3",
  "./assets/error-sounds/error3.mp3",
];
const LIFE_IMAGE_SOURCES = [
  "./assets/0-lives.png",
  "./assets/1-live.png",
  "./assets/2-lives.png",
  "./assets/3-lives.png",
];
const COIN_SPRITE_SOURCES = [
  "./assets/coin-sprites/coin1.png",
  "./assets/coin-sprites/coin2.png",
  "./assets/coin-sprites/coin3.png",
];
const WIN_SPRITE_SOURCES = [
  "./assets/win-sprites/win1.png",
  "./assets/win-sprites/win2.png",
  "./assets/win-sprites/win3.png",
  "./assets/win-sprites/win4.png",
  "./assets/win-sprites/win5.png",
  "./assets/win-sprites/win6.png",
  "./assets/win-sprites/win7.png",
];
const ERROR_SPRITE_SOURCES = [
  "./assets/error-sprites/error1.png",
  "./assets/error-sprites/error2.png",
  "./assets/error-sprites/error3.png",
];

const LEADERBOARD_KEY = "musicNoteReadingLeaderboard";
const SETTINGS_KEY = "musicNoteReadingSettings";
const MAX_SCORES = 10;
const DEFAULT_SETTINGS = {
  accidentals: "natural",
  timerSeconds: 15,
  octaveRange: 1,
  clef: "treble",
  answerCount: "all",
  errorSound: true,
  muted: false,
};
const OCTAVE_OPTIONS = [1, 2, 3, 4];
const CLEF_OCTAVE_OFFSETS = { treble: 4, alto: 4, bass: 3 };
const SHARP_NOTES = ["C", "D", "F", "G", "A"];
const FLAT_NOTES = ["D", "E", "G", "A", "B"];

const output = document.getElementById("output");
const staveStageEl = document.getElementById("stave-stage");
const staveTitleEl = document.getElementById("stave-title");
const winStageEl = document.getElementById("win-stage");
const winSpriteLaneEl = document.getElementById("win-sprite-lane");
const coinSpriteLaneEl = document.getElementById("coin-sprite-lane");
const errorSpriteLaneEl = document.getElementById("error-sprite-lane");
const pauseScreenEl = document.getElementById("pause-screen");
const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("best-score");
const livesImageEl = document.getElementById("lives-image");
const timerEl = document.getElementById("timer");
const messageEl = document.getElementById("message");
const answerButtonsEl = document.getElementById("answer-buttons");
const leaderboardEl = document.getElementById("leaderboard");
const leaderboardTitleEl = document.getElementById("leaderboard-title");
const scoreEntryForm = document.getElementById("score-entry");
const playerNameInput = document.getElementById("player-name");
const settingsForm = document.getElementById("settings-form");
const welcomeScreenEl = document.getElementById("welcome-screen");
const gameScreenEl = document.getElementById("game-screen");
const settingsPanelEl = document.getElementById("settings-panel");
const startButton = document.getElementById("start");
const pauseButton = document.getElementById("pause-button");
const muteButton = document.getElementById("mute-button");
const pauseScreen = document.getElementById("pause-screen");
const accidentalModeSelect = document.getElementById("accidental-mode");
const timerDurationSelect = document.getElementById("timer-duration");

const octaveRangeSelect = document.getElementById("octave-range-selector");
const clefSelect = document.getElementById("clef-select");
const answerCountSelect = document.getElementById("answer-count");
const errorSoundToggleButton = document.getElementById("error-sound-toggle");
const settingsStatusEl = document.getElementById("settings-status");
const helpButton = document.getElementById("help-button");
const helpScreenEl = document.getElementById("help-screen");
const backToGameButton = document.getElementById("back-to-game");
const topBarEl = document.getElementById("top-bar");

function leaderboardStorageKey(accidentalMode) {
  return `${LEADERBOARD_KEY}:${accidentalMode}`;
}

function loadLeaderboard(accidentalMode) {
  try {
    const savedScores = JSON.parse(localStorage.getItem(leaderboardStorageKey(accidentalMode)) || "[]");
    if (!Array.isArray(savedScores)) return [];

    return savedScores
      .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(entry.score))
      .sort((a, b) => a.roundTime - b.roundTime)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SCORES);
  } catch {
    return [];
  }
}

function calculateBest(scores) {
  return scores.reduce((best, entry) => Math.max(best, entry.score), 0);
}

function loadSettings() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    const settings = { ...DEFAULT_SETTINGS, ...savedSettings };

    if (!["natural", "sharps", "flats", "mixed", "listen"].includes(settings.accidentals)) {
      settings.accidentals = DEFAULT_SETTINGS.accidentals;
    }
    if (![5, 10, 15, 20, 30].includes(Number(settings.timerSeconds))) {
      settings.timerSeconds = DEFAULT_SETTINGS.timerSeconds;
    } else {
      settings.timerSeconds = Number(settings.timerSeconds);
    }
    if (!OCTAVE_OPTIONS.includes(Number(settings.octaveRange))) {
      settings.octaveRange = DEFAULT_SETTINGS.octaveRange;
    }

    settings.octaveRange = Number(settings.octaveRange);

    if (!["treble", "bass", "alto"].includes(settings.clef)) {
      settings.clef = DEFAULT_SETTINGS.clef;
    }
    if (typeof settings.errorSound !== "boolean") {
      settings.errorSound = DEFAULT_SETTINGS.errorSound;
    }
    const maxAnswerCount = getNoteLabels(settings).length;
    if (settings.answerCount === "all") {
      settings.answerCount = "all";
    } else {
      const answerCount = Number(settings.answerCount);
      settings.answerCount = Number.isInteger(answerCount) && answerCount >= 4 && answerCount <= maxAnswerCount
        ? answerCount === maxAnswerCount ? "all" : answerCount
        : DEFAULT_SETTINGS.answerCount;
    }



    return settings;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

const initialSettings = loadSettings();
const initialLeaderboard = loadLeaderboard(initialSettings.accidentals);

const state = {
  score: 0,
  bestScore: calculateBest(initialLeaderboard),
  leaderboard: initialLeaderboard,
  settings: initialSettings,
  pitchDeck: [],
  lastPitchKey: null,
  lives: 3,
  timerId: null,
  timerEndTime: null,
  remainingTimeMs: 0,
  transitionTimer: null,
  currentQuestion: null,
  correctStreak: 0,
  isLocked: false,
  hasStarted: false,
  isPaused: false,
  isGameOver: false,
};

updateMuteToggle();
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function getNoteLabels(settings) {
  const includeSharps = settings.accidentals === "sharps" || settings.accidentals === "mixed";
  const includeFlats = settings.accidentals === "flats" || settings.accidentals === "mixed";

  return NOTE_NAMES.flatMap((letter) => {
    const labels = [letter];
    if (includeFlats && FLAT_NOTES.includes(letter)) labels.push(`${letter}b`);
    if (includeSharps && SHARP_NOTES.includes(letter)) labels.push(`${letter}#`);
    return labels;
  });
}

function formatNoteName(label) {
  const accidentalNames = { "#": " #", b: " b" };
  return `${NOTE_NAMES_ES[label[0]]}${accidentalNames[label.slice(1)] || ""}`;
}

async function playQuestionTone(question) {
  if (state.settings.accidentals === 'listen' || !state.settings.muted) {
    const accidentalOffset = question.accidental === "#" ? 1 : question.accidental === "b" ? -1 : 0;
    const toneIndex = (NOTE_TONE_INDEX[question.letter] + accidentalOffset + 12) % 12;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      if (!noteAudioContext) noteAudioContext = new AudioContextClass();
      if (noteAudioContext.state === "suspended") await noteAudioContext.resume();

      let buffer = noteToneBuffers.get(toneIndex);
      if (!buffer) {
        const response = await fetch(`./assets/tones/${toneIndex}.ogg`);
        if (!response.ok) throw new Error(`Tone ${toneIndex} could not be loaded.`);
        buffer = await noteAudioContext.decodeAudioData(await response.arrayBuffer());
        noteToneBuffers.set(toneIndex, buffer);
      }

      if (activeNoteSource) activeNoteSource.stop();
      const source = noteAudioContext.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = 2 ** (question.octave - 4);
      source.connect(noteAudioContext.destination);
      source.onended = () => {
        if (activeNoteSource === source) activeNoteSource = null;
      };
      activeNoteSource = source;
      source.start();
    } catch (error) {
      console.warn("No se pudo reproducir el sonido de la nota.", error);
    }
  }
}

async function playErrorTone(index) {
  if (!state.settings.muted) {
    const errorFile = ERROR_SOUNDS[index];

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      if (!noteAudioContext) noteAudioContext = new AudioContextClass();
      if (noteAudioContext.state === "suspended") await noteAudioContext.resume();

      let buffer = null;
      const response = await fetch(errorFile);
      if (!response.ok) throw new Error(`Tone ${errorFile} could not be loaded.`);
      buffer = await noteAudioContext.decodeAudioData(await response.arrayBuffer());

      if (activeNoteSource) activeNoteSource.stop();
      const source = noteAudioContext.createBufferSource();
      source.buffer = buffer;
      // source.playbackRate.value = 2 ** (question.octave - 4);
      source.connect(noteAudioContext.destination);
      source.onended = () => {
        if (activeNoteSource === source) activeNoteSource = null;
      };
      activeNoteSource = source;
      source.start();
    } catch (error) {
      console.warn("No se pudo reproducir el sonido de la nota.", error);
    }
  }
}


async function playWinTone() {
  if (!state.settings.muted) {
    // const winFile = WIN_SOUNDS[randomInt(0, WIN_SOUNDS.length - 1)];
    const winFile = WIN_SOUNDS[0];

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      if (!noteAudioContext) noteAudioContext = new AudioContextClass();
      if (noteAudioContext.state === "suspended") await noteAudioContext.resume();

      let buffer = null;
      const response = await fetch(winFile);
      if (!response.ok) throw new Error(`Tone ${toneIndex} could not be loaded.`);
      buffer = await noteAudioContext.decodeAudioData(await response.arrayBuffer());

      if (activeNoteSource) activeNoteSource.stop();
      const source = noteAudioContext.createBufferSource();
      source.buffer = buffer;
      // source.playbackRate.value = 2 ** (question.octave - 4);
      source.connect(noteAudioContext.destination);
      source.onended = () => {
        if (activeNoteSource === source) activeNoteSource = null;
      };
      activeNoteSource = source;
      source.start();
    } catch (error) {
      console.warn("No se pudo reproducir el sonido de la nota.", error);
    }
  }
}

async function playCNote() {


  const toneIndex = 0;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    if (!noteAudioContext) noteAudioContext = new AudioContextClass();
    if (noteAudioContext.state === "suspended") await noteAudioContext.resume();

    let buffer = null;
    const response = await fetch(`./assets/tones/${toneIndex}.ogg`);
    if (!response.ok) throw new Error(`Tone ${errorFile} could not be loaded.`);
    buffer = await noteAudioContext.decodeAudioData(await response.arrayBuffer());

    if (activeNoteSource) activeNoteSource.stop();
    const source = noteAudioContext.createBufferSource();
    source.buffer = buffer;
    // source.playbackRate.value = 2 ** (question.octave - 4);
    source.connect(noteAudioContext.destination);
    source.onended = () => {
      if (activeNoteSource === source) activeNoteSource = null;
    };
    activeNoteSource = source;
    source.start();
  } catch (error) {
    console.warn("No se pudo reproducir el sonido de la nota.", error);
  }

}

function buildQuestionOLD() {
  if (state.pitchDeck.length === 0) {
    const noteLabels = getNoteLabels(state.settings);
    const pitches = [];
    var octaveOffset = CLEF_OCTAVE_OFFSETS[state.settings.clef];
    const octaveRange = state.settings.octaveRange;
    //sube octava cuando embocas 10 seguidas

    const minOctave = octaveOffset - (octaveRange - 1);
    const maxOctave = octaveOffset + (octaveRange - 1);

    for (let octave = minOctave; octave <= maxOctave; octave += 1) {
      noteLabels.forEach((label) => {
        const letter = label[0];
        const accidental = label.slice(1);
        pitches.push({
          letter,
          accidental,
          octave,
          label,
          key: `${label.toLowerCase()}/${octave}`,
        });
      });
    }

    state.pitchDeck = shuffle(pitches);
    const lastIndex = state.pitchDeck.length - 1;
    if (state.pitchDeck[lastIndex].key === state.lastPitchKey) {
      [state.pitchDeck[0], state.pitchDeck[lastIndex]] = [state.pitchDeck[lastIndex], state.pitchDeck[0]];
    }
  }

  const pitch = state.pitchDeck.pop();
  const { letter, accidental, octave, key, label } = pitch;
  state.lastPitchKey = key;
  const noteLabels = getNoteLabels(state.settings);
  const distractors = shuffle(noteLabels.filter((value) => value !== label));

  const answerCount = state.settings.answerCount === "all"
    ? noteLabels.length
    : Math.min(Number(state.settings.answerCount), noteLabels.length);
  const possibleAnswers = [label, ...distractors.slice(0, answerCount - 1)]
    .sort((a, b) => noteLabels.indexOf(a) - noteLabels.indexOf(b));

  return {
    letter,
    accidental,
    octave,
    key,
    correct: label,
    clef: state.settings.clef,
    options: possibleAnswers,
  };
}

function buildQuestion() {
  if (state.pitchDeck.length === 0) {
    const noteLabels = getNoteLabels(state.settings);
    const pitches = [];
    const centralNote = CLEF_CENTRAL_NOTE[state.settings.clef];
    const minLimit = centralNote - (state.settings.octaveRange) * 7;
    const maxLimit = centralNote + (state.settings.octaveRange) * 7;
    const lowestNote = ALL_POSIBLE_NOTES[minLimit];
    const highestNote = ALL_POSIBLE_NOTES[maxLimit];

    for (let i = minLimit; i <= maxLimit; i++) {
      // const label = getNoteLabels(state.settings)[0]
      //  const letter = label[0];
      const letter = ALL_POSIBLE_NOTES[i][0];
      // const accidental = label.slice(1);
      const accidental = '';
      const label = (letter + accidental).toUpperCase();
      const octave = eval(ALL_POSIBLE_NOTES[i].toLowerCase().slice(2))
      pitches.push({
        letter,
        accidental,
        octave,
        label,
        key: ALL_POSIBLE_NOTES[i].toLowerCase(),
      });
    }
    state.pitchDeck = shuffle(pitches);
    const lastIndex = state.pitchDeck.length - 1;
    if (state.pitchDeck[lastIndex].key === state.lastPitchKey) {
      [state.pitchDeck[0], state.pitchDeck[lastIndex]] = [state.pitchDeck[lastIndex], state.pitchDeck[0]];
    }
  }




  const pitch = state.pitchDeck.pop();
  const { letter, accidental, octave, key, label } = pitch;
  state.lastPitchKey = key;
  const noteLabels = getNoteLabels(state.settings);
  const distractors = shuffle(noteLabels.filter((value) => value !== label));

  const answerCount = state.settings.answerCount === "all"
    ? noteLabels.length
    : Math.min(Number(state.settings.answerCount), noteLabels.length);
  const possibleAnswers = [label, ...distractors.slice(0, answerCount - 1)]
    .sort((a, b) => noteLabels.indexOf(a) - noteLabels.indexOf(b));

  return {
    letter,
    accidental,
    octave,
    key,
    correct: label,
    clef: state.settings.clef,
    options: possibleAnswers,
  };
}

function drawStaff(question, showHelp) {
  output.innerHTML = "";
  if (state.settings.accidentals === "listen") {
    if (showHelp) {

    } else {
      output.innerHTML = '<div class="listen-txt">Usando la oreja.. ¿qué nota es?<br><span id="playDo"><button>Ctrl</button>:DO de referencia</span><br><br><span id="repeatNote"><button>Shift</button>:Repite la nota</span></div>';
      document.getElementById("playDo").addEventListener('click',null)
      document.getElementById("playDo").addEventListener('click',function(){
        playCNote();
      })
      document.getElementById("repeatNote").addEventListener('click',null)
      document.getElementById("repeatNote").addEventListener('click',function(){
        playQuestionTone(state.currentQuestion);
      })
    }
  } else {
    const renderer = new Vex.Flow.Renderer(output, Vex.Flow.Renderer.Backends.SVG);
    const rendererWidth = 500;
    const rendererHeight = 240;
    const staveWidth = 200;
    renderer.resize(rendererWidth, rendererHeight);
    const context = renderer.getContext();

    context.setFillStyle("#f5f5f5");
    context.setStrokeStyle("#f5f5f5");
    context.scale(SCALE_FACTOR, SCALE_FACTOR);

    const staveX = (rendererWidth - staveWidth) / 2;
    const stave = new Vex.Flow.Stave(20, 0, staveWidth).addClef(question.clef);
    stave.setEndBarType(Vex.Flow.Barline.type.END);
    stave.setContext(context).draw();


    if (showHelp) {
      var octaveOffset = CLEF_OCTAVE_OFFSETS[question.clef];
      const voice = new Vex.Flow.Voice({ num_beats: 4, beat_value: 4 });
      voice.setStrict(false);
      const lyrics = NOTE_NAMES;
      for (let i = 0; i < NOTE_NAMES.length; i++) {
        const note = new Vex.Flow.StaveNote({
          clef: question.clef,
          keys: [NOTE_NAMES[i].toLowerCase() + "/" + octaveOffset],
          duration: 'q',
        });
        note.autoStem();
        voice.addTickable(note);

        const lyricAnnotation = new Vex.Flow.Annotation(NOTE_NAMES_ES[lyrics[i]])
          .setFont("ArcadeApp", 6, "normal")
          .setVerticalJustification(Vex.Flow.Annotation.VerticalJustify.TOP);
        note.addModifier(lyricAnnotation, 0)
      }




      new Vex.Flow.Formatter().joinVoices([voice]).format([voice], 150);
      voice.draw(context, stave);


    } else {
      const note = new Vex.Flow.StaveNote({
        clef: question.clef,
        keys: [question.key],
        duration: NOTE_DURATIONS[randomInt(0, NOTE_DURATIONS.length - 1)],
      });
      if (question.accidental) {
        note.addModifier(new Vex.Flow.Accidental(question.accidental));
      }

      note.autoStem();

      const voice = new Vex.Flow.Voice({ num_beats: 4, beat_value: 4 });
      voice.setStrict(false);
      voice.addTickable(note);

      new Vex.Flow.Formatter().joinVoices([voice]).format([voice], 280);
      voice.draw(context, stave);
    }
  }





}

function renderAnswerButtons(options) {
  answerButtonsEl.innerHTML = "";

  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "note-btn";
    button.textContent = formatNoteName(option);
    button.addEventListener("click", () => handleAnswer(option));
    answerButtonsEl.appendChild(button);
  });
}
function animateWinCoin() {
  const sprite = document.createElement("img");
  sprite.className = "coin-sprite";
  sprite.src = COIN_SPRITE_SOURCES[randomInt(0, COIN_SPRITE_SOURCES.length - 1)];
  sprite.alt = "";
  sprite.height = 55;

  sprite.addEventListener("animationend", () => sprite.remove(), { once: true });
  coinSpriteLaneEl.appendChild(sprite);
}
function animateWinSprite() {
  const sprite = document.createElement("img");
  sprite.className = "win-sprite";
  sprite.src = WIN_SPRITE_SOURCES[randomInt(0, WIN_SPRITE_SOURCES.length - 1)];
  sprite.alt = "";
  sprite.height = 55;
  sprite.style.imageRendering = "pixelated";
  sprite.className = "win-sprite";
  sprite.addEventListener("animationend", () => sprite.remove(), { once: true });
  winSpriteLaneEl.appendChild(sprite);
}
var idx = 0;
function animateErrorSprite() {
  const sprite = document.createElement("img");
  sprite.className = "error-sprite";
  // const idx = randomInt(0, ERROR_SPRITE_SOURCES.length - 1);
  sprite.src = ERROR_SPRITE_SOURCES[idx];
  sprite.alt = "";
  sprite.addEventListener("animationend", () => sprite.remove(), { once: true });
  errorSpriteLaneEl.appendChild(sprite);
}

function updateHUD() {
  scoreEl.textContent = state.score;
  bestScoreEl.textContent = state.bestScore;
  const lives = Math.max(0, Math.min(3, state.lives));
  livesImageEl.src = LIFE_IMAGE_SOURCES[lives];
  livesImageEl.alt = lives === 1 ? "1 vida restante" : `${lives} vidas restantes`;
}

function syncSettingsForm() {
  accidentalModeSelect.value = state.settings.accidentals;
  timerDurationSelect.value = state.settings.timerSeconds;
  octaveRangeSelect.value = state.settings.octaveRange;
  clefSelect.value = state.settings.clef;
  syncAnswerCountOptions(state.settings.answerCount);
  state.settings.answerCount = answerCountSelect.value === "all"
    ? "all"
    : Number(answerCountSelect.value);
  updateErrorSoundToggle();
}

function updateErrorSoundToggle() {
  const enabled = state.settings.errorSound;
  errorSoundToggleButton.textContent = `Sonido de error: ${enabled ? "Activado" : "Desactivado"}`;
}

function syncAnswerCountOptions(preferredValue) {
  const maxAnswerCount = getNoteLabels({ accidentals: accidentalModeSelect.value }).length;
  const requestedCount = preferredValue === undefined
    ? answerCountSelect.value
    : String(preferredValue);
  const validCount = requestedCount === "all"
    ? "all"
    : Number(requestedCount) >= maxAnswerCount
      ? "all"
      : requestedCount;

  answerCountSelect.innerHTML = "";
  for (let count = 4; count < maxAnswerCount; count += 1) {
    const option = document.createElement("option");
    option.value = count;
    option.textContent = `${count} notas`;
    answerCountSelect.appendChild(option);
  }

  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = `Todas las notas posibles (${maxAnswerCount})`;
  answerCountSelect.appendChild(allOption);
  answerCountSelect.value = validCount;
  if (!answerCountSelect.value) answerCountSelect.value = "4";
}

accidentalModeSelect.addEventListener("change", () => {
  syncAnswerCountOptions(answerCountSelect.value);
});

errorSoundToggleButton.addEventListener("click", () => {
  state.settings.errorSound = !state.settings.errorSound;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  updateErrorSoundToggle();
});

function renderLeaderboard() {
  leaderboardEl.innerHTML = "";
  const modeLabels = {
    natural: "modo Naturales",
    sharps: "Con sostenidos",
    flats: "Con bemoles",
    mixed: "Sostenidos y bemoles",
    listen: "modo Escucha",
  };
  leaderboardTitleEl.textContent = `Mejores puntuaciones: ${modeLabels[state.settings.accidentals] || state.settings.accidentals}`;

  if (state.leaderboard.length === 0) {
    const emptyRow = document.createElement("li");
    emptyRow.className = "leaderboard-empty";
    emptyRow.textContent = "AÚN NO HAY PUNTUACIONES";
    leaderboardEl.appendChild(emptyRow);
    return;
  }

  state.leaderboard.forEach((entry, index) => {
    const row = document.createElement("li");
    row.className = "leaderboard-row";

    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = String(index + 1).padStart(2, "0");

    const name = document.createElement("span");
    name.className = "leaderboard-name";
    name.textContent = entry.name;

    const score = document.createElement("span");
    score.className = "leaderboard-score";
    score.textContent = entry.score;

    const roundTime = document.createElement("span");
    roundTime.className = "leaderboard-round-time";
    roundTime.textContent = (entry.roundTime / 1000).toFixed(1) + "s";

    row.append(rank, name, score, roundTime);
    leaderboardEl.appendChild(row);
  });
}

function qualifiesForLeaderboard(score) {
  if (score <= 0) return false;
  if (state.leaderboard.length < MAX_SCORES) return true;

  return score > state.leaderboard[state.leaderboard.length - 1].score;
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function startTimer() {
  stopTimer();
  state.timerEndTime = Date.now() + state.remainingTimeMs;
  state.timerId = setInterval(() => {
    const remaining = Math.max(0, state.timerEndTime - Date.now());
    state.remainingTimeMs = remaining;
    const seconds = (remaining / 1000).toFixed(1);
    timerEl.textContent = `${seconds}s`;

    if (remaining <= 0) {
      state.remainingTimeMs = 0;
      stopTimer();
      handleTimeout();
    }
  }, 100);
}

function updatePauseButton() {
  pauseButton.textContent = state.isPaused ? "Reanudar" : "Pausar";
  pauseButton.disabled = !state.hasStarted || state.isGameOver;
}

function togglePause() {
  if (!state.hasStarted || state.isGameOver || state.isLocked) return;

  if (state.isPaused) {
    state.isPaused = false;
    staveStageEl.hidden = false;
    staveTitleEl.hidden = false;
    pauseScreenEl.hidden = true;
    answerButtonsEl.hidden = false;
    setMessage("¿Qué nota es esta?", true);
    updatePauseButton();
    startTimer();
    return;
  }
  pause()
}

function pause() {
  if (!state.hasStarted || state.isGameOver || state.isLocked) return;
  state.remainingTimeMs = Math.max(0, state.timerEndTime - Date.now());
  stopTimer();
  state.isPaused = true;
  staveStageEl.hidden = true;
  staveTitleEl.hidden = true;
  pauseScreenEl.hidden = false;
  answerButtonsEl.hidden = true;
  setMessage("Juego en pausa", true);
  updatePauseButton();
}
function unPause() {
  state.isPaused = false;
  staveStageEl.hidden = false;
  staveTitleEl.hidden = false;
  pauseScreenEl.hidden = true;
  answerButtonsEl.hidden = false;
  setMessage("¿Qué nota es esta?", true);
  updatePauseButton();
  startTimer();
  return;
}

function toggleMute() {
  if (state.settings.muted === null) {
    state.settings.muted = true;
  } else {
    state.settings.muted = !state.settings.muted;

  }
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  updateMuteToggle();
}

function updateMuteToggle() {
  const enabled = state.settings.muted;
  muteButton.textContent = enabled ? "Activar sonido" : "Shh!";
  muteButton.style.backgroundColor = enabled ? "#3d2355" : "#2f3d51";
}

function setMessage(text, isGood = true) {
  messageEl.innerText = text;
  messageEl.style.color = isGood ? "#7ef29a" : "#ff9a9a";
}

function nextRound() {
  if (state.lives == 3) {
    state.startTimeStamp = Date.now();
    idx = 0;
  }
  staveStageEl.hidden = false;
  staveTitleEl.hidden = false;
  winStageEl.hidden = true;
  if (state.transitionTimer) {
    clearTimeout(state.transitionTimer);
    state.transitionTimer = null;
  }
  state.isPaused = false;
  state.isGameOver = false;
  state.remainingTimeMs = state.settings.timerSeconds * 1000;
  staveStageEl.hidden = false;
  staveTitleEl.hidden = false;
  pauseScreenEl.hidden = true;
  answerButtonsEl.hidden = false;
  if (state.settings.accidentals === 'natural') {
    state.currentQuestion = buildQuestion();
  } else {
    state.currentQuestion = buildQuestionOLD();
  }

  if (state.correctStreak == 3 || state.correctStreak == 6 || state.correctStreak == 10 || state.correctStreak == 15  ) {
    state.score = state.score+state.correctStreak;
    showReward();
    if(state.correctStreak == 15){
      state.correctStreak = 0;
    }
  }
  

  drawStaff(state.currentQuestion);
  playQuestionTone(state.currentQuestion);
  renderAnswerButtons(state.currentQuestion.options);
  updatePauseButton();
  startTimer();
  state.isLocked = false;
  setMessage("¿Qué nota es esta?", true);
}

function showReward() {
  
  updateHUD();
  const sprite = document.createElement("div");
  sprite.innerHTML="Racha +"+state.correctStreak +"!"
  sprite.className = "reward";
  sprite.addEventListener("animationend", () => sprite.remove(), { once: true });
  winSpriteLaneEl.appendChild(sprite);
}

function scheduleTransition(callback) {
  if (state.transitionTimer) clearTimeout(state.transitionTimer);
  state.transitionTimer = setTimeout(() => {
    state.transitionTimer = null;
    callback();
  }, 900);
}

function finishGame() {
  stopTimer();

  state.isLocked = true;
  state.isPaused = false;
  state.isGameOver = true;
  state.correctStreak = 0;
  staveStageEl.hidden = false;
  staveTitleEl.hidden = false;
  pauseScreenEl.hidden = true;
  answerButtonsEl.hidden = false;
  updatePauseButton();
  renderAnswerButtons([]);
  answerButtonsEl.innerHTML = '<button type="button" class="note-btn reset-btn" id="restart-game">Jugar de nuevo</button>';
  scoreEntryForm.hidden = !qualifiesForLeaderboard(state.score);
  if (!scoreEntryForm.hidden) {
    playerNameInput.value = "";
    playerNameInput.focus();

  }
  document.getElementById("restart-game").addEventListener("click", () => {
    state.score = 0;
    state.lives = 3;
    scoreEntryForm.hidden = true;
    updateHUD();
    nextRound();
  });
  setMessage(`¡Fin del juego! Puntuación final: ${state.score}`, false);

  document.getElementById("celebration-img").src = "./assets/celebration" + randomInt(1, 3) + ".png";
  winStageEl.hidden = false;
  staveStageEl.hidden = true;
  staveTitleEl.hidden = true;
  idx = 0;
  const elem = document.getElementsByClassName('error-sprite');
  while (elem[0]) {
    elem[0].parentNode.removeChild(elem[0]);
  }
}

function showAnswerUntilContinue(message) {
  setMessage(message, false);
  renderAnswerButtons([]);
  pauseButton.disabled = true;

  const continueButton = document.createElement("button");
  continueButton.type = "button";
  continueButton.className = "pause-button";
  continueButton.textContent = "Continuar";
  continueButton.style.gridColumn = "1 / -1";
  continueButton.addEventListener("click", () => {
    continuePress();
  });
  answerButtonsEl.appendChild(continueButton);
}
function continuePress() {
  if (state.lives <= 0) {
    finishGame();
  } else {
    nextRound();
  }
}
scoreEntryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = playerNameInput.value.trim().replace(/\s+/g, " ").slice(0, 12);
  if (!name) {
    playerNameInput.focus();
    return;
  }

  state.leaderboard = [...state.leaderboard, { name, score: state.score, roundTime: state.roundTime }]
    .sort((a, b) => a.roundTime - b.roundTime)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SCORES);
  localStorage.setItem(leaderboardStorageKey(state.settings.accidentals), JSON.stringify(state.leaderboard));
  renderLeaderboard();
  scoreEntryForm.hidden = true;
  setMessage(`${name} entró en la tabla de mejores puntuaciones.`, true);
});

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();


  const octaveRange = Number(octaveRangeSelect.value);
  const previousAccidentalMode = state.settings.accidentals;


  state.settings = {
    accidentals: accidentalModeSelect.value,
    timerSeconds: Number(timerDurationSelect.value),
    octaveRange: octaveRange,
    clef: clefSelect.value,
    answerCount: answerCountSelect.value === "all" ? "all" : Number(answerCountSelect.value),
    errorSound: state.settings.errorSound,
    muted: state.settings.muted,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  if (state.settings.accidentals !== previousAccidentalMode) {
    state.leaderboard = loadLeaderboard(state.settings.accidentals);
    state.bestScore = calculateBest(state.leaderboard);
    renderLeaderboard();
  }

  stopTimer();
  if (state.transitionTimer) {
    clearTimeout(state.transitionTimer);
    state.transitionTimer = null;
  }
  state.score = 0;
  state.lives = 3;
  state.pitchDeck = [];
  state.lastPitchKey = null;
  state.correctStreak = 0;
  scoreEntryForm.hidden = true;
  settingsStatusEl.textContent = "Ajustes aplicados. Comienza una partida nueva.";
  settingsStatusEl.classList.remove("settings-error");
  updateHUD();
  if (state.hasStarted) nextRound();
  settingsPanelEl.open = false;
});

pauseButton.addEventListener("click", togglePause);
pauseScreen.addEventListener("click", togglePause);
muteButton.addEventListener("click", toggleMute);
messageEl.addEventListener("click", unPause);
startButton.addEventListener("click", startGame);

function startGame() {
  state.hasStarted = true;
  welcomeScreenEl.hidden = true;
  gameScreenEl.hidden = false;
  settingsPanelEl.open = false;
  nextRound();
}

helpButton.addEventListener("click", () => {
  showHelpScreen();
})
backToGameButton.addEventListener("click", () => {
  hideHelpScreen();
})


function handleAnswer(selected) {
  if (state.isLocked || state.isPaused) return;

  state.isLocked = true;
  stopTimer();

  if (selected === state.currentQuestion.correct) {
    state.correctStreak += 1;
    animateWinCoin()
    if (state.correctStreak % 4 === 0) animateWinSprite();
    state.score += 1;
    if (state.score > state.bestScore) {
      state.bestScore = state.score;

    }
    playWinTone();
    updateHUD();
    setMessage(`¡Correcto! La nota es ${formatNoteName(state.currentQuestion.correct)}.`, true);
  } else {
    state.correctStreak = 0;
    state.lives -= 1;
    updateHUD();
    showAnswerUntilContinue(`La respuesta era \n ${formatNoteName(state.currentQuestion.correct)}.`);
    const elem = document.getElementsByClassName('win-sprite');
    while (elem[0]) {
      elem[0].parentNode.removeChild(elem[0]);
    }
    animateErrorSprite();

    if (state.settings.errorSound) playErrorTone(idx);
    idx++;
    if (state.lives == 0) {
      state.endTimeStamp = Date.now();
      state.roundTime = (state.endTimeStamp - state.startTimeStamp);
    }
    return;
  }




  scheduleTransition(nextRound);
}

function handleTimeout() {
  if (state.isLocked || state.isPaused) return;

  state.isLocked = true;
  state.correctStreak = 0;
  state.lives -= 1;
  updateHUD();
  showAnswerUntilContinue(`¡Se acabó el tiempo! Era \n ${formatNoteName(state.currentQuestion.correct)}.`);
}

function keyPressed(event) {
  if (event.key === "Escape") {
    togglePause();
  }
  if (event.key === "Enter") {
    if (state.hasStarted === false) {
      startGame();
    } else {
      if (state.isGameOver && scoreEntryForm.hidden) {
        state.score = 0;
        state.lives = 3;
        scoreEntryForm.hidden = true;
        updateHUD();
        nextRound();
      }
    }

  }
  if (event.key === "Control") {
    if (state.hasStarted && !state.isLocked && !state.isPaused) {
      playCNote();
    }

  }
  if (event.key === "Shift") {
    if (state.hasStarted && !state.isLocked && !state.isPaused) {
      playQuestionTone(state.currentQuestion);
    }
  }

  if (event.key === " ") {

    if (state.isLocked && !state.isGameOver) {
      event.preventDefault();
      continuePress();
    } else if (playerNameInput.checkVisibility()) {

    } else {
      event.preventDefault();
    }
  }
  if (event.key >= "1" && event.key <= "7") {
    event.preventDefault();
    document.getElementById("answer-buttons")?.children[Number(event.key) - 1]?.click();
  }
}

window.addEventListener('blur', function () {
  pause();
});

function showHelpScreen() {
  helpScreenEl.hidden = false;
  messageEl.hidden = true;
  answerButtonsEl.hidden = true;
  topBarEl.hidden = true;
  pauseButton.disabled = true;
  helpButton.disabled = true;
  settingsPanelEl.hidden = true;
  stopTimer();
  drawStaff(state.currentQuestion, true);
}
function hideHelpScreen() {
  helpScreenEl.hidden = true;
  messageEl.hidden = false;
  answerButtonsEl.hidden = false;
  topBarEl.hidden = false;
  pauseButton.disabled = false;
  helpButton.disabled = false;
  settingsPanelEl.hidden = false;
  startTimer();
  drawStaff(state.currentQuestion);
}

syncSettingsForm();
updateHUD();
renderLeaderboard();
updatePauseButton();

