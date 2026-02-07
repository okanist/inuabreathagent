# GitHub Actions Deployment

## Setup

### 1. Configure GitHub Secrets
Go to: `Settings -> Secrets and variables -> Actions`

Add these secrets:
- `VPS_HOST`: your server IP or domain (for example: `203.0.113.10`)
- `VPS_USER`: your SSH username (for example: `deploy`)
- `VPS_SSH_KEY`: private SSH key used by GitHub Actions

### 2. Create SSH Key (if needed)
```bash
# Create a new SSH key pair
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions

# Copy public key to server
ssh-copy-id -i ~/.ssh/github_actions.pub <VPS_USER>@<VPS_HOST>

# Copy private key content and store it in GitHub Secret: VPS_SSH_KEY
cat ~/.ssh/github_actions
```

### 3. First-Time Server Setup
```bash
cd ~
git clone <YOUR_REPOSITORY_URL> inua-breath-backend
cd inua-breath-backend/backend

# Create environment file
cp .env.example .env
nano .env

# Start containers
docker compose up -d
```

## Usage
When you push changes to `main` (or your configured branch), GitHub Actions will:
1. Start the deployment workflow.
2. Connect to the server via SSH.
3. Pull latest changes.
4. Rebuild containers.
5. Restart services.

## Monitoring
- Check workflow runs in the GitHub Actions tab.
- On server: `docker compose logs -f`

## Troubleshooting

### SSH Connection Failed
- Verify `VPS_SSH_KEY`, `VPS_HOST`, and `VPS_USER` secrets.
- Check firewall and SSH port access.

### Git Pull Failed
- Verify repository exists on server.
- Verify branch and remote settings.

### Docker Build Failed
- Verify Docker and Docker Compose are installed.
- Check available disk space.

### Health Check Failed
- Check service logs: `docker compose logs`
- Check port usage (example): `sudo lsof -i :8001`

## Security Notes
- Do not store real server IP, usernames, tokens, or keys in repository files.
- Keep sensitive values only in GitHub Secrets.
- Rotate SSH keys immediately if they were exposed.
