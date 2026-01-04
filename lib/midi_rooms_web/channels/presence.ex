defmodule MidiRoomsWeb.Presence do
  @moduledoc false
  use Phoenix.Presence,
    otp_app: :midi_rooms,
    pubsub_server: MidiRooms.PubSub
end
