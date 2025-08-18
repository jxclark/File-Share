import { Router } from 'express';
import authRoutes from './auth.route';
import filesRoutes from './files.route';
import { passportAuthenticateJwt } from '../../config/passport.config';

const internalRoutes = Router();

internalRoutes.use('/auth', authRoutes);
internalRoutes.use('/files', passportAuthenticateJwt, filesRoutes);

export default internalRoutes;
