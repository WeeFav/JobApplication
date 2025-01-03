import express from "express";
import cors from "cors";
import * as db from "./database/database.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from "multer";

const app = express();
const corsOptions = {
  origin: ["http://localhost:5000"],
};

// Use CORS Middleware
app.use(cors(corsOptions));

// Middleware to parse JSON
app.use(express.json());

// Serve static files from the "images" directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use("/images", express.static(path.join(__dirname, "images")));

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

app.put('/account', async (req, res) => {
  const updatedAccount = req.body;
  await db.update_account(updatedAccount);
  res.json({message: 'success'});
});

app.delete('/account', async (req, res) => {
  await db.delete_account(req.query);
  res.json({ message: 'Account deleted successfully' }) // backend must respond or else frontend fetch will not resolve
});

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

app.put('/user', async (req, res) => {
  const updatedUser = req.body;
  await db.update_user(updatedUser);
  res.json({message: 'success'});
});

/* 
===============================================================================
company
===============================================================================
*/

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

app.delete('/company', async (req, res) => {
  await db.delete_company(req.query);
  res.json({ message: 'Company deleted successfully' }) // backend must respond or else frontend fetch will not resolve
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
    res.status(404).json({ 'error': `Job ${job_id} not found` })
  }
})

app.post('/job', async (req, res) => {
  const newJob = req.body;
  const job_id = await db.add_job(newJob);
  res.json({ job_id: job_id });
});

app.put('/job', async (req, res) => {
  const updatedJob = req.body;
  await db.update_job(updatedJob);
  res.json({message: 'success'});
});

app.delete('/job', async (req, res) => {
  await db.delete_job(req.query);
  res.json({ message: 'Job deleted successfully' }) // backend must respond or else frontend fetch will not resolve
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
===============================================================================
others
===============================================================================
*/

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "images")); // Save images to "/images"
  },
  filename: (req, file, cb) => {
    cb(null, req.body.customFilename); // Unique file name
  },
});

const upload = multer({ storage });

app.post("/save-image", upload.single("image"), (req, res) => {
  try {
    res.status(200).json({ message: "Image uploaded successfully!", file: req.file });
  } catch (error) {
    res.status(500).json({ error: "Failed to upload image" });
  }
});


app.listen(8000, () => {
  console.log("Server started at port 8000");
});