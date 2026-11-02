const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const authRouter = require("./routes/auth.routes");
const accountRouter = require("./routes/account.routes");
const transactionRoutes = require("./routes/transaction.routes");

const app = express();

const allowedOrigins = [
    process.env.CLIENT_ORIGIN,
    "http://localhost:5173",
    "http://localhost:3000"
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app") || process.env.NODE_ENV !== "production") {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
    res.json({
        status: "online",
        service: "Apex Horizon Double-Entry Banking & Ledger Service",
        timestamp: new Date().toISOString()
    });
});

app.use("/api/auth", authRouter);
app.use("/api/accounts", accountRouter);
app.use("/api/transactions", transactionRoutes);

// Fallback alias directly without /api prefix to support all baseURL variants
app.use("/auth", authRouter);
app.use("/accounts", accountRouter);
app.use("/transactions", transactionRoutes);

// Catch-all 404 for unmapped API endpoints
app.use((req, res) => {
    res.status(404).json({
        message: `Endpoint ${req.method} ${req.originalUrl} not found`
    });
});

// Centralized error handler
app.use((err, req, res, next) => {
    console.error("Unhandled Application Error:", err);
    res.status(err.status || 500).json({
        message: err.message || "Internal server error occurred"
    });
});

module.exports = app;
