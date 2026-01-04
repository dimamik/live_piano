defmodule MidiRoomsWeb.PageController do
  use MidiRoomsWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end
end
