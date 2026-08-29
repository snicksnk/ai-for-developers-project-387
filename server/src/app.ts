import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { sharedSchemas } from "./schemas.js";
import { registerRoutes } from "./routes.js";

/**
 * Builds the Fastify app: CORS, shared schemas, OpenAPI generation,
 * Swagger UI at /docs, and all API routes.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      transport: {
        target: "pino-pretty",
        options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
      },
    },
  });

  // @fastify/cors only allows GET,HEAD,POST by default — the API also needs
  // PUT (update event type) and DELETE (remove event type).
  await app.register(cors, {
    origin: true,
    methods: ["GET", "HEAD", "POST", "PUT", "DELETE"],
  });

  // Register shared model schemas so both validation and Swagger can $ref them.
  for (const schema of sharedSchemas) {
    app.addSchema(schema);
  }

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Booking Calendar API",
        description:
          "Backend for the booking calendar. Contract mirrors api-spect.tsp.",
        version: "1.0.0",
      },
      tags: [
        { name: "Owner", description: "Owner-facing endpoints" },
        { name: "Guest", description: "Guest-facing endpoints" },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: false },
  });

  await app.register(registerRoutes);

  return app;
}
