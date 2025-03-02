import express from "express";
import cors from "cors";
import * as db from "./database/database.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from "multer";
import fs from "fs";
import csv from "csv-parser";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const corsOptions = {
  origin: ["http://localhost:5000"],
};

// Use CORS Middleware
app.use(cors(corsOptions));

// Middleware to parse JSON
app.use(express.json());

/* 
===============================================================================
account
===============================================================================
*/

app.post('/account', async (req, res) => {
  const account = req.body;
  try {
    const account_id = await db.add_account(account);
    res.json({ account_id: account_id });
  } catch (e) {
    res.json({ account_id: e.code });
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
  res.json({ message: 'success' });
});

app.delete('/account', async (req, res) => {
  await db.delete_account(req.query);

  // Ensure the file path is resolved correctly
  const filename = req.body.is_company ? `company${req.body.id}.png` : `user${req.body.id}.png`
  const imagePath = path.join(__dirname, 'images', filename);

  fs.access(imagePath, fs.constants.F_OK, (accessErr) => {
    if (accessErr) {
      // File does not exist
      console.log(`File not found: ${imagePath}`);
      return res.status(200).json({ message: 'Image not found' });
    }

    // File exists, proceed to delete it
    fs.unlink(imagePath, (unlinkErr) => {
      if (unlinkErr) {
        console.error(`Failed to delete file: ${unlinkErr}`);
        return res.status(500).json({ message: 'Failed to delete the image' });
      }
    });
    res.json({ message: 'Account deleted successfully' }) // backend must respond or else frontend fetch will not resolve
  });

});

/* 
===============================================================================
user
===============================================================================
*/

app.get('/user', async (req, res) => {
  const [user] = await db.get_user(req.query);
  res.json(user);
});

app.post('/user/generate', async (req, res) => {
  const option = req.body;

  const pythonProcess = spawn('python', ["D:/JobApplication/server/generate_user.py", option.location, option.education, option.years]);
  let generated_user;

  pythonProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.startsWith('DATA:')) {
        generated_user = JSON.parse(line.replace('DATA: ', ''));
      }
      else {
        console.log(line);
      }
    });
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Error: ${data}`);
    res.status(500).send(`Python script error: ${data}`);
  });

  pythonProcess.on('close', async (code) => {
    if (code === 0) {
      // add account
      const account_email = generated_user.user_name.toLowerCase().replace(' ', '.') + Math.floor(Math.random() * 10000).toString().padStart(4, '0') + '@gmail.com';
      const account = {
        account_email,
        account_password: account_email.replace('@gmail.com', ''),
        is_company: 0
      }
      
      let account_id;
      try {
        console.log(account)
        account_id = await db.add_account(account);
        console.log("account added")
      } catch (e) {
        res.json({ 'message': e });
      }

      // add user
      const user = {
        user_id: account_id,
        user_name: generated_user.user_name,
        user_email: account_email,
        user_image: "/api/images/user.png",
        user_location: generated_user.user_location,
        user_education: generated_user.user_education,
        user_skills: generated_user.user_skills,
        user_experience_years: generated_user.user_experience_years,
        user_experience_roles: generated_user.user_experience_roles,
      };
      await db.add_user(user);

      res.json({ 'message': 'success' })
    }
    else {
      res.status(500).send(`Python script exited with code ${code}`);
    }
  });


});

app.post('/user', async (req, res) => {
  const user = req.body;
  await db.add_user(user);
  res.json({ message: 'success' });
});

app.put('/user', async (req, res) => {
  const updatedUser = req.body;
  await db.update_user(updatedUser);
  res.json({ message: 'success' });
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
  res.json({ company_id: company_id });
});

app.put('/company', async (req, res) => {
  const updatedCompany = req.body;
  await db.update_company(updatedCompany);
  res.json({ message: 'success' });
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
  
  // insert into database
  const job_id = await db.add_job(newJob);
  
  if (!newJob.is_custom) {
    // extract job
    db.extract_jd(JSON.stringify([{job_id: job_id, job_description: newJob.job_description}]));
  }

  res.json({ job_id: job_id });
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
recommendation
===============================================================================
*/

app.get('/recommend', async (req, res) => {
  const jobs = await db.get_recommendations(req.query);
  res.json(jobs);
})

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


app.listen(8000, () => {
  console.log("Server started at port 8000");
});