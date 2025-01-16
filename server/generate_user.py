import os
import mysql.connector
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from langchain_core.messages import HumanMessage, SystemMessage
load_dotenv()
  
# class User(BaseModel):
#   name: str = Field(description="User's name")
#   email: str = Field(description="User's email")
#   location: str = Field(description="User's locaion")
#   education: str = Field(description="User's education. For example: Master of Science in Computer Engineering from the University of Toronto")
#   skills: list[str] = Field(description="User's skills")
#   work_experience_years: int = Field(description="User's experience years")
#   work_experience_companies: list[str] = Field(description="User's experience companies")
   
# class ResponseFormatter(BaseModel):
#   users: list[User]

if __name__ == '__main__':
  # Database connection
  db = mysql.connector.connect(
      host=os.environ['DB_HOST'],       
      user=os.environ['DB_USER'],            
      password=os.environ['DB_PASSWORD'],    
      database=os.environ['DB_NAME']      
  )

  # Cursor object to execute queries
  cursor = db.cursor()

  cursor.execute("""
                 SELECT * FROM users 
                 ORDER BY RAND() 
                 LIMIT 10;
                """, 
                ("value1",))
  result = cursor.fetchall()
  for row in result:
      print(row)


  messages = [
      HumanMessage("""
        Generate 1 job applicant profile with the following requirements:
        - name
        - email
        - location: based in the United States
        - education:
          * Fields: Engineering, Sciences, Business, Arts, Humanities, Social Sciences 
          * Degree levels: Bachelors, Masters, PhD
          * Universities: Mix of state schools, private universities, liberal arts colleges                                                 
        - skills: Include both technical and soft skills relevant to their field (minimum 4 skills)
        - work experience years
        - work experience companies: Include specific roles (including intern) at real companies.                              
    """),
  ]

  # model = ChatOpenAI(model="gpt-4o-mini", temperature=1.2)
  # model_with_structure = model.with_structured_output(ResponseFormatter)
  # structured_output = model_with_structure.invoke(messages)
  # print(structured_output)