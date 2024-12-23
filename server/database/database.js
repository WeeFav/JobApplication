import mysql from 'mysql2';
import dotenv from "dotenv";
dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}).promise()

export async function get_jobs(search) {
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

  const [res] = await db.query(query, params);
  return res;
}

export async function get_job(job_id) {
  let query = `
    SELECT *
    FROM jobs
    INNER JOIN companys
    ON jobs.company_id = companys.company_id
    WHERE job_id = ?;
  `;

  const [res] = await db.query(query, [job_id]);
  return res;
}

export async function get_user(account_id) {
  let query = `
    SELECT * FROM users
    WHERE account_id = ?;
  `;

  const [res] = await db.query(query, [account_id]);
  return res;
}

export async function get_company(account_id) {
  let query = `
    SELECT * FROM companys
    WHERE account_id = ?;
  `;

  const [res] = await db.query(query, [account_id]);
  return res;
}

export async function get_companys(limit) {
  let query = `
    SELECT *
    FROM companys
  `;

  const params = [];

  if (limit && limit > 0) {
    query += ` LIMIT ?`;
    params.push(limit);
  }

  const [res] = await db.query(query, params);
  return res;
}

export async function add_job(job) {
  let query;
  let id;

  // if adding new company to database
  if (job.company) {
    query = `
      INSERT INTO companys (company_name, company_description, company_email, company_phone)
      VALUES (?, ?, ?, ?)
    `;
    const [res] = await db.query(query, [job.company.name, job.company.description, job.company.contactEmail, job.company.contactPhone]);
    id = res.insertId;
  };

  const company_id = job.company ? id : job.companyID;

  query = `
    INSERT INTO jobs (job_title, job_type, job_description, job_location, job_salary, company_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await db.query(query, [job.title, job.type, job.description, job.location, job.salary, company_id]);
}

export async function update_job(job) {
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

  await db.query(query, [job.title, job.type, job.description, job.location, job.salary, job.companyID, job.id]);
}

export async function delete_job(job_id) {
  let query = `
    DELETE FROM jobs
    WHERE job_id = ?
  `;

  await db.query(query, [job_id]);
}

export async function add_account(account) {
  const is_company = account.accountType === 'company' ? true : false;

  const query = `
    INSERT INTO accounts (account_email, account_password, is_company)
    VALUES (?, ?, ?)
  `;
  const [result] = await db.query(query, [account.email, account.password, is_company]);
  const account_id = result.insertId;
  return account_id;
}

export async function add_user(user) {
  const query = `
    INSERT INTO users (user_name, account_id)
    VALUES (?, ?)
  `;
  await db.query(query, [user.user_name, user.account_id]);
}

export async function add_company(company) {
  const query = `
    INSERT INTO companys (company_name, company_description, company_email, company_phone, is_custom, account_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await db.query(query, [company.company_name, company.company_description, company.company_email, company.company_phone, company.is_custom, company.account_id]);
}

export async function check_account(account) {
  const is_company = account.accountType === 'company' ? true : false;
  
  const query = `
    SELECT account_id, account_email, is_company FROM accounts WHERE account_email = ? AND account_password = ? AND is_company = ?
  `;
  const [res] = await db.query(query, [account.email, account.password, is_company]);
  return res;
}