/**
 * What each form field of Concepts admin is for, with an example.
 * Shown by the (i) next to the label (`app-gc-info`) as tooltip and as the
 * icon's accessible name. One home for the texts so they read as one voice
 * and a spec can check every template key exists.
 *
 * Keep each text short (it is a tooltip): what the field is, what it changes,
 * one example. Limits quoted here are the ones the back DTOs enforce.
 */
export const FIELD_INFO = {
  concept: {
    term_id:
      'Numeric code that identifies the concept for good, e.g. 1042. Fill it only to keep the code an existing register already uses; left empty, the next free number is assigned. It cannot be edited later.',
    preferred_label: 'The main name of the concept, as readers see it on the public page and in the API, e.g. “Theory of Change”. Up to 500 characters.',
    definition:
      'The full meaning of the concept, e.g. “A description of how and why a set of activities is expected to lead to the desired change.” Published with the concept.',
    short_definition: 'A one-line version of the definition, used in tooltips and compact lists, e.g. “How activities are expected to lead to change.” Up to 500 characters.',
    scope_note: 'When and how to use the term, and what it does not cover, e.g. “Use for programme-level logic; for one project use Results framework.”',
    example_of_use: 'A sentence that uses the term in context, e.g. “The team revised its theory of change after the mid-term review.”',
    term_type: 'The kind of term, picked from the “term type” controlled list (Setup → Controlled lists). Readers and the API can filter concepts by it.',
    functions:
      'The function(s) the concept serves: Monitoring, Evaluation, Learning, Impact assessment or Foresight. Pick one or more; readers and the API can filter by it.',
    phase_primary:
      'The main phase of the cycle where the concept is used, from the “Phase” list. In the concepts Excel it is usually the PARENT TERM column.',
    derivation: 'How the term was obtained, from the “derivation” list, e.g. adopted as-is from a source or adapted from one.',
    source_citation: 'Where the definition comes from, written as a reference, e.g. “OECD DAC (2023). Glossary of Key Terms in Evaluation.”',
    source_url: 'Web link to that source, starting with https://, e.g. https://www.oecd.org/dac/evaluation/. Up to 1,000 characters.',
    steward: 'Person or team responsible for keeping the term right, e.g. “MEL Community of Practice”. Up to 255 characters.',
    notes: 'Notes for other admins, e.g. “Check the wording with the Evaluation Function before approving.” Never published: only admins see them.',
    new_status:
      'Moves the concept through its life cycle: Draft → In review → Approved, or Deprecated when it should no longer be used. Saved on its own with Change status, apart from the details.',
    replaced_by: 'The concept that takes over from this one, e.g. a newer term with the same meaning. Readers of the deprecated concept are pointed to it.',
    reason: 'Why the concept is no longer used, e.g. “Merged into 1042 Theory of Change.” Required when there is no replacement. Up to 2,000 characters.'
  },
  icon: {
    icon_status: 'Where the icon stands: Final, Draft, Placeholder or Not yet designed. A Final icon is shown to readers, so it needs alt text.',
    icon_code: 'Short identifier of the icon in the design library, e.g. “MEL-042”. Up to 50 characters.',
    alt_text: 'What the icon shows, read aloud by screen readers in place of the image, e.g. “Arrow looping back to a light bulb”. Required once the status is Final.',
    file_link_primary: 'Public http(s) link to the hosted image file, e.g. https://…/mel-042.svg. This is the link that is previewed and published.',
    file_link_backup: 'A second place where the same file is hosted, e.g. a copy in another repository, kept in case the primary link stops working.',
    file_format: 'Format of the file, picked from the “icon format” list, e.g. SVG or PNG.',
    file_name: 'Name of the file as the designer delivered it, e.g. mel-042_theory-of-change.svg. Up to 255 characters.',
    designer: 'Person or studio that drew the icon, for credit, e.g. “Jane Doe Studio”. Up to 255 characters.',
    designer_country: 'Country the designer works from, e.g. Kenya. Up to 100 characters.',
    year_created: 'Year the icon was designed, between 1900 and 2200, e.g. 2025.',
    date_added: 'Day the icon was added to the taxonomy, e.g. 2026-09-28.',
    rights_and_licence: 'Licence under which others may reuse the icon, e.g. CC BY 4.0. Up to 255 characters.'
  },
  label: {
    label: 'Another name of the concept, e.g. the acronym “ToC”, a synonym, or the term in another language. Up to 500 characters.',
    kind: 'Alternative: a synonym readers may use. Hidden: only helps search, e.g. a common misspelling. Acronym: a short form. Preferred, other language: the main name in another language.',
    language: 'Language code of this label, e.g. en, fr or es.',
    discouraged: 'Published as “do not use”: the name exists, but readers should use the preferred label instead.'
  },
  relation: {
    broader: 'Pick a more general concept this one belongs to, e.g. “Evaluation” is broader than “Impact evaluation”. A loop (A under B under A) is refused.',
    related: 'Pick a concept associated with this one that is neither broader nor narrower, e.g. “Indicator” and “Target”. The link shows on both concepts.',
    narrower: 'Read only: the concepts that name this one as broader. Change them from the narrower concept.'
  },
  mapping: {
    target_scheme: 'Name of the outside vocabulary, e.g. AGROVOC or Wikidata. Up to 50 characters.',
    match_type:
      'How close the outside term is, as a SKOS match: Exact (interchangeable anywhere), Close (in some contexts), Broad (the target is more general), Narrow (more specific) or Related (associated, not equivalent).',
    target_uri: 'Permanent web address of the outside term, e.g. http://aims.fao.org/aos/agrovoc/c_1234. Up to 1,000 characters.',
    target_label: 'Name of the term in the outside vocabulary, e.g. “theory of change”. Shown next to the link.',
    justification: 'Manual review: a person compared both terms. Lexical match: they were matched by their wording alone.',
    confidence: 'How sure the match is, from 0 (a guess) to 1 (certain), e.g. 0.9.'
  },
  setupField: {
    label: 'Name editors see above the field in the concept form, e.g. “Funding source”. Up to 255 characters.',
    code: 'Machine name the values are stored under, lowercase with underscores, e.g. funding_source. Imports read it as the column x:funding_source. Fixed once created.',
    type: 'What the field accepts: short or long text, several texts, one or several values of a list, links to other concepts, a web address, a date or a number. Fixed once created.',
    list_code: 'The controlled list whose values the field offers, e.g. funding_source. Manage its values under Controlled lists. Fixed once created.',
    help: 'One line shown under the field and in its (i) in the concept form, e.g. “Who pays for the work this term describes.” Up to 500 characters.',
    sort: 'Position of the field in the concept form; lower numbers come first, e.g. 10.',
    required: 'Editors cannot save a concept while this field is empty.',
    is_public: 'The value goes out through the public API and exports. Unchecked, only admins see it.',
    is_active: 'An inactive field leaves the concept form; the values already stored are kept.'
  },
  setupList: {
    list_code: 'Machine name of the new list, lowercase with underscores, e.g. funding_source. Custom fields point to the list by this code.',
    first_value: 'The first option of the list, e.g. “Bilateral funding”. A list exists from its first value; add the rest once it is created.',
    pick: 'The controlled list whose values you are viewing, reordering and editing below.',
    new_label: 'What editors see in the dropdown, e.g. “Bilateral”. It can be relabelled later.',
    new_value: 'What is stored on each concept, e.g. bilateral. Left empty, it is made from the label. It never changes once created.',
    shared: 'Offer this value in every concept scheme, not only in this one.'
  },
  collection: {
    label: 'Display name of the collection, e.g. “PRMS glossary”. It can be renamed later.',
    code: 'Short identifier that becomes part of the collection URI, e.g. prms_glossary. Suggested from the name; it cannot change later.',
    ordered: 'Members keep the order you give them, and the collection is published as a SKOS ordered collection.'
  },
  request: {
    note: 'Message to the person who sent the request, e.g. why it was sent back. Recorded in the history and sent with the notification.'
  }
} as const;

/** Text of the (i) of an import mapping row. */
export function importColumnInfo(header: string): string {
  return `Pick the concept field that the column “${header}” fills, or leave “Ignore this column” to skip it. A field takes one column only: picking it here clears it from any other column.`;
}
