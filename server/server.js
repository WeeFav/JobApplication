import express from "express";
import cors from "cors";
import { get_jobs_db, get_job_db, get_companys_db, add_job_db } from "./database/database.js";

const app = express();
const corsOptions = {
  origin: ["http://localhost:5000"],
};

// Use CORS Middleware
app.use(cors(corsOptions));

// Middleware to parse JSON
app.use(express.json());



function format_job(job_db) {
  return ({
    id: job_db.job_id,
    title: job_db.job_title,
    type: job_db.job_type,
    description: job_db.job_description,
    location: job_db.job_location,
    salary: job_db.job_salary,
    company: {
      name: job_db.company_name,
      description: job_db.company_description,
      contactEmail: job_db.company_email,
      contactPhone: job_db.company_phone
    }
  })
};



app.get('/jobs', async (req, res) => {
  const limit = parseInt(req.query._limit);
  const jobs = await get_jobs_db(limit);

  const jobs_formatted = [];

  jobs.map((job) => {
    jobs_formatted.push(format_job(job))
  });

  res.json(jobs_formatted);
});

app.get('/jobs/:id', async (req, res) => {
  const id = req.params.id;
  const [job] = await get_job_db(id);

  if (job) {
    res.json(format_job(job));
  }
  else {
    res.status(404).json({ 'error': `Job ${id} not found` })
  }
})

app.get('/companys', async (req, res) => {
  const limit = parseInt(req.query._limit);
  const companys = await get_companys_db(limit);
  res.json(companys);
});

app.post('/jobs', async (req, res) => {
  const newJob = req.body;
  await add_job_db(newJob);
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