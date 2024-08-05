// const crypto = require('crypto');
const sha1 = require('sha1');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const userExistence = await dbClient.getUserByEmail(email);
    if (userExistence) {
      return res.status(400).json({ error: 'Already exists' });
    }

    // const passwdHash = crypto.createHash('sha1').update(password).digest('hex');
    // const newUser = { email, password: passwdHash };

    const passwdHash = sha1(password);
    const newUser = await dbClient.createUser(email, passwdHash);

    // const saveNewUser = await dbClient.db.collection('users').insertOne(newUser);
    return res.status(201).json({ id: newUser._id, email: newUser.email });
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient.getUserById(userId);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ id: user._id, email: user.email });
  }
}

module.exports = UsersController;
