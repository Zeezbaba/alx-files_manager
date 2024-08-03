const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'file_manager';
    const url = `mongodb://${host}:${port}`;
    this.connected = false;

    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect()
      .then(() => {
        this.db = this.client.db(database);
      })
      .catch((errMsg) => {
        console.error(errMsg);
      });
  }

  isAlive() {
    // const resp = this.client && this.client.topology && this.client.topology.isConnected();
    const resp = this.client.isConnected();
    return resp;
  }

  async nbUsers() {
    const userNumber = this.db.collection('users').countDocuments();
    return userNumber;
  }

  async nbFiles() {
    const fileNumber = this.db.collection('files').countDocuments();
    return fileNumber;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
