/**
 * Chiptune music system using Web Audio API.
 * Tracks: menu (slow space atmospheric), game (Mute City), shop (Wii Shop), boss (FFVII).
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function noteToFreq(name, octave) {
  const i = NOTE_NAMES.indexOf(name);
  if (i === -1) return 440;
  const semitones = (octave - 4) * 12 + i;
  return 440 * Math.pow(2, semitones / 12);
}

function parseNote(s) {
  if (!s || s === '-' || s === '.') return null;
  const match = s.match(/^([A-G]#?)(\d)$/);
  if (!match) return null;
  return { name: match[1], octave: parseInt(match[2], 10) };
}

function getFreq(noteStr) {
  const p = parseNote(noteStr);
  return p ? noteToFreq(p.name, p.octave) : null;
}

const STORAGE_MUTE = 'musicMuted';

function createMusicSystem() {
  let audioContext = null;
  let masterGain = null;
  let currentTrackKey = null;
  let stepIndex = 0;
  let nextStepTime = 0;
  let schedulerId = null;
  let muted = false;
  let noiseBuffer = null;

  function getContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.35;
      masterGain.connect(audioContext.destination);
      try {
        const stored = localStorage.getItem(STORAGE_MUTE);
        muted = stored === 'true';
      } catch (_) {}
    }
    return audioContext;
  }

  function getNoiseBuffer(ctx) {
    if (!noiseBuffer) {
      const length = ctx.sampleRate * 0.15;
      noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1);
    }
    return noiseBuffer;
  }

  function playNote(ctx, freq, startTime, duration, waveType, volume) {
    if (!masterGain || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  function playKick(ctx, startTime) {
    if (!masterGain || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, startTime);
    osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.08);
    gain.gain.setValueAtTime(0.35, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + 0.15);
  }

  function playSnare(ctx, startTime) {
    if (!masterGain || muted) return;
    const buf = getNoiseBuffer(ctx);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
    src.connect(gain);
    gain.connect(masterGain);
    src.start(startTime);
    src.stop(startTime + 0.1);
    const tone = ctx.createOscillator();
    const toneGain = ctx.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(180, startTime);
    tone.frequency.exponentialRampToValueAtTime(80, startTime + 0.08);
    toneGain.gain.setValueAtTime(0.15, startTime);
    toneGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
    tone.connect(toneGain);
    toneGain.connect(masterGain);
    tone.start(startTime);
    tone.stop(startTime + 0.08);
  }

  function playHat(ctx, startTime, open = false) {
    if (!masterGain || muted) return;
    const buf = getNoiseBuffer(ctx);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    gain.gain.setValueAtTime(open ? 0.08 : 0.05, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + (open ? 0.06 : 0.03));
    src.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    src.start(startTime);
    src.stop(startTime + 0.06);
  }

  const TRACKS = {
    menu: getMenuTrack(),
    game: getGameTrack(),
    shop: getShopTrack(),
    boss: getBossTrack(),
  };

  function stepDurationMs(track) {
    return (60 * 1000) / (track.bpm * (track.stepsPerBeat || 4));
  }

  function scheduleTrack(ctx, track, fromStep, now) {
    const stepMs = stepDurationMs(track) / 1000;
    const steps = track.length;

    track.channels.forEach((ch) => {
      const pattern = ch.pattern;
      const vol = (ch.vol ?? 0.2) * (muted ? 0 : 1);
      const wave = ch.wave || 'square';
      for (let i = 0; i < 4; i++) {
        const s = (fromStep + i) % steps;
        const note = pattern[s];
        if (!note) continue;
        const t = now + i * stepMs;
        if (note === 'KICK') playKick(ctx, t);
        else if (note === 'SNARE') playSnare(ctx, t);
        else if (note === 'HAT' || note === 'HAT_O') playHat(ctx, t, note === 'HAT_O');
        else if (wave) {
          const freq = getFreq(note);
          if (freq) {
            const sustain = ch.sustain != null ? ch.sustain : 0.85;
            playNote(ctx, freq, t, stepMs * sustain, wave, vol);
          }
        }
      }
    });
  }

  function scheduler() {
    const ctx = getContext();
    if (ctx.state === 'suspended') return;
    const trackKey = currentTrackKey;
    if (!trackKey) return;
    const track = TRACKS[trackKey];
    if (!track) return;

    const now = ctx.currentTime;
    const stepMs = stepDurationMs(track) / 1000;
    const steps = track.length;

    if (nextStepTime === 0) nextStepTime = now;

    while (nextStepTime < now + 0.12) {
      scheduleTrack(ctx, track, stepIndex, nextStepTime);
      stepIndex = (stepIndex + 4) % steps;
      nextStepTime += stepMs * 4;
    }
  }

  function startScheduler() {
    if (schedulerId != null) return;
    schedulerId = setInterval(scheduler, 25);
  }

  function stopScheduler() {
    if (schedulerId != null) {
      clearInterval(schedulerId);
      schedulerId = null;
    }
    nextStepTime = 0;
    stepIndex = 0;
  }

  function resumeOnce() {
    const ctx = audioContext;
    if (!ctx || ctx.state !== 'suspended') return;
    ctx.resume().then(() => {
      document.removeEventListener('click', resumeOnce);
      document.removeEventListener('keydown', resumeOnce);
      document.removeEventListener('touchstart', resumeOnce);
    }).catch(() => {});
  }

  /** Call from menu/game on first click or key so audio can start (browser autoplay policy). */
  function resumeContext() {
    if (!audioContext) return;
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        document.removeEventListener('click', resumeOnce);
        document.removeEventListener('keydown', resumeOnce);
        document.removeEventListener('touchstart', resumeOnce);
      }).catch(() => {});
    }
  }

  function suspend() {
    stopScheduler();
    if (!audioContext) return;
    if (audioContext.state === 'running') {
      audioContext.suspend().catch(() => {});
    }
  }

  function resume() {
    if (!audioContext) return;
    const startIfNeeded = () => {
      if (currentTrackKey) startScheduler();
    };
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(startIfNeeded).catch(() => {});
    } else {
      startIfNeeded();
    }
  }

  function play(trackKey) {
    if (!TRACKS[trackKey]) return;
    currentTrackKey = trackKey;
    stepIndex = 0;
    nextStepTime = 0;
    const ctx = getContext();
    if (ctx.state === 'suspended') {
      document.addEventListener('click', resumeOnce);
      document.addEventListener('keydown', resumeOnce);
      document.addEventListener('touchstart', resumeOnce);
      ctx.resume().catch(() => {});
    }
    startScheduler();
  }

  function stop() {
    currentTrackKey = null;
    stopScheduler();
  }

  function toggleMute() {
    muted = !muted;
    try {
      localStorage.setItem(STORAGE_MUTE, String(muted));
    } catch (_) {}
    return muted;
  }

  function isMuted() {
    return muted;
  }

  function init() {
    getContext();
  }

  return { play, stop, init, toggleMute, isMuted, resumeContext, suspend, resume };
}

// ─── Track data: pattern arrays, length = steps per loop ─────────────────

function getMenuTrack() {
  // Slow moon / Sweet Valley / Tobacco: spacey, hazy, atmospheric. Low BPM, pads, soft arps.
  const len = 128;
  const pad = new Array(len).fill(null);
  const arp = new Array(len).fill(null);
  const bass = new Array(len).fill(null);

  // Pad: sustained chord roots (repeated so they overlap), Dm → Am → F → C, 32 steps each
  const padNotes = [
    ...Array(32).fill('D4'), ...Array(32).fill('A3'), ...Array(32).fill('F4'), ...Array(32).fill('C4'),
  ];
  padNotes.forEach((n, i) => { pad[i] = n; });

  // Soft arp: slow, sparse (one note every 4 steps), same progression
  const arpNotes = [
    'D4', null, null, null, 'F4', null, null, null, 'A4', null, null, null, 'F4', null, null, null,
    'A3', null, null, null, 'C4', null, null, null, 'E4', null, null, null, 'C4', null, null, null,
    'F4', null, null, null, 'A4', null, null, null, 'C5', null, null, null, 'A4', null, null, null,
    'C4', null, null, null, 'E4', null, null, null, 'G4', null, null, null, 'E4', null, null, null,
    'D4', null, null, null, 'F4', null, null, null, 'A4', null, null, null, 'F4', null, null, null,
    'A3', null, null, null, 'C4', null, null, null, 'E4', null, null, null, 'C4', null, null, null,
    'F4', null, null, null, 'A4', null, null, null, 'C5', null, null, null, 'A4', null, null, null,
    'C4', null, null, null, 'E4', null, null, null, 'G4', null, null, null, 'E4', null, null, null,
  ];
  arpNotes.forEach((n, i) => { arp[i] = n; });

  // Sub bass: root every 8 steps, very low
  for (let i = 0; i < len; i += 8) {
    if (i < 32) bass[i] = 'D2';
    else if (i < 64) bass[i] = 'A2';
    else if (i < 96) bass[i] = 'F2';
    else bass[i] = 'C2';
  }

  // High shimmer: sparse high notes for space
  const shimmer = new Array(len).fill(null);
  [0, 16, 32, 48, 64, 80, 96, 112].forEach((i) => {
    shimmer[i] = i < 32 ? 'A5' : i < 64 ? 'E5' : i < 96 ? 'C6' : 'G5';
  });

  return {
    bpm: 76,
    stepsPerBeat: 4,
    length: len,
    channels: [
      { wave: 'sine', vol: 0.11, pattern: pad, sustain: 3.5 },
      { wave: 'triangle', vol: 0.06, pattern: arp, sustain: 2 },
      { wave: 'sine', vol: 0.12, pattern: bass, sustain: 4 },
      { wave: 'sine', vol: 0.04, pattern: shimmer, sustain: 5 },
    ],
  };
}

function getGameTrack() {
  // Mute City style: fast, driving, E minor / mixolydian
  const len = 64;
  const lead = new Array(len).fill(null);
  const bass = new Array(len).fill(null);
  const drums = new Array(len).fill(null);

  const leadNotes = [
    'E5', 'E5', 'G5', null, 'B5', null, 'G5', null, 'E5', null, 'D5', null, 'E5', null, 'G5', null,
    'A5', 'G5', 'E5', null, 'D5', null, 'E5', null, 'G5', null, 'E5', null, 'D5', null, 'C5', null,
    'D5', 'E5', 'G5', null, 'A5', null, 'G5', null, 'E5', null, 'D5', null, 'E5', null, 'G5', null,
    'E5', 'D5', 'C5', null, 'B4', null, 'C5', null, 'D5', null, 'E5', null, 'G5', null, 'E5', null,
  ];
  leadNotes.forEach((n, i) => { lead[i] = n; });

  // Driving bass
  const bassNotes = [
    'E2', 'E3', 'E2', 'E3', 'G2', 'G3', 'G2', 'G3', 'E2', 'E3', 'E2', 'E3', 'D2', 'D3', 'D2', 'D3',
    'E2', 'E3', 'E2', 'E3', 'G2', 'G3', 'G2', 'G3', 'A2', 'A3', 'G2', 'G3', 'E2', 'E3', 'E2', 'E3',
    'D2', 'D3', 'D2', 'D3', 'E2', 'E3', 'E2', 'E3', 'G2', 'G3', 'G2', 'G3', 'E2', 'E3', 'D2', 'D3',
    'C2', 'C3', 'B2', 'B3', 'A2', 'A3', 'G2', 'G3', 'E2', 'E3', 'E2', 'E3', 'E2', 'E3', 'E2', 'E3',
  ];
  bassNotes.forEach((n, i) => { bass[i] = n; });

  for (let i = 0; i < len; i++) {
    if (i % 4 === 0) drums[i] = 'KICK';
    if (i % 8 === 4) drums[i] = 'SNARE';
    drums[i] = drums[i] || 'HAT';
  }

  return {
    bpm: 168,
    stepsPerBeat: 4,
    length: len,
    channels: [
      { wave: 'sawtooth', vol: 0.18, pattern: lead },
      { wave: 'sawtooth', vol: 0.2, pattern: bass },
      { wave: 'square', vol: 0, pattern: drums },
    ],
  };
}

function getShopTrack() {
  // Wii Shop style: chill, catchy, simple
  const len = 32;
  const lead = new Array(len).fill(null);
  const bass = new Array(len).fill(null);

  const leadNotes = [
    'G4', null, 'B4', null, 'D5', null, 'B4', null, 'G4', null, 'E4', null, 'G4', null, 'B4', null,
    'A4', null, 'G4', null, 'E4', null, 'D4', null, 'E4', null, 'G4', null, 'E4', null, 'D4', null,
  ];
  leadNotes.forEach((n, i) => { lead[i] = n; });

  ['G2', 'G2', 'G2', 'G2', 'C3', 'C3', 'C3', 'C3', 'D3', 'D3', 'D3', 'D3', 'G2', 'G2', 'G2', 'G2',
   'G2', 'G2', 'E2', 'E2', 'A2', 'A2', 'D3', 'D3', 'G2', 'G2', 'G2', 'G2', 'G2', 'G2', 'G2', 'G2'].forEach((n, i) => { bass[i] = n; });

  return {
    bpm: 98,
    stepsPerBeat: 4,
    length: len,
    channels: [
      { wave: 'square', vol: 0.2, pattern: lead },
      { wave: 'triangle', vol: 0.2, pattern: bass },
    ],
  };
}

function getBossTrack() {
  // FFVII boss: tense, minor, driving
  const len = 64;
  const lead = new Array(len).fill(null);
  const bass = new Array(len).fill(null);
  const drums = new Array(len).fill(null);

  const leadNotes = [
    'E5', null, 'G5', null, 'E5', null, 'D5', null, 'C5', null, 'D5', null, 'E5', null, 'G5', null,
    'A5', null, 'G5', null, 'E5', null, 'D5', null, 'C5', null, 'B4', null, 'C5', null, 'D5', null,
    'E5', null, 'G5', null, 'E5', null, 'D5', null, 'C5', null, 'D5', null, 'E5', null, 'G5', null,
    'F5', null, 'E5', null, 'D5', null, 'C5', null, 'B4', null, 'A4', null, 'G4', null, 'E4', null,
  ];
  leadNotes.forEach((n, i) => { lead[i] = n; });

  ['E2', 'E2', 'E2', 'E2', 'E2', 'E2', 'E2', 'E2', 'G2', 'G2', 'G2', 'G2', 'G2', 'G2', 'G2', 'G2',
   'A2', 'A2', 'A2', 'A2', 'G2', 'G2', 'G2', 'G2', 'E2', 'E2', 'E2', 'E2', 'E2', 'E2', 'E2', 'E2',
   'C2', 'C2', 'C2', 'C2', 'G2', 'G2', 'G2', 'G2', 'A2', 'A2', 'A2', 'A2', 'G2', 'G2', 'G2', 'G2',
   'E2', 'E2', 'E2', 'E2', 'D2', 'D2', 'D2', 'D2', 'E2', 'E2', 'E2', 'E2', 'E2', 'E2', 'E2', 'E2'].forEach((n, i) => { bass[i] = n; });

  for (let i = 0; i < len; i++) {
    if (i % 4 === 0) drums[i] = 'KICK';
    if (i % 8 === 4) drums[i] = 'SNARE';
    drums[i] = drums[i] || 'HAT';
  }

  return {
    bpm: 132,
    stepsPerBeat: 4,
    length: len,
    channels: [
      { wave: 'square', vol: 0.18, pattern: lead },
      { wave: 'sawtooth', vol: 0.22, pattern: bass },
      { wave: 'square', vol: 0, pattern: drums },
    ],
  };
}

// Export singleton
let instance = null;

export function getMusicSystem() {
  if (!instance) instance = createMusicSystem();
  return instance;
}
