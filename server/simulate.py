import pandas as pd
import numpy as np
from dotenv import load_dotenv
import os
import mysql.connector
import argparse
import random
from datetime import datetime, timedelta

# set enviroment variables
load_dotenv()

# connect to mysql
db = mysql.connector.connect(
    host=os.environ['DB_HOST'],       
    user=os.environ['DB_USER'],            
    password=os.environ['DB_PASSWORD'],    
    database=os.environ['DB_NAME']      
)
cursor = db.cursor(dictionary=True)

def main():
  cursor.execute("""
                 DELETE FROM applications
                 """)
  db.commit()
  
  print("applications reset")
  print("start randomizing job posting date")
  # get all jobs
  cursor.execute("""
                 SELECT job_id, company_id FROM jobs
                 WHERE is_custom = 0
                 ORDER BY company_id, job_id;
                 """)
  job_list = cursor.fetchall()
  
  # construct company_job dictionary
  company_job_dict = {}
  for job in job_list:
    if job['company_id'] in company_job_dict:
      company_job_dict[job['company_id']].append(job['job_id'])
    else:
      company_job_dict[job['company_id']] = [job['job_id']]

  start_date = datetime(2025, 1, 1)
  end_date = datetime(2025, 12, 1)
  
  # randomly select a batch of jobs from the same company and assign random a date
  # loop until no jobs left to assign
  while len(list(company_job_dict.keys())) > 0:
    company = random.choice(list(company_job_dict.keys()))
    jobs = company_job_dict[company]

    random.shuffle(jobs)
    batch_size = random.randint(1, min(3, len(jobs)))
    chosen_jobs = jobs[:batch_size]
    company_job_dict[company] = jobs[batch_size:] # update remaining jobs
    
    random_days = random.randint(0, (end_date - start_date).days)
    random_date = (start_date + timedelta(days=random_days)).strftime("%Y-%m-%d")

    # print(f"company: {company}, jobs: {chosen_jobs}, date: {random_date}")
    
    # updating mysql jobs table
    cursor.execute(f"""
                   UPDATE jobs
                   SET job_date = %s
                   WHERE job_id IN ({', '.join(['%s'] * len(chosen_jobs))})
                   """, [random_date, *chosen_jobs])
    db.commit()

    if len(company_job_dict[company]) == 0:
      del company_job_dict[company]
  
  print("finish")
  print("start randomizing applications")
    
  # get all users
  cursor.execute(f"""
                 SELECT user_id FROM users
                 """)
  user_list = [user['user_id'] for user in cursor.fetchall()]
  
  application_list = []
  
  for user_id in user_list:
    # define application frequnecy
    freq = random.uniform(0.2, 0.8)  
    
    # get all recommended jobs
    cursor.execute("""
                   SELECT jobs.job_id, jobs.job_date 
                   FROM recommendations INNER JOIN jobs
                   ON recommendations.job_id = jobs.job_id
                   WHERE recommendations.user_id = %s
                   ORDER BY priority;
                   """, [user_id])
    recommendation_list = cursor.fetchall()
    cutoff = int(freq * len(recommendation_list))
    recommendation_list = recommendation_list[:cutoff]
    
    for recommendation in recommendation_list:
      application_date = (recommendation['job_date'] + timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d")
      application_list.append({'user_id': user_id, 'job_id': recommendation['job_id'], 'application_date': application_date})
  
  # update mysql applications table
  params = []
  for application in application_list:
    params.append(application['user_id'])
    params.append(application['job_id'])
    params.append(application['application_date'])
    
  cursor.execute(f"""
                 INSERT INTO applications (user_id, job_id, application_date)
                 VALUES {", ".join(["(%s, %s, %s)"] * len(application_list))}
                 """, params)
  db.commit()
  
  print("finish")
if __name__ == '__main__':
  main()