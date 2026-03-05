# MedCore HMS — Docker & Kubernetes Architecture

## Docker Usage

- **Backend**: FastAPI app in Python 3.11, built from Dockerfile.backend
- **Frontend**: Vite/React app, built from Dockerfile.frontend
- **Database**: PostgreSQL 16 (for local dev, use Neon in prod)

### Local Development

1. Copy `.env` files as needed (see backend/.env.example)
2. Run: `docker-compose up --build`
3. Access frontend at http://localhost:3000, backend at http://localhost:8000

## Kubernetes Usage

- All manifests in `k8s/` directory
- Deployments for backend, frontend, and db
- Services for each component (ClusterIP)
- Ingress for unified routing (requires ingress controller)

### Quick Start (K8s)

1. Build and push images to a registry (update image names in manifests)
2. Apply manifests:
   ```
   kubectl apply -f k8s/db-deployment.yaml
   kubectl apply -f k8s/db-service.yaml
   kubectl apply -f k8s/backend-deployment.yaml
   kubectl apply -f k8s/backend-service.yaml
   kubectl apply -f k8s/frontend-deployment.yaml
   kubectl apply -f k8s/frontend-service.yaml
   kubectl apply -f k8s/ingress.yaml
   ```
3. Add `medcore.local` to your `/etc/hosts` for local ingress testing

## Notes
- For production, use Neon DB and externalize secrets via K8s Secrets
- Update image names/tags for your registry
- Scale replicas as needed for load balancing
- Ingress requires an ingress controller (e.g., NGINX)
