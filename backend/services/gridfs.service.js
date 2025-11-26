import { GridFSBucket, ObjectId } from 'mongodb';
import mongoose from 'mongoose';
import { Readable } from 'stream';

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'image/webp'];
const BUCKET_NAME = 'additionalVerificationFiles';

let bucketInstance = null;

const ensureBucket = () => {
    if (bucketInstance) {
        return bucketInstance;
    }

    const connection = mongoose.connection;

    if (!connection || !connection.db) {
        throw new Error('Mongo connection not initialized');
    }

    bucketInstance = new GridFSBucket(connection.db, { bucketName: BUCKET_NAME });

    connection.once('disconnected', () => {
        bucketInstance = null;
    });

    return bucketInstance;
};

export const ALLOWED_MIME_LOOKUP = ALLOWED_MIME_TYPES.reduce((acc, type) => {
    acc[type] = true;
    return acc;
}, {});

export const uploadBufferToGridFS = ({ buffer, filename, mimetype, metadata = {} }) => {
    if (!buffer) {
        throw new Error('No buffer provided');
    }

    if (buffer.length > MAX_FILE_BYTES) {
        throw new Error('File exceeds 10MB limit');
    }

    if (!ALLOWED_MIME_LOOKUP[mimetype]) {
        throw new Error('Unsupported file type');
    }

    const bucket = ensureBucket();
    const uploadStream = bucket.openUploadStream(filename, {
        contentType: mimetype,
        metadata
    });

    return new Promise((resolve, reject) => {
        Readable.from(buffer).pipe(uploadStream)
            .on('error', reject)
            .on('finish', () => {
                resolve({
                    fileId: uploadStream.id,
                    filename,
                    size: buffer.length,
                    mimeType: mimetype
                });
            });
    });
};

export const getFileStream = (fileId) => {
    const bucket = ensureBucket();
    return bucket.openDownloadStream(new ObjectId(fileId));
};

export const deleteFileById = async (fileId) => {
    const bucket = ensureBucket();
    await bucket.delete(new ObjectId(fileId));
};

export const getFileMetadata = async (fileId) => {
    const bucket = ensureBucket();
    const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray();
    return files[0] || null;
};

