import { createClient } from 'redis';

const client = createClient({
    username: 'default',
    password: 'apQJ7JCbEkLCvf9Ish8qeLFlkRRRXF5F',
    socket: {
        host: 'redis-19135.c244.us-east-1-2.ec2.redns.redis-cloud.com',
        port: 19135
    }
});

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();

await client.set('a', 'a');
// const result = await client.get('foo');
console.log('done')

