const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { ObjectId } = require('mongodb');
const mime = require('mime-types');
const Bull = require('bull');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

const fileQueue = new Bull('fileQueue');

class FilesController {
  static async postUpload(req, res) {
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

    const {
      name, type, parentId = '0', isPublic = false, data,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId !== '0') {
      const parentFile = await dbClient.getFileById(parentId);
      if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
      if (parentFile.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    const fileData = {
      userId: ObjectId(userId),
      name,
      type,
      isPublic,
      parentId: parentId === '0' ? '0' : ObjectId(parentId),
      localPath: null,
    };

    if (type === 'folder') {
      const resp = await dbClient.createFile(fileData);
      return res.status(201).json(resp.ops[0]);
    }

    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const localPath = path.join(folderPath, uuidv4());
    fs.writeFileSync(localPath, Buffer.from(data, 'Base64'));
    fileData.localPath = localPath;

    const resp = await dbClient.createFile(fileData);

    if (type === 'image') {
      fileQueue.add({ userId: userId.toString(), fileId: resp.ops[0]._id.toString() });
    }

    return res.status(201).json(resp.ops[0]);
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const fileDoc = await dbClient.db.collection('files').findOne({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });

    if (!fileDoc) {
      return res.status(404).json({ error: 'Not found' });
    }

    return res.status(200).json(fileDoc);
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parentIdParam = req.query.parentId || '0';
    const page = parseInt(req.query.page, 10) || 0;
    const pageSize = 20;
    const pageSkip = page * pageSize;

    const parentId = parentIdParam === '0' ? '0' : ObjectId(parentIdParam);

    const files = await dbClient.db.collection('files').aggregate([
      { $match: { userId: ObjectId(userId), parentId } },
      { $skip: pageSkip },
      { $limit: pageSize },
    ]).toArray();

    return res.status(200).json(files);
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const fileDoc = await dbClient.db.collection('files').findOne({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });

    if (!fileDoc) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.db.collection('files').updateOne(
      { _id: ObjectId(fileId) },
      { $set: { isPublic: true } },
    );

    const updateFileDoc = await dbClient.db.collection('files').findOne({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });

    return res.status(200).json(updateFileDoc);
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const fileId = req.params.id;
    const fileDoc = await dbClient.db.collection('files').findOne({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });

    if (!fileDoc) {
      return res.status(404).json({ error: 'Not found' });
    }

    await dbClient.db.collection('files').updateOne(
      { _id: ObjectId(fileId) },
      { $set: { isPublic: false } },
    );

    const updateFileDoc = await dbClient.db.collection('files').findOne({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });

    return res.status(200).json(updateFileDoc);
  }

  static async getFile(req, res) {
    const token = req.headers['x-token'];
    const fileId = req.params.id;
    const size = req.query.size;

    const fileDoc = await dbClient.db.collection('files').findOne({
      _id: ObjectId(fileId),
    });

    if (!fileDoc) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!fileDoc.isPublic) {
      if (!token) {
        return res.status(404).json({ error: 'Not found' });
      }

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId || fileDoc.userId.toString() !== userId.toString()) {
        return res.status(404).json({ error: 'Not found' });
      }
    }

    if (fileDoc.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }
    
    const filePath = size ? `${fileDoc.localPath}_${size}` : fileDoc.localPath;

    if (!fs.existsSync(fileDoc.localPath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const mimeType = mime.lookup(fileDoc.name);
    res.setHeader('Content-Type', mimeType);
    const fileStream = fs.createReadStream(filePath);
    // const fileContent = fs.readFileSync(fileDoc.localPath);
    // return res.status(200).json(fileContent);
    fileStream.pipe(res);
  }
}

module.exports = FilesController;
