// sharp-phash ships no bundled type declarations. Minimal ambient types for
// the two entry points actually used (TradesService's duplicate-image
// check): the main hash function and its companion Hamming-distance helper.
declare module 'sharp-phash' {
  function phash(input: Buffer): Promise<string>;
  export default phash;
}

declare module 'sharp-phash/distance' {
  function distance(hashA: string, hashB: string): number;
  export default distance;
}
