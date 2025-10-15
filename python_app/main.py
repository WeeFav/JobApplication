import redis
import json
import traceback

from insert import insert

def scrape():
  pass

def main():
  # connect to redis
  r = redis.Redis(
      host='redis',
      port=6379,
      decode_responses=True,
  )

  pubsub = r.pubsub()
  pubsub.subscribe('scrape')
  print(f"Listening on pubsub 'scrape' and queue 'queue'...")
  
  try:
    while True:
      # --- 1. Check for scrape ---
      message = pubsub.get_message(ignore_subscribe_messages=True, timeout=0.1)
      if message:
        scrape()
      
      # --- 2. Check for queued jobs ---
      result = r.brpop('queue', timeout=1)   
      if result:
        _, data = result
        insert([json.loads(data)], 'manual')
  except Exception:
    traceback.print_exc()
    pubsub.unsubscribe('scrape')
    pubsub.close()
    r.close()

if __name__ == '__main__':
  print("Python backend started")
  main()