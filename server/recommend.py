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
load_dotenv()

# model = OllamaLLM(model="llama3.2")

# def extract_skill(jd):
#   messages = [HumanMessage(f"""
#                          Extract all qualifications and skills needed for this job. Use the exact same word as on the original post. Output nothing else but the bullet points.
                         
#                          {jd}
#                          """)]
#   res = model.invoke(messages)
#   return res
  
# df = pd.read_csv("D:\JobApplication\job_dataset\selected_jobs\Amazon.csv")
# corpus = []
# stop_words = stopwords.words('english')
# additional_stop_words = ['experience', 'qualification', 'working']
# stop_words.extend(additional_stop_words)

# for jd in df['job_description']:
#   # call llm
#   skill = extract_skill(jd)
#   print(skill)
#   # lowercase
#   skill = skill.lower()
  
#   # remove punctuation
#   skill = re.sub(r'[^\w\s]', '', skill)
  
#   # remove stop words
#   skill = skill.split()
#   tokens = [word for word in skill if word not in stop_words]
  
#   # lemmatize
#   lemmatizer = WordNetLemmatizer()
#   tokens = [lemmatizer.lemmatize(word) for word in tokens]
  
#   # reconsturct
#   skill = " ".join(tokens)
#   corpus.append(skill)
#   print(skill)
#   print("-----------------------------")

# print("saving corpus")
# np.array(corpus).dump("./server/corpus.npy")

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

  
