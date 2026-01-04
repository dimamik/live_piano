<p align="center">
	<img src="https://raw.githubusercontent.com/dimamik/live_piano/main/img/logo-rich.png" alt="LivePiano logo" width="160" />
</p>

<p align="center">
	<a href="https://github.com/dimamik/live_piano/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License - MIT" /></a>
	<a href="https://hex.pm/packages/live_piano"><img src="https://img.shields.io/hexpm/v/live_piano.svg" alt="Hex version" /></a>
	<a href="https://github.com/dimamik/live_piano/blob/main/deployment/fly/README.md"><img src="https://img.shields.io/badge/Deploy%20to-Fly-blueviolet?logo=fly.io" alt="Deploy to Fly" /></a>
	<a href="https://github.com/dimamik/live_piano/blob/main/deployment/vps/README.md"><img src="https://img.shields.io/badge/Deploy%20on-VPS-blue?logo=docker" alt="Deploy on VPS" /></a>
</p>

# LivePiano

An opinionated Phoenix starter designed for speed without sacrificing quality. Spin up a PoC in minutes, then scale it into a production-grade application — the foundation is already there.

Built-in patterns help you (and your AI coding agents) extend the app while following industry best practices, so you write better software from day one.

## Getting started

```bash
# 1. Install the generator as a Mix archive (if not already)
mix archive.install hex live_piano --force

# 2. Generate a new app
mix live_piano.new my_new_app

# 3. Set it up and run it
cd my_new_app
mix setup
mix phx.server
```

## What's included

1. Web - [Phoenix](https://www.phoenixframework.org/) with [LiveView](https://hexdocs.pm/phoenix_live_view/Phoenix.LiveView.html)
1. Database - [Ecto](https://hexdocs.pm/ecto/Ecto.html) with [Postgres](https://www.postgresql.org/)
1. Jobs - [Oban](https://hexdocs.pm/oban/Oban.html) and [Oban Web (dashboard)](https://hexdocs.pm/oban_web/installation.html)
1. HTTP Requests - [Req](https://hexdocs.pm/req/Req.html)
1. Code Analysis - [Credo](https://hexdocs.pm/credo/overview.html) and [Sobelow](https://hexdocs.pm/sobelow/Sobelow.html)
1. CI/CD - [GitHub Actions](https://docs.github.com/actions) and [Fly.io](https://fly.io/docs/) or your own VPS (e.g. [Hetzner](https://www.hetzner.com/cloud/)) with [GHCR](https://docs.github.com/packages/working-with-a-github-packages-registry/working-with-the-container-registry) docker images (included)

## What **will** be included in the future

1. More robust and secure installation. I'd lean towards using hex to version and distribute the source code.
1. Safer default CSP settings (so we don't need to skip them in Sobelow)
1. Live Debugger
1. A way to test Req requests
1. Observability configuration (ideally - something free or self-hosted)
1. A way to define new views/components, so LLMs follow established patterns
1. Authorization (Probably some variation of Phoenix auth). Use password-first approach, since emails are harder to set up
1. Better LLM instructions and pre-defined tooling
1. Improved favicons for better branding
1. And many, many more

## Contributing

Feel free to open an issue or submit a pull request if you find bugs or want to contribute improvements!

## Learn More

- **Phoenix Framework:** https://www.phoenixframework.org/
- **Phoenix Guides:** https://hexdocs.pm/phoenix/overview.html
- **Phoenix Docs:** https://hexdocs.pm/phoenix
- **Elixir Forum:** https://elixirforum.com/c/phoenix-forum
- **Phoenix Source:** https://github.com/phoenixframework/phoenix
