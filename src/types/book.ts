import { Quad } from "@rdfjs/types";
import { pgTermToUri, pgTerm, dcTermToUri } from "./typeutils";
import Creator from "./creator";
import Format from "./format";

export default class Book {
    public readonly id: number;
    public readonly title: string;
    public readonly type: string;
    public readonly formats: Format[];
    public readonly bookshelves: string[];
    public readonly downloadCount: number; // counts number of recent downloads
    public readonly issued: Date;
    public readonly creators: Creator[];
    public readonly language: string;
    public readonly description: string;
    public readonly rights: string;

    constructor(
        id: number, 
        title: string, 
        type: string, 
        formats: Format[], 
        bookshelves: string[], 
        downloadCount: number, 
        issued: Date, 
        creators: Creator[], 
        language: string, 
        description: string, 
        rights: string
    ) {
        this.id = id;
        this.title = title;
        this.type = type;
        this.formats = formats;
        this.bookshelves = bookshelves;
        this.downloadCount = downloadCount;
        this.issued = issued;
        this.creators = creators;
        this.language = language;
        this.description = description;
        this.rights = rights;
    }

    public static fromQuads(quads: Quad[]): Book {
        function extractBookId() {
            const regex = /gutenberg\.org\/ebooks\/(\d+)$/; // matches ebook id in URI
            const quad = quads.find((quad: Quad) => quad.subject.value.match(regex));
            const idStrOrUndefined = quad?.subject.value.match(regex)?.at(1);
            if (typeof idStrOrUndefined === 'undefined') {
                throw new Error('Invalid quad list');
            } else {
                return parseInt(idStrOrUndefined);
            }
        }
        const bookId = extractBookId();

        const bookUri = `http://www.gutenberg.org/ebooks/${bookId}`;

        function selectQuads(subject: (subjectStr: string) => boolean, predicate: (predicateStr: string) => boolean): Quad[] {
            return quads.filter(quad => subject(quad.subject.value) && predicate(quad.predicate.value));
        }
        function selectQuadsAndEnsureNonEmpty(subject: (subjectStr: string) => boolean, predicate: (predicateStr: string) => boolean): Quad[] {
            const result = selectQuads(subject, predicate);
            if (result.length === 0) {
                throw new Error('Invalid quad list');
            }
            return result;
        }
        
        function selectQuadsByUriAndPgTerm(pgTerm: string): Quad[] {
            return selectQuads(s => s === bookUri, p => p === pgTermToUri(pgTerm));
        }
        function selectQuadsByUriAndDcTerm(pgTerm: string): Quad[] {
            return selectQuads(s => s === bookUri, p => p === dcTermToUri(pgTerm));
        }
        function selectQuadsByUriAndDcTermAndEnsureNonEmpty(pgTerm: string): Quad[] {
            return selectQuadsAndEnsureNonEmpty(s => s === bookUri, p => p === dcTermToUri(pgTerm));
        }

        let result: Quad[];

        result = selectQuadsByUriAndDcTermAndEnsureNonEmpty('title');
        const bookTitle = result[0].object.value;

        result = selectQuadsAndEnsureNonEmpty(s => s === bookUri, p => !!p.match('#type'));
        const bookType = pgTerm(result[0].object.value);

        result = selectQuads(s => s === bookUri, p => p === dcTermToUri('hasFormat'));
        const bookFormats = result.map(formatQuad => {
            const formatUri = formatQuad.object.value;

            let internalResult: Quad[];
            internalResult = selectQuadsAndEnsureNonEmpty(s => s === formatUri, p => p === dcTermToUri('format'));
            const mimeTypeAddress = internalResult[0].object.value;

            internalResult = selectQuadsAndEnsureNonEmpty(s => s === mimeTypeAddress, p => !!p.match('#value'));
            const formatMimetype = internalResult[0].object.value;

            return new Format(formatUri, formatMimetype);
        });

        result = selectQuadsByUriAndPgTerm('bookshelf');
        const bookshelfAddresses = result.map(q => q.object.value);
        const quadsRelatedToBookshelves = quads.filter(quad => bookshelfAddresses.includes(quad.subject.value));
        const bookBookshelves = bookshelfAddresses.map(address => {
            const internalResult = quadsRelatedToBookshelves.find(quad => quad.subject.value === address && quad.predicate.value.match('#value'));
            if (typeof internalResult === 'undefined') {
                throw new Error('Bookshelf information is invalid in RDF');
            }
            return internalResult.object.value;
        });

        result = selectQuadsByUriAndPgTerm('downloads');
        const bookDownloadCount = result.length > 0 ? parseInt(result[0].object.value) : 0;

        result = selectQuadsByUriAndPgTerm('issued');
        const bookIssued = result.length > 0 ? new Date(result[0].object.value) : new Date(0);

        result = selectQuadsByUriAndPgTerm('creator');
        const bookCreators = Creator.fromQuadsMultiple(quads);

        result = selectQuadsByUriAndPgTerm('language');
        let bookLanguage: string;
        if (result.length > 0) {
            const languageAddress = result[0].object.value;
            const internalResult = selectQuadsAndEnsureNonEmpty(s => s === languageAddress, p => !!p.match('#value'));
            bookLanguage = internalResult[0].object.value;
        } else {
            bookLanguage = 'en';
        }

        result = selectQuadsByUriAndDcTerm('description');
        const bookDescription = result.length > 0 ? result[0].object.value : '';

        result = selectQuadsByUriAndPgTerm('rights');
        // In case of absent rights field, use the book URI instead
        // This default was chosen because it is the simplest and the most legal fallback value
        // That, in all cases, avoids license misappropriation 
        const bookRights = result.length > 0 ? result[0].object.value : bookUri;

        return new Book(
            bookId,
            bookTitle,
            bookType,
            bookFormats,
            bookBookshelves,
            bookDownloadCount,
            bookIssued,
            bookCreators,
            bookLanguage,
            bookDescription,
            bookRights
        );
    } 
}