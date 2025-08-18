import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import FileModel, { UploadSourceEnum } from '../models/file.model';
import UserModel from '../models/user.models';
import {
  BadRequestException,
  InternalServerException,
  NotFoundException,
  UnauthorizedException,
} from '../utils/app-error';
import { sanitizeFilename } from '../utils/helper';
import { logger } from '../utils/logger';
import { Env } from '../config/env.config';
import { s3 } from '../config/aws-s3.config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const uploadFilesService = async (
  userId: string,
  files: Express.Multer.File[],
  uploadedVia: keyof typeof UploadSourceEnum,
) => {
  const user = await UserModel.findOne({ _id: userId });
  if (!user) throw new UnauthorizedException('Unauthorized access');
  if (!files?.length) throw new BadRequestException('No files provided');

  const results = await Promise.allSettled(
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
  const successfulRes = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value);

  const failedRes = results
    .filter((r) => r.status === 'rejected')
    .map((r) => r.reason.message);

  if (failedRes.length > 0) {
    logger.error('Failed to upload file(s)', files);
    throw new InternalServerException(
      `Failed to upload ${failedRes.length} out of ${files.length} files`,
    );
  }

  return {
    message: `Uploaded successfully ${successfulRes.length} out of ${files.length}`,
    data: successfulRes,
  };
};

export const getAllFilesService = async (
  userId: string,
  filter: { keyword?: string },
  pagination: { pageSize: number; pageNumber: number },
) => {
  const { keyword } = filter;

  const filterConditions: Record<string, any> = {
    userId,
  };

  if (keyword) {
    filterConditions.$or = [
      { originalName: { $regex: keyword, $options: 'i' } },
    ];
  }
  const { pageSize, pageNumber } = pagination;
  const skip = (pageNumber - 1) * pageSize;

  const [files, totalCount] = await Promise.all([
    FileModel.find(filterConditions)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize),
    FileModel.countDocuments(filterConditions),
  ]);

  const filesWithUrls = await Promise.all(
    files.map(async (file) => {
      const url = await getFileFromS3({
        storageKey: file.storageKey,
        mimeType: file.mimeType,
        expiresIn: 3600, // 1 hour
      });
      return {
        ...file.toObject(),
        url,
        storageKey: undefined, // Exclude storageKey from response
      };
    }),
  );

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    file: filesWithUrls,
    pagination: {
      pageSize,
      pageNumber,
      totalCount,
      totalPages,
      skip,
    },
  };
};

export const getFileUrlService = async (fileId: string) => {
  const file = await FileModel.findOne({ _id: fileId });
  if (!file) throw new NotFoundException('File not found');

  const url = await getFileFromS3({
    storageKey: file.storageKey,
    expiresIn: 3600, // 1 hour
    mimeType: file.mimeType,
  });

  return { url };
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

async function getFileFromS3({
  storageKey,
  expiresIn = 60,
  filename,
  mimeType,
}: {
  storageKey: string;
  expiresIn?: number;
  filename?: string;
  mimeType?: string;
}) {
  try {
    const command = new GetObjectCommand({
      Bucket: Env.AWS_S3_BUCKET,
      Key: storageKey,
      ...(!filename && {
        ResponseContentType: mimeType,
        ResponseContentDisposition: `inline`,
      }),
      ...(filename && {
        ResponseContentDisposition: `attachment; filename="${filename}"`,
      }),
    });
    return await getSignedUrl(s3, command, { expiresIn });
  } catch (error) {
    logger.error('Failed to get file from S3', storageKey);
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
