defmodule LivePiano.RoomServer do
  @moduledoc """
  GenServer for managing ephemeral piano rooms in memory.
  Rooms are stored in ETS for fast concurrent access.
  """
  use GenServer

  @table_name :live_piano
  @slug_length 6
  @slug_chars ~c"abcdefghjkmnpqrstuvwxyz23456789"

  defstruct [:slug, :created_at, :instrument]

  @valid_instruments ~w(piano electric_piano organ synth_pad)

  # Client API

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  @doc """
  Creates a new room and returns the slug
  """
  def create_room do
    slug = generate_slug()

    room = %__MODULE__{
      slug: slug,
      created_at: DateTime.utc_now(),
      instrument: "piano"
    }

    :ets.insert(@table_name, {slug, room})
    {:ok, slug}
  end

  @doc """
  Gets a room by slug
  """
  def get_room(slug) do
    case :ets.lookup(@table_name, slug) do
      [{^slug, room}] -> {:ok, room}
      [] -> {:error, :not_found}
    end
  end

  @doc """
  Sets the instrument for a room
  """
  def set_instrument(slug, instrument) when instrument in @valid_instruments do
    case :ets.lookup(@table_name, slug) do
      [{^slug, room}] ->
        updated_room = %{room | instrument: instrument}
        :ets.insert(@table_name, {slug, updated_room})
        {:ok, updated_room}

      [] ->
        {:error, :not_found}
    end
  end

  def set_instrument(_slug, _instrument), do: {:error, :invalid_instrument}

  @doc """
  Deletes a room
  """
  def delete_room(slug) do
    :ets.delete(@table_name, slug)
    :ok
  end

  @doc """
  Lists all rooms (for debugging)
  """
  def list_rooms do
    :ets.tab2list(@table_name)
    |> Enum.map(fn {_slug, room} -> room end)
  end

  # Server callbacks

  @impl true
  def init(_opts) do
    table = :ets.new(@table_name, [:named_table, :public, :set, read_concurrency: true])
    {:ok, %{table: table}}
  end

  # Private helpers

  defp generate_slug do
    slug =
      1..@slug_length
      |> Enum.map(fn _ -> Enum.random(@slug_chars) end)
      |> List.to_string()

    # Ensure uniqueness
    case :ets.lookup(@table_name, slug) do
      [] -> slug
      _ -> generate_slug()
    end
  end
end
