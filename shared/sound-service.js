import { SOUNDS } from './constants.js';

export class SoundService {
  constructor(soundManager = null) {
    this.soundManager = soundManager || (typeof window !== 'undefined' ? window.soundManager : null);
  }

  isAvailable() {
    return this.soundManager !== null && this.soundManager !== undefined;
  }

  play(soundName) {
    if (!this.isAvailable()) {
      return;
    }
    try {
      this.soundManager.play(soundName);
    } catch (error) {
      console.warn(`Failed to play sound: ${soundName}`, error);
    }
  }

  playDing() {
    this.play(SOUNDS.DING);
  }

  playCorrect() {
    this.play(SOUNDS.CORRECT);
  }

  playBuzzer() {
    this.play(SOUNDS.BUZZER);
  }

  playError() {
    this.play(SOUNDS.ERROR);
  }

  playCompleted() {
    this.play(SOUNDS.COMPLETED);
  }
}
