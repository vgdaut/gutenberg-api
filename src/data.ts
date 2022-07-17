import { Dirent } from 'fs';
import fsPromises from 'fs/promises';
import { join } from 'path';
import { Quad } from '@rdfjs/types';
import { RdfXmlParser } from 'rdfxml-streaming-parser';
import Book from './types/book';

const rdfFilesPath = '/home/user/Downloads/rdf-files/cache/epub';

// fs.createReadStream(join(rdfFilesPath, '1', 'pg1.rdf'))
//     .pipe(rdfParser)
//     .on('data', console.log)
//     .on('error', console.error)
//     .on('end', () => console.log('All triples were parsed!'));

fsPromises.opendir(rdfFilesPath)
    .then(async dir => {
        for await (const dirent of dir) {
            const entryId = parseInt(dirent.name);
            if (dirent.isDirectory() && !isNaN(entryId) && entryId > 0) { // is a valid entry
                // if (dirent.name !== '100') continue;
                processDirent(dirent);
                // break;
            }
        }
    });

async function processDirent(dirent: Dirent): Promise<void> {
    const entryIdStr = dirent.name;
    const entryRdfPath = join(rdfFilesPath, entryIdStr, `pg${entryIdStr}.rdf`);

    const stats = await fsPromises.stat(entryRdfPath);
    if (!stats.isFile()) {
        return;
    }
    
    const quads: Quad[] = [];

    const fileHandle = await fsPromises.open(entryRdfPath);
    fileHandle.createReadStream()
        .pipe(new RdfXmlParser())
        .on('data', (quad: Quad) => {
            quads.push(quad);
        })
        .on('error', console.error)
        .on('end', () => {
            const book = Book.fromQuads(quads);
            // Book.fromQuads also performs Creator.fromQuadsMultiple
            // Thus, we can use book.creators
            const creators = book.creators;
            console.log({book});
        });

}