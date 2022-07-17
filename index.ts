import { MongoClient } from 'mongodb';
import app from './src/app';

const mongoUrl = 'mongodb://localhost:27017/';
const port = 8000;

async function main() {
    const client = new MongoClient(mongoUrl);
    try {
        await client.connect();
        await client.db('gutenberg').command({ ping: 1 });
    } finally {
        console.log('Connected to MongoDB database');
    }

    app.listen(port, () => {
        console.log(`Listening on port ${port}`);
    });
}

main();