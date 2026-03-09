let _ctx = null;
let _master = null;
let _muted = localStorage.getItem('sfxMuted') === '1';

function getCtx() {
  if (_ctx) return _ctx;
  _ctx = new (window.AudioContext || window.webkitAudioContext)();
  _master = _ctx.createGain();
  _master.gain.value = _muted ? 0 : 0.35;
  _master.connect(_ctx.destination);
  return _ctx;
}

function ensureResumed() {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted() { return _muted; }

export function toggleMute() {
  _muted = !_muted;
  try { localStorage.setItem('sfxMuted', _muted ? '1' : '0'); } catch (_) {}
  if (_master) _master.gain.value = _muted ? 0 : 0.35;
  return _muted;
}

function tone(freq, duration, type = 'square', volume = 1) {
  const ctx = ensureResumed();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(_master);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function sweep(startFreq, endFreq, duration, type = 'square', volume = 1) {
  const ctx = ensureResumed();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + duration);
  gain.gain.value = volume;
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(_master);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function noise(duration, volume = 0.3) {
  const ctx = ensureResumed();
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  gain.gain.value = volume;
  src.connect(gain);
  gain.connect(_master);
  src.start(ctx.currentTime);
}

function arpeggio(notes, noteLen, type = 'square', volume = 0.6) {
  const ctx = ensureResumed();
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const start = ctx.currentTime + i * noteLen;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.linearRampToValueAtTime(0, start + noteLen * 0.9);
    osc.connect(gain);
    gain.connect(_master);
    osc.start(start);
    osc.stop(start + noteLen);
  });
}

// ── Exported sound effects ──────────────────────────────────

export function sfxFire() {
  sweep(880, 220, 0.12, 'square', 0.5);
}

export function sfxPerfect() {
  arpeggio([523, 659, 784], 0.07, 'square', 0.5);
}

export function sfxHit() {
  noise(0.08, 0.35);
  tone(120, 0.1, 'square', 0.4);
}

export function sfxKill() {
  noise(0.15, 0.5);
  sweep(400, 60, 0.2, 'sawtooth', 0.4);
}

export function sfxSuperKill() {
  noise(0.25, 0.6);
  sweep(600, 40, 0.3, 'sawtooth', 0.5);
  const ctx = ensureResumed();
  setTimeout(() => {
    if (ctx.state === 'running') noise(0.1, 0.3);
  }, 150);
}

export function sfxShieldBlock() {
  tone(1200, 0.06, 'triangle', 0.6);
  tone(1800, 0.08, 'triangle', 0.3);
}

export function sfxGlancing() {
  tone(300, 0.05, 'square', 0.25);
}

export function sfxOverkill() {
  tone(110, 0.15, 'square', 0.5);
  const ctx = ensureResumed();
  setTimeout(() => {
    if (ctx.state === 'running') tone(90, 0.15, 'square', 0.4);
  }, 100);
}

export function sfxOverflow() {
  const ctx = ensureResumed();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(200, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.15);
  osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.3);
  osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.45);
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(_master);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
}

export function sfxRewind() {
  sweep(1200, 200, 0.25, 'sawtooth', 0.4);
}

export function sfxSplit() {
  arpeggio([330, 440, 660], 0.06, 'triangle', 0.5);
}

export function sfxPowerup() {
  arpeggio([440, 554, 659], 0.08, 'square', 0.45);
}

export function sfxPowerupMiss() {
  sweep(500, 150, 0.2, 'triangle', 0.3);
}

export function sfxFortressHit() {
  noise(0.12, 0.5);
  tone(80, 0.15, 'square', 0.6);
}

export function sfxEnemyShot() {
  sweep(600, 1200, 0.06, 'square', 0.3);
}

export function sfxWaveClear() {
  arpeggio([523, 659, 784, 1047], 0.1, 'square', 0.5);
}

export function sfxGameOver() {
  sweep(400, 80, 0.6, 'sawtooth', 0.5);
  const ctx = ensureResumed();
  setTimeout(() => {
    if (ctx.state === 'running') tone(60, 0.5, 'square', 0.3);
  }, 300);
}

export function sfxBugReport() {
  noise(0.1, 0.4);
  sweep(200, 1600, 0.05, 'square', 0.3);
  const ctx = ensureResumed();
  setTimeout(() => {
    if (ctx.state === 'running') {
      noise(0.08, 0.3);
      sweep(1400, 100, 0.06, 'sawtooth', 0.3);
    }
  }, 80);
}

export function sfxMenuStart() {
  arpeggio([660, 880], 0.08, 'square', 0.4);
}

export function sfxShopSelect() {
  tone(1200, 0.04, 'triangle', 0.5);
  const ctx = ensureResumed();
  setTimeout(() => {
    if (ctx.state === 'running') tone(1600, 0.06, 'triangle', 0.4);
  }, 50);
}

export function sfxLaneChange() {
  tone(800, 0.03, 'square', 0.2);
}

export function sfxChargeTick(chargeLevel) {
  const freq = 200 + chargeLevel * 6;
  tone(freq, 0.03, 'square', 0.12);
}
