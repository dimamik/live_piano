// WebRTC Manager for P2P MIDI connections

// Default ICE servers (STUN only - won't work on mobile networks/Safari without TURN)
const DEFAULT_ICE_SERVERS = [
  { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }
];

export class WebRTCManager {
  constructor(channel, onMidiReceived, iceServers = null) {
    this.channel = channel;
    this.onMidiReceived = onMidiReceived;
    this.peers = new Map();        // peerId -> RTCPeerConnection
    this.dataChannels = new Map(); // peerId -> RTCDataChannel
    this.localId = null;
    this.pendingCandidates = new Map(); // peerId -> ICE candidates waiting for remote description

    // Use provided ICE servers or fall back to defaults
    // For Safari/iOS on mobile networks, TURN servers are required
    this.iceConfig = {
      iceServers: iceServers && iceServers.length > 0 ? iceServers : DEFAULT_ICE_SERVERS
    };
    console.log("WebRTC ICE config:", this.iceConfig);
  }

  init(localId) {
    this.localId = localId;
    console.log("WebRTC Manager initialized with local ID:", localId);

    // Listen for signaling messages
    this.channel.on("signal", (payload) => {
      console.log("Signal event received:", payload.from, "->", payload.to, "(I am:", this.localId, ")");
      // Only process messages addressed to us
      if (payload.to === this.localId) {
        console.log("Signal is for me, processing...");
        this.handleSignal(payload.from, payload.data);
      } else {
        console.log("Signal not for me, ignoring");
      }
    });

    // Listen for new peers joining
    this.channel.on("peer_joined", (payload) => {
      console.log("New peer joined:", payload.peer_id);
      // We initiate connection to new peers (we're the "impolite" peer)
      this.connectToPeer(payload.peer_id);
    });

    // Listen for peers leaving
    this.channel.on("presence_diff", (diff) => {
      const leaves = Object.keys(diff.leaves || {});
      leaves.forEach(peerId => {
        console.log("Peer left:", peerId);
        this.closePeerConnection(peerId);
      });
    });
  }

  // Connect to existing peers when we join
  connectToExistingPeers(presenceState) {
    console.log("Presence state received:", presenceState);
    console.log("Local ID:", this.localId);
    const peerIds = Object.keys(presenceState).filter(id => id !== this.localId);
    console.log("Peers to connect to:", peerIds);
    peerIds.forEach(peerId => {
      if (peerId && peerId.length > 0) {
        this.connectToPeer(peerId);
      } else {
        console.warn("Skipping invalid peer ID:", peerId);
      }
    });
  }

  async connectToPeer(peerId) {
    if (this.peers.has(peerId)) {
      console.log("Already connected to peer:", peerId);
      return;
    }

    console.log("Creating connection to peer:", peerId);
    const pc = this.createPeerConnection(peerId);
    this.peers.set(peerId, pc);

    // Create data channel for MIDI (only the initiator creates the channel)
    const dataChannel = pc.createDataChannel("midi", {
      ordered: true,
      maxRetransmits: 3
    });
    this.setupDataChannel(peerId, dataChannel);

    // Create and send offer
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this.sendSignal(peerId, { type: "offer", sdp: offer.sdp });
    } catch (err) {
      console.error("Error creating offer:", err);
    }
  }

  createPeerConnection(peerId) {
    const pc = new RTCPeerConnection(this.iceConfig);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`ICE candidate for ${peerId}:`, event.candidate.candidate);
        this.sendSignal(peerId, {
          type: "ice-candidate",
          candidate: event.candidate
        });
      } else {
        console.log(`ICE gathering complete for ${peerId}`);
      }
    };

    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${peerId}:`, pc.iceConnectionState);
    };

    // Handle ICE gathering state
    pc.onicegatheringstatechange = () => {
      console.log(`ICE gathering state with ${peerId}:`, pc.iceGatheringState);
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}:`, pc.connectionState);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        this.closePeerConnection(peerId);
      }
    };

    // Handle incoming data channels (for the answering peer)
    pc.ondatachannel = (event) => {
      console.log("Received data channel from:", peerId);
      this.setupDataChannel(peerId, event.channel);
    };

    return pc;
  }

  setupDataChannel(peerId, channel) {
    console.log(`Setting up data channel for ${peerId}, current state: ${channel.readyState}`);

    channel.onopen = () => {
      console.log("Data channel OPEN with:", peerId);
      this.dataChannels.set(peerId, channel);
    };

    channel.onclose = () => {
      console.log("Data channel CLOSED with:", peerId);
      this.dataChannels.delete(peerId);
    };

    channel.onerror = (error) => {
      console.error("Data channel ERROR with:", peerId, error);
    };

    channel.onmessage = (event) => {
      console.log("Received MIDI from:", peerId, event.data);
      try {
        const data = JSON.parse(event.data);
        if (this.onMidiReceived) {
          this.onMidiReceived(data.type, data.note, data.velocity);
        }
      } catch (err) {
        console.error("Error parsing MIDI message:", err);
      }
    };

    // If already open, add to map
    if (channel.readyState === "open") {
      console.log("Data channel already open, adding to map:", peerId);
      this.dataChannels.set(peerId, channel);
    }
  }

  async handleSignal(fromPeerId, data) {
    console.log("=== Received signal from", fromPeerId, "type:", data.type);

    if (data.type === "offer") {
      console.log("Processing offer from:", fromPeerId);
      await this.handleOffer(fromPeerId, data);
    } else if (data.type === "answer") {
      console.log("Processing answer from:", fromPeerId);
      await this.handleAnswer(fromPeerId, data);
    } else if (data.type === "ice-candidate") {
      console.log("Processing ICE candidate from:", fromPeerId);
      await this.handleIceCandidate(fromPeerId, data.candidate);
    }
  }

  async handleOffer(peerId, offer) {
    console.log("handleOffer called for peer:", peerId);

    // Create peer connection if we don't have one
    if (!this.peers.has(peerId)) {
      console.log("Creating new peer connection for:", peerId);
      const pc = this.createPeerConnection(peerId);
      this.peers.set(peerId, pc);
    }

    const pc = this.peers.get(peerId);

    try {
      console.log("Setting remote description (offer)...");
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: "offer",
        sdp: offer.sdp
      }));
      console.log("Remote description set successfully");

      // Process any pending ICE candidates
      await this.processPendingCandidates(peerId);

      console.log("Creating answer...");
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log("Answer created, sending to:", peerId);
      this.sendSignal(peerId, { type: "answer", sdp: answer.sdp });
    } catch (err) {
      console.error("Error handling offer:", err);
    }
  }

  async handleAnswer(peerId, answer) {
    console.log("handleAnswer called for peer:", peerId);
    const pc = this.peers.get(peerId);
    if (!pc) {
      console.warn("No peer connection for answer from:", peerId);
      return;
    }

    try {
      console.log("Setting remote description (answer)...");
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: "answer",
        sdp: answer.sdp
      }));
      console.log("Remote description (answer) set successfully");

      // Process any pending ICE candidates
      await this.processPendingCandidates(peerId);
      console.log("Answer processing complete, connection should establish soon");
    } catch (err) {
      console.error("Error handling answer:", err);
    }
  }

  async handleIceCandidate(peerId, candidate) {
    const pc = this.peers.get(peerId);
    if (!pc) {
      console.warn("No peer connection for ICE candidate from:", peerId);
      return;
    }

    // If remote description isn't set yet, queue the candidate
    if (!pc.remoteDescription) {
      if (!this.pendingCandidates.has(peerId)) {
        this.pendingCandidates.set(peerId, []);
      }
      this.pendingCandidates.get(peerId).push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error("Error adding ICE candidate:", err);
    }
  }

  async processPendingCandidates(peerId) {
    const candidates = this.pendingCandidates.get(peerId) || [];
    const pc = this.peers.get(peerId);

    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("Error adding pending ICE candidate:", err);
      }
    }

    this.pendingCandidates.delete(peerId);
  }

  sendSignal(toPeerId, data) {
    console.log("Sending signal to:", toPeerId, "type:", data.type);
    this.channel.push("signal", { to: toPeerId, data: data });
  }

  broadcastMidi(type, note, velocity) {
    const message = JSON.stringify({ type, note, velocity });
    console.log(`Broadcasting MIDI to ${this.dataChannels.size} peers:`, message);

    this.dataChannels.forEach((channel, peerId) => {
      console.log(`  - Peer ${peerId}: channel state = ${channel.readyState}`);
      if (channel.readyState === "open") {
        channel.send(message);
        console.log(`    Sent to ${peerId}`);
      }
    });
  }

  closePeerConnection(peerId) {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
    }
    this.dataChannels.delete(peerId);
    this.pendingCandidates.delete(peerId);
  }

  getConnectedPeerCount() {
    return this.dataChannels.size;
  }

  destroy() {
    this.peers.forEach((pc, peerId) => {
      pc.close();
    });
    this.peers.clear();
    this.dataChannels.clear();
    this.pendingCandidates.clear();
  }
}
