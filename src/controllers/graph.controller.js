import asyncHandler from "../utils/asyncHandler.js";
import sendSuccess from "../utils/response.js";
import * as graphService from "../services/graph.service.js";

export const getMovieGraph = asyncHandler(async (req, res) => {
  const data = await graphService.buildMovieGraph(req.params.id);
  sendSuccess(res, { message: "Movie graph fetched successfully", data });
});

export const getUserGraph = asyncHandler(async (req, res) => {
  const data = await graphService.buildUserGraph(req.params.id);
  sendSuccess(res, { message: "User graph fetched successfully", data });
});

export const getShortestPath = asyncHandler(async (req, res) => {
  const { sourceId, targetId } = req.params;
  const data = await graphService.buildShortestPathGraph(sourceId, targetId);
  sendSuccess(res, { message: "Shortest path computed successfully", data });
});
