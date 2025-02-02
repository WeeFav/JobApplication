import pandas as pd
import numpy as np
from langchain_ollama.llms import OllamaLLM
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
import re
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
import nltk
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import redis
import json
import os
import time
load_dotenv()

def extract_skill(jd):
  messages = [HumanMessage(f"""
                         Extract all qualifications and skills needed for this job. Use the exact same word as on the original post. Output nothing else but the bullet points.
                         
                         {jd}
                         """)]
  res = model.invoke(messages)
  return res

r = redis.Redis(
    host=os.environ['REDIS_HOST'],
    port=os.environ['REDIS_PORT'],
    decode_responses=True,
    username=os.environ['REDIS_USER'],
    password=os.environ['REDIS_PASSWORD'],
)

model = OllamaLLM(model="llama3.2")
stop_words = stopwords.words('english')
additional_stop_words = ['experience', 'qualification', 'working', 'skill']
stop_words.extend(additional_stop_words)

print("Python Server Runinng...")

while True:
  result = r.brpop('queue', timeout=5)
  if result:
    print("recieved data...")
    _, data = result
    jd_list = json.loads(data)
    curr_corpus = []
    
    # extract all job description
    for idx, jd in enumerate(jd_list):
      print(f"extracting skill {idx}")
      skill = extract_skill(jd)
      # lowercase
      skill = skill.lower()
      # remove punctuation
      skill = re.sub(r'[^\w\s]', '', skill)
      # remove stop words
      skill = skill.split()
      tokens = [word for word in skill if word not in stop_words]
      # lemmatize
      lemmatizer = WordNetLemmatizer()
      tokens = [lemmatizer.lemmatize(word) for word in tokens]
      # reconsturct
      skill = " ".join(tokens)

      curr_corpus.append(skill)
      for i in range(10, 0, -1):
        print(f"cooling down... {i}", end=' \r')
        time.sleep(1)
      print('')
    
    curr_corpus = np.array(curr_corpus)  
    
    if os.path.exists("./corpus.npy"):
      corpus = np.load("./corpus.npy", allow_pickle=True)
      corpus = np.concatenate((corpus, curr_corpus))
    else:
      corpus = curr_corpus
    
    print(corpus)
    corpus.dump("./corpus.npy")
    
    
    


  
df = pd.read_csv("D:\JobApplication\job_dataset\selected_jobs\Amazon.csv")
corpus = []
stop_words = stopwords.words('english')
additional_stop_words = ['experience', 'qualification', 'working']
stop_words.extend(additional_stop_words)

for jd in df['job_description']:
  # call llm
  skill = extract_skill(jd)
  print(skill)
  # lowercase
  skill = skill.lower()
  
  # remove punctuation
  skill = re.sub(r'[^\w\s]', '', skill)
  
  # remove stop words
  skill = skill.split()
  tokens = [word for word in skill if word not in stop_words]
  
  # lemmatize
  lemmatizer = WordNetLemmatizer()
  tokens = [lemmatizer.lemmatize(word) for word in tokens]
  
  # reconsturct
  skill = " ".join(tokens)
  corpus.append(skill)
  print(skill)
  print("-----------------------------")

print("saving corpus")
np.array(corpus).dump("./server/corpus.npy")

corpus = np.load("./server/corpus.npy", allow_pickle=True)
vectorizer = TfidfVectorizer()
tfidf_matrix = vectorizer.fit_transform(corpus)

# Example user input
user_input = ["computer vision pytorch", "program management experience", "master degree engineering"]
user_vector = vectorizer.transform(user_input)

# Compute cosine similarity
similarity_scores = cosine_similarity(user_vector, tfidf_matrix)
# print(similarity_scores.argsort()[:,-1:])
print(similarity_scores.argsort())
