import asyncHandler from "../utils/asyncHandler.js";
import sendSuccess from "../utils/response.js";
import * as recommendationService from "../services/recommendation.service.js";

export const getRecommendations = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit } = req.validatedQuery;
  const data = await recommendationService.getRecommendations(userId, limit);
  sendSuccess(res, { message: "Recommendations generated successfully", data });
});

export const explainRecommendation = asyncHandler(async (req, res) => {
  const { userId, movieId } = req.params;
  const data = await recommendationService.explainRecommendation(userId, movieId);
  sendSuccess(res, { message: "Recommendation explanation generated successfully", data });
});
