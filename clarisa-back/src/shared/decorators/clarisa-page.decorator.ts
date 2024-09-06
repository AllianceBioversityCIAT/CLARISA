import { SetMetadata } from '@nestjs/common';

export const IS_CLARISA_PAGE = 'isCLARISAPage';
export const ClarisaPageOnly = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(IS_CLARISA_PAGE, true);
