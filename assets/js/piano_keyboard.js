// Piano keyboard UI renderer with mouse and keyboard input

export class PianoKeyboard {
  constructor(container, onNoteOn, onNoteOff) {
    this.container = container;
    this.onNoteOn = onNoteOn;
    this.onNoteOff = onNoteOff;
    this.keys = new Map(); // noteNumber -> element
    this.startNote = 21; // A0 (lowest note on standard 88-key piano)
    this.endNote = 108; // C8 (highest note on standard 88-key piano)
    this.pressedKeys = new Set();
    this.mouseDown = false;

    // Computer keyboard mapping (starting from C4 = 60)
    this.keyboardMap = {
      // Lower row - white keys
      'a': 60, // C4
      's': 62, // D4
      'd': 64, // E4
      'f': 65, // F4
      'g': 67, // G4
      'h': 69, // A4
      'j': 71, // B4
      'k': 72, // C5
      'l': 74, // D5
      ';': 76, // E5
      // Upper row - black keys
      'w': 61, // C#4
      'e': 63, // D#4
      't': 66, // F#4
      'y': 68, // G#4
      'u': 70, // A#4
      'o': 73, // C#5
      'p': 75, // D#5
      // Extra keys
      'z': 48, // C3
      'x': 50, // D3
      'c': 52, // E3
      'v': 53, // F3
      'b': 55, // G3
      'n': 57, // A3
      'm': 59, // B3
    };
  }

  render() {
    this.container.innerHTML = "";
    this.container.className = "piano-container";

    // Create the main piano frame
    const pianoFrame = document.createElement("div");
    pianoFrame.className = "piano-frame";

    // Left end cap
    const leftEnd = document.createElement("div");
    leftEnd.className = "piano-end piano-end-left";
    pianoFrame.appendChild(leftEnd);

    // Keyboard section
    const keyboard = document.createElement("div");
    keyboard.className = "piano-keys";

    for (let note = this.startNote; note <= this.endNote; note++) {
      const isBlack = this.isBlackKey(note);
      const key = document.createElement("div");

      key.className = `piano-key ${isBlack ? "black-key" : "white-key"}`;
      key.dataset.note = note;

      // Add note label for C notes
      if (note % 12 === 0) {
        const label = document.createElement("span");
        label.className = "key-label";
        label.textContent = `C${Math.floor(note / 12) - 1}`;
        key.appendChild(label);
      }

      // Mouse/touch events
      key.addEventListener("mousedown", (e) => this.handleKeyDown(note, e));
      key.addEventListener("mouseenter", (e) => {
        if (this.mouseDown) this.handleKeyDown(note, e);
      });
      key.addEventListener("mouseup", () => this.handleKeyUp(note));
      key.addEventListener("mouseleave", () => this.handleKeyUp(note));

      // Touch events
      key.addEventListener("touchstart", (e) => {
        e.preventDefault();
        this.handleKeyDown(note, e);
      });
      key.addEventListener("touchend", (e) => {
        e.preventDefault();
        this.handleKeyUp(note);
      });

      keyboard.appendChild(key);
      this.keys.set(note, key);
    }

    pianoFrame.appendChild(keyboard);

    // Right end cap
    const rightEnd = document.createElement("div");
    rightEnd.className = "piano-end piano-end-right";
    pianoFrame.appendChild(rightEnd);

    this.container.appendChild(pianoFrame);

    // Global mouse up listener
    document.addEventListener("mouseup", () => {
      this.mouseDown = false;
    });

    // Computer keyboard listeners
    document.addEventListener("keydown", (e) => this.handleComputerKeyDown(e));
    document.addEventListener("keyup", (e) => this.handleComputerKeyUp(e));
  }

  handleKeyDown(note, e) {
    if (e) e.preventDefault();
    this.mouseDown = true;

    if (!this.pressedKeys.has(note)) {
      this.pressedKeys.add(note);
      this.highlightKey(note);
      if (this.onNoteOn) this.onNoteOn(note, 100);
    }
  }

  handleKeyUp(note) {
    if (this.pressedKeys.has(note)) {
      this.pressedKeys.delete(note);
      this.unhighlightKey(note);
      if (this.onNoteOff) this.onNoteOff(note);
    }
  }

  handleComputerKeyDown(e) {
    // Ignore if typing in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.repeat) return; // Ignore key repeat

    const note = this.keyboardMap[e.key.toLowerCase()];
    if (note !== undefined) {
      e.preventDefault();
      this.handleKeyDown(note, null);
    }
  }

  handleComputerKeyUp(e) {
    const note = this.keyboardMap[e.key.toLowerCase()];
    if (note !== undefined) {
      this.handleKeyUp(note);
    }
  }

  isBlackKey(noteNumber) {
    const noteInOctave = noteNumber % 12;
    return [1, 3, 6, 8, 10].includes(noteInOctave);
  }

  highlightKey(noteNumber) {
    const key = this.keys.get(noteNumber);
    if (key) {
      key.classList.add("active");
    }
  }

  unhighlightKey(noteNumber) {
    const key = this.keys.get(noteNumber);
    if (key) {
      key.classList.remove("active");
    }
  }

  unhighlightAll() {
    this.keys.forEach((key) => {
      key.classList.remove("active");
    });
    this.pressedKeys.clear();
  }

  destroy() {
    document.removeEventListener("keydown", this.handleComputerKeyDown);
    document.removeEventListener("keyup", this.handleComputerKeyUp);
  }
}
