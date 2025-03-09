export default async function handler(req, res) {
    const backendURL = "http://35.187.7.1:4000"; // Your backend server URL
    
    try {
      // Handle GET and POST methods
      if (req.method === "GET") {
        // Proxy GET request to /api/spins on your backend
        const response = await fetch(`${backendURL}/api/spins`);
        const data = await response.json();
        res.status(200).json(data);
      } else if (req.method === "POST") {
        // Proxy POST request to /api/spin on your backend
        const response = await fetch(`${backendURL}/api/spin`, {
          method: "POST",
          headers: req.headers,
          body: req.body,
        });
        const data = await response.json();
        // If the backend returns a 400 status (no spins left), forward that status.
        res.status(response.status).json(data);
      } else {
        res.setHeader("Allow", ["GET", "POST"]);
        res.status(405).json({ error: "Method Not Allowed" });
      }
    } catch (error) {
      console.error("Proxy error:", error);
      res.status(500).json({ error: "Proxy error: Failed to fetch from backend" });
    }
  }
  