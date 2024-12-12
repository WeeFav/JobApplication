import express from "express";
import cors from "cors";
import jobs from "./jobs.json" with { type: "json" };

const app = express();
const corsOptions = {
  origin: ["http://localhost:5000"],
};

// Use CORS Middleware
app.use(cors(corsOptions));

app.get('/jobs', (req, res) => {
  const limit = parseInt(req.query._limit);
  if (limit && limit > 0) {
    res.json(jobs.jobs.slice(0, limit));
  }
  else {
    res.json(jobs.jobs);
  }
});

app.get('/jobs/:id', (req, res) => {
  const id = req.params.id;
  const job = jobs.jobs.find(job => job.id === id);

  if (job) {
    res.json(job);
  }
  else {
    res.status(404).json({'error': `Job ${id} not found`})
  }
})

app.listen(
  8000, () => {
    console.log("Server started at port 8000");
  });