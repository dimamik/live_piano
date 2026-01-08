// Piano synthesizer using Tone.js with multiple instrument support

import * as Tone from "tone";

// Instrument definitions
export const INSTRUMENTS = {
  piano: {
    name: "Piano",
    createSynth: async () => {
      const sampler = new Tone.Sampler({
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

      await Tone.loaded();
      return sampler;
    },
  },
  organ: {
    name: "Organ",
    createSynth: async () => {
      const sampler = new Tone.Sampler({
        urls: {
          C1: "C1.mp3",
          C2: "C2.mp3",
          C3: "C3.mp3",
          C4: "C4.mp3",
          C5: "C5.mp3",
          C6: "C6.mp3",
        },
        release: 0.5,
        baseUrl:
          "https://nbrosowsky.github.io/tonejs-instruments/samples/organ/",
        onload: () => console.log("Organ samples loaded"),
        onerror: (err) => console.error("Organ sample error:", err),
      }).toDestination();

      await Tone.loaded();
      return sampler;
    },
  },
  strings: {
    name: "Strings",
    createSynth: async () => {
      const sampler = new Tone.Sampler({
        urls: {
          A3: "A3.mp3",
          A4: "A4.mp3",
          A5: "A5.mp3",
          C4: "C4.mp3",
          C5: "C5.mp3",
          C6: "C6.mp3",
          E4: "E4.mp3",
          E5: "E5.mp3",
          G4: "G4.mp3",
          G5: "G5.mp3",
        },
        release: 1,
        baseUrl:
          "https://nbrosowsky.github.io/tonejs-instruments/samples/violin/",
        onload: () => console.log("Strings samples loaded"),
        onerror: (err) => console.error("Strings sample error:", err),
      }).toDestination();

      await Tone.loaded();
      return sampler;
    },
  },
  saxophone: {
    name: "Saxophone",
    createSynth: async () => {
      // Use MIDI.js soundfonts (FluidR3_GM alto sax)
      const sampler = new Tone.Sampler({
        urls: {
          A3: "A3.mp3",
          A4: "A4.mp3",
          A5: "A5.mp3",
          C4: "C4.mp3",
          C5: "C5.mp3",
          E4: "E4.mp3",
          E5: "E5.mp3",
          G4: "G4.mp3",
          G5: "G5.mp3",
        },
        release: 0.5,
        baseUrl:
          "https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/alto_sax-mp3/",
        onload: () => console.log("Saxophone samples loaded"),
        onerror: (err) => console.error("Saxophone sample error:", err),
      }).toDestination();

      await Tone.loaded();
      return sampler;
    },
  },
};

export class Piano {
  constructor() {
    this.synth = null;
    this.currentInstrument = null;
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
    return this.setInstrument("piano");
  }

  async setInstrument(instrumentId) {
    // If already this instrument and initialized, do nothing
    if (
      instrumentId === this.currentInstrument &&
      this.initialized &&
      !this.loading
    ) {
      return this.loadPromise;
    }

    const instrument = INSTRUMENTS[instrumentId];
    if (!instrument) {
      console.warn("Unknown instrument:", instrumentId);
      return;
    }

    // Release all active notes before switching
    this.releaseAllNotes();

    // Store old synth to dispose after new one is ready
    const oldSynth = this.synth;
    this.synth = null;

    this.currentInstrument = instrumentId;
    this.initialized = false;
    this.loading = true;

    this.loadPromise = this._createSynth(instrument, oldSynth);
    return this.loadPromise;
  }

  async _createSynth(instrument, oldSynth) {
    try {
      console.log("Creating synth for:", instrument.name);
      const newSynth = await instrument.createSynth();

      // Dispose old synth after new one is ready
      if (oldSynth) {
        try {
          oldSynth.dispose();
        } catch (e) {
          console.warn("Error disposing old synth:", e);
        }
      }

      this.synth = newSynth;
      this.initialized = true;
      this.loading = false;
      console.log("Synth ready:", instrument.name);

      // Play any queued notes that weren't released during loading
      this.pendingNotes.forEach((velocity, noteNumber) => {
        if (velocity !== null) {
          this.playNote(noteNumber, velocity);
        }
      });
      this.pendingNotes.clear();
    } catch (err) {
      console.error("Error creating synth:", err);
      this.loading = false;
      this.initialized = false;
    }
  }

  async init() {
    if (this.initialized) return;

    // If already loading, wait for it
    if (this.loadPromise) {
      await this.loadPromise;
      return;
    }

    // Start loading default instrument
    await this.preload();
  }

  releaseAllNotes() {
    if (!this.synth) return;

    // Release all active and sustained notes
    const allNotes = new Set([...this.activeNotes, ...this.sustainedNotes]);
    allNotes.forEach((noteNumber) => {
      const noteName = this.midiToNoteName(noteNumber);
      this.synth.triggerRelease(noteName, Tone.now());
    });

    this.activeNotes.clear();
    this.sustainedNotes.clear();
  }

  // Play a note (MIDI note number, velocity 0-127)
  playNote(noteNumber, velocity = 100) {
    // Queue note if still loading
    if (this.loading && !this.initialized) {
      this.pendingNotes.set(noteNumber, velocity);
      return;
    }

    if (!this.initialized || !this.synth) return;

    const noteName = this.midiToNoteName(noteNumber);
    const normalizedVelocity = velocity / 127;

    this.activeNotes.add(noteNumber);
    this.synth.triggerAttack(noteName, Tone.now(), normalizedVelocity);
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

    if (!this.initialized || !this.synth) return;

    this.activeNotes.delete(noteNumber);

    // If sustain pedal is down, don't release - add to sustained notes
    if (this.sustainPedalDown) {
      this.sustainedNotes.add(noteNumber);
      return;
    }

    const noteName = this.midiToNoteName(noteNumber);
    this.synth.triggerRelease(noteName, Tone.now());
  }

  // Handle sustain pedal
  setSustainPedal(isDown) {
    this.sustainPedalDown = isDown;

    // When pedal is released, release all sustained notes that aren't actively pressed
    if (!isDown) {
      this.sustainedNotes.forEach((noteNumber) => {
        if (!this.activeNotes.has(noteNumber)) {
          const noteName = this.midiToNoteName(noteNumber);
          this.synth.triggerRelease(noteName, Tone.now());
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
    if (this.synth) {
      this.synth.dispose();
      this.synth = null;
    }
    this.initialized = false;
    this.currentInstrument = null;
  }
}

// Need to start audio context on user interaction
export async function startAudioContext() {
  await Tone.start();
}
