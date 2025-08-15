import { Router } from 'express';
import authRoutes from './auth.route';

const internalRoutes = Router();

internalRoutes.use('/auth', authRoutes);

export default internalRoutes;
