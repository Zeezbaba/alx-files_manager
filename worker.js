const Bull = require('bull');
const { ObjectId } = require('mongodb');
const imageThumbnail = require('image-thumbnail');
const fs = require('fs');
// const path = require('path');
const dbClient = require('./utils/db');
// const { error } = require('console');

const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

  if (!fileId) {
    throw new Error('Missing fileId');
  }

  if (!userId) {
    throw new Error('Missing userId');
  }

  const fileDoc = await dbClient.db.collection('files').findOne({
    _id: ObjectId(fileId),
    userId: ObjectId(userId),
  });

  if (!fileDoc) {
    throw new Error('File not found');
  }

  const widthSize = [500, 250, 100];
  const filePath = fileDoc.localPath;

  //   for (const size of widthSize) {
  //     const thumbnail = await imageThumbnail(filePath, { width: size });
  //     const thumbnailPath = `${filePath}_${size}`;
  //     fs.writeFileSync(thumbnailPath, thumbnail);
  //   }

  const generateThumbnails = widthSize.map(async (size) => {
    const thumbnail = await imageThumbnail(filePath, { width: size });
    const thumbnailPath = `${filePath}_${size}`;
    fs.writeFileSync(thumbnailPath, thumbnail);
  });

  await Promise.all(generateThumbnails);
});
