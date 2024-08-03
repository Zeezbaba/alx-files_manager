const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AppController {
  static async getStatus(req, res) {
    if (redisClient.isAlive() && dbClient.isAlive()) {
      res.status(200).json({ redis: true, db: true });
    }
  }

  static async getStats(req, res) {
    const numUser = await dbClient.nbUsers();
    const numFile = await dbClient.nbFiles();
    res.status(200).json({ users: numUser, files: numFile });
  }
}

module.exports = AppController;
