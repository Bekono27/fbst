# Group CSV import

The Groups directory supports regional grouping, privacy/source filters, member-count ranges, sorting, pagination and UTF-8 CSV export.

Supported columns (map them during import):
- Name (required)
- Link (required): a direct https://www.facebook.com/groups/ID-or-slug/ URL
- Region: aimag/province, Ulaanbaatar district, nationwide or a topic label
- Size: nonnegative whole member count, e.g. "303,064"; blank means unknown
- Source: original source label, retained without claiming verification
- Privacy: public/private/unknown; omitted values remain unknown
- Notes (optional)

The directory accepts Facebook groups, not Page records or search-result links. A "find" label without its underlying direct group URL cannot be imported as a verified group. Invalid rows abort the import with a row error; duplicates are skipped by canonical group URL. Existing records are preserved.

Use the local app's Groups > CSV / файл оруулах button, confirm the column mapping, and import. Region and source are stored in SQLite using additive columns; the database is not reset. Missing geography remains unknown. Only recognized explicit region labels are normalized; names are not mined to guess geography.

The general directory shows all group privacy types. Dedicated public/private sections remain available. Unknown member counts remain visible unless a numeric range is applied. CSV export includes all filtered rows across pages.

The public publisher still publishes only groups explicitly marked public. Importing a CSV does not automatically classify it as public.

The newly attached Pasted text.txt was not readable in this session because the execution environment was unavailable. No new attached rows were imported or fabricated; only the UI/import infrastructure was updated. The existing catalog remains intact.
