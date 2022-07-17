import express from 'express';

const app: express.Express = express();

// List of routers
// app.use()

// Default error 404
app.use((_req, res) => {
    res.status(404).json({
        error: {
            code: 404,
        }
    });
});

export default app;