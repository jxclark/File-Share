import { Router } from 'express';

import { multiUpload } from '../../config/multer.confug';
import { uploadFilesViaWebController } from '../../controllers/files.controller';
import { CheckStorageAvailability } from '../../middlewares/check-storage.middleware';

const filesRoutes = Router();

filesRoutes.post(
  '/upload',
  multiUpload,
  CheckStorageAvailability,
  uploadFilesViaWebController,
);

export default filesRoutes;
