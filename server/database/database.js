import mysql from 'mysql2';
import dotenv from "dotenv";
dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}).promise()

/* 
===============================================================================
account
===============================================================================
*/

export async function add_account(account) {
  const is_company = account.accountType === 'company' ? true : false;
  const query = `
    INSERT INTO accounts (account_email, account_password, is_company)
    VALUES (?, ?, ?)
  `;
  const [res] = await db.query(query, [account.email, account.password, is_company]);
  const account_id = res.insertId;
  return account_id;
}

export async function check_account(account) {
  const is_company = account.accountType === 'company' ? true : false;
  
  let query;
  
  if (is_company) {
    query = `
    SELECT company_id AS id, is_company FROM accounts
    INNER JOIN companys
    ON accounts.account_id = companys.account_id
    WHERE account_email = ? AND account_password = ? AND is_company = ?
    `;
  }
  else {
    query = `
    SELECT user_id AS id, is_company FROM accounts
    INNER JOIN users
    ON accounts.account_id = users.user_id
    WHERE account_email = ? AND account_password = ? AND is_company = ?
    `;
  }
  
  const [res] = await db.query(query, [account.email, account.password, is_company]);
  return res;
}

/* 
===============================================================================
user
===============================================================================
*/

export async function get_user(user_id) {
  let query = `
    SELECT * FROM users
    WHERE user_id = ?;
  `;
  const [res] = await db.query(query, [user_id]);
  return res;
}

export async function add_user(user) {
  const query = `
    INSERT INTO users (user_id, user_name, user_email)
    VALUES (?, ?, ?)
  `;
  await db.query(query, [user.user_id, user.user_name, user.user_email]);
}

/* 
===============================================================================
company
===============================================================================
*/

export async function get_company(company_id) {
  let query = `
    SELECT * FROM companys
    WHERE company_id = ?;
  `;

  const [res] = await db.query(query, [company_id]);
  return res;
}

export async function get_companys(search) {
  let query = `
    SELECT *
    FROM companys
  `;

  const params = [];

  if (search.limit && search.limit > 0) {
    query += ` LIMIT ?`;
    params.push(search.limit);
  }

  // params.push(search.job_id ? search.job_id : "%");
  // params.push(search.is_custom ? search.is_custom : "%");
  // params.push(search.company_id ? search.company_id : "%");
  // params.push(search.jobTitle ? `%${search.jobTitle}%` : "%");
  // params.push(search.jobType ? `%${search.jobType}%` : "%");
  // params.push(search.jobLocation ? `%${search.jobLocation}%` : "%");
  const [res] = await db.query(query, params);
  return res;
}

export async function add_company(company) {
  const query = `
    INSERT INTO companys (company_name, company_description, company_email, company_phone, is_custom, account_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const [res] = await db.query(query, [company.company_name, company.company_description, company.company_email, company.company_phone, company.is_custom, company.account_id]);
  const company_id = res.insertId;
  return company_id;
}

export async function update_company(updatedCompany) {
  const query = `
    UPDATE companys
    SET company_name = ?,
        company_description = ?,
        company_email = ?,
        company_phone = ?
    WHERE company_id = ?;
  `;
  await db.query(query, [updatedCompany.company_name, updatedCompany.company_description, updatedCompany.company_email, updatedCompany.company_phone, updatedCompany.company_id]);
}

/* 
===============================================================================
job
===============================================================================
*/

export async function get_jobs(search) {
  let query = `
    SELECT job_id, job_title, job_type, job_description, job_location, job_salary, jobs.company_id, company_name, company_description, company_email, company_phone FROM jobs 
    INNER JOIN companys
    ON jobs.company_id = companys.company_id
    WHERE job_id LIKE ? AND jobs.is_custom LIKE ? AND jobs.company_id LIKE ? AND job_title LIKE ? AND job_type LIKE ? AND job_location LIKE ?
  `;

  const params = [];

  if (search.limit && search.limit > 0) {
    query += ` LIMIT ?`;
    params.push(search.limit);
  }

  params.push(search.job_id ? search.job_id : "%");
  params.push(search.is_custom ? search.is_custom : "%");
  params.push(search.company_id ? search.company_id : "%");
  params.push(search.jobTitle ? `%${search.jobTitle}%` : "%");
  params.push(search.jobType ? `%${search.jobType}%` : "%");
  params.push(search.jobLocation ? `%${search.jobLocation}%` : "%");
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

export async function add_job(newJob) {
  const query = `
    INSERT INTO jobs (job_title, job_type, job_description, job_location, job_salary, company_id, is_custom)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  await db.query(query, [newJob.jobTitle, newJob.jobType, newJob.jobDescription, newJob.jobLocation, newJob.jobSalary, newJob.companyID, newJob.is_custom]);
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

/* 
===============================================================================
application
===============================================================================
*/
