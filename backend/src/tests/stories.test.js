const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/features/auth/user.model');
const Story = require('../src/features/stories/story.model');

let accessToken;
let storyId;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/memoryai_test');

  // Create and login test user
  await User.deleteMany({ email: 'test_stories@example.com' });
  await request(app).post('/api/v1/auth/register').send({
    name: 'Story Tester',
    email: 'test_stories@example.com',
    password: 'Password123',
  });
  const res = await request(app).post('/api/v1/auth/login').send({
    email: 'test_stories@example.com',
    password: 'Password123',
  });
  accessToken = res.body.data.accessToken;
});

afterAll(async () => {
  await Story.deleteMany({ contributor: { $exists: true } });
  await User.deleteMany({ email: 'test_stories@example.com' });
  await mongoose.disconnect();
});

describe('Stories API', () => {
  it('POST /stories — creates a story (auth required)', async () => {
    const res = await request(app)
      .post('/api/v1/stories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        content: 'Once upon a time in a Yoruba village, there lived a wise tortoise who outsmarted all the animals in the forest with his cunning and wisdom.',
        language: 'yoruba',
        knowledgeType: 'folktale',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.story._id).toBeDefined();
    storyId = res.body.data.story._id;
  });

  it('POST /stories — rejects unauthenticated request', async () => {
    const res = await request(app).post('/api/v1/stories').send({
      content: 'A test story content that is long enough to pass validation.',
      language: 'english',
    });
    expect(res.status).toBe(401);
  });

  it('POST /stories — validates minimum content length', async () => {
    const res = await request(app)
      .post('/api/v1/stories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ content: 'Too short', language: 'english' });
    expect(res.status).toBe(400);
  });

  it('GET /stories — returns published stories list', async () => {
    const res = await request(app).get('/api/v1/stories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  it('GET /stories/:id — returns story by ID', async () => {
    const res = await request(app).get(`/api/v1/stories/${storyId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.story._id).toBe(storyId);
  });

  it('GET /stories/:id — returns 404 for invalid ID', async () => {
    const res = await request(app).get('/api/v1/stories/000000000000000000000000');
    expect(res.status).toBe(404);
  });
});
