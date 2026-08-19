# myapp — Production-Ready CI/CD Pipeline for Cloud Deployment

A tiny Express "Hello World" app used to demonstrate a full CI/CD pipeline:

**Git → GitHub Actions → Docker → Docker Hub → AWS EC2 → Nginx**

## What happens on every push to `main`

1. **Test** – GitHub Actions installs dependencies and runs `npm test`.
2. **Build & Push** – if tests pass, a Docker image is built and pushed to
   Docker Hub, tagged with the short git SHA (e.g. `a1b2c3d`) **and** `latest`.
3. **Deploy** – GitHub Actions SSHes into the EC2 instance, pulls the new
   image, and restarts the container with `docker compose`.

Because every image is tagged with its commit SHA, rolling back is just
re-deploying an older tag (see `rollback.yml`).

---

## Step-by-step setup

### 1. Create the GitHub repo
```bash
cd myapp
git init
git add .
git commit -m "Initial commit: app + Docker + CI/CD pipeline"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/myapp.git
git push -u origin main
```

### 2. Create a Docker Hub repo
- Go to hub.docker.com → Create Repository → name it `myapp`.
- Create an access token: Account Settings → Security → New Access Token.

### 3. Launch an AWS EC2 instance
- Ubuntu 22.04, t2.micro (free tier) is enough.
- Security group: allow inbound ports **22 (SSH)**, **80 (HTTP)**, **443 (HTTPS)**.
- Create/download a key pair (`.pem` file) — you'll use this for GitHub's deploy key too, or generate a separate deploy-only key pair.

### 4. Set up the EC2 instance
SSH in, then install Docker, Compose, and Nginx:
```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP

sudo apt update
sudo apt install -y docker.io docker-compose-plugin nginx
sudo usermod -aG docker $USER
newgrp docker

mkdir -p /home/ubuntu/myapp
```

Copy `docker-compose.prod.yml` to `/home/ubuntu/myapp/` on the server, and
create `/home/ubuntu/myapp/.env.production` there manually (never commit this
file — see `.env.example` for the format). Also edit
`docker-compose.prod.yml` on the server to replace
`YOUR_DOCKERHUB_USERNAME` with your real Docker Hub username.

### 5. Configure Nginx as a reverse proxy
```bash
sudo cp nginx/myapp.conf /etc/nginx/sites-available/myapp.conf
# edit server_name to your EC2 public IP or domain
sudo ln -s /etc/nginx/sites-available/myapp.conf /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default   # remove the default site
sudo nginx -t
sudo systemctl reload nginx
```
Now port 80 (Nginx) forwards traffic to port 3000 (your container).

Optional HTTPS (only if you have a domain pointed at the EC2 IP):
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 6. Create a GitHub deploy SSH key
On your own machine (not EC2):
```bash
ssh-keygen -t ed25519 -f deploy_key -N ""
```
- Copy `deploy_key.pub` contents into EC2's `~/.ssh/authorized_keys`.
- Copy `deploy_key` (the private key) — you'll paste this into GitHub secrets.

### 7. Add GitHub repo secrets
Repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret name          | Value                                   |
|-----------------------|------------------------------------------|
| `DOCKERHUB_USERNAME`  | your Docker Hub username                |
| `DOCKERHUB_TOKEN`     | the access token from step 2            |
| `EC2_HOST`            | EC2 public IP or domain                 |
| `EC2_USER`            | `ubuntu`                                |
| `EC2_SSH_KEY`         | contents of the private `deploy_key`    |

### 8. Update placeholders in the repo
Replace `YOUR_DOCKERHUB_USERNAME` in:
- `.github/workflows/deploy.yml`
- `.github/workflows/rollback.yml`
- `docker-compose.prod.yml`

### 9. Trigger the pipeline
```bash
git add .
git commit -m "Configure for my Docker Hub + EC2"
git push origin main
```
Watch it run under the repo's **Actions** tab. Once it finishes, visit:
```
http://YOUR_EC2_PUBLIC_IP/
```
You should see the JSON response from the app.

### 10. Test a rollback
Actions tab → **Rollback** workflow → Run workflow → paste an older commit's
short SHA (visible in the Actions run logs or `git log --oneline`).

---

## Local development / testing (before pushing)
```bash
npm install
npm test
npm start          # runs on http://localhost:3000

# or with Docker
docker build -t myapp:local .
docker run -p 3000:3000 myapp:local
```

## Project structure
```
myapp/
├── src/
│   ├── server.js          # Express app
│   └── server.test.js     # basic tests
├── Dockerfile
├── docker-compose.prod.yml
├── .dockerignore
├── .env.example
├── nginx/
│   └── myapp.conf
└── .github/workflows/
    ├── deploy.yml          # test -> build/push -> deploy
    └── rollback.yml        # manual rollback to any past image tag
```
