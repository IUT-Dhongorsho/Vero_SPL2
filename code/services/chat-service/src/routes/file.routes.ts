import { NextFunction, Request, Response, Router } from 'express';
import { fileController, uploadMiddleware } from '../controllers/file.controller.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

/** Turns multer's size/type rejections into a readable 400 rather than a 500. */
function handleUpload(req: Request, res: Response, next: NextFunction) {
  uploadMiddleware(req, res, (error: any) => {
    if (error) {
      const message =
        error.code === 'LIMIT_FILE_SIZE' ? 'File is larger than the 25 MB limit' : error.message;
      return res.status(400).json({ error: message });
    }
    next();
  });
}

router.post('/upload', authMiddleware, handleUpload, fileController.upload);
router.get('/:storedName', fileController.download);

export default router;
