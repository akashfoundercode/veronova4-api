// Tiny WebAudio synth so the game needs no audio files.
let ctx = null;
let master = null;
let enabled = true;

export function initAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    /* audio is optional */
  }
}

export function setSoundEnabled(v) {
  enabled = !!v;
}

function tone({ freq, type = 'sine', dur = 0.12, vol = 0.18, slide = 0, delay = 0 }) {
  if (!enabled || !ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// Pentatonic scale so rapid peg hits sound musical rather than noisy.
const SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

export const sfx = {
  click: () => tone({ freq: 440, type: 'triangle', dur: 0.06, vol: 0.12 }),
  drop: () => tone({ freq: 520, type: 'sine', dur: 0.22, vol: 0.18, slide: -300 }),
  peg: (n = 0) => tone({ freq: SCALE[n % SCALE.length], type: 'sine', dur: 0.09, vol: 0.1 }),
  bonus: () => {
    tone({ freq: 880, type: 'square', dur: 0.08, vol: 0.08 });
    tone({ freq: 1320, type: 'square', dur: 0.12, vol: 0.08, delay: 0.07 });
  },
  reward: (mult = 1) => {
    const base = mult >= 1 ? 523.25 : 330;
    tone({ freq: base, type: 'triangle', dur: 0.14, vol: 0.18 });
    tone({ freq: base * 1.25, type: 'triangle', dur: 0.14, vol: 0.18, delay: 0.08 });
    if (mult >= 1) tone({ freq: base * 1.5, type: 'triangle', dur: 0.2, vol: 0.18, delay: 0.16 });
  },
  upgrade: () => {
    tone({ freq: 440, type: 'square', dur: 0.08, vol: 0.09 });
    tone({ freq: 660, type: 'square', dur: 0.08, vol: 0.09, delay: 0.07 });
    tone({ freq: 880, type: 'square', dur: 0.14, vol: 0.09, delay: 0.14 });
  },
  error: () => tone({ freq: 160, type: 'sawtooth', dur: 0.16, vol: 0.1, slide: -40 }),
  cashout: () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', dur: 0.16, vol: 0.16, delay: i * 0.08 })
    );
  },
  ascend: () => {
    [330, 440, 554, 659, 880, 1109].forEach((f, i) =>
      tone({ freq: f, type: 'sine', dur: 0.28, vol: 0.14, delay: i * 0.09 })
    );
  },
};
