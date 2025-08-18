import { Request, Response } from "express";
import { asyncHandler } from "../middlewares/asyncHander.middleware";
import { UploadSourceEnum } from "../models/file.model";
import { HTTPSTATUS } from "../config/http.config";
import { uploadFilesService } from "../service/files.service";


export const uploadFilesViaWebController = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const files = req.files as Express.Multer.File[]
    const uploadedVia = UploadSourceEnum.WEB

    const results = await uploadFilesService(userId, files, uploadedVia)

    return res.status(HTTPSTATUS.OK).json({
        message: "Files uploaded successfully",
        data: results
    })
})