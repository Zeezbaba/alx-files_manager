const { expect } = require('chai');
const redisClient = require('../utils/redis');

describe('redisClient', () => {
  it('connected', async () => {
    const isAlive = await redisClient.isAlive();
    expect(isAlive).to.be.true;
  });

  it('set and get values', async () => {
    await redisClient.set('test_key', 'test_value', 10);
    const value = await redisClient.get('test_key');
    expect (value).to.equal('test_value');
  });
});
