import { Router } from "express";
import { followUser, getUsers, likeMovie, watchMovie } from "../controllers/users.controller.js";
import { validate } from "../middleware/validate.js";
import {
  followParamsSchema,
  likeParamsSchema,
  watchParamsSchema,
} from "../validators/user.validator.js";

const router = Router();

router.get("/", getUsers);
router.post("/:id/like/:movieId", validate(likeParamsSchema, "params"), likeMovie);
router.post("/:id/watch/:movieId", validate(watchParamsSchema, "params"), watchMovie);
router.post("/:id/follow/:targetId", validate(followParamsSchema, "params"), followUser);

export default router;
