defmodule MidiRoomsWeb.ReqTest do
  @moduledoc false

  use MidiRoomsWeb.ConnCase, async: true

  test "no real requests are made" do
    assert_raise(RuntimeError, ~r/cannot find mock\/stub/, fn ->
      Req.get!("https://google.com")
    end)
  end
end
