export class CursorPageMetaDto {
  readonly hasNextPage: boolean;
  readonly endCursor: string | null;

  constructor(hasNextPage: boolean, endCursor: string | null) {
    this.hasNextPage = hasNextPage;
    this.endCursor = endCursor;
  }
}
