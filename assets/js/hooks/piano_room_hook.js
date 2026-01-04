// LiveView hook for the piano room

import { Socket } from "phoenix";
import { MidiHandler } from "../midi";
import { Piano, startAudioContext } from "../piano";
import { PianoKeyboard } from "../piano_keyboard";
import { WebRTCManager } from "../webrtc_manager";

const PianoRoom = {
  mounted() {
    console.log("PianoRoom hook mounted");

    this.slug = this.el.dataset.slug;
    console.log("Slug:", this.slug);

    // Initialize components
    this.piano = new Piano();

    // Setup keyboard with callbacks - everyone can play
    this.keyboard = new PianoKeyboard(
      document.getElementById("piano-keyboard"),
      // onNoteOn - broadcast to peers and play locally
      (note, velocity) => {
        this.sendMidiEvent("on", note, velocity);
        this.playNote(note, velocity); // Play locally immediately
      },
      // onNoteOff
      (note) => {
        this.sendMidiEvent("off", note, 0);
        this.stopNote(note); // Stop locally immediately
      }
    );
    this.keyboard.render();

    this.channel = null;
    this.webrtcManager = null;
    this.midiHandler = null;
    this.audioStarted = false;
    this.localPeerId = null;
    this.pendingPresenceState = null; // Store presence until WebRTC is ready

    // Connect to channel
    this.connectChannel();

    // Setup audio and MIDI on first interaction
    this.setupFirstInteraction();
  },

  connectChannel() {
    const socket = new Socket("/socket", {});
    socket.connect();

    this.channel = socket.channel(`room:${this.slug}`, {});

    // Handle presence for peer count only
    this.channel.on("presence_state", (state) => {
      const count = Object.keys(state).length;
      console.log("Presence state - peer count:", count, "peers:", Object.keys(state));
      this.updateListenerCount(count);
    });

    this.channel.on("presence_diff", (diff) => {
      const joins = Object.keys(diff.joins || {}).length;
      const leaves = Object.keys(diff.leaves || {}).length;
      const currentEl = document.getElementById("listener-count");
      if (currentEl) {
        const current = parseInt(currentEl.textContent) || 1;
        currentEl.textContent = Math.max(1, current + joins - leaves);
      }
    });

    this.channel.join()
      .receive("ok", (resp) => {
        console.log("Joined room successfully", resp);
        this.localPeerId = resp.peer_id;

        // Initialize WebRTC manager after we have our peer ID
        this.webrtcManager = new WebRTCManager(
          this.channel,
          // onMidiReceived - handle MIDI from other peers
          (type, note, velocity) => {
            this.handleIncomingMidi({ type, note, velocity });
          }
        );
        this.webrtcManager.init(this.localPeerId);

        // Don't connect to existing peers here - they will initiate via peer_joined
        // This prevents "glare" where both sides send offers simultaneously
        this.pendingPresenceState = null;
      })
      .receive("error", (resp) => {
        console.error("Unable to join room", resp);
      });
  },

  setupFirstInteraction() {
    const initOnInteraction = async () => {
      console.log("First interaction detected, initializing audio and MIDI...");

      // Initialize audio
      if (!this.audioStarted) {
        try {
          await startAudioContext();
          await this.piano.init();
          this.audioStarted = true;
          console.log("Audio initialized successfully");
        } catch (err) {
          console.error("Audio init failed:", err);
        }
      }

      // Initialize MIDI
      await this.setupMidi();

      // Remove listeners after first interaction
      document.removeEventListener("click", initOnInteraction);
      document.removeEventListener("keydown", initOnInteraction);
    };

    document.addEventListener("click", initOnInteraction);
    document.addEventListener("keydown", initOnInteraction);

    // Also try to init MIDI immediately
    console.log("Attempting immediate MIDI init...");
    this.setupMidi();
  },

  async setupMidi() {
    if (this.midiHandler) {
      console.log("MIDI handler already exists, skipping setup");
      return;
    }

    console.log("Setting up MIDI handler...");

    this.midiHandler = new MidiHandler(
      // onNoteOn
      (note, velocity) => {
        console.log("MIDI Note On:", note, velocity);
        this.sendMidiEvent("on", note, velocity);
      },
      // onNoteOff
      (note) => {
        console.log("MIDI Note Off:", note);
        this.sendMidiEvent("off", note, 0);
      },
      // onDevicesChanged
      (devices) => {
        console.log("MIDI devices changed:", devices);
        this.updateMidiStatusUI(devices.length > 0);
        this.pushEvent("midi_status", { connected: devices.length > 0 });
      }
    );

    const success = await this.midiHandler.init();
    console.log("MIDI init result:", success);

    if (!success) {
      console.warn("MIDI initialization failed");
    }
  },

  updateMidiStatusUI(connected) {
    const alertContainer = this.el.closest('main')?.querySelector('.alert');
    if (alertContainer) {
      if (connected) {
        alertContainer.className = 'alert alert-success max-w-md';
        alertContainer.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>MIDI keyboard connected</span>
        `;
      }
    }
  },

  sendMidiEvent(type, note, velocity) {
    // Send via WebRTC P2P to all connected peers
    if (this.webrtcManager) {
      this.webrtcManager.broadcastMidi(type, note, velocity);
    }
  },

  handleIncomingMidi(payload) {
    const { type, note, velocity } = payload;

    if (type === "on") {
      this.playNote(note, velocity);
    } else {
      this.stopNote(note);
    }
  },

  async playNote(note, velocity) {
    // Ensure audio is started
    if (!this.audioStarted) {
      await startAudioContext();
      await this.piano.init();
      this.audioStarted = true;
    }

    this.piano.playNote(note, velocity);
    this.keyboard.highlightKey(note);
  },

  stopNote(note) {
    this.piano.stopNote(note);
    this.keyboard.unhighlightKey(note);
  },

  updateListenerCount(count) {
    const el = document.getElementById("listener-count");
    if (el) {
      el.textContent = count;
    }
  },

  destroyed() {
    if (this.webrtcManager) {
      this.webrtcManager.destroy();
    }
    if (this.midiHandler) {
      this.midiHandler.destroy();
    }
    if (this.keyboard) {
      this.keyboard.destroy();
    }
    if (this.piano) {
      this.piano.destroy();
    }
    if (this.channel) {
      this.channel.leave();
    }
  }
};

export default PianoRoom;
