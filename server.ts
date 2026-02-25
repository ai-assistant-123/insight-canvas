import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // API Proxy Endpoint to bypass CORS
  app.post("/api/proxy", async (req, res) => {
    const { url, method, headers, body } = req.body;

    if (!url) {
      return res.status(400).json({ error: "Missing target URL" });
    }

    try {
      console.log(`Proxying ${method || 'POST'} request to: ${url}`);
      
      const response = await fetch(url, {
        method: method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error: any) {
      console.error("Proxy Error:", error);
      res.status(500).json({ 
        error: "Proxy request failed", 
        message: error.message 
      });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
