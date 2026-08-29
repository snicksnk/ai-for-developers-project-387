import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { sharedSchemas } from "./schemas.js";
import { registerRoutes } from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Directory holding the built frontend (Vite `dist/`). In the Docker image the
 * build step copies it next to the compiled backend; override with PUBLIC_DIR.
 */
const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(__dirname, "public");

/**
 * Builds the Fastify app: CORS, shared schemas, OpenAPI generation,
 * Swagger UI at /docs, and all API routes.
 */
export async function buildApp(): Promise<FastifyInstance> {
  // `pino-pretty` is a dev-only dependency; in production (the Docker image
  // installs prod deps only) log plain JSON lines instead.
  const isProd = process.env.NODE_ENV === "production";
  const app = Fastify({
    logger: isProd
      ? true
      : {
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

  // Serve the built single-page frontend (if present) from the same origin as
  // the API, so a single container/port hosts the whole app. Any unmatched GET
  // that isn't an API or /docs path falls back to index.html for client-side
  // routing (e.g. /owner).
  if (fs.existsSync(path.join(PUBLIC_DIR, "index.html"))) {
    await app.register(fastifyStatic, { root: PUBLIC_DIR });

    app.setNotFoundHandler((request, reply) => {
      if (
        request.method === "GET" &&
        !request.url.startsWith("/docs") &&
        (request.headers.accept ?? "").includes("text/html")
      ) {
        return reply.sendFile("index.html");
      }
      return reply.code(404).send({ error: "Not found" });
    });
  }

  return app;
}
