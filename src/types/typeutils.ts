// Generate purl.org URI from term string
export function dcTermToUri(term: string): string {
    return `http://purl.org/dc/terms/${term}`;
}

export function pgTermToUri(term: string): string {
    return `http://www.gutenberg.org/2009/pgterms/${term}`;
}

export function pgTerm(uri: string): string {
    const matches = uri.match(/\/(\w+)$/);
    const term = matches?.[1];
    if (!term) {
        throw new Error('Cannot parse pgTerm');
    }
    return term;
}