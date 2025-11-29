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
  SELECT jobs.*
  FROM jobs
  LEFT JOIN applications
  ON jobs.id = applications.job_id
  `;

  query += "WHERE applications.job_id IS NULL"

  if (conditions.length > 0) {
    query += ` AND ${conditions.join(" AND ")}`
  }

  query += " ORDER BY ID"

  if (search.limit && search.limit > 0) {
    query += ` LIMIT $${idx++}`;
    params.push(parseInt(search.limit));
  }

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

export async function delete_job(search) {
  let query = `
    DELETE FROM jobs
    WHERE id = $1
  `;
  await db.query(query, [search.id]);
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

  if (search.job_id) {
    conditions.push(`jobs.id = $${idx++}`)
    params.push(search.job_id)
  }
  if (search.jobTitle) {
    conditions.push(`jobs.title ILIKE $${idx++}`)
    params.push(`%${search.jobTitle}%`)
  }
  if (search.company) {
    conditions.push(`jobs.company ILIKE $${idx++}`)
    params.push(`%${search.company}%`)
  }

  let query = `
    SELECT jobs.id, jobs.title, jobs.company, jobs.url, jobs.description, jobs.description_extracted, jobs.post_date, jobs.scrape_date, jobs.location, application_date 
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

/* 
===============================================================================
others
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