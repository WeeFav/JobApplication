CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    hash VARCHAR(260) NOT NULL,
    title VARCHAR(150),
    company VARCHAR(150),
    location VARCHAR(150),
    post_date DATE,
    scrape_date DATE NOT NULL DEFAULT CURRENT_DATE,
    url TEXT NOT NULL,
    description TEXT,
    description_extracted TEXT,
);

CREATE TABLE applications (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES jobs(id) 
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  application_date DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE recommendations (
  job_id INTEGER REFERENCES jobs(id) 
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  resume_id INTEGER REFERENCES resumes(id) 
  ON DELETE CASCADE
  ON UPDATE CASCADE,
  similarity_score REAL NOT NULL,
  keyword_score REAL NOT NULL,
  embeddings_score REAL NOT NULL,
  final_score REAL NOT NULL
);

CREATE TABLE users (
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(50) NOT NULL
);

CREATE TABLE resumes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  content TEXT NOT NULL,
  isUpdated BOOLEAN NOT NULL DEFAULT true,
  embedding vector(768) NOT NULL
);


