const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');

describe('API Endpoints', () => {
  let token = '';
  let userId = '';
  let fileId = '';

  before(async () => {
    // Create a new user
    const resUser = await request(server)
      .post('/users')
      .send({ email: 'zeez@test.com', password: 'test123' });
    expect(resUser.status).to.equal(201);
    userId = resUser.body.id;

    // Authenticate the user to get a token
    const resAuth = await request(server)
      .get('/connect')
      .set('Authorization', 'Basic ' + Buffer.from('zeez@test.com:test123').toString('base64'));
    expect(resAuth.status).to.equal(200);
    token = resAuth.body.token;

    // Create a new file
    const resFile = await request(server)
      .post('/files')
      .set('X-Token', token)
      .send({ name: 'test.txt', type: 'file', data: 'Hello World' });
    expect(resFile.status).to.equal(201);
    fileId = resFile.body.id;
  });

  describe('GET /status', () => {
    it('should return the status', async () => {
      const res = await request(server).get('/status');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('redis');
      expect(res.body).to.have.property('db');
    });
  });

  describe('GET /stats', () => {
    it('should return stats', async () => {
      const res = await request(server).get('/stats');
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('users');
      expect(res.body).to.have.property('files');
    });
  });

  describe('POST /users', () => {
    it('should create a new user', async () => {
      const res = await request(server)
        .post('/users')
        .send({ email: 'newuser@test.com', password: 'test123' });
      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('email');
    });
  });

  describe('GET /connect', () => {
    it('should authenticate the user', async () => {
      const res = await request(server)
        .get('/connect')
        .set('Authorization', 'Basic ' + Buffer.from('newuser@test.com:test123').toString('base64'));
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('token');
    });
  });

  describe('GET /disconnect', () => {
    it('should disconnect the user', async () => {
      const res = await request(server)
        .get('/disconnect')
        .set('X-Token', token);
      expect(res.status).to.equal(204);
    });
  });

  describe('GET /users/me', () => {
    it('should return user information', async () => {
      const res = await request(server)
        .get('/users/me')
        .set('X-Token', token);
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('email');
    });
  });

  describe('POST /files', () => {
    it('should create a new file', async () => {
      const res = await request(server)
        .post('/files')
        .set('X-Token', token)
        .send({ name: 'another_test.txt', type: 'file', data: 'This is a file manager' });
      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('id');
    });
  });

  describe('GET /files/:id', () => {
    it('should return file information', async () => {
      const res = await request(server)
        .get(`/files/${fileId}`)
        .set('X-Token', token);
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('name');
    });
  });

  describe('GET /files', () => {
    it('should return files with pagination', async () => {
      const res = await request(server)
        .get('/files')
        .set('X-Token', token)
        .query({ page: 0 });
      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });
  });

  describe('PUT /files/:id/publish', () => {
    it('should publish the file', async () => {
      const res = await request(server)
        .put(`/files/${fileId}/publish`)
        .set('X-Token', token);
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('isPublic');
      expect(res.body.isPublic).to.be.true;
    });
  });

  describe('PUT /files/:id/unpublish', () => {
    it('should unpublish the file', async () => {
      const res = await request(server)
        .put(`/files/${fileId}/unpublish`)
        .set('X-Token', token);
      expect(res.status).to.equal(200);
      expect(res.body).to.have.property('isPublic');
      expect(res.body.isPublic).to.be.false;
    });
  });

  describe('GET /files/:id/data', () => {
    it('should return file data', async () => {
      const res = await request(server)
        .get(`/files/${fileId}/data`)
        .set('X-Token', token);
      expect(res.status).to.equal(200);
      expect(res.text).to.equal('Hello World');
    });

    it('should return file data with size parameter', async () => {
      const res = await request(server)
        .get(`/files/${fileId}/data`)
        .set('X-Token', token)
        .query({ size: 100 });
      expect(res.status).to.equal(200);
      expect(res.text).to.contain('Hello World');
    });
  });
});
