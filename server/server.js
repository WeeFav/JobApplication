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
  console.log('a')
  const jobs = await db.get_jobs(req.query);
  res.json(jobs);
});

app.get('/jobs/:id', async (req, res) => {
  const id = req.params.id;
  const [job] = await db.get_job(id);

  if (job) {
    res.json(job);
  }
  else {
    res.status(404).json({ 'error': `Job ${id} not found` })
  }
})

app.put('/jobs', async (req, res) => {
  const updatedJob = req.body;
  await db.update_job(updatedJob);
  res.status(200).json({ message: 'success' });
});

app.delete('/jobs', async (req, res) => {
  await db.delete_job(req.query);
  res.json({ message: 'Job deleted successfully' }) // backend must respond or else frontend fetch will not resolve
});

/* 
===============================================================================
application
===============================================================================
*/

// app.get('/applications', async (req, res) => {
//   console.log('b')  
//   const applications = await db.get_applications(req.query);
//   res.json(applications);
// });

app.post('/applications', async (req, res) => {
  const { job_id } = req.body;
  await db.add_application(job_id);
  res.json({ message: 'Application added successfully' });
});

app.delete('/applications', async (req, res) => {
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
user profile
===============================================================================
*/
app.get('/user', async (req, res) => {
  const [user] = await db.get_user();
  res.json(user);
});

app.put('/user', async (req, res) => {
  const updatedUser = req.body;
  await db.update_user(updatedUser);
  res.status(200).json({ message: 'success' });
});

app.get('/resumes', async (req, res) => {
  const resumes = await db.get_resumes();
  res.json(resumes);
});

// Start HTTP + WS server
server.listen(8000, '0.0.0.0', () => {
  console.log("Server started at port 8000");
});