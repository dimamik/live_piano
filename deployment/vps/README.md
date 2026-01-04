# Deploying Your App to Hetzner VPS with Docker Compose

## Quickstart

1. Clone the repo on your server
1. Add `.env` file with your environment variables. Use `mix phx.gen.secret` to generate `SECRET_KEY_BASE`. Other variables can be generated arbitrary.
1. Setup [nginx proxy manager](https://github.com/NginxProxyManager/nginx-proxy-manager). Run it inside `nginx_network`.
1. Run `docker-compose -f deployment/vps/docker-compose.yml --env-file .env up -d` from the root.
1. Go to nginx dashboard and configure SSL and domain settings
1. Enjoy your deployed app!

## Resources

- [Hetzner Cloud Docs](https://docs.hetzner.com/cloud/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Proxy Manager](https://nginxproxymanager.com/)
- [Let's Encrypt](https://letsencrypt.org/docs/)
- [Phoenix Deployment Guide](https://hexdocs.pm/phoenix/deployment.html)