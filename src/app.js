import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import graphRoutes from "./routes/graph.routes.js";
import moviesRoutes from "./routes/movies.routes.js";
import recommendationsRoutes from "./routes/recommendations.routes.js";
import usersRoutes from "./routes/users.routes.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ success: true, message: "CineGraph API is running" });
});

app.use("/api/movies", moviesRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/recommendations", recommendationsRoutes);
app.use("/api/graph", graphRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
