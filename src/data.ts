import { Quad } from '@rdfjs/types';
import { RdfXmlParser } from '@vgdaut/rdfxml-streaming-parser';
import https from 'https';
import { join } from 'path';
import tar from 'tar-stream';
import bz2 from 'unbzip2-stream';
import Book from './types/book';

export default class GutenbergLoader {
    public mirrorUri = 'https://www.gutenberg.org';
    // Ignoring 90907 because this is a stub ebook without any data
    public readonly ignoredBooks = [90907];
    // True when the method synchronizeDatabase is running
    private running = false;
    // Date of the RDF files archive at the time of the last synchronization
    private lastDate = '';

    public synchronizeDatabase(): void {
        if (this.running) {
            return;
        }
        this.running = true;

        const extract = tar.extract();

        extract.on('entry', (headers, stream, next) => {
            // After reading of file is finished, call next()
            stream.on('end', next);

            if (headers.type !== 'file') {
                stream.resume();
                return;
            }

            const matches = headers.name.match(/pg([0-9]+)\.rdf/);
            if (matches?.length !== 2) {
                stream.resume();
                return;
            }

            const bookIdStr = matches[1];
            const bookId = parseInt(bookIdStr);
            if (isNaN(bookId) || this.ignoredBooks.includes(bookId)) {
                stream.resume();
                return;
            }

            const quads: Quad[] = [];

            stream
                .pipe(new RdfXmlParser({ validateUri: false }))
                .on('data', (quad: Quad) => {
                    quads.push(quad);
                })
                .on('error', err => {
                    console.error(`Cannot process a quad of ${bookIdStr}`);
                    console.error(err);
                    next();
                })
                .on('end', () => {
                    try {
                        const book = Book.fromQuads(quads);
                        // console.log(book);
                    } catch (err) {
                        console.error(`Failed to create a Book instance of ${bookIdStr}:`);
                        console.error(err);
                    }
                });
        });

        // Extraction of files finished
        extract.on('finish', () => {
            this.running = false;
        });

        https.get(join(this.mirrorUri, 'cache', 'epub', 'feeds', 'rdf-files.tar.bz2'), res => {
            const date = res.headers.date;

            if (date !== this.lastDate) {
                res.pipe(bz2()).pipe(extract);
            }

            if (typeof date === 'undefined') {
                this.lastDate = '';
            } else {
                this.lastDate = date;
            }
        });
    }

}
