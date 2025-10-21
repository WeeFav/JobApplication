import express from "express";
import cors from "cors";
import * as db from "./database.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from "multer";
import fs from "fs";
import csv from "csv-parser";
import { spawn } from "child_process";
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const corsOptions = {
  origin: ["http://client:5000"],
};

// Use CORS Middleware
app.use(cors(corsOptions));

// Middleware to parse JSON
app.use(express.json());

// Create an HTTP server from Express app
const server = createServer(app);

// Create WebSocket server that attaches to the same HTTP server
const wss = new WebSocketServer({ server });

/* 
===============================================================================
job
===============================================================================
*/

app.get('/jobs', async (req, res) => {
  const jobs = await db.get_jobs(req.query);
  res.json(jobs);
});

app.get('/jobs/:id', async (req, res) => {
  const job_id = req.params.id;
  const [job] = await db.get_job(job_id);

  if (job) {
    res.json(job);
  }
  else {
    res.status(404).json({ 'error': `Job ${job_id} not found` })
  }
})

app.post('/jobs', async (req, res) => {
  const newJob = req.body;
  const python_res = await fetch('http://python:8080/jobs', {
    method: 'POST', 
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newJob)
  });

  const message_json = await python_res.json();
  res.status(python_res.status).json({message: message_json.message});
});

const uploadJobs = multer({ dest: 'uploads/' });
app.post('/job/upload', uploadJobs.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  const company_id = req.body.company_id;
  const newRows = [];
  const jobDescriptionList = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => {
      // Add a new column/value for each row
      row.company_id = company_id;
      row.is_custom = 0;
      const d = new Date(row.job_date)
      row.job_date = d.toISOString().slice(0, 10);
      // Store the modified row in the array
      newRows.push(row);
    })
    .on('end', () => {
      Promise.all(newRows.map(async (newJob) => {
        // inserting into database
        const job_id = await db.add_job(newJob);
        // append job_descripion, job_id to list for extraction
        jobDescriptionList.push({job_id: job_id,
          job_description: newJob.job_description});        
        return;
      }))
        .then(() => {
          db.extract_jd(JSON.stringify(jobDescriptionList));
          fs.unlinkSync(req.file.path); // Clean up temporary file
          res.status(200).json({ message: 'CSV processed and data inserted into MySQL.' });
        })
        .catch((error) => {
          console.error('Error inserting rows into MySQL:', error);
          res.status(500).json({ error: 'Failed to insert data into MySQL.' });
        });
    })

  // res.json({ message: 'success' });
});

app.put('/job', async (req, res) => {
  const updatedJob = req.body;
  await db.update_job(updatedJob);
  res.json({ message: 'success' });
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

app.get('/applications', async (req, res) => {
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
recommendation
===============================================================================
*/

app.get('/recommendations', async (req, res) => {
  const jobs = await db.get_recommendations(req.query);
  res.json(jobs);
})

/* 
===============================================================================
Websocket
===============================================================================
*/

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (msg) => {
    console.log('Received:', msg.toString());
  });

  ws.send(JSON.stringify({ type: 'progress', data: 'Task started...' }));

  setTimeout(() => {
    ws.send(JSON.stringify({ type: 'done', data: 'Task completed!' }));
    ws.close();
  }, 10000);

  ws.on('close', () => console.log('Client disconnected'));
});

/* 
===============================================================================
others
===============================================================================
*/

// Serve static files from the "images" directory
app.use("/images", express.static(path.join(__dirname, "images")));

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

// Start HTTP + WS server
server.listen(8000, '0.0.0.0', () => {
  console.log("Server started at port 8000");
});