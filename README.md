# SmartRetailX

SmartRetailX is a cloud-native retail platform built using a microservices architecture. The project is organised as a monorepo containing several independent Express.js services, an API Gateway, and a Docker Compose setup for local development and testing.

The purpose of this project is to demonstrate distributed application development concepts such as service separation, API communication, containerisation, API documentation, and scalable deployment practices.

---

## Services Overview

| Service           | Location                      | Port | Purpose                                                                                               |
| ----------------- | ----------------------------- | ---- | ----------------------------------------------------------------------------------------------------- |
| API Gateway       | `gateway/`                    | 3000 | Central entry point that routes requests to backend services and exposes aggregated API documentation |
| User Service      | `services/user-service/`      | 3001 | Handles user registration, authentication, profile management, and JWT generation                     |
| Catalogue Service | `services/catalogue-service/` | 3002 | Manages products, categories, and product search operations                                           |
| Order Service     | `services/order-service/`     | 3003 | Creates and manages orders, communicates with other services, and processes order status updates      |

All APIs follow versioned endpoints using the `/api/v1` convention.

Each service also exposes its own Swagger/OpenAPI documentation through the `/docs` endpoint.

---

## API Gateway Routing

The API Gateway acts as the single entry point for clients and forwards requests to the appropriate microservice.

| Gateway Endpoint                    | Target Service    |
| ----------------------------------- | ----------------- |
| `http://localhost:3000/users/*`     | User Service      |
| `http://localhost:3000/catalogue/*` | Catalogue Service |
| `http://localhost:3000/orders/*`    | Order Service     |

### Example Requests

Register a new user:

```bash
curl -X POST http://localhost:3000/users/api/v1/auth/register \
-H "Content-Type: application/json" \
-d '{
  "email":"shopper@example.com",
  "password":"password123",
  "name":"Shopper"
}'
```

Create a product category:

```bash
curl -X POST http://localhost:3000/catalogue/api/v1/categories \
-H "Content-Type: application/json" \
-d '{
  "name":"Electronics"
}'
```

---

## API Documentation

The gateway provides a consolidated Swagger UI containing all available service endpoints.

| URL                        | Description                |
| -------------------------- | -------------------------- |
| http://localhost:3000/docs | Combined API documentation |
| http://localhost:3001/docs | User Service API           |
| http://localhost:3002/docs | Catalogue Service API      |
| http://localhost:3003/docs | Order Service API          |

---

## Running the Application with Docker

### Prerequisites

- Docker
- Docker Compose v2 or later

From the root directory of the project:

```bash
docker compose up --build
```

This command builds and starts all services on the shared Docker network.

### Health Check

```bash
http://localhost:3000/health
```

### Stopping the Environment

```bash
docker compose down
```

---

## Payment Service Note

The Order Service is designed to communicate with a Payment Service during order creation.

For the current implementation, a dedicated payment microservice has not been included. During development, the application simulates a successful payment if the configured payment endpoint is unavailable.

A real payment provider can be integrated later by updating the `PAYMENT_SERVICE_URL` environment variable.

---

## Local Development Setup

Install dependencies:

```bash
npm install
```

Create local environment files:

```bash
cp services/user-service/.env.example services/user-service/.env
cp services/catalogue-service/.env.example services/catalogue-service/.env
cp services/order-service/.env.example services/order-service/.env
cp gateway/.env.example gateway/.env
```

Start each service in separate terminals:

```bash
npm run start:user
npm run start:catalogue
npm run start:order
npm run start:gateway
```

For local service communication, configure the Order Service environment variables as follows:

```env
CATALOGUE_SERVICE_URL=http://localhost:3002
PAYMENT_SERVICE_URL=http://localhost:3004
```

---

## Testing

The project uses Jest and Supertest for automated testing.

Available commands:

```bash
npm test

npm run test:user
npm run test:catalogue
npm run test:order
npm run test:gateway
```

Tests cover both unit and integration scenarios, with controller-level coverage targets enforced across services.

---

## Project Structure

```text
smartretailx/
├── ARCHITECTURE.md
├── README.md
├── docker-compose.yml
├── gateway/
│   ├── Dockerfile
│   ├── src/
│   └── tests/
└── services/
    ├── user-service/
    ├── catalogue-service/
    └── order-service/
```

Each service follows a consistent structure and contains:

- Source code (`src/`)
- Automated tests (`tests/`)
- Dockerfile
- OpenAPI/Swagger specification
- Environment configuration examples
- Request validation using Zod
- Centralised error handling
- Pino-based request logging

This structure helps maintain consistency across services and simplifies future expansion of the platform.
