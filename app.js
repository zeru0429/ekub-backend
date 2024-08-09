import express from "express";
import { HOST, PORT } from "./src/config/secrets.js";
import appRoute from "./src/route/index.js";
import cors from "cors";
const app = express();

const corsOptions = {
  origin: true,
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());

app.use(express.urlencoded({ extended: true }));
app.use("/api", appRoute);

app.get("/", (req, res) => {
  const options = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    day: "2-digit",
    month: "short",
    year: "numeric",
  };

  const date = new Date();
  const formattedDate = date.toLocaleString("en-US", options);

  res.send(`<h1>${formattedDate}</h1>`);
});

app.listen(PORT, HOST, () => {
  console.log(`Server is running at http://${HOST}:${PORT}`);
});
