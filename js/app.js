const NOTE_NAMES = ["C", "D", "E", "F", "G", "A", "B"];
const NOTE_NAMES_ES = { C: "Do", D: "Re", E: "Mi", F: "Fa", G: "Sol", A: "La", B: "Si" };
const NOTE_TONE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const noteToneBuffers = new Map();
let noteAudioContext = null;
let activeNoteSource = null;
const SCALE_FACTOR = 1.8;
const WIN_SOUNDS = [
  "./assets/tones/win/win1.mp3",
  "./assets/tones/win/win2.mp3",  
];
const FART_SOUNDS = [
  "./assets/tones/farts/fart1.mp3",
  "./assets/tones/farts/fart2.mp3",
  "./assets/tones/farts/fart3.mp3",
  "./assets/tones/farts/fart4.mp3",
  "./assets/tones/farts/fart5.mp3",
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
];
const ERROR_SPRITE_SOURCES = [
  "./assets/error-sprites/error1.png",
  "./assets/error-sprites/error2.png",
  "./assets/error-sprites/error3.png",
];
const HIGH_SCORE_KEY = "musicNoteReadingHighScore";
const LEADERBOARD_KEY = "musicNoteReadingLeaderboard";
const SETTINGS_KEY = "musicNoteReadingSettings";
const MAX_SCORES = 10;
const DEFAULT_SETTINGS = {
  accidentals: "natural",
  timerSeconds: 15,
  minOctave: 4,
  maxOctave: 4,
  clef: "treble",
  answerCount: 4,
  errorSound:false,
};
const OCTAVE_OPTIONS = [2, 3, 4, 5, 6];
const CLEF_OCTAVE_OFFSETS = { treble: 0, alto: -1, bass: -2 };
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
const scoreEntryForm = document.getElementById("score-entry");
const playerNameInput = document.getElementById("player-name");
const settingsForm = document.getElementById("settings-form");
const welcomeScreenEl = document.getElementById("welcome-screen");
const gameScreenEl = document.getElementById("game-screen");
const settingsPanelEl = document.getElementById("settings-panel");
const startButton = document.getElementById("start");
const pauseButton = document.getElementById("pause-button");
const accidentalModeSelect = document.getElementById("accidental-mode");
const timerDurationSelect = document.getElementById("timer-duration");
const minOctaveSelect = document.getElementById("min-octave");
const maxOctaveSelect = document.getElementById("max-octave");
const clefSelect = document.getElementById("clef-select");
const answerCountSelect = document.getElementById("answer-count");
const errorSoundToggleButton = document.getElementById("error-sound-toggle");
const settingsStatusEl = document.getElementById("settings-status");

function loadLeaderboard() {
  try {
    const savedScores = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
    if (!Array.isArray(savedScores)) return [];

    return savedScores
      .filter((entry) => entry && typeof entry.name === "string" && Number.isFinite(entry.score))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SCORES);
  } catch {
    return [];
  }
}

function loadSettings() {
  try {
    const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    const settings = { ...DEFAULT_SETTINGS, ...savedSettings };
    
    if (!["natural", "sharps", "flats", "mixed"].includes(settings.accidentals)) {
      settings.accidentals = DEFAULT_SETTINGS.accidentals;
    }
    if (![5, 10, 15, 20, 30].includes(Number(settings.timerSeconds))) {
      settings.timerSeconds = DEFAULT_SETTINGS.timerSeconds;
    } else {
      settings.timerSeconds = Number(settings.timerSeconds);
    }
    if (!OCTAVE_OPTIONS.includes(Number(settings.minOctave))) {
      settings.minOctave = DEFAULT_SETTINGS.minOctave;
    }
    if (!OCTAVE_OPTIONS.includes(Number(settings.maxOctave))) {
      settings.maxOctave = DEFAULT_SETTINGS.maxOctave;
    }
    settings.minOctave = Number(settings.minOctave);
    settings.maxOctave = Number(settings.maxOctave);
    if (settings.minOctave > settings.maxOctave) {
      settings.minOctave = DEFAULT_SETTINGS.minOctave;
      settings.maxOctave = DEFAULT_SETTINGS.maxOctave;
    }
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

const state = {
  score: 0,
  bestScore: Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0,
  leaderboard: loadLeaderboard(),
  settings: loadSettings(),
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

async function playErrorTone() {
  const fartFile = FART_SOUNDS[randomInt(0, FART_SOUNDS.length - 1)];
  
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    if (!noteAudioContext) noteAudioContext = new AudioContextClass();
    if (noteAudioContext.state === "suspended") await noteAudioContext.resume();

    let buffer =null;
    const response = await fetch(fartFile);
    if (!response.ok) throw new Error(`Tone ${fartFile} could not be loaded.`);
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

async function playWinTone() {
  // const winFile = WIN_SOUNDS[randomInt(0, WIN_SOUNDS.length - 1)];
  const winFile = WIN_SOUNDS[0];
  
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    if (!noteAudioContext) noteAudioContext = new AudioContextClass();
    if (noteAudioContext.state === "suspended") await noteAudioContext.resume();

    let buffer =null;
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

function buildQuestion() {
  if (state.pitchDeck.length === 0) {
    const noteLabels = getNoteLabels(state.settings);
    const pitches = [];
    const octaveOffset = CLEF_OCTAVE_OFFSETS[state.settings.clef];
    const minOctave = Math.max(OCTAVE_OPTIONS[0], state.settings.minOctave + octaveOffset);
    const maxOctave = Math.max(minOctave, Math.min(OCTAVE_OPTIONS[OCTAVE_OPTIONS.length - 1], state.settings.maxOctave + octaveOffset));

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

function drawStaff(question) {
  output.innerHTML = "";

  const renderer = new Vex.Flow.Renderer(output, Vex.Flow.Renderer.Backends.SVG);
  const rendererWidth = 420;
  const rendererHeight = 150;
  const staveWidth = 380;
  renderer.resize(rendererWidth * SCALE_FACTOR, rendererHeight * SCALE_FACTOR);
  const context = renderer.getContext();

  context.setFillStyle("#f5f5f5");
  context.setStrokeStyle("#f5f5f5");
  context.scale(SCALE_FACTOR, SCALE_FACTOR);

  const staveX = (rendererWidth - staveWidth) / 2;
  const stave = new Vex.Flow.Stave(staveX, 40, staveWidth).addClef(question.clef);
  stave.setContext(context).draw();

  const note = new Vex.Flow.StaveNote({
    clef: question.clef,
    keys: [question.key],
    duration: "q",
  });
  if (question.accidental) {
    note.addModifier(new Vex.Flow.Accidental(question.accidental));
  }

  const voice = new Vex.Flow.Voice({ num_beats: 1, beat_value: 4 });
  voice.addTickable(note);

  new Vex.Flow.Formatter().joinVoices([voice]).format([voice], 280);
  voice.draw(context, stave);
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
  sprite.setAttribute("aria-hidden", "true");
  sprite.addEventListener("animationend", () => sprite.remove(), { once: true });
  coinSpriteLaneEl.appendChild(sprite);
}
function animateWinSprite() {
  const sprite = document.createElement("img");
  sprite.className = "win-sprite";
  sprite.src = WIN_SPRITE_SOURCES[randomInt(0, WIN_SPRITE_SOURCES.length - 1)];
  sprite.alt = "";
  sprite.height = 55;
  sprite.setAttribute("aria-hidden", "true");
  sprite.addEventListener("animationend", () => sprite.remove(), { once: true });
  winSpriteLaneEl.appendChild(sprite);
}

function animateErrorSprite() {
  const sprite = document.createElement("img");
  sprite.className = "error-sprite";
  sprite.src = ERROR_SPRITE_SOURCES[randomInt(0, ERROR_SPRITE_SOURCES.length - 1)];
  sprite.alt = "";
  sprite.setAttribute("aria-hidden", "true");
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
  minOctaveSelect.value = state.settings.minOctave;
  maxOctaveSelect.value = state.settings.maxOctave;
  clefSelect.value = state.settings.clef;
  syncAnswerCountOptions(state.settings.answerCount);
  state.settings.answerCount = answerCountSelect.value === "all"
    ? "all"
    : Number(answerCountSelect.value);
  updateErrorSoundToggle();
}

function updateErrorSoundToggle() {
  const enabled = state.settings.errorSound;
  errorSoundToggleButton.setAttribute("aria-pressed", String(enabled));
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

    row.append(rank, name, score);
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
  pauseButton.setAttribute("aria-pressed", String(state.isPaused));
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
    setMessage("¿Qué nota es?", true);
    updatePauseButton();
    startTimer();
    return;
  }

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

function setMessage(text, isGood = true) {
  messageEl.innerText = text;
  messageEl.style.color = isGood ? "#7ef29a" : "#ff9a9a";
}

function nextRound() {
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
  state.currentQuestion = buildQuestion();
  drawStaff(state.currentQuestion);
  playQuestionTone(state.currentQuestion);
  renderAnswerButtons(state.currentQuestion.options);
  updatePauseButton();
  startTimer();
  state.isLocked = false;
  setMessage("¿Qué nota es esta?", true);
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
  winStageEl.hidden = false;
  staveStageEl.hidden = true;
  staveTitleEl.hidden = true;
}

function showAnswerUntilContinue(message) {
  setMessage(message, false);
  renderAnswerButtons([]);
  pauseButton.disabled = true;

  const continueButton = document.createElement("button");
  continueButton.type = "button";
  continueButton.className = "note-btn reset-btn";
  continueButton.textContent = "Continuar";
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

  state.leaderboard = [...state.leaderboard, { name, score: state.score }]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SCORES);
  localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(state.leaderboard));
  renderLeaderboard();
  scoreEntryForm.hidden = true;
  setMessage(`${name} entró en la tabla de mejores puntuaciones.`, true);
});

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const minOctave = Number(minOctaveSelect.value);
  const maxOctave = Number(maxOctaveSelect.value);
  if (minOctave > maxOctave) {
    settingsStatusEl.textContent = "La octava mínima no puede superar la máxima.";
    settingsStatusEl.classList.add("settings-error");
    return;
  }

  state.settings = {
    accidentals: accidentalModeSelect.value,
    timerSeconds: Number(timerDurationSelect.value),
    minOctave,
    maxOctave,
    clef: clefSelect.value,
    answerCount: answerCountSelect.value === "all" ? "all" : Number(answerCountSelect.value),
    errorSound: state.settings.errorSound,
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));

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

startButton.addEventListener("click", () => {
  state.hasStarted = true;
  welcomeScreenEl.hidden = true;
  gameScreenEl.hidden = false;
  settingsPanelEl.open = false;
  nextRound();
});

function handleAnswer(selected) {
  if (state.isLocked || state.isPaused) return;

  state.isLocked = true;
  stopTimer();

  if (selected === state.currentQuestion.correct) {
    state.correctStreak += 1;
    animateWinCoin()
    if (state.correctStreak % 3 === 0) animateWinSprite();
    state.score += 1;
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      localStorage.setItem(HIGH_SCORE_KEY, state.bestScore);
    }
    playWinTone();
    updateHUD();
    setMessage(`¡Correcto! La nota es ${formatNoteName(state.currentQuestion.correct)}.`, true);
  } else {
    state.correctStreak = 0;
    state.lives -= 1;
    updateHUD();
    showAnswerUntilContinue(`La respuesta era \n ${formatNoteName(state.currentQuestion.correct)}.`);
    animateErrorSprite();
    if (state.settings.errorSound) playErrorTone();
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
  if (event.key === "Control") {
    playQuestionTone(state.currentQuestion);
  }
  if (event.key === " ") {
    event.preventDefault();
    if (state.isLocked) {
      continuePress();

    }
  }
}

syncSettingsForm();
updateHUD();
renderLeaderboard();
updatePauseButton();

