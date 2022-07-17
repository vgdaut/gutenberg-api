import { Quad } from "@rdfjs/types";
import { dcTermToUri, pgTermToUri } from "./typeutils";

export default class Creator {
    // RDF files refer to creators in a strange way
    // For example, Thomas Jefferson has address "http://www.gutenberg.org/2009/agents/1638"
    // id is a derivative of such an address: 1638
    public readonly id: number;
    public readonly name: string;
    public readonly birthYear: number | undefined;
    public readonly deathYear: number | undefined;
    public readonly webpage: string | undefined;

    get address(): string {
        return `http://www.gutenberg.org/2009/agents/${this.id}`;
    }

    constructor(
        id: number,
        name: string,
        birthYear: number | undefined, 
        deathYear: number | undefined, 
        webpage: string | undefined
    ) {
        this.id = id;
        this.name = name;
        this.birthYear = birthYear;
        this.deathYear = deathYear;
        this.webpage = webpage;
    }

    public static fromQuadsMultiple(quads: Quad[]): Creator[] {
        function selectQuads(subject: (subjectStr: string) => boolean, predicate: (predicateStr: string) => boolean): Quad[] {
            return quads.filter(quad => subject(quad.subject.value) && predicate(quad.predicate.value));
        }
        
        function selectQuadsByDcTerm(pgTerm: string): Quad[] {
            return selectQuads(() => true, p => p === dcTermToUri(pgTerm));
        }

        const creatorQuads = selectQuadsByDcTerm('creator');
        const creatorAddresses = creatorQuads.map(quad => quad.object.value);
        // We will have a little more filters in this method so we need to filter out all useless quads
        const creatorQuadsFiltered = quads.filter(quad => creatorAddresses.includes(quad.subject.value));
        const creators = creatorAddresses.map(address => {
            function selectQuadsByAddressAndPgTerm(pgTerm: string): Quad[] {
                return creatorQuadsFiltered.filter(quad => quad.subject.value === address && quad.predicate.value === pgTermToUri(pgTerm));
            }

            const matches = address.match(/(\d+)$/);
            if (!matches || matches.length === 0) {
                throw new Error('Invalid creator address in RDF');
            }
            const creatorId = parseInt(matches[1]);

            let result: Quad[];
            result = selectQuadsByAddressAndPgTerm('name');
            if (result.length === 0) {
                throw new Error('Unable to find creator\'s name in RDF');
            }
            const creatorName = result[0].object.value;
            
            result = selectQuadsByAddressAndPgTerm('birthdate');
            let creatorBirthYear: number | undefined;
            if (result.length > 0) {
                const birthDateStr = result[0].object.value;
                const birthDate = parseInt(birthDateStr);
                if (!isNaN(birthDate)) {
                    creatorBirthYear = birthDate;
                }
            }

            result = selectQuadsByAddressAndPgTerm('deathdate');
            let creatorDeathYear: number | undefined;
            if (result.length > 0) {
                const deathDateStr = result[0].object.value;
                const deathDate = parseInt(deathDateStr);
                if (!isNaN(deathDate)) {
                    creatorDeathYear = deathDate;
                }
            }

            result = selectQuadsByAddressAndPgTerm('webpage');
            const creatorWebpage = result?.[0]?.object?.value;

            return new Creator(creatorId, creatorName, creatorBirthYear, creatorDeathYear, creatorWebpage);
        });

        return creators;
    }
}