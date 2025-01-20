import os
import mysql.connector
import json
import sys
import random
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, SystemMessage
load_dotenv()
  
class User(BaseModel):
  name: str = Field(description="User's name")
  location: str = Field(description="User's locaion")
  education: str = Field(description="User's education. For example: Master of Science in Computer Engineering from the University of Toronto")
  skills: list[str] = Field(description="User's skills")
  work_experience_years: int = Field(description="User's experience years")
  work_experience_roles: list[str] = Field(description="User's experience companies")
   
class ResponseFormatter(BaseModel):
  users: list[User]

if __name__ == '__main__':
  # Database connection
  db = mysql.connector.connect(
      host=os.environ['DB_HOST'],       
      user=os.environ['DB_USER'],            
      password=os.environ['DB_PASSWORD'],    
      database=os.environ['DB_NAME']      
  )

  # Cursor object to execute queries
  cursor = db.cursor(dictionary=True)

  cursor.execute("""
                 SELECT user_name, user_location, user_education, user_skills, user_experience_years, user_experience_roles FROM users 
                 ORDER BY RAND() 
                 LIMIT 10;
                """)
  result = cursor.fetchall()
  
  if sys.argv[1] == 'us':
    location = 'Based in the United States'
  elif sys.argv[1] == 'global':
    location = 'Anywhere in the world'
  
  fields = ['Engineering or Sciences', 'Business', 'Arts, Humanities, Social Sciences']
  if sys.argv[2] == 'engr':
    education = fields[0]
  elif sys.argv[2] == 'bus':
    education = fields[1]
  elif sys.argv[2] == 'ahss':
    education = fields[2]
  elif sys.argv[2] == 'any':
    education = random.choice(fields)
  
  y = ['Set to 0', '1 to 5', '5 to 20']
  if sys.argv[3] == 'entry':
    years = y[0]
  elif sys.argv[3] == 'mid':
    years = y[1]
  elif sys.argv[3] == 'high':
    years = y[2]
  elif sys.argv[3] == 'any':
    years = random.choice(y)
    
  if years == 'Set to 0':
    roles = 'Internship'
  else:
    roles = 'Specific roles'
      
  messages = [
      HumanMessage(f"""
        Here are the previous 10 user profiles {result}
                   
        Generate 1 unqiue job applicant profile with the following requirements:
        - name
        - location: {location}
        - education:
          * Fields: {education} 
          * Degree levels: Bachelors, Masters, PhD
          * Universities: Mix of state schools, private universities, liberal arts colleges                                                 
        - skills: Include specific technical and soft skills relevant to their field (minimum 4 skills)
        - work experience years: {years}
        - work experience roles: {roles} at real companies.
        
        Ensure the generated user is different than previous users in all profile fields. 
      """)
  ]
  
  model = ChatOpenAI(model="gpt-4o-mini")
  model_with_structure = model.with_structured_output(ResponseFormatter)
  structured_output = model_with_structure.invoke(messages)
  user = structured_output.users[0]
  
  generated_user = {
    "user_name": user.name,
    "user_location": user.location,
    "user_education": user.education,
    "user_skills": json.dumps(user.skills),
    "user_experience_years": user.work_experience_years,
    "user_experience_roles": json.dumps(user.work_experience_roles),
  }
  
  # generated_user = {
  #   "user_name": 'Marvin Lim',
  #   "user_location": 'b',
  #   "user_education": 'c',
  #   "user_skills": json.dumps(['1', '2']),
  #   "user_experience_years": 10,
  #   "user_experience_roles": json.dumps(['3', '4'])
  # }
  
  print(f"DATA: {json.dumps(generated_user)}")
