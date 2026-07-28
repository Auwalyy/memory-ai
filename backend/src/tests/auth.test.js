const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/features/auth/user.model');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/memoryai_test');
});

afterAll(async () => {
  await User.deleteMany({ email: /test_auth/ });
  await mongoose.disconnect();
});

describe('Auth API', () => {
  const testUser = {
    name: 'Test User',
    email: 'test_auth_user@example.com',
    password: 'Password123',
  };
  let accessToken;

  it('POST /auth/register — creates a new user', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('POST /auth/register — rejects duplicate email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    expect(res.status).toBe(409);
  });

  it('POST /auth/login — returns access token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken;
  });

  it('POST /auth/login — rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword1' });
    expect(res.status).toBe(401);
  });

  it('GET /auth/me — returns user with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('GET /auth/me — rejects missing token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('POST /auth/register — validates weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Test', email: 'test_auth_weak@example.com', password: 'weak' });
    expect(res.status).toBe(400);
  });
});
