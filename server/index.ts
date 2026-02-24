import { randomUUID } from "crypto";
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes.js";
import { loadEnv } from "./env.js";

// Dynamic import for vite utilities to avoid bundling dev dependencies
async function loadViteUtils() {
  const viteModule = await import("./vite.js");
  return viteModule;
}

// Millan Luxury Cleaning - Express Server
// Production-ready application with Supabase authentication and Vercel Blob storage

console.log('[INFO] Starting Millan Luxury Cleaning server...');
console.log('[INFO] Using Supabase for authentication');

const app = express();

// Track initialization status for Vercel serverless
// @ts-ignore
app.isInitialized = false;

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use((req, res, next) => {
  const start = Date.now();
  const requestId = randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      const duration = Date.now() - start;
      console.log(`[${requestId}] ${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// Initialization state for Vercel serverless
let initPromise: Promise<Express> | null = null;
let initializedApp: Express | null = null;

// Async initialization function
async function initializeApp(): Promise<Express> {
  if (initializedApp) {
    return initializedApp;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    console.log('[Init] Starting app initialization...');
    const env = loadEnv();

    const server = await registerRoutes(app, env);
    console.log('[Init] Routes registered');

    // Return JSON for any unmatched API routes instead of falling through to HTML
    app.use("/api", (req, res) => {
      res.status(404).json({ message: "API route not found", path: req.path });
    });

    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      const requestId = res.locals.requestId ?? "unknown";
      let status = err?.status || err?.statusCode || 500;
      let message = err?.message || "Internal Server Error";
      const wantsJson = req.path.startsWith("/api") || req.headers.accept?.includes("application/json");

      if (err?.code === "LIMIT_FILE_SIZE") {
        status = 413;
        message = "Uploaded file exceeds size limit";
      }

      console.error(`[ERROR] [${requestId}] ${status} ${message}`);

      const payload: Record<string, unknown> = { message };

      if (process.env.NODE_ENV !== "production" && err?.stack) {
        payload.stack = err.stack;
      }

      if (wantsJson) {
        res.status(status).json(payload);
        return;
      }

      res.status(status).send(message);
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      const { setupVite } = await loadViteUtils();
      await setupVite(app, server);
    } else if (!process.env.VERCEL) {
      // Only serve static files in production non-Vercel environments
      // Vercel handles static files through its CDN
      const { serveStatic } = await loadViteUtils();
      serveStatic(app);
    }

    // In Vercel (serverless), skip .listen() and export the app instead
    // In local dev, start the server normally
    if (!process.env.VERCEL) {
      const port = env.port;
      server.listen(port, "0.0.0.0", () => {
        console.log(`serving on port ${port}`);
      });
    } else {
      console.log('[VERCEL] Express app initialized and ready');
    }

    initializedApp = app;
    console.log('[Init] App initialization complete');
    return app;
  })();

  return initPromise;
}

// For local dev: start initialization immediately
if (!process.env.VERCEL) {
  initializeApp().catch(err => {
    console.error('Failed to initialize app:', err);
    process.exit(1);
  });
}

// Export initialization function for Vercel
export default initializeApp;
