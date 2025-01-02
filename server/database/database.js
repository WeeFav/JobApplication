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

export async function update_account(updatedAccount) {
  const query = `
    UPDATE accounts
    SET account_email = ?
    WHERE account_id = ?;
  `;
  await db.query(query, [updatedAccount.account_email, updatedAccount.account_id]);
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
    INSERT INTO users (user_id, user_name, user_email, user_image)
    VALUES (?, ?, ?, ?)
  `;
  await db.query(query, [user.user_id, user.user_name, user.user_email, user.user_image]);
}

export async function update_user(updatedUser) {
  const query = `
    UPDATE users
    SET user_name = ?,
        user_email = ?,
        user_image = ?
    WHERE user_id = ?;
  `;
  await db.query(query, [updatedUser.user_name, updatedUser.user_email, updatedUser.user_image, updatedUser.user_id]);
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
    WHERE is_custom = ?
  `;

  const params = [];

  if (search.limit && search.limit > 0) {
    query += ` LIMIT ?`;
    params.push(search.limit);
  }

  // params.push(search.job_id ? search.job_id : "%");
  params.push(search.is_custom ? search.is_custom : "%");
  // params.push(search.company_id ? search.company_id : "%");
  // params.push(search.jobTitle ? `%${search.jobTitle}%` : "%");
  // params.push(search.jobType ? `%${search.jobType}%` : "%");
  // params.push(search.jobLocation ? `%${search.jobLocation}%` : "%");
  const [res] = await db.query(query, params);
  return res;
}

export async function add_company(company) {
  const query = `
    INSERT INTO companys (company_name, company_description, company_email, company_phone, is_custom, account_id, company_image)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const [res] = await db.query(query, [company.company_name, company.company_description, company.company_email, company.company_phone, company.is_custom, company.account_id, company.company_image]);
  const company_id = res.insertId;
  return company_id;
}

export async function update_company(updatedCompany) {
  const query = `
    UPDATE companys
    SET company_name = ?,
        company_description = ?,
        company_email = ?,
        company_phone = ?,
        company_image = ?
    WHERE company_id = ?;
  `;
  await db.query(query, [updatedCompany.company_name, updatedCompany.company_description, updatedCompany.company_email, updatedCompany.company_phone, updatedCompany.company_image, updatedCompany.company_id]);
}

export async function delete_company(search) {
  const query = `
  DELETE FROM companys
  WHERE company_id = ?
`;
  await db.query(query, [search.company_id]);  
}

/* 
===============================================================================
job
===============================================================================
*/

export async function get_jobs(search) {
  let query = `
    SELECT job_id, job_title, job_type, job_description, job_location, job_salary, company_id FROM jobs 
    WHERE job_id LIKE ? AND is_custom LIKE ? AND company_id LIKE ? AND job_title LIKE ? AND job_type LIKE ? AND job_location LIKE ?
  `;

  const params = [];

  
  params.push(search.job_id ? search.job_id : "%");
  params.push(search.is_custom ? search.is_custom : "%");
  params.push(search.company_id ? search.company_id : "%");
  params.push(search.jobTitle ? `%${search.jobTitle}%` : "%");
  params.push(search.jobType ? `%${search.jobType}%` : "%");
  params.push(search.jobLocation ? `%${search.jobLocation}%` : "%");

  if (search.limit && search.limit > 0) {
    query += ` LIMIT ?`;
    params.push(parseInt(search.limit));
  }

  const [res] = await db.query(query, params);
  return res;
}

export async function get_job(job_id) {
  let query = `
    SELECT job_id, job_title, job_type, job_description, job_location, job_salary, jobs.is_custom AS custom_job, company_name, company_description, company_email, company_phone, companys.is_custom AS custom_company, jobs.company_id
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
  const [res] = await db.query(query, [newJob.jobTitle, newJob.jobType, newJob.jobDescription, newJob.jobLocation, newJob.jobSalary, newJob.companyID, newJob.is_custom]);
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

export async function get_applications(search) {
  let query = `
    SELECT jobs.job_id, job_title, job_type, job_description, job_location, job_salary, application_id, application_date, application_status FROM applications
    INNER JOIN jobs
    ON applications.job_id = jobs.job_id
    WHERE user_id LIKE ? AND jobs.job_id LIKE ? AND application_date LIKE ? AND application_status LIKE ? AND job_title LIKE ? AND job_type LIKE ? AND job_location LIKE ? AND company_id LIKE ?
  `;

  const params = [];
  
  params.push(search.user_id ? search.user_id : "%");
  params.push(search.job_id ? search.job_id : "%");
  params.push(search.application_date ? search.application_date : "%");
  params.push(search.application_status ? search.application_status : "%");
  params.push(search.jobTitle ? `%${search.jobTitle}%` : "%");
  params.push(search.jobType ? `%${search.jobType}%` : "%");
  params.push(search.jobLocation ? `%${search.jobLocation}%` : "%");
  params.push(search.company_id ? search.company_id : "%");
  
  if (search.limit && search.limit > 0) {
    query += `LIMIT ?`;
    params.push(parseInt(search.limit));
  }
  
  const [res] = await db.query(query, params);
  return res;
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
