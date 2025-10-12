CREATE TABLE jobs (
  id SERIAL PRIMARY KEY,
  hash VARCHAR(260) NOT NULL,
  title VARCHAR(150),
	company VARCHAR(150),
	url TEXT NOT NULL,
	description TEXT,
	description_extracted TEXT,
  post_date DATE,
  scrape_date DATE NOT NULL DEFAULT CURRENT_DATE,
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
  score INT NOT NULL
);


