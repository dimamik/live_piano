defmodule LivePianoWeb.HomeLive do
  use LivePianoWeb, :live_view

  alias LivePiano.RoomServer

  @impl true
  def mount(_params, _session, socket) do
    {:ok, socket}
  end

  @impl true
  def handle_event("create_room", _params, socket) do
    {:ok, slug} = RoomServer.create_room()
    {:noreply, push_navigate(socket, to: ~p"/room/#{slug}")}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen flex flex-col items-center justify-center bg-base-200">
      <div class="text-center max-w-2xl px-4">
        <h1 class="text-5xl font-bold mb-4">Live Piano</h1>
        <p class="text-xl text-base-content/70 mb-8">
          Create a room, connect your MIDI keyboard, and let others listen to you play in real-time.
        </p>

        <button
          phx-click="create_room"
          class="btn btn-primary btn-lg gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Create Room
        </button>

        <div class="mt-12 text-sm text-base-content/50">
          <p>Works best in Chrome, Edge, or Opera (Web MIDI API required)</p>
        </div>
      </div>
    </div>
    """
  end
end
