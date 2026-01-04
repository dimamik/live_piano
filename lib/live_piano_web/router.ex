defmodule LivePianoWeb.Router do
  use LivePianoWeb, :router

  pipeline :browser do
    plug(:accepts, ["html"])
    plug(:fetch_session)
    plug(:fetch_live_flash)
    plug(:put_root_layout, html: {LivePianoWeb.Layouts, :root})
    plug(:protect_from_forgery)

    plug(:put_secure_browser_headers)
  end

  pipeline :api do
    plug(:accepts, ["json"])
  end

  scope "/", LivePianoWeb do
    pipe_through(:browser)

    live("/", HomeLive)
    live("/room/:slug", RoomLive)
  end

  # Other scopes may use custom stacks.
  # scope "/api", LivePianoWeb do
  #   pipe_through :api
  # end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:live_piano, :dev_routes) do
    # If you want to use the LiveDashboard or ObanDashboard in production, you
    # should put it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router
    import Oban.Web.Router

    scope "/dev" do
      pipe_through(:browser)

      live_dashboard("/dashboard", metrics: LivePianoWeb.Telemetry)
      oban_dashboard("/oban")
      forward("/mailbox", Plug.Swoosh.MailboxPreview)
    end
  end
end
