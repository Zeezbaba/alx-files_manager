const { MongoClient, ObjectId } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'file_manager';
    const url = `mongodb://${host}:${port}`;
    this.connected = false;

    // console.log(`Attempting to connect to MongoDB at ${url} and database ${database}`);
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect()
      .then(() => {
        this.db = this.client.db(database);
        this.connected = true;
        // console.log('Connected to MongoDB');
      })
      .catch((errMsg) => {
        console.error('Error connecting to MongoDB:', errMsg);
      });
  }

  isAlive() {
    return this.connected;
  }

  async nbUsers() {
    const userNumber = await this.db.collection('users').countDocuments();
    return userNumber;
  }

  async nbFiles() {
    const fileNumber = await this.db.collection('files').countDocuments();
    return fileNumber;
  }

  async findUserByEmailAndPassword(email, password) {
    const resp = await this.db.collection('users').findOne({ email, password });
    return resp;
  }

  async getUserById(id) {
    try {
      if (!this.connected) throw new Error('Not connected to DB');
      console.log(`getUserById: Received ID: ${id}`);
      if (!ObjectId.isValid(id)) {
        console.log(`Invalid ID format: ${id}`);
        throw new Error('Invalid ID format');
      }
      const _id = new ObjectId(id);
      const user = await this.db.collection('users').findOne({ _id });
      return user;
    } catch (error) {
      console.error('Error in getUserById:', error);
      throw error;
    }
  }

  async getUserByEmail(email) {
    return this.db.collection('users').findOne({ email });
  }

  async createUser(email, password) {
    const result = await this.db.collection('users').insertOne({ email, password });
    return result.ops[0];
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
