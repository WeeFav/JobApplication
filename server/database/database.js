import mysql from 'mysql2';
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
}).promise()

async function query_db(limit) {
  let query = `
    SELECT *
    FROM jobs 
    INNER JOIN companys
    ON jobs.company_id = companys.company_id
  `;

  const params = [];

  if (limit && limit > 0) {
    query += ` LIMIT ?`;
    params.push(limit);
  }

  const [res] = await pool.query(query, params);
  return res;
}

export default query_db