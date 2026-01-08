defmodule LivePianoWeb.RoomChannel do
  @moduledoc """
  Channel for WebRTC signaling in piano rooms.
  Handles peer discovery and SDP/ICE exchange for P2P connections.
  MIDI data flows directly between browsers via WebRTC DataChannels.
  """
  use LivePianoWeb, :channel

  alias LivePiano.RoomServer

  @impl true
  def join("room:" <> slug, _params, socket) do
    case RoomServer.get_room(slug) do
      {:ok, room} ->
        socket = assign(socket, :slug, slug)
        send(self(), :after_join)
        {:ok, %{peer_id: socket.id, instrument: room.instrument}, socket}

      {:error, :not_found} ->
        {:error, %{reason: "room_not_found"}}
    end
  end

  @impl true
  def handle_info(:after_join, socket) do
    {:ok, _} =
      LivePianoWeb.Presence.track(socket, socket.id, %{
        joined_at: System.system_time(:second)
      })

    # Send current peers list to new joiner
    push(socket, "presence_state", LivePianoWeb.Presence.list(socket))

    # Notify existing peers about the new joiner
    broadcast_from!(socket, "peer_joined", %{peer_id: socket.id})

    {:noreply, socket}
  end

  @impl true
  def handle_in("signal", %{"to" => target_id, "data" => data}, socket) do
    # Relay signaling message (SDP offer/answer or ICE candidate) to target peer
    broadcast_from!(socket, "signal", %{
      from: socket.id,
      to: target_id,
      data: data
    })

    {:noreply, socket}
  end

  @impl true
  def handle_in("instrument_change", %{"instrument" => instrument}, socket) do
    case RoomServer.set_instrument(socket.assigns.slug, instrument) do
      {:ok, _room} ->
        # Broadcast to all users in the room (including sender)
        broadcast!(socket, "instrument_state", %{instrument: instrument})
        {:noreply, socket}

      {:error, _reason} ->
        {:reply, {:error, %{reason: "invalid_instrument"}}, socket}
    end
  end
end
