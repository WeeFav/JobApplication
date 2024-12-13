import express from "express";
import cors from "cors";
import jobs from "./jobs.json" with { type: "json" };

const app = express();
const corsOptions = {
  origin: ["http://localhost:5000"],
};

// Use CORS Middleware
app.use(cors(corsOptions));

// Middleware to parse JSON
app.use(express.json());

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
    res.status(404).json({ 'error': `Job ${id} not found` })
  }
})

app.post('/jobs', (req, res) => {
  const newJob = { id: (jobs.jobs.length + 1).toString(), ...req.body }; // automatically assign job id
  jobs.jobs.push(newJob);
  res.json({ message: 'Job added successfully' });
});

app.delete('/jobs/:id', (req, res) => {
  const id = req.params.id;
  const job = jobs.jobs.find(job => job.id === id);
  if (!job) {
    return res.status(404).json({ 'error': `Job ${id} not found` })
  }

  jobs.jobs = jobs.jobs.filter((job) => job.id != id);
});

app.put('/jobs/:id', (req, res) => {
  const id = req.params.id;
  const updatedjob = req.body;
  const idx = jobs.jobs.findIndex((job) => job.id === id);
  console.log(idx)
  if (idx === -1) {
    return res.status(404).json({ 'error': `Job ${id} not found` })
  }

  jobs.jobs[idx] = updatedjob;
  res.json({ message: 'Job updated successfully' });
})

app.listen(8000, () => {
  console.log("Server started at port 8000");
});