const { express, expect } = require('chai');
const dbClient = require('../utils/db');

describe('dbClient', () => {
  before(async () => {
    await dbClient.connect();
  });

  it('should be connected to database', async () => {
    const isAlive = dbClient.isAlive();
    expect(isAlive).to.be.true;
  });

  it('returns number of users', async () => {
    const nbUsers = await dbClient.nbUsers();
    expect(nbUsers).to.be.a('number');
  });
});
