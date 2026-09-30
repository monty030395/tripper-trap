// ============================================================================
// TRIPPER TRAP — barcode-scanner-triggered sound/visual installation
// ============================================================================
// A USB barcode scanner behaves as a HID keyboard: it "types" the decoded
// string then sends Enter. We listen for keydown globally, buffer characters
// until Enter, and treat the buffered string as one "scan".
// ============================================================================


// ----------------------------------------------------------------------------
// 1. SYNTHS (placeholders — swap trigger() bodies for sample playback later)
// ----------------------------------------------------------------------------

const kickSynth = new Tone.MembraneSynth({
  pitchDecay: 0.05,
  octaves: 6,
  envelope: { attack: 0.001, decay: 0.4, sustain: 0 },
}).toDestination();

const snareSynth = new Tone.NoiseSynth({
  noise: { type: 'white' },
  envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
}).toDestination();

const hatSynth = new Tone.MetalSynth({
  envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 4000,
  octaves: 1.5,
}).toDestination();
hatSynth.volume.value = -12;

const bassSynth = new Tone.MonoSynth({
  oscillator: { type: 'sawtooth' },
  envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.4 },
  filterEnvelope: {
    attack: 0.01, decay: 0.2, sustain: 0.3, baseFrequency: 200, octaves: 3,
  },
}).toDestination();


// ----------------------------------------------------------------------------
// 2. TRIGGER MAP — the heart of the installation.
//
//    Key   = exact string a barcode scan produces (case-sensitive, no
//            trailing whitespace — the scan buffer is trimmed before lookup).
//    label = human-readable name, shown in the debug log.
//    color = CSS color used for this trigger's visual flash.
//    power = 0..1, controls flash size/intensity (bigger sound = bigger hit).
//    sound = function that fires the Tone.js trigger.
//
//    TO ADD A NEW SCAN -> SOUND MAPPING:
//    Just add another entry below with the real barcode string as the key.
//    Placeholder codes here (trap_kick etc.) are what you'd type manually
//    in dev mode until you've printed real barcodes and know what your
//    scanner actually sends (check the debug log in the top-left corner).
// ----------------------------------------------------------------------------

const TRIGGER_MAP = {
  trap_kick: {
    label: 'Kick Drum',
    color: '#ff3b5c',
    power: 1.0,
    sound: () => kickSynth.triggerAttackRelease('C1', '8n'),
  },
  trap_snare: {
    label: 'Snare',
    color: '#ffd23f',
    power: 0.8,
    sound: () => snareSynth.triggerAttackRelease('8n'),
  },
  trap_hat: {
    label: 'Hi-Hat',
    color: '#3fffc0',
    power: 0.35,
    sound: () => hatSynth.triggerAttackRelease('32n'),
  },
  trap_bass: {
    label: 'Bass Stab',
    color: '#8c3fff',
    power: 0.9,
    sound: () => bassSynth.triggerAttackRelease('C2', '8n'),
  },
};

// Fallback visual/behaviour for a scanned code with no mapping entry.
const UNMAPPED = {
  label: 'Unmapped scan',
  color: '#666666',
  power: 0.25,
};


// ----------------------------------------------------------------------------
// 3. AUDIO UNLOCK (browsers require a user gesture before Tone/WebAudio runs)
// ----------------------------------------------------------------------------

const audioGate = document.getElementById('audio-gate');
const audioGateBtn = document.getElementById('audio-gate-btn');

audioGateBtn.addEventListener('click', async () => {
  await Tone.start();
  audioGate.classList.add('hidden');
});


// ----------------------------------------------------------------------------
// 4. SCAN CAPTURE — global keydown buffering
// ----------------------------------------------------------------------------

let scanBuffer = '';

const devToggle = document.getElementById('dev-toggle');
const devControls = document.getElementById('dev-controls');
const devInput = document.getElementById('dev-input');
const devSendBtn = document.getElementById('dev-send-btn');

devToggle.addEventListener('change', () => {
  devControls.hidden = !devToggle.checked;
  if (devToggle.checked) devInput.focus();
});

function isIgnorableTarget(target) {
  // Don't hijack clicks on buttons/checkboxes (e.g. spacebar toggling a checkbox).
  return target.tagName === 'BUTTON' || (target.tagName === 'INPUT' && target.type === 'checkbox');
}

function submitScan(raw) {
  const code = raw.trim();
  scanBuffer = '';
  devInput.value = '';
  if (!code) return;
  handleScan(code);
}

// Global capture: this is what a real USB scanner drives. Also fires
// naturally when typing in the dev-mode text input, since keydown bubbles
// up to document — so dev mode and real hardware share the same code path.
document.addEventListener('keydown', (e) => {
  if (isIgnorableTarget(e.target)) return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  if (e.key === 'Enter') {
    submitScan(scanBuffer);
  } else if (e.key === 'Backspace') {
    scanBuffer = scanBuffer.slice(0, -1);
    syncDevInput();
  } else if (e.key.length === 1) {
    // Any single printable character (letters, digits, symbols).
    scanBuffer += e.key;
    syncDevInput();
  }
});

// Keep the visible dev-mode input in sync with the buffer, so you can watch
// characters arrive in real time when testing with the actual scanner too.
function syncDevInput() {
  if (devToggle.checked) devInput.value = scanBuffer;
}

// "Send" button simulates pressing Enter using whatever is in the text box.
devSendBtn.addEventListener('click', () => submitScan(devInput.value));


// ----------------------------------------------------------------------------
// 5. SCAN HANDLING — look up the mapping, fire sound + visual, log it
// ----------------------------------------------------------------------------

function handleScan(code) {
  const mapping = TRIGGER_MAP[code];
  const matched = Boolean(mapping);

  if (matched) {
    try {
      mapping.sound();
    } catch (err) {
      console.error('Trigger sound failed for', code, err);
    }
    flash(mapping.color, mapping.power);
  } else {
    flash(UNMAPPED.color, UNMAPPED.power);
  }

  logScan(code, matched, matched ? mapping.label : UNMAPPED.label);
}


// ----------------------------------------------------------------------------
// 6. DEBUG LOG — last few raw scans, newest first
// ----------------------------------------------------------------------------

const debugLog = document.getElementById('debug-log');
const MAX_LOG_ENTRIES = 8;

function logScan(code, matched, label) {
  const li = document.createElement('li');
  li.className = matched ? 'matched' : 'unmapped';

  const time = document.createElement('span');
  time.className = 'scan-time';
  time.textContent = new Date().toLocaleTimeString([], { hour12: false });

  const text = document.createElement('span');
  text.className = 'scan-code';
  text.textContent = `${code}  →  ${label}`;

  li.appendChild(time);
  li.appendChild(text);
  debugLog.prepend(li);

  while (debugLog.children.length > MAX_LOG_ENTRIES) {
    debugLog.removeChild(debugLog.lastChild);
  }
}


// ----------------------------------------------------------------------------
// 7. VISUAL FEEDBACK — full-screen canvas flash/pulse per trigger
// ----------------------------------------------------------------------------

const canvas = document.getElementById('visual-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Active flashes: each is a burst that grows and fades over its lifetime.
let flashes = [];

function flash(color, power = 0.6) {
  flashes.push({
    color,
    power,
    start: performance.now(),
    duration: 220 + power * 380, // stronger hits linger a bit longer
  });
}

function drawFrame(now) {
  ctx.fillStyle = 'rgba(0, 0, 0, 1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const maxRadius = Math.hypot(cx, cy);

  flashes = flashes.filter((f) => now - f.start < f.duration);

  for (const f of flashes) {
    const t = (now - f.start) / f.duration; // 0 -> 1 over lifetime
    const alpha = (1 - t) * (0.35 + f.power * 0.65);
    const radius = maxRadius * (0.15 + t * (0.5 + f.power * 0.6));

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, withAlpha(f.color, alpha));
    gradient.addColorStop(1, withAlpha(f.color, 0));

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Full-screen tint on the initial hit, for a stronger "impact" feel.
    if (t < 0.15) {
      ctx.fillStyle = withAlpha(f.color, alpha * 0.25 * (1 - t / 0.15));
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(drawFrame);
}
requestAnimationFrame(drawFrame);

function withAlpha(hexColor, alpha) {
  const clamped = Math.max(0, Math.min(1, alpha));
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}
