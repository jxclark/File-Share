import { HTTPSTATUS } from '../config/http.config';
import { asyncHandler } from '../middlewares/asyncHander.middleware';
import { Request, Response } from 'express';
import { getUserAnalyticsWithChartService } from '../service/analytics.service';

export const getUserAnalyticsWithChartController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?._id;
    const { from, to } = req.query;

    const filter = {
      dateFrom: from ? new Date(from as string) : undefined,
      dateTo: from ? new Date(to as string) : undefined,
    };

    const result = await getUserAnalyticsWithChartService(userId, filter);

    return res.status(HTTPSTATUS.OK).json({
      message: 'User analytics retrieved successfully',
      ...result,
    });
  },
);
