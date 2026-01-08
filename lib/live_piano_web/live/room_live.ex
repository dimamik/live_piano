defmodule LivePianoWeb.RoomLive do
  use LivePianoWeb, :live_view

  alias LivePiano.RoomServer

  @instruments [
    {"piano", "Piano"},
    {"electric_piano", "Electric Piano"},
    {"organ", "Organ"},
    {"synth_pad", "Synth Pad"}
  ]

  @impl true
  def mount(%{"slug" => slug}, _session, socket) do
    case RoomServer.get_room(slug) do
      {:ok, room} ->
        ice_servers = Application.get_env(:live_piano, :ice_servers, [])

        socket =
          socket
          |> assign(:slug, slug)
          |> assign(:listener_count, 1)
          |> assign(:midi_connected, false)
          |> assign(:ice_servers, Jason.encode!(ice_servers))
          |> assign(:instrument, room.instrument)
          |> assign(:instruments, @instruments)

        {:ok, socket}

      {:error, :not_found} ->
        socket =
          socket
          |> put_flash(:error, "Room not found")
          |> push_navigate(to: ~p"/")

        {:ok, socket}
    end
  end

  @impl true
  def handle_event("midi_status", %{"connected" => connected}, socket) do
    {:noreply, assign(socket, :midi_connected, connected)}
  end

  @impl true
  def handle_event("select_instrument", %{"instrument" => instrument}, socket) do
    {:noreply, push_event(socket, "select_instrument", %{instrument: instrument})}
  end

  @impl true
  def handle_event("instrument_changed", %{"instrument" => instrument}, socket) do
    {:noreply, assign(socket, :instrument, instrument)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="min-h-screen bg-base-200 flex flex-col">
      <!-- Header -->
      <header class="navbar bg-base-100 shadow-sm">
        <div class="flex-1">
          <a href="/" class="btn btn-ghost text-xl">Live Piano</a>
        </div>
        <div class="flex-none gap-2">
          <div id="listener-badge" phx-update="ignore" class="badge badge-outline gap-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span id="listener-count">{@listener_count}</span>
          </div>
        </div>
      </header>
      
    <!-- Main content -->
      <main class="flex-1 flex flex-col items-center justify-center p-4">
        <!-- Instrument picker -->
        <div class="mb-6">
          <div class="flex flex-wrap justify-center gap-2">
            <button
              :for={{id, label} <- @instruments}
              phx-click="select_instrument"
              phx-value-instrument={id}
              class={[
                "btn btn-sm transition-all",
                if(@instrument == id, do: "btn-primary", else: "btn-ghost btn-outline")
              ]}
            >
              {label}
            </button>
          </div>
          <p class="text-center text-xs text-base-content/50 mt-2">
            Everyone hears the same instrument
          </p>
        </div>
        
    <!-- Controls info -->
        <div class="mb-4 text-center text-sm text-base-content/70">
          <p>Click piano keys, use keyboard (A-L for white, W-E-T-Y-U for black), or MIDI</p>
          <p class="mt-1 text-xs opacity-60 md:hidden">
            Turn off Silent Mode to hear audio
          </p>
          <%= if @midi_connected do %>
            <p class="text-success mt-1 font-medium">✓ MIDI keyboard connected</p>
          <% end %>
        </div>
        
    <!-- Piano keyboard -->
        <div
          id="piano-room"
          phx-hook="PianoRoom"
          phx-update="ignore"
          data-slug={@slug}
          data-ice-servers={@ice_servers}
          class="w-full"
        >
          <div id="piano-keyboard" class="piano-keyboard"></div>
        </div>
        
    <!-- Share link -->
        <div class="mt-8 w-full max-w-md">
          <div class="form-control">
            <label class="label">
              <span class="label-text">Share this link with friends</span>
            </label>
            <div class="join w-full">
              <input
                type="text"
                id="share-url"
                value={url(~p"/room/#{@slug}")}
                readonly
                class="input input-bordered join-item flex-1"
              />
              <button
                onclick="navigator.clipboard.writeText(document.getElementById('share-url').value); this.textContent = 'Copied!'; setTimeout(() => this.textContent = 'Copy', 2000)"
                class="btn join-item"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
    """
  end
end
