// Web MIDI API wrapper for capturing MIDI keyboard input

export class MidiHandler {
  constructor(onNoteOn, onNoteOff, onDevicesChanged, onSustainPedal) {
    this.onNoteOn = onNoteOn;
    this.onNoteOff = onNoteOff;
    this.onDevicesChanged = onDevicesChanged;
    this.onSustainPedal = onSustainPedal;
    this.midiAccess = null;
    this.activeInputs = new Map();
  }

  async init() {
    if (!navigator.requestMIDIAccess) {
      console.warn("Web MIDI API not supported in this browser");
      return false;
    }

    try {
      console.log("Requesting MIDI access...");
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      console.log("MIDI access granted:", this.midiAccess);
      console.log("MIDI inputs:", this.midiAccess.inputs);
      console.log("MIDI inputs size:", this.midiAccess.inputs.size);

      // Use addEventListener for better compatibility
      this.midiAccess.addEventListener('statechange', (e) => {
        console.log("MIDI state change:", e.port.name, e.port.state);
        this.updateDevices();
      });

      this.updateDevices();
      return true;
    } catch (err) {
      console.error("Failed to get MIDI access:", err);
      return false;
    }
  }

  updateDevices() {
    const devices = [];

    // Clear old listeners
    this.activeInputs.forEach((_, input) => {
      input.onmidimessage = null;
    });
    this.activeInputs.clear();

    // Setup new listeners - iterate over the Map entries
    for (const [id, input] of this.midiAccess.inputs) {
      console.log("Found MIDI input:", id, input.name, "state:", input.state);

      if (input.state === "connected") {
        devices.push({
          id: input.id,
          name: input.name || "Unknown Device",
          manufacturer: input.manufacturer || "Unknown"
        });

        input.onmidimessage = (event) => this.handleMidiMessage(event);
        this.activeInputs.set(input, true);
      }
    }

    console.log("Total connected MIDI devices:", devices.length, devices);

    if (this.onDevicesChanged) {
      this.onDevicesChanged(devices);
    }
  }

  handleMidiMessage(event) {
    const [status, data1, data2] = event.data;
    const command = status >> 4;

    // Note On (command 9) with velocity > 0
    if (command === 9 && data2 > 0) {
      this.onNoteOn(data1, data2);
    }
    // Note Off (command 8) or Note On with velocity 0
    else if (command === 8 || (command === 9 && data2 === 0)) {
      this.onNoteOff(data1);
    }
    // Control Change (command 11)
    else if (command === 11) {
      const controller = data1;
      const value = data2;

      // Sustain pedal is CC 64
      if (controller === 64 && this.onSustainPedal) {
        // Pedal down when value >= 64, up when < 64
        this.onSustainPedal(value >= 64);
      }
    }
  }

  destroy() {
    this.activeInputs.forEach((_, input) => {
      input.onmidimessage = null;
    });
    this.activeInputs.clear();
  }
}

// Convert MIDI note number to note name (e.g., 60 -> "C4")
export function midiNoteToName(noteNumber) {
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(noteNumber / 12) - 1;
  const noteName = notes[noteNumber % 12];
  return `${noteName}${octave}`;
}
