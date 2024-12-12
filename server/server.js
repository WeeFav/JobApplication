import express from "express";
import cors from "cors";
import jobs from "./jobs.json" with { type: "json" };

const app = express();
const corsOptions = {
    origin: ["http://localhost:5000"],
};

// Use CORS Middleware
app.use(cors(corsOptions));

app.get('/', (req, res) => {
    res.json(jobs);
});

app.listen(8000, () => {
    console.log("Server started at port 8000");
});