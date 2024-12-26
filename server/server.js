import express from "express";
import cors from "cors";
import * as db from "./database/database.js";

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
===============================================================================
account
===============================================================================
*/

app.post('/account', async (req, res) => {
  const account = req.body;
  try {
    const account_id = await db.add_account(account);
    res.json({account_id: account_id});
  } catch (e) {
    res.json({account_id: e.code});
  }
});

app.post('/account/check', async (req, res) => {
  const account = req.body;
  const result = await db.check_account(account);
  if (result.length > 0) {
    res.json(result[0]);
  }
  else {
    res.json({ id: 'failed' });
  }
})

/* 
===============================================================================
user
===============================================================================
*/

app.get('/user/:id', async (req, res) => {
  const user_id = req.params.id;
  const [user] = await db.get_user(user_id);
  res.json(user);
});

app.post('/user', async (req, res) => {
  const user = req.body;

  await db.add_user(user);
  res.json({message: 'success'});
});

/* 
===============================================================================
company
===============================================================================
*/

app.get('/company/:id', async (req, res) => {
  const company_id = req.params.id;
  const [company] = await db.get_company(company_id);
  res.json(company);
});

app.get('/company', async (req, res) => {
  const companys = await db.get_companys(req.query);
  res.json(companys);
});

app.post('/company', async (req, res) => {
  const company = req.body;
  const company_id = await db.add_company(company);
  res.json({company_id: company_id});
});

app.put('/company', async (req, res) => {
  const updatedCompany = req.body;
  await db.update_company(updatedCompany);
  res.json({message: 'success'});
});

/* 
===============================================================================
job
===============================================================================
*/

app.get('/job', async (req, res) => {
  const jobs = await db.get_jobs(req.query);
  res.json(jobs);
});

app.get('/job/:id', async (req, res) => {
  const job_id = req.params.id;
  const [job] = await db.get_job(job_id);

  if (job) {
    res.json(job);
  }
  else {
    res.status(404).json({ 'error': `Job ${id} not found` })
  }
})

app.post('/job', async (req, res) => {
  const newJob = req.body;
  const job_id = await db.add_job(newJob);
  res.json({ job_id: job_id });
});

/* 
===============================================================================
application
===============================================================================
*/

app.get('/application', async (req, res) => {
  const applications = await db.get_applications(req.query);
  res.json(applications);
});

app.post('/application', async (req, res) => {
  const application = req.body;
  await db.add_application(application);
  res.json({ message: 'Application added successfully' });
});

app.delete('/application', async (req, res) => {
  await db.delete_application(req.query);
  res.json({ message: 'Application deleted successfully' }) // backend must respond or else frontend fetch will not resolve
});
















/*
-----------------------------------------------------------
POST
-----------------------------------------------------------
*/











/*
-----------------------------------------------------------
PUT
-----------------------------------------------------------
*/

app.put('/jobs/:id', async (req, res) => {
  const id = req.params.id;
  const updatedjob = req.body;
  await db.update_job(updatedjob);

  res.json({ message: 'Job updated successfully' });
})

/*
-----------------------------------------------------------
DELETE
-----------------------------------------------------------
*/

app.delete('/jobs/:id', async (req, res) => {
  const id = req.params.id;
  await db.delete_job(id);

  res.json({ message: 'Job deleted successfully' }) // backend must respond or else frontend fetch will not resolve
});




app.listen(8000, () => {
  console.log("Server started at port 8000");
});