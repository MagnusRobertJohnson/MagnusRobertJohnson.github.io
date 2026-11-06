Save the top-20 book list text files in this folder (one book per line):

- `_001 Top 20 Fictional.txt`
- `_002 Top 20 Non-Fiction.txt`

The full reading list is `book-list.csv`, encoded as UTF-8 with the headers
`Book title,Author,Original publication year`. Use standard CSV quoting for
fields containing commas, quotes, or line breaks. Separate co-authors with
semicolons; each is counted individually. Missing authors or years may be
left blank. Century filters use the first year of a publication range and
support approximate BCE dates and stated centuries (for example `c. 375 BCE`
or `c. 4th century BCE`). Unrecognized or missing dates appear under Unknown.
