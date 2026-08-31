'use strict';
/* ---------------- AudioSystem ---------------- */
const Sfx = {
  ctx: null, on: true, music: true, holdTimer: null, master: null, volume: 0.32,
  init() {
    if (this.ctx) {
      /* Browsers suspend the context when the tab is backgrounded, and start it
         suspended if it was ever created outside a gesture. Always try to wake it. */
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch (e) { this.on = false; }
  },
  setVolume(v) {
    this.volume = clamp(v, 0, 1);
    if (this.master) this.master.gain.value = this.volume;
  },
  tone(freq, dur = 0.12, type = 'square', vol = 0.5, delay = 0, glide = 0) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + glide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.03);
  },
  noise(dur = 0.16, vol = 0.25, delay = 0) {
    if (!this.on || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const n = this.ctx.sampleRate * dur, buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain();
    s.buffer = buf; g.gain.value = vol; s.connect(g); g.connect(this.master); s.start(t);
  },
  step() { this.noise(0.05, 0.045); },
  blip() { this.tone(520, 0.06, 'square', 0.28); },
  talk() { this.tone(ri(300, 460), 0.035, 'square', 0.12); },
  /* The opening types its captions like the dialogue box does, but a whole
     minute of them at dialogue volume is a chattering machine rather than a
     film. Lower and a good deal quieter — under the room, not on top of it. */
  type() { this.tone(ri(196, 240), 0.03, 'square', 0.05); },
  /* A beat landing. One low note with a fifth under it, short enough that
     twelve of them in ninety seconds do not become a rhythm. */
  cut() { this.tone(174, 0.34, 'sine', 0.11); this.tone(116, 0.4, 'sine', 0.07, 0.02); },
  select() { this.tone(680, 0.07, 'triangle', 0.3); this.tone(920, 0.06, 'triangle', 0.22, 0.05); },
  deny() { this.tone(180, 0.16, 'sawtooth', 0.25, 0, -60); },
  ring() {
    for (let i = 0; i < 2; i++) {
      this.tone(880, 0.09, 'sine', 0.3, i * 0.22); this.tone(660, 0.09, 'sine', 0.3, i * 0.22 + 0.1);
    }
  },
  xp() { this.tone(700, 0.07, 'triangle', 0.25); this.tone(1050, 0.1, 'triangle', 0.22, 0.06); },
  levelup() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.3, i * 0.09)); },
  coffee() { this.noise(0.5, 0.14); this.tone(140, 0.4, 'sawtooth', 0.12, 0.05, 40); },
  printer() { this.noise(0.28, 0.3); this.tone(90, 0.3, 'square', 0.2, 0.1, 30); this.noise(0.2, 0.22, 0.34); },
  door() { this.tone(220, 0.1, 'sine', 0.22); this.noise(0.1, 0.12, 0.05); },
  key() { this.tone(ri(900, 1400), 0.02, 'square', 0.06); },
  notify() { this.tone(988, 0.08, 'sine', 0.28); this.tone(1319, 0.12, 'sine', 0.24, 0.07); },
  bad() { this.tone(200, 0.2, 'sawtooth', 0.28); this.tone(150, 0.3, 'sawtooth', 0.24, 0.12); },
  cash() { this.tone(1200, 0.05, 'square', 0.2); this.tone(1600, 0.08, 'square', 0.18, 0.05); },
  /* Hold music: a MIDI keyboard demo of Greensleeves, played by a machine
     that has never been outdoors. */
  holdMusic(start) {
    clearTimeout(this.holdTimer); this.holdTimer = null;
    if (!start || !this.music || !this.on || !this.ctx) return;
    const mel = [440, 523, 587, 659, 698, 659, 587, 494, 440, 392, 440, 494, 523, 494, 440, 415];
    let i = 0;
    const loop = () => {
      if (!this.music || !this.on) return;
      const f = mel[i % mel.length];
      this.tone(f * (chance(0.06) ? 1.06 : 1), 0.26, 'triangle', 0.09);
      this.tone(f / 2, 0.3, 'sine', 0.05);
      i++;
      this.holdTimer = setTimeout(loop, i % 8 === 0 ? 420 : 300);
    };
    loop();
  }
};
