defmodule MidiRoomsWeb.RoomChannel do
  @moduledoc """
  Channel for real-time MIDI event broadcasting in piano rooms.
  Everyone can play, everyone hears all notes.
  """
  use MidiRoomsWeb, :channel

  alias MidiRooms.RoomServer

  @impl true
  def join("room:" <> slug, _params, socket) do
    case RoomServer.get_room(slug) do
      {:ok, _room} ->
        socket = assign(socket, :slug, slug)
        send(self(), :after_join)
        {:ok, socket}

      {:error, :not_found} ->
        {:error, %{reason: "room_not_found"}}
    end
  end

  @impl true
  def handle_info(:after_join, socket) do
    {:ok, _} = MidiRoomsWeb.Presence.track(socket, socket.id, %{
      joined_at: System.system_time(:second)
    })

    push(socket, "presence_state", MidiRoomsWeb.Presence.list(socket))
    {:noreply, socket}
  end

  @impl true
  def handle_in("midi", payload, socket) do
    # Broadcast to everyone in the room (including sender)
    broadcast!(socket, "midi", payload)
    {:noreply, socket}
  end
end
