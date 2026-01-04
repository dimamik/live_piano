defmodule LivePiano.Repo do
  use Ecto.Repo,
    otp_app: :live_piano,
    adapter: Ecto.Adapters.Postgres
end
