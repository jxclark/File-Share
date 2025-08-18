import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import FileModel, { UploadSourceEnum } from '../models/file.model';
import UserModel from '../models/user.models';
import { BadRequestException, UnauthorizedException } from '../utils/app-error';
import { sanitizeFilename } from '../utils/helper';
import { logger } from '../utils/logger';
import { Env } from '../config/env.config';
import { s3 } from '../config/aws-s3.config';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

export const uploadFilesService = async (
  userId: string,
  files: Express.Multer.File[],
  uploadedVia: keyof typeof UploadSourceEnum,
) => {
  const user = await UserModel.findOne({ _id: userId });
  if (!user) throw new UnauthorizedException('Unauthorized access');
  if (!files?.length) throw new BadRequestException('No files provided');

  const results = await Promise.all(
    files.map(async (file) => {
      let _storageKey: string | null = null;
      try {
        const { storageKey } = await uploadToS3(file, userId);
        _storageKey = storageKey;
        const createdFile = await FileModel.create({
          userId,
          storageKey,
          originalName: file.originalname,
          uploadVia: uploadedVia,
          size: file.size,
          ext: path.extname(file.originalname)?.slice(1)?.toLowerCase(),
          url: '',
          mimeType: file.mimetype,
        });

        return {
          fileId: createdFile._id,
          originalName: createdFile.originalName,
          size: createdFile.size,
          ext: createdFile.ext,
          mimeType: createdFile.mimeType,
        };
      } catch (error) {
        logger.error('AWS3 Failed to upload file', error);
        if (_storageKey) {
          // delete from s3 bucket
        }
      }
    }),
  );
  return results;
};

async function uploadToS3(
  file: Express.Multer.File,
  userId: string,
  meta?: Record<string, string>,
) {
  try {
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);

    const cleanName = sanitizeFilename(basename).substring(0, 64);

    logger.info(sanitizeFilename(basename), cleanName);

    const storageKey = `users/${userId}/${uuidv4()}-${cleanName}{$ext}`;

    const command = new PutObjectCommand({
      Bucket: Env.AWS_S3_BUCKET,
      Key: storageKey,
      Body: file.buffer,
      ...(meta && { Metadata: meta }),
    });

    await s3.send(command);

    //   const url = `https://${Env.AWS_S3_BUCKET}.s3.${Env.AWS_REGION}.amazonaws.com/${storageKey}`;

    return {
      storageKey,
    };
  } catch (error) {
    logger.error('AWS Failed to upload file', error);
    throw error;
  }
}

async function deleteFromS3(storageKey: string) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: Env.AWS_S3_BUCKET,
      Key: storageKey,
    });
    await s3.send(command);
  } catch (error) {
    logger.error('AWS Failed to delete file', storageKey);
    throw error;
  }
}
