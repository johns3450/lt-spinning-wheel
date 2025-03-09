// api/spins.js

export default async function handler(req, res) {
    try {
      // Forward the request to your API server.
      const response = await fetch("http://35.187.7.1:4000/api/spins");
      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      console.error("Error fetching spins:", error);
      res.status(500).json({ error: "Failed to fetch spin count" });
    }
  }  