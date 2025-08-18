import { Router } from 'express';
import { publicGetFileUrlController } from '../../controllers/files.controller';

const publicRoutes = Router();

publicRoutes.use('/files/:fileId/view', publicGetFileUrlController);

export default publicRoutes;
