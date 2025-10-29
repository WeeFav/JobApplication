import pkg from 'pg';
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;
const db = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

/* 
===============================================================================
job
===============================================================================
*/

export async function get_jobs(search) {
  let conditions = [];
  let params = [];
  let idx = 1;

  if (search.job_id) {
    conditions.push(`id = $${idx++}`)
    params.push(search.job_id)
  }
  if (search.company) {
    conditions.push(`company ILIKE $${idx++}`)
    params.push(`%${search.company}%`)
  }
  if (search.jobTitle) {
    conditions.push(`title ILIKE $${idx++}`)
    params.push(`%${search.jobTitle}%`)
  }

  let query = `
  SELECT jobs.id, jobs.title, jobs.company, jobs.description_extracted
  FROM jobs
  `;

  if (conditions.length > 0) {
    query += `WHERE ${conditions.join(" AND ")}`
  }

  if (search.limit && search.limit > 0) {
    query += ` LIMIT $${idx++}`;
    params.push(parseInt(search.limit));
  }

  const res = await db.query(query, params);
  return res.rows;
}

export async function get_job(job_id) {
  let query = `
    SELECT id, title, company, url, description, post_date, scrape_date
    FROM jobs
    WHERE id = $1;
  `;

  const res = await db.query(query, [job_id]);
  return res.rows;
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
recommendations
===============================================================================
*/
export async function get_recommendations(search) {
  let conditions = [];
  let params = [];
  let idx = 1;

  if (search.jobTitle) {
    conditions.push(`title ILIKE $${idx++}`)
    params.push(`%${search.jobTitle}%`)
  }
  if (search.company) {
    conditions.push(`company ILIKE $${idx++}`)
    params.push(`%${search.company}%`)
  }
  if (search.score) {
    conditions.push(`score >= $${idx++}`)
    params.push(search.score)
  }


  let query = `
  SELECT jobs.id, jobs.title, jobs.company, jobs.description_extracted, recommendations.score
  FROM recommendations INNER JOIN jobs
  ON recommendations.job_id = jobs.id
  `;

  if (conditions.length > 0) {
    query += `WHERE ${conditions.join(" AND ")}`;
  }
  
  const res = await db.query(query, params);
  return res.rows;
}