defmodule LivePianoWeb.UserSocket do
  use Phoenix.Socket

  channel("room:*", LivePianoWeb.RoomChannel)

  @impl true
  def connect(_params, socket, _connect_info) do
    # Generate unique peer ID for WebRTC signaling
    peer_id = generate_peer_id()
    {:ok, assign(socket, :peer_id, peer_id)}
  end

  @impl true
  def id(socket), do: "peer:#{socket.assigns.peer_id}"

  defp generate_peer_id do
    :crypto.strong_rand_bytes(8) |> Base.url_encode64(padding: false)
  end
end
