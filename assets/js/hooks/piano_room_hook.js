// LiveView hook for the piano room

import { Socket, Presence } from "phoenix";
import { MidiHandler } from "../midi";
import { Piano, startAudioContext } from "../piano";
import { PianoKeyboard } from "../piano_keyboard";
import { WebRTCManager } from "../webrtc_manager";

const PianoRoom = {
  mounted() {
    console.log("PianoRoom hook mounted");

    this.slug = this.el.dataset.slug;
    console.log("Slug:", this.slug);

    // Parse ICE servers from data attribute
    try {
      this.iceServers = JSON.parse(this.el.dataset.iceServers || "[]");
      console.log("ICE servers:", this.iceServers);
    } catch (e) {
      console.warn("Failed to parse ICE servers:", e);
      this.iceServers = [];
    }

    // Initialize components
    this.piano = new Piano();

    // Start preloading samples immediately (doesn't require user interaction)
    this.piano.preload();

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

    // Scroll to center on middle C (C4) after a short delay
    setTimeout(() => {
      this.scrollToMiddleC();
    }, 100);

    this.channel = null;
    this.webrtcManager = null;
    this.midiHandler = null;
    this.audioStarted = false;
    this.localPeerId = null;
    this.pendingPresenceState = null; // Store presence until WebRTC is ready
    this.currentInstrument = null;

    // Listen for LiveView events
    this.handleEvent("select_instrument", ({ instrument }) => {
      console.log("Select instrument event from LiveView:", instrument);
      // Push to channel to broadcast to all users
      if (this.channel) {
        this.channel.push("instrument_change", { instrument });
      }
    });

    // Connect to channel
    this.connectChannel();

    // Setup audio and MIDI on first interaction
    this.setupFirstInteraction();
  },

  connectChannel() {
    const socket = new Socket("/socket", {});
    socket.connect();

    this.channel = socket.channel(`room:${this.slug}`, {});

    // Handle presence using Phoenix Presence for proper state sync
    this.presence = new Presence(this.channel);

    this.presence.onSync(() => {
      const count = this.presence.list().length;
      console.log("Presence sync - peer count:", count);
      this.updateListenerCount(count);
    });

    // Listen for instrument state broadcasts
    this.channel.on("instrument_state", (payload) => {
      console.log("Instrument state received:", payload.instrument);
      this.handleInstrumentChange(payload.instrument);
    });

    this.channel.join()
      .receive("ok", (resp) => {
        console.log("Joined room successfully", resp);
        this.localPeerId = resp.peer_id;

        // Set initial instrument from server
        if (resp.instrument) {
          this.handleInstrumentChange(resp.instrument);
        }

        // Initialize WebRTC manager after we have our peer ID
        this.webrtcManager = new WebRTCManager(
          this.channel,
          // onMidiReceived - handle MIDI from other peers
          (type, note, velocity) => {
            this.handleIncomingMidi({ type, note, velocity });
          },
          this.iceServers
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

  handleInstrumentChange(instrumentId) {
    if (instrumentId === this.currentInstrument) return;

    console.log("Changing instrument to:", instrumentId);
    this.currentInstrument = instrumentId;
    this.piano.setInstrument(instrumentId);

    // Update LiveView assign for UI sync
    this.pushEvent("instrument_changed", { instrument: instrumentId });
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
      // onNoteOn - broadcast to peers and play locally
      (note, velocity) => {
        console.log("MIDI Note On:", note, velocity);
        this.sendMidiEvent("on", note, velocity);
        this.playNote(note, velocity); // Play locally immediately
      },
      // onNoteOff - broadcast to peers and stop locally
      (note) => {
        console.log("MIDI Note Off:", note);
        this.sendMidiEvent("off", note, 0);
        this.stopNote(note); // Stop locally immediately
      },
      // onDevicesChanged
      (devices) => {
        console.log("MIDI devices changed:", devices);
        this.updateMidiStatusUI(devices.length > 0);
        this.pushEvent("midi_status", { connected: devices.length > 0 });
      },
      // onSustainPedal
      (isDown) => {
        console.log("Sustain pedal:", isDown ? "down" : "up");
        this.sendSustainEvent(isDown);
        this.piano.setSustainPedal(isDown);
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

  sendSustainEvent(isDown) {
    // Send sustain pedal via WebRTC P2P to all connected peers
    if (this.webrtcManager) {
      this.webrtcManager.broadcastMidi("sustain", isDown ? 1 : 0, 0);
    }
  },

  handleIncomingMidi(payload) {
    const { type, note, velocity } = payload;

    if (type === "on") {
      this.playNote(note, velocity);
      this.keyboard.highlightKey(note);
    } else if (type === "off") {
      this.stopNote(note);
      this.keyboard.unhighlightKey(note);
    } else if (type === "sustain") {
      // note contains 1 for down, 0 for up
      this.piano.setSustainPedal(note === 1);
    }
  },

  async playNote(note, velocity) {
    // Try to start audio if not already started
    if (!this.audioStarted) {
      // Check if audio context is suspended (needs user gesture on mobile)
      const Tone = await import("tone");
      if (Tone.getContext().state === "suspended") {
        this.showAudioEnablePrompt();
        return;
      }

      // Try to start audio
      try {
        await startAudioContext();
        await this.piano.init();
        this.audioStarted = true;
      } catch (err) {
        console.warn("Audio init failed:", err);
        return;
      }
    }

    this.piano.playNote(note, velocity);
  },

  showAudioEnablePrompt() {
    // Only show once
    if (this.audioPromptShown) return;
    this.audioPromptShown = true;

    // Create overlay prompt
    const overlay = document.createElement("div");
    overlay.id = "audio-enable-overlay";
    overlay.className = "fixed inset-0 bg-black/70 flex items-center justify-center z-50";
    overlay.innerHTML = `
      <div class="bg-base-100 rounded-lg p-6 mx-4 text-center max-w-sm shadow-xl">
        <div class="text-4xl mb-4">🎹</div>
        <h3 class="text-lg font-semibold mb-2">Enable Audio</h3>
        <p class="text-base-content/70 mb-4">Tap to hear the music from other players</p>
        <button id="enable-audio-btn" class="btn btn-primary btn-wide">
          Enable Audio
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("enable-audio-btn").addEventListener("click", async () => {
      try {
        await startAudioContext();
        await this.piano.init();
        this.audioStarted = true;
        overlay.remove();
      } catch (err) {
        console.error("Failed to start audio:", err);
      }
    });
  },

  stopNote(note) {
    this.piano.stopNote(note);
  },

  updateListenerCount(count) {
    const el = document.getElementById("listener-count");
    if (el) {
      el.textContent = count;
    }
  },

  scrollToMiddleC() {
    const container = document.querySelector(".piano-container");
    const middleCKey = document.querySelector('[data-note="60"]'); // C4

    if (container && middleCKey) {
      const containerRect = container.getBoundingClientRect();
      const keyRect = middleCKey.getBoundingClientRect();

      // Calculate scroll position to center middle C
      const scrollLeft = middleCKey.offsetLeft - (containerRect.width / 2) + (keyRect.width / 2);

      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: "smooth"
      });
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
    this.presence = null;
    if (this.channel) {
      this.channel.leave();
    }
  }
};

export default PianoRoom;
