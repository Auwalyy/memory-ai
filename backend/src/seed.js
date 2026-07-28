'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./features/auth/user.model');
const Story = require('./features/stories/story.model');
const Proverb = require('./features/proverbs/proverb.model');
const Chat = require('./features/chat/chat.model');
const Bookmark = require('./features/bookmarks/bookmark.model');
const Upload = require('./features/uploads/upload.model');
const KnowledgeNode = require('./features/graph/graph.node.model');
const KnowledgeEdge = require('./features/graph/graph.edge.model');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear all collections
  await Promise.all([
    User.deleteMany({}),
    Story.deleteMany({}),
    Proverb.deleteMany({}),
    Chat.deleteMany({}),
    Bookmark.deleteMany({}),
    Upload.deleteMany({}),
    KnowledgeNode.deleteMany({}),
    KnowledgeEdge.deleteMany({}),
  ]);
  console.log('Cleared existing data');

  // ── USERS ──────────────────────────────────────────────────────────────────
  const password = await bcrypt.hash('Password123!', 12);

  const [admin, contributor, judge] = await User.insertMany([
    {
      name: 'Admin User',
      email: 'admin@memoryai.ng',
      password,
      role: 'admin',
      isEmailVerified: true,
      preferredLanguage: 'english',
      bio: 'Platform administrator and indigenous knowledge curator.',
      interests: ['history', 'folktales', 'proverbs', 'culture'],
    },
    {
      name: 'Amina Bello',
      email: 'amina@memoryai.ng',
      password,
      role: 'contributor',
      isEmailVerified: true,
      preferredLanguage: 'hausa',
      bio: 'Hausa oral historian from Kano. Preserving northern Nigerian traditions.',
      interests: ['history', 'folktales', 'proverbs'],
    },
    {
      name: 'Judge Demo',
      email: 'judge@memoryai.ng',
      password,
      role: 'user',
      isEmailVerified: true,
      preferredLanguage: 'english',
      bio: 'Hackathon judge account — full access to all demo content.',
      interests: ['history', 'folktales', 'proverbs', 'culture', 'education', 'music'],
    },
  ]);
  console.log('Users created');
