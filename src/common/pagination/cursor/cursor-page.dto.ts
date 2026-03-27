import { CursorPageMetaDto } from './cursor-page-meta.dto';

export class CursorPageDto<T> {
  readonly data: T[];
  readonly meta: CursorPageMetaDto;

  constructor(data: T[], meta: CursorPageMetaDto) {
    this.data = data;
    this.meta = meta;
  }
}
