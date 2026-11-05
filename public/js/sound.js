// Synthesised sounds — no audio files needed. Browsers only allow sound after a click,
// which is why the laptop starts behind "OPEN THE FILE".
window.Sound = (() => {
  let ctx = null;
  const ac = () => (ctx = ctx || new (window.AudioContext || window.webkitAudioContext)());

  function unlock() { const c = ac(); if (c.state === 'suspended') c.resume(); }

  // A counter bell: struck metal, several inharmonic partials, long decay. Loud.
  function ding() {
    const c = ac(), t = c.currentTime, out = c.createGain();
    out.gain.value = 0.9; out.connect(c.destination);
    [[1, 1.0], [2.76, .55], [5.4, .32], [8.93, .18]].forEach(([mult, amp]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = 1046 * mult;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + .004);
      g.gain.exponentialRampToValueAtTime(.0001, t + 2.4 / Math.sqrt(mult));
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 2.6);
    });
  }

  // Typewriter carriage: a few clacks then the bell, for new exhibits.
  function carriage() {
    const c = ac(), t = c.currentTime;
    for (let i = 0; i < 6; i++) {
      const len = .03, buf = c.createBuffer(1, c.sampleRate * len, c.sampleRate), d = buf.getChannelData(0);
      for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / d.length, 4);
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      s.buffer = buf; f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 900; g.gain.value = .7;
      s.connect(f); f.connect(g); g.connect(c.destination); s.start(t + i * .085 + Math.random() * .02);
    }
    setTimeout(ding, 620);
  }

  function truth() {
    const c = ac(), t = c.currentTime;
    [659.25, 987.77].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t + i * .18); g.gain.linearRampToValueAtTime(.5, t + i * .18 + .01);
      g.gain.exponentialRampToValueAtTime(.0001, t + i * .18 + 1.2);
      o.connect(g); g.connect(c.destination); o.start(t + i * .18); o.stop(t + i * .18 + 1.3);
    });
  }

  function deception() {
    const c = ac(), t = c.currentTime, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = 98; o2.frequency.value = 103.5;
    f.type = 'lowpass'; f.frequency.value = 1400;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + .02);
    g.gain.setValueAtTime(.55, t + .9); g.gain.exponentialRampToValueAtTime(.0001, t + 1.15);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(c.destination);
    o.start(t); o2.start(t); o.stop(t + 1.2); o2.stop(t + 1.2);
  }

  // Corvin's caw: a short rasping croak, two falling pulses
  function caw() {
    const c = ac(), t = c.currentTime;
    [0, .19].forEach((d, i) => {
      const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(i ? 520 : 600, t + d); o.frequency.exponentialRampToValueAtTime(i ? 300 : 360, t + d + .17);
      lfo.frequency.value = 62; lg.gain.value = 40; lfo.connect(lg); lg.connect(o.frequency);
      f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 1.2;
      g.gain.setValueAtTime(0, t + d); g.gain.linearRampToValueAtTime(.35, t + d + .015); g.gain.exponentialRampToValueAtTime(.0001, t + d + .18);
      o.connect(f); f.connect(g); g.connect(c.destination); o.start(t + d); lfo.start(t + d); o.stop(t + d + .2); lfo.stop(t + d + .2);
    });
  }

  return { unlock, init: unlock, ding, carriage, truth, deception, caw };
})();
