import Config

# Configure your database
#
# The MIX_TEST_PARTITION environment variable can be used
# to provide built-in test partitioning in CI environment.
# Run `mix help test` for more information.
database_url =
  System.get_env("DATABASE_URL") ||
    "postgresql://postgres:postgres@localhost/midi_rooms_test#{System.get_env("MIX_TEST_PARTITION")}"

config :midi_rooms, MidiRooms.Repo,
  url: database_url,
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: System.schedulers_online() * 2

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :midi_rooms, MidiRoomsWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "auGzTGxqLLMGEYCsTQv8dnZbz90hYrznPfShGqt2Ac5J5zW2z5btpAwu7AY4AqNs",
  server: false

# In test we don't send emails
config :midi_rooms, MidiRooms.Mailer, adapter: Swoosh.Adapters.Test

config :midi_rooms, Oban, testing: :manual

# Disable swoosh api client as it is only required for production adapters
config :swoosh, :api_client, false

# Print only warnings and errors during test
config :logger, level: :warning

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime

# Enable helpful, but potentially expensive runtime checks
config :phoenix_live_view,
  enable_expensive_runtime_checks: true

# Make sure no external requests are made during tests
config :req,
  default_options: [
    plug: {Req.Test, :req_plug}
  ]
