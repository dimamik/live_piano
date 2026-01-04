defmodule LivePianoWeb.Presence do
  @moduledoc false
  use Phoenix.Presence,
    otp_app: :live_piano,
    pubsub_server: LivePiano.PubSub
end
