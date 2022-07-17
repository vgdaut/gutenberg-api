export default class Format {
    public readonly uri: string; // URI that leads to the file on Gutenberg's server
    public readonly mimeType: string;
    constructor(uri: string, mimeType: string) {
        this.uri = uri;
        this.mimeType = mimeType;
    }
}