defmodule MidiRooms.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      MidiRoomsWeb.Telemetry,
      MidiRooms.Repo,
      {DNSCluster, query: Application.get_env(:midi_rooms, :dns_cluster_query) || :ignore},
      {Oban, Application.fetch_env!(:midi_rooms, Oban)},
      {Phoenix.PubSub, name: MidiRooms.PubSub},
      MidiRooms.RoomServer,
      MidiRoomsWeb.Presence,
      MidiRoomsWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: MidiRooms.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    MidiRoomsWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
