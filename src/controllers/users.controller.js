import asyncHandler from "../utils/asyncHandler.js";
import sendSuccess from "../utils/response.js";
import * as userService from "../services/user.service.js";

export const getUsers = asyncHandler(async (req, res) => {
  const users = await userService.listUsers();
  sendSuccess(res, { message: "Users fetched successfully", data: users });
});

export const likeMovie = asyncHandler(async (req, res) => {
  const { id, movieId } = req.params;
  const data = await userService.likeMovie(id, movieId);
  sendSuccess(res, { message: "Movie liked successfully", data });
});

export const watchMovie = asyncHandler(async (req, res) => {
  const { id, movieId } = req.params;
  const data = await userService.watchMovie(id, movieId);
  sendSuccess(res, { message: "Movie marked as watched", data });
});

export const followUser = asyncHandler(async (req, res) => {
  const { id, targetId } = req.params;
  const data = await userService.followUser(id, targetId);
  sendSuccess(res, { message: "User followed successfully", data });
});
