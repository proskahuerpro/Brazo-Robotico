/**
 * Procedural Web Audio API sound generator for robot servo motors and gripper clicks.
 */
export class RobotAudio {
  private ctx: AudioContext | null = null;
  private servoOscillator: OscillatorNode | null = null;
  private servoGain: GainNode | null = null;
  private isMuted: boolean = false;
  private currentSpeed: number = 0;

  constructor() {
    // Initialized lazily on first user interaction to comply with browser autoplay policies
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public setServoSpeed(speed: number) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    this.currentSpeed = Math.min(1.0, Math.max(0.0, speed));

    if (this.currentSpeed > 0.02) {
      if (!this.servoOscillator) {
        this.servoOscillator = this.ctx.createOscillator();
        this.servoOscillator.type = 'sawtooth';

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, this.ctx.currentTime);

        this.servoGain = this.ctx.createGain();
        this.servoGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

        this.servoOscillator.connect(filter);
        filter.connect(this.servoGain);
        this.servoGain.connect(this.ctx.destination);

        this.servoOscillator.start();
      }

      if (this.servoGain && this.servoOscillator) {
        const targetFreq = 160 + this.currentSpeed * 280;
        const targetVol = Math.min(0.08, this.currentSpeed * 0.08);

        this.servoOscillator.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.05);
        this.servoGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.05);
      }
    } else {
      if (this.servoGain && this.ctx) {
        this.servoGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
      }
    }
  }

  public playGripClick(success: boolean = true) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = success ? 'triangle' : 'square';
    osc.frequency.setValueAtTime(success ? 420 : 180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(success ? 840 : 110, this.ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  public playMechanicalSnap() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    // Short noise burst to simulate metal clamp contact
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.servoGain && this.ctx) {
      this.servoGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}
