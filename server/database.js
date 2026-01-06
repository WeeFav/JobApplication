import pkg from 'pg';
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const { Pool } = pkg;
const db = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
  ssl: {
    rejectUnauthorized: false,
    ca: fs.readFileSync("/app/server-ca.pem").toString(),
    key: fs.readFileSync("/app/client-key.pem").toString(),
    cert: fs.readFileSync("/app/client-cert.pem").toString(),
  },
});

/* 
===============================================================================
job
===============================================================================
*/

export async function get_jobs(search) {
  let params = [];

  const dateParam = search.date ? search.date : null;

  let query = `
  SELECT jobs.*
  FROM jobs
  LEFT JOIN applications
  ON jobs.id = applications.job_id
  WHERE applications.job_id IS NULL
    AND ($1::date IS NULL OR scrape_date >= $1::date)
    AND title ILIKE $2
    AND company ILIKE $3
  ORDER BY scrape_date DESC, id DESC
  LIMIT $4
  OFFSET $5
  `; 

  params = [dateParam, `%${search.title}%`, `%${search.company}%`, Number(search.limit), Number(search.offset)];
  
  console.log("get_jobs")
  console.log(params)

  const res = await db.query(query, params);
  return res.rows;
}

export async function get_job(id) {
  let query = `
    SELECT *
    FROM jobs 
    WHERE id = $1;
  `;

  const res = await db.query(query, [id]);
  return res.rows;
}

export async function update_job(updatedJob) {
  let query = `
    UPDATE jobs
    SET title = $1,
        company = $2,
        description = $3,
        url = $4,
        location = $5,
        post_date = $6
    WHERE id = $7;
  `;
  await db.query(query, [updatedJob.title, updatedJob.company, updatedJob.description, updatedJob.url, updatedJob.location, updatedJob.post_date, updatedJob.id]);
}

/* 
===============================================================================
application
===============================================================================
*/

export async function get_applications(search) {
  let params = [];

  const dateParam = search.date ? search.date : null;

  let query = `
  SELECT jobs.*, application_date
  FROM applications
  INNER JOIN jobs
  ON applications.job_id = jobs.id
  WHERE applications.job_id IS NULL
    AND ($1::date IS NULL OR scrape_date >= $1::date)
    AND title ILIKE $2 
    AND company ILIKE $3
  ORDER BY applications.application_date DESC, id DESC
  LIMIT $4
  OFFSET $5
  `; 

  params = [dateParam, `%${search.title}%`, `%${search.company}%`, Number(search.limit), Number(search.offset)];
  
  console.log("get_applications")
  console.log(params)

  const res = await db.query(query, params);
  return res.rows; 
}

export async function add_application(job_id) {
  const query = `
  INSERT INTO applications (job_id)
  VALUES ($1)
`;
  await db.query(query, [job_id]);
}

export async function delete_application(search) {
  const query = `
  DELETE FROM applications
  WHERE job_id = $1
`;
  await db.query(query, [search.id]);
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
  WITH filtered_recommendations AS (
    SELECT recommendations.job_id, recommendations.final_score
    FROM recommendations
    WHERE resume_id = ${search.resumeId}
  )
  SELECT jobs.id, jobs.title, jobs.company, jobs.location, jobs.post_date, jobs.scrape_date, jobs.url, jobs.description_extracted, fr.final_score
  FROM filtered_recommendations fr
  INNER JOIN jobs
    ON fr.job_id = jobs.id
  LEFT JOIN applications
    ON jobs.id = applications.job_id
  `; 

  query += "WHERE applications.job_id IS NULL";

  if (search.date) {
    query += ` AND ((post_date >= '${search.date}') OR (post_date IS NULL AND scrape_date >= '${search.date}'))`
  }

  if (conditions.length > 0) {
    query += ` AND ${conditions.join(" AND ")}`;
  }

  query += " ORDER BY fr.final_score DESC, jobs.post_date IS NULL, jobs.post_date DESC"
  
  const res = await db.query(query, params);
  return res.rows;
}

/* 
===============================================================================
user profile
===============================================================================
*/
export async function get_user() {
  const query = `
    SELECT *
    FROM users
    LIMIT 1
  `;

  const res = await db.query(query);
  return res.rows;
}

export async function update_user(updatedUser) {
  let query = `
    UPDATE users
    SET first_name = $1,
        last_name = $2,
        email = $3
  `;
  await db.query(query, [updatedUser.firstname, updatedUser.lastname, updatedUser.email]);
}

export async function get_resumes() {
  const query = `
    SELECT id, name, content, isUpdated
    FROM resumes
    ORDER BY id
  `;
  const res = await db.query(query);
  return res.rows;
}

export async function update_resumes(resumes) {
  const params = [];
  const values = [];
  
  // 1. Bulk upsert
  resumes.forEach((resume, i) => {
    const base = i * 3;
    params.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
    values.push(resume.id, resume.name, resume.content, resume.isUpdated);
  });

  let query = `
    INSERT INTO resumes (id, name, content, isUpdated)
    VALUES ${params.join(", ")}
    ON CONFLICT (id)
    DO UPDATE SET
        name = EXCLUDED.name,
        content = EXCLUDED.content,
        isUpdated = EXCLUDED.isUpdated
  `;
  await db.query(query, values);

  // 2. Delete rows not in resumes
  const ids = resumes.map((r) => r.id);
  query = `
    DELETE FROM resumes 
    WHERE id NOT IN (SELECT UNNEST($1::int[]))
  `;
  await db.query(query, [ids]);
}