import mongoose from 'mongoose';
import {
  LoginSchemaType,
  RegisterSchemaType,
} from '../validators/auth.validator';
import UserModel from '../models/user.models';
import { UnauthorizedException } from '../utils/app-error';
import StorageModel from '../models/storage.model';
import { logger } from '../utils/logger';
import { signJwtToken } from '../utils/jwt';

export const registerService = async (body: RegisterSchemaType) => {
  const { email } = body;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const existingUser = await UserModel.findOne({ email }).session(session);

      if (existingUser) {
        throw new UnauthorizedException('User with this email already exists');
      }

      const newUser = new UserModel({
        ...body,
        profilePicture: body.profilePicture || '',
      });

      await newUser.save({ session });

      const storage = new StorageModel({
        userId: newUser._id,
      });

      await storage.save({ session });

      return { user: newUser.omitPassword() };
    });
  } catch (error) {
    logger.error('Error during user registration:', error);
    throw error;
  } finally {
    await session.endSession();
  }
};

export const loginService = async (body: LoginSchemaType) => {
  const { email, password } = body;
  const user = await UserModel.findOne({ email });
  if (!user) throw new UnauthorizedException('Invalid email or password');

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new UnauthorizedException('Invalid email or password');
  }

  const { token, expiresAt } = signJwtToken({
    userId: user.id,
  });

  return {
    user: user.omitPassword(),
    accessToken: token,
    expiresAt,
  };
};
