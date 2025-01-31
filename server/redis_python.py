import redis

r = redis.Redis(
    host='redis-19135.c244.us-east-1-2.ec2.redns.redis-cloud.com',
    port=19135,
    decode_responses=True,
    username="default",
    password="apQJ7JCbEkLCvf9Ish8qeLFlkRRRXF5F",
)

# success = r.set('foo', 'bar')

result = r.rpop('queue')
print(result)

