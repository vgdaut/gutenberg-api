import { MongoClient } from 'mongodb';
import app from './src/app';
import GutenbergLoader from './src/data';

const mongoUrl = 'mongodb://localhost:27017/mainDb';
const port = 8000;

main();

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

    const loader = new GutenbergLoader();
    loader.synchronizeDatabase();
    // Run the method every hour afterwards
    setInterval(() => {
        loader.synchronizeDatabase();
    }, 3600);
}
