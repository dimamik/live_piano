// Piano synthesizer using Tone.js Sampler

import * as Tone from "tone";

export class Piano {
  constructor() {
    this.sampler = null;
    this.initialized = false;
    this.loading = false;
    this.loadPromise = null;
    this.pendingNotes = new Map(); // Queue for notes during loading (noteNumber -> velocity, null means released)
    this.sustainPedalDown = false;
    this.sustainedNotes = new Set(); // Notes being held by sustain pedal
    this.activeNotes = new Set(); // Notes currently being pressed
  }

  // Start loading samples immediately (before user interaction)
  preload() {
    if (this.loadPromise) return this.loadPromise;

    this.loading = true;
    this.loadPromise = this._createSampler();
    return this.loadPromise;
  }

  async _createSampler() {
    // Use Tone.js Sampler with Salamander piano samples
    this.sampler = new Tone.Sampler({
      urls: {
        A0: "A0.mp3",
        C1: "C1.mp3",
        "D#1": "Ds1.mp3",
        "F#1": "Fs1.mp3",
        A1: "A1.mp3",
        C2: "C2.mp3",
        "D#2": "Ds2.mp3",
        "F#2": "Fs2.mp3",
        A2: "A2.mp3",
        C3: "C3.mp3",
        "D#3": "Ds3.mp3",
        "F#3": "Fs3.mp3",
        A3: "A3.mp3",
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
        C5: "C5.mp3",
        "D#5": "Ds5.mp3",
        "F#5": "Fs5.mp3",
        A5: "A5.mp3",
        C6: "C6.mp3",
        "D#6": "Ds6.mp3",
        "F#6": "Fs6.mp3",
        A6: "A6.mp3",
        C7: "C7.mp3",
        "D#7": "Ds7.mp3",
        "F#7": "Fs7.mp3",
        A7: "A7.mp3",
        C8: "C8.mp3",
      },
      release: 1,
      baseUrl: "https://tonejs.github.io/audio/salamander/",
    }).toDestination();

    // Wait for samples to load
    await Tone.loaded();
    this.initialized = true;
    this.loading = false;

    // Play any queued notes that weren't released during loading
    this.pendingNotes.forEach((velocity, noteNumber) => {
      if (velocity !== null) {
        // Note is still held - play it
        this.playNote(noteNumber, velocity);
      }
    });
    this.pendingNotes.clear();
  }

  async init() {
    if (this.initialized) return;

    // If already loading, wait for it
    if (this.loadPromise) {
      await this.loadPromise;
      return;
    }

    // Start loading
    await this.preload();
  }

  // Play a note (MIDI note number, velocity 0-127)
  playNote(noteNumber, velocity = 100) {
    // Queue note if still loading
    if (this.loading && !this.initialized) {
      this.pendingNotes.set(noteNumber, velocity);
      return;
    }

    if (!this.initialized || !this.sampler) return;

    const noteName = this.midiToNoteName(noteNumber);
    const normalizedVelocity = velocity / 127;

    this.activeNotes.add(noteNumber);
    this.sampler.triggerAttack(noteName, Tone.now(), normalizedVelocity);
  }

  // Stop a note
  stopNote(noteNumber) {
    // Mark as released if still loading
    if (this.loading && !this.initialized) {
      if (this.pendingNotes.has(noteNumber)) {
        this.pendingNotes.set(noteNumber, null); // Mark as released
      }
      return;
    }

    if (!this.initialized || !this.sampler) return;

    this.activeNotes.delete(noteNumber);

    // If sustain pedal is down, don't release - add to sustained notes
    if (this.sustainPedalDown) {
      this.sustainedNotes.add(noteNumber);
      return;
    }

    const noteName = this.midiToNoteName(noteNumber);
    this.sampler.triggerRelease(noteName, Tone.now());
  }

  // Handle sustain pedal
  setSustainPedal(isDown) {
    this.sustainPedalDown = isDown;

    // When pedal is released, release all sustained notes that aren't actively pressed
    if (!isDown) {
      this.sustainedNotes.forEach((noteNumber) => {
        if (!this.activeNotes.has(noteNumber)) {
          const noteName = this.midiToNoteName(noteNumber);
          this.sampler.triggerRelease(noteName, Tone.now());
        }
      });
      this.sustainedNotes.clear();
    }
  }

  // Convert MIDI note number to Tone.js note name
  midiToNoteName(noteNumber) {
    const notes = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];
    const octave = Math.floor(noteNumber / 12) - 1;
    const noteName = notes[noteNumber % 12];
    return `${noteName}${octave}`;
  }

  destroy() {
    if (this.sampler) {
      this.sampler.dispose();
      this.sampler = null;
    }
    this.initialized = false;
  }
}

// Need to start audio context on user interaction
export async function startAudioContext() {
  await Tone.start();
}
