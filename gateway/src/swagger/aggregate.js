const config = require('../config');

/**
 * Aggregated OpenAPI document. Paths are rewritten to gateway-facing routes
 * (/users, /catalogue, /orders) while preserving each service's /api/v1 contract
 * via the proxy path rewrite.
 */
function buildAggregatedSwagger() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'SmartRetailX API Gateway',
      description:
        'Aggregated API documentation for user, catalogue, and order services. ' +
        'Traffic is proxied: /users → user-service, /catalogue → catalogue-service, /orders → order-service.',
      version: '1.0.0',
    },
    servers: [
      {
        url: '/',
        description: 'API Gateway',
      },
    ],
    tags: [
      { name: 'Users', description: `Proxied to ${config.userServiceUrl}` },
      { name: 'Catalogue', description: `Proxied to ${config.catalogueServiceUrl}` },
      { name: 'Orders', description: `Proxied to ${config.orderServiceUrl}` },
    ],
    paths: {
      '/users/api/v1/auth/register': {
        post: {
          tags: ['Users'],
          summary: 'Register a new user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password', 'name'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Registered' } },
        },
      },
      '/users/api/v1/auth/login': {
        post: {
          tags: ['Users'],
          summary: 'Login',
          responses: { '200': { description: 'JWT issued' } },
        },
      },
      '/users/api/v1/users/me': {
        get: {
          tags: ['Users'],
          summary: 'Current user profile',
          security: [{ bearerAuth: [] }],
          responses: { '200': { description: 'Profile' } },
        },
      },
      '/catalogue/api/v1/categories': {
        get: {
          tags: ['Catalogue'],
          summary: 'List categories',
          responses: { '200': { description: 'OK' } },
        },
        post: {
          tags: ['Catalogue'],
          summary: 'Create category',
          responses: { '201': { description: 'Created' } },
        },
      },
      '/catalogue/api/v1/products': {
        get: {
          tags: ['Catalogue'],
          summary: 'List products',
          responses: { '200': { description: 'OK' } },
        },
        post: {
          tags: ['Catalogue'],
          summary: 'Create product',
          responses: { '201': { description: 'Created' } },
        },
      },
      '/catalogue/api/v1/search': {
        get: {
          tags: ['Catalogue'],
          summary: 'Search products',
          parameters: [
            {
              name: 'q',
              in: 'query',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: { '200': { description: 'Matches' } },
        },
      },
      '/orders/api/v1/orders': {
        get: {
          tags: ['Orders'],
          summary: 'List orders',
          responses: { '200': { description: 'OK' } },
        },
        post: {
          tags: ['Orders'],
          summary: 'Create order',
          responses: { '201': { description: 'Created' } },
        },
      },
      '/orders/api/v1/orders/{id}': {
        get: {
          tags: ['Orders'],
          summary: 'Get order',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'OK' } },
        },
      },
      '/orders/api/v1/orders/{id}/status': {
        patch: {
          tags: ['Orders'],
          summary: 'Update order status',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Updated' } },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  };
}

module.exports = { buildAggregatedSwagger };
