import mysql from 'mysql2';
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}).promise()

async function get_jobs_db(search) {
  let query = `
    SELECT *
    FROM jobs 
    INNER JOIN companys
    ON jobs.company_id = companys.company_id
  `;

  const params = [];

  if (search.limit && search.limit > 0) {
    query += ` LIMIT ?`;
    params.push(search.limit);
  }

  if (search.jobTitle || search.jobType || search.jobLocation) {
    query += `WHERE job_title LIKE ? AND job_type LIKE ? AND job_location LIKE ?`;
    params.push(`%${search.jobTitle}%`);
    params.push(`%${search.jobType}%`);
    params.push(`%${search.jobLocation}%`);
  }

  const [res] = await pool.query(query, params);
  return res;
}

async function get_job_db(job_id) {
  let query = `
    SELECT *
    FROM jobs
    INNER JOIN companys
    ON jobs.company_id = companys.company_id
    WHERE job_id = ?;
  `;

  const [res] = await pool.query(query, [job_id]);
  return res;
}

async function get_companys_db(limit) {
  let query = `
    SELECT *
    FROM companys
  `;

  const params = [];

  if (limit && limit > 0) {
    query += ` LIMIT ?`;
    params.push(limit);
  }

  const [res] = await pool.query(query, params);
  return res;
}

async function add_job_db(job) {
  let query;
  let id;

  // if adding new company to database
  if (job.company) {
    query = `
      INSERT INTO companys (company_name, company_description, company_email, company_phone)
      VALUES (?, ?, ?, ?)
    `;
    const [res] = await pool.query(query, [job.company.name, job.company.description, job.company.contactEmail, job.company.contactPhone]);
    id = res.insertId;
  };

  const company_id = job.company ? id : job.companyID;

  query = `
    INSERT INTO jobs (job_title, job_type, job_description, job_location, job_salary, company_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await pool.query(query, [job.title, job.type, job.description, job.location, job.salary, company_id]);
}

async function update_job_db(job) {
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

  await pool.query(query, [job.title, job.type, job.description, job.location, job.salary, job.companyID, job.id]);
}

async function delete_job_db(job_id) {
  let query = `
    DELETE FROM jobs
    WHERE job_id = ?
  `;

  await pool.query(query, [job_id]);
}

export async function db_add_user(user) {
  const is_company = user.accountType === 'company' ? true : false;

  const query = `
    INSERT INTO users (user_email, user_password, is_company)
    VALUES (?, ?, ?)
  `;
  await pool.query(query, [user.email, user.password, is_company]);
}

export async function db_check_user(user) {
  const query = `
    SELECT user_id FROM users WHERE user_email = ? AND user_password = ?
  `;
  const [res] = await pool.query(query, [user.email, user.password]);
  return res;
}

export { get_jobs_db, get_job_db, get_companys_db, add_job_db, delete_job_db, update_job_db };