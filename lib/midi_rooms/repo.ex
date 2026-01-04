defmodule MidiRooms.Repo do
  use Ecto.Repo,
    otp_app: :midi_rooms,
    adapter: Ecto.Adapters.Postgres
end
