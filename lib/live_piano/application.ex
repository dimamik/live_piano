defmodule LivePiano.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      LivePianoWeb.Telemetry,
      LivePiano.Repo,
      {DNSCluster, query: Application.get_env(:live_piano, :dns_cluster_query) || :ignore},
      {Oban, Application.fetch_env!(:live_piano, Oban)},
      {Phoenix.PubSub, name: LivePiano.PubSub},
      LivePiano.RoomServer,
      LivePianoWeb.Presence,
      LivePianoWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: LivePiano.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    LivePianoWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
