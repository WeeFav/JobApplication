import express from "express";
import cors from "cors";
import { get_jobs_db, get_job_db, get_companys_db, add_job_db, delete_job_db, update_job_db } from "./database/database.js";

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
      id: job_db.company_id,
      name: job_db.company_name,
      description: job_db.company_description,
      contactEmail: job_db.company_email,
      contactPhone: job_db.company_phone
    }
  })
};

/*
-----------------------------------------------------------
GET
-----------------------------------------------------------
*/

app.get('/jobs', async (req, res) => {
  const jobs = await get_jobs_db(req.query);

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

/*
-----------------------------------------------------------
POST
-----------------------------------------------------------
*/

app.post('/add-job', async (req, res) => {
  const job = req.body;

  // if custom company, then add to companys  
  if (job.company) {
    await db_add_company(job.company);
  }

  // add job
  await db_add_job(job);

  // if custom job, then add to applications
  if (job.is_custom) {
    await db_add_application();
  }


  await add_job_db(newJob);
  res.json({ message: 'Job added successfully' });
});

/*
-----------------------------------------------------------
PUT
-----------------------------------------------------------
*/

app.put('/jobs/:id', async (req, res) => {
  const id = req.params.id;
  const updatedjob = req.body;
  await update_job_db(updatedjob);

  res.json({ message: 'Job updated successfully' });
})

/*
-----------------------------------------------------------
DELETE
-----------------------------------------------------------
*/

app.delete('/jobs/:id', async (req, res) => {
  const id = req.params.id;
  await delete_job_db(id);

  res.json({ message: 'Job deleted successfully' }) // backend must respond or else frontend fetch will not resolve
});




app.listen(8000, () => {
  console.log("Server started at port 8000");
});