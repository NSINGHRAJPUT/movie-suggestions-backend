import { Router } from "express";
import {
  explainRecommendation,
  getRecommendations,
} from "../controllers/recommendations.controller.js";
import { validate } from "../middleware/validate.js";
import {
  explainParamsSchema,
  recommendationQuerySchema,
  userIdParamsSchema,
} from "../validators/recommendation.validator.js";

const router = Router();

router.get(
  "/explain/:userId/:movieId",
  validate(explainParamsSchema, "params"),
  explainRecommendation,
);
router.get(
  "/:userId",
  validate(userIdParamsSchema, "params"),
  validate(recommendationQuerySchema, "query"),
  getRecommendations,
);

export default router;
