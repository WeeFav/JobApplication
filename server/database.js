import pkg from 'pg';
import dotenv from "dotenv";
import { createClient } from 'redis';

dotenv.config();

const { Pool } = pkg;
const db = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// const redis_q = createClient({
//   username: process.env.REDIS_USER,
//   password: process.env.REDIS_PASSWORD,
//   socket: {
//       host: process.env.REDIS_HOST,
//       port: parseInt(process.env.REDIS_PORT)
//   }
// });
// redis_q.on('error', err => console.log('Redis Client Error', err));
// await redis_q.connect();

/* 
===============================================================================
job
===============================================================================
*/

export async function get_jobs(search) {
  let conditions = [];
  let params = [];

  if (search.job_id) {
    conditions.push("job_id = ?")
    params.push(search.job_id)
  }
  if (search.is_custom) {
    conditions.push("is_custom = ?")
    params.push(search.is_custom)
  }
  if (search.company_id) {
    conditions.push("company_id = ?")
    params.push(search.company_id)
  }
  if (search.jobTitle) {
    conditions.push("job_title LIKE ?")
    params.push(`%${search.jobTitle}%`)
  }
  if (search.jobType) {
    conditions.push("job_type LIKE ?")
    params.push(`%${search.jobType}%`)
  }
  if (search.jobLocation) {
    conditions.push("job_location LIKE ?")
    params.push(`%${search.jobLocation}%`)
  }

  let query = `
  SELECT job_id, job_title, job_type, job_description, job_location, job_salary, company_id
  FROM jobs
  `;

  if (conditions.length > 0) {
    query += `WHERE ${conditions.join(" AND ")}`
  }

  if (search.limit && search.limit > 0) {
    query += ` LIMIT ?`;
    params.push(parseInt(search.limit));
  }

  const [res] = await db.query(query, params);
  return res;
}

export async function get_job(job_id) {
  let query = `
    SELECT job_id, job_title, job_type, job_description, job_location, job_salary, jobs.is_custom AS custom_job, company_name, company_description, company_email, company_phone, companys.is_custom AS custom_company, jobs.company_id, jobs.user_id as user_id
    FROM jobs
    INNER JOIN companys
    ON jobs.company_id = companys.company_id
    WHERE job_id = ?;
  `;

  const [res] = await db.query(query, [job_id]);
  return res;
}

export async function add_job(newJob) {
  const columns = Object.keys(newJob);
  const placeholders = columns.map(() => '?').join(', ');
  const query = `
    INSERT INTO jobs (${columns.join(', ')})
    VALUES (${placeholders})
  `;
   
  const [res] = await db.query(query, Object.values(newJob));
  const job_id = res.insertId;
  return job_id;
}

export async function update_job(updatedJob) {
  let query = `
    UPDATE jobs
    SET job_title = ?,
        job_type = ?,
        job_description = ?,
        job_location = ?,
        job_salary = ?,
        company_id = ?
    WHERE job_id = ?;
  `;
  await db.query(query, [updatedJob.jobTitle, updatedJob.jobType, updatedJob.jobDescription, updatedJob.jobLocation, updatedJob.jobSalary, updatedJob.companyID, updatedJob.job_id]);
}

export async function delete_job(search) {
  let query = `
    DELETE FROM jobs
    WHERE job_id = ?
  `;
  await db.query(query, [search.job_id]);
}

/* 
===============================================================================
application
===============================================================================
*/

export async function get_applications(search) {
  let conditions = [];
  let params = [];
  let idx = 1;

  if (search.jobTitle) {
    conditions.push(`job_title ILIKE $${idx++}`)
    params.push(`%${search.jobTitle}%`)
  }
  if (search.company) {
    conditions.push(`company ILIKE $${idx++}`)
    params.push(`%${search.company}%`)
  }

  let query = `
    SELECT jobs.id, jobs.title, jobs.company, jobs.description_extracted 
    FROM applications
    INNER JOIN jobs
    ON applications.job_id = jobs.id
  `;

  if (conditions.length > 0) {
    query += `WHERE ${conditions.join(" AND ")}`
  }

  if (search.limit && search.limit > 0) {
    query += `LIMIT $${idx++}`;
    params.push(parseInt(search.limit));
  }

  const res = await db.query(query, params);
  return res.rows;
}

export async function add_application(application) {
  const query = `
  INSERT INTO applications (job_id, user_id)
  VALUES (?, ?)
`;
  await db.query(query, [application.job_id, application.user_id]);
}

export async function delete_application(search) {
  const query = `
  DELETE FROM applications
  WHERE application_id = ?
`;
  await db.query(query, [search.application_id]);
}

/* 
===============================================================================
application
===============================================================================
*/
export async function get_recommendations(search) {
  let conditions = [];
  let params = [search.user_id];
  
  if (search.jobTitle) {
    conditions.push("job_title LIKE ?")
    params.push(`%${search.jobTitle}%`)
  }
  if (search.jobType) {
    conditions.push("job_type LIKE ?")
    params.push(`%${search.jobType}%`)
  }
  if (search.jobLocation) {
    conditions.push("job_location LIKE ?")
    params.push(`%${search.jobLocation}%`)
  }

  let query = `
  SELECT jobs.job_id, job_title, job_type, job_description, job_location, job_salary
  FROM recommendations INNER JOIN jobs
  ON recommendations.job_id = jobs.job_id
  WHERE recommendations.user_id = ?
  `;

  if (conditions.length > 0) {
    query += ` AND ${conditions.join(" AND ")}`
  }
  
  const [res] = await db.query(query, params)
  return res;
}

/* 
===============================================================================
Redis Queue
===============================================================================
*/
export async function extract_jd(jobDescriptionList) {
  await redis_q.lPush('queue', jobDescriptionList);
}