defmodule LivePianoWeb.PageController do
  use LivePianoWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
