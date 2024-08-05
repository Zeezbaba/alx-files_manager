const { createClient } = require('redis');
const { promisify } = require('util');

class RedisClient {
  constructor() {
    this.client = createClient();

    this.client.on('error', (errMsg) => {
      console.error(errMsg);
    });
    this.connected = false;
    this.client.on('connect', () => {
      this.connected = true;
    });

    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    return this.connected;
  }

  async get(key) {
    console.log(`Fetching key: ${key}`);
    const resp = await this.getAsync(key);
    console.log(`Value for key ${key}: ${resp}`);
    return resp;
  }

  async set(key, value, duration) {
    console.log(`Setting key: ${key} with value: ${value} and duration: ${duration}`);
    await this.setAsync(key, value, 'EX', duration);
  }

  async del(key) {
    await this.delAsync(key);
  }
}

const redisClient = new RedisClient();
module.exports = redisClient;
