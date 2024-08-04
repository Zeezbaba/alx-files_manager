const crypto = require('crypto');
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

    const userExistence = await dbClient.db.collection('users').findOne({ email });
    if (userExistence) {
      return res.status(400).json({ error: 'Already exists' });
    }

    const passwdHash = crypto.createHash('sha1').update(password).digest('hex');
    const newUser = { email, password: passwdHash };

    const saveNewUser = await dbClient.db.collection('users').insertOne(newUser);
    return res.status(201).json({ id: saveNewUser.insertedId, email: newUser.email });
  }
}

module.exports = UsersController;
