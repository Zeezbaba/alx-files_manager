const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'file_manager';
    const url = `mongodb://${host}:${port}`;

    this.client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
    this.connected = false;

    this.client.connect()
      .then(() => {
        this.db = this.client.db(database);
        this.connected = true;
      })
      .catch((errMsg) => {
        console.error('MongoDB connection error:', errMsg);
      });
  }

  isAlive() {
    return this.connected;
  }

  async nbUsers() {
    if (!this.connected) {
      throw new Error('MongoDB not connected');
    }
    const userNumber = await this.db.collection('users').countDocuments();
    return userNumber;
  }

  async nbFiles() {
    if (!this.connected) {
      throw new Error('MongoDB not connected');
    }
    const fileNumber = await this.db.collection('files').countDocuments();
    return fileNumber;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
