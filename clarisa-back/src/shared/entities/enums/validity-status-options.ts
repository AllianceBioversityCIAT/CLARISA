/**
 * Optional filter over the validity period of a catalogue entry.
 *
 * Filtering by VALUE and not by a boolean flag is deliberate: a boolean has
 * exactly two states forever, so the day a third one is needed (an entry
 * withdrawn because it was created by mistake, say) the only options would be
 * a second query parameter or a breaking change. ROR was able to add
 * `withdrawn` years after `active`/`inactive` without breaking a single
 * consumer precisely because it filters by value.
 *
 * The default is SHOW_ALL so that a caller that sends nothing gets exactly the
 * same response it gets today.
 */
export enum ValidityStatusOptions {
  SHOW_ALL = 'all',
  SHOW_ONLY_ACTIVE = 'active',
  SHOW_ONLY_ENDED = 'ended',
}
