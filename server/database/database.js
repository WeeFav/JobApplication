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
  const query = `
    INSERT INTO accounts (account_email, account_password, is_company)
    VALUES (?, ?, ?)
  `;
  const [res] = await db.query(query, [account.account_email, account.account_password, account.is_company]);
  const account_id = res.insertId;
  return account_id;
}

export async function check_account(account) {
  let query;

  if (account.is_company) {
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

  const [res] = await db.query(query, [account.account_email, account.account_password, account.is_company]);
  return res;
}

export async function update_account(updatedAccount) {
  let updates = [];
  let params = [];

  if (updatedAccount.account_email) {
    updates.push("account_email = ?");
    params.push(updatedAccount.account_email)
  }
  if (updatedAccount.account_password) {
    updates.push("account_password = ?");
    params.push(updatedAccount.account_password)
  }

  const query = `
    UPDATE accounts
    SET ${updates.join(", ")}
    WHERE account_id = ?;
  `;
  params.push(updatedAccount.account_id)
  await db.query(query, params);
}

export async function delete_account(search) {
  let query = `
    DELETE FROM accounts
    WHERE account_id = ?
  `;
  await db.query(query, [search.account_id]);
}

/* 
===============================================================================
user
===============================================================================
*/

export async function get_user(search) {
  let query = `
    SELECT * FROM users
    WHERE user_id = ?;
  `;
  const [res] = await db.query(query, [search.user_id]);
  return res;
}

export async function add_user(user) {
  const columns = Object.keys(user);
  const placeholders = columns.map(() => '?').join(', ');
  const query = `
    INSERT INTO users (${columns.join(', ')})
    VALUES (${placeholders})
  `;

  await db.query(query, Object.values(user));
}

export async function update_user(updatedUser) {
  const updates = []
  const params = []

  for (const key in updatedUser) {
    if (key != 'user_id') {
      updates.push(`${key} = ?`)
      params.push(updatedUser[key])
    }
  };
  
  params.push(updatedUser['user_id'])

  const query = `
    UPDATE users
    SET ${updates.join(', ')}
    WHERE user_id = ?;
  `;

  await db.query(query, params);
}

/* 
===============================================================================
company
===============================================================================
*/

export async function get_companys(search) {
  let conditions = [];
  let params = [];

  if (search.is_custom) {
    conditions.push("is_custom = ?")
    params.push(search.is_custom)
  }
  if (search.company_id) {
    conditions.push("company_id = ?")
    params.push(search.company_id)
  }

  let query = `
  SELECT *
  FROM companys
  `;

  if (conditions.length > 0) {
    query += `WHERE ${conditions.join(" AND ")}`
  }

  if (search.limit && search.limit > 0) {
    query += ` LIMIT ?`;
    params.push(search.limit);
  }

  const [res] = await db.query(query, params);
  return res;
}

export async function add_company(company) {
  const query = `
    INSERT INTO companys (company_name, company_description, company_email, company_phone, is_custom, account_id, company_image, user_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const [res] = await db.query(query, [company.company_name, company.company_description, company.company_email, company.company_phone, company.is_custom, company.account_id, company.company_image, company.user_id]);
  const company_id = res.insertId;
  return company_id;
}

export async function update_company(updatedCompany) {
  let updates = [];
  let params = [];

  if (updatedCompany.company_name) {
    updates.push("company_name = ?");
    params.push(updatedCompany.company_name)
  }
  if (updatedCompany.company_description) {
    updates.push("company_description = ?");
    params.push(updatedCompany.company_description)
  }
  if (updatedCompany.company_email) {
    updates.push("company_email = ?");
    params.push(updatedCompany.company_email)
  }
  if (updatedCompany.company_phone) {
    updates.push("company_phone = ?");
    params.push(updatedCompany.company_phone)
  }
  if (updatedCompany.company_image) {
    updates.push("company_image = ?");
    params.push(updatedCompany.company_image)
  }

  const query = `
    UPDATE companys
    SET ${updates.join(", ")}
    WHERE company_id = ?;
  `;
  params.push(updatedCompany.company_id)
  await db.query(query, params);
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

  if (search.user_id) {
    conditions.push("applications.user_id = ?")
    params.push(search.user_id)
  }
  if (search.job_id) {
    conditions.push("jobs.job_id = ?")
    params.push(search.job_id)
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
    SELECT jobs.job_id, job_title, job_type, job_description, job_location, job_salary, application_id 
    FROM applications
    INNER JOIN jobs
    ON applications.job_id = jobs.job_id
  `;

  if (conditions.length > 0) {
    query += `WHERE ${conditions.join(" AND ")}`
  }

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
