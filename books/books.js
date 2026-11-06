function parseBookCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    let closedQuote = false;
    text = text.replace(/^\uFEFF/, '');

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (quoted) {
            if (char === '"' && text[i + 1] === '"') {
                field += '"';
                i++;
            } else if (char === '"') {
                quoted = false;
                closedQuote = true;
            } else {
                field += char;
            }
        } else if (char === ',' || char === '\n' || char === '\r') {
            row.push(field);
            field = '';
            closedQuote = false;
            if (char !== ',') {
                if (char === '\r' && text[i + 1] === '\n') i++;
                if (row.some(value => value.trim())) rows.push(row);
                row = [];
            }
        } else if (char === '"' && !field && !closedQuote) {
            quoted = true;
        } else if (char === '"' || closedQuote) {
            throw new Error('Invalid CSV quotation');
        } else {
            field += char;
        }
    }
    if (quoted) throw new Error('Unclosed CSV quotation');
    if (field || row.length || closedQuote) {
        row.push(field);
        if (row.some(value => value.trim())) rows.push(row);
    }
    const expected = ['Book title', 'Author', 'Original publication year'];
    const header = rows.shift();
    if (!header || header.length !== expected.length || header.some((value, i) => value.trim() !== expected[i])) {
        throw new Error('Unexpected book CSV header');
    }
    return rows.map((values, i) => {
        if (values.length !== 3 || !values[0].trim()) {
            throw new Error('Invalid book CSV row ' + (i + 2));
        }
        const [title, author, year] = values.map(value => value.trim());
        return { title, author, year, authors: author ? author.split(';').map(name => name.trim()).filter(Boolean) : [] };
    });
}

function bookCentury(year) {
    const century = year.match(/^(?:c\.\s*)?(\d+)(?:st|nd|rd|th)\s+century\s*(BCE)?$/i);
    if (century) return Number(century[1]) * (century[2] ? -1 : 1);
    const date = year.match(/^(?:c\.\s*)?(\d+)(?:\s*(?:-|–|—)\s*\d+)?\s*(BCE)?$/i);
    if (!date || Number(date[1]) === 0) return null;
    return Math.ceil(Number(date[1]) / 100) * (date[2] ? -1 : 1);
}

function centuryLabel(century) {
    const number = Math.abs(century);
    const lastTwo = number % 100;
    const suffix = lastTwo >= 11 && lastTwo <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[number % 10] || 'th');
    return number + suffix + ' century' + (century < 0 ? ' BCE' : '');
}

async function loadBooks() {
    const stats = document.getElementById('book-stats');
    const table = document.getElementById('list-all');
    const search = document.getElementById('book-filter');
    const authorFilter = document.getElementById('book-author');
    const centuryFilter = document.getElementById('book-century');

    try {
        const response = await fetch('books/book-list.csv', { cache: 'no-cache' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const books = parseBookCsv(await response.text());
        if (!books.length) throw new Error('The book list is empty');

        const authors = new Map();
        const centuries = new Map();
        books.forEach(book => {
            book.century = bookCentury(book.year);
            book.authors.forEach(author => authors.set(author, (authors.get(author) || 0) + 1));
            const key = book.century === null ? 'unknown' : String(book.century);
            centuries.set(key, (centuries.get(key) || 0) + 1);
        });

        [...authors.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([author, count]) => {
            authorFilter.add(new Option(author + ' (' + count + ')', author));
        });
        [...centuries.entries()].sort((a, b) => {
            if (a[0] === 'unknown') return 1;
            if (b[0] === 'unknown') return -1;
            return Number(a[0]) - Number(b[0]);
        }).forEach(([century, count]) => {
            centuryFilter.add(new Option((century === 'unknown' ? 'Unknown' : centuryLabel(Number(century))) + ' (' + count + ')', century));
        });
        authorFilter.disabled = false;
        centuryFilter.disabled = false;

        function updateBooks() {
            const query = search.value.trim().toLocaleLowerCase();
            const selectedAuthor = authorFilter.value;
            const selectedCentury = centuryFilter.value;
            const matches = books.filter(book =>
                (!query || [book.title, book.author, book.year].some(value => value.toLocaleLowerCase().includes(query))) &&
                (!selectedAuthor || book.authors.includes(selectedAuthor)) &&
                (!selectedCentury || (selectedCentury === 'unknown' ? book.century === null : book.century === Number(selectedCentury)))
            );
            stats.textContent = matches.length + ' of ' + books.length + ' books shown. Filter by author or century to see a count; filters can be combined.';
            table.replaceChildren();
            if (!matches.length) {
                const row = table.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 3;
                cell.className = 'status';
                cell.textContent = 'No books match these filters.';
                return;
            }
            const fragment = document.createDocumentFragment();
            matches.forEach(book => {
                const row = document.createElement('tr');
                [book.title, book.author || 'Unknown', book.year || 'Unknown'].forEach(value => {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    row.appendChild(cell);
                });
                fragment.appendChild(row);
            });
            table.appendChild(fragment);
        }
        search.addEventListener('input', updateBooks);
        authorFilter.addEventListener('change', updateBooks);
        centuryFilter.addEventListener('change', updateBooks);
        updateBooks();
    } catch (error) {
        console.error('Unable to load books:', error);
        stats.textContent = 'Book statistics are unavailable.';
        table.innerHTML = '<tr><td colspan="3" class="status">Book list not available.</td></tr>';
    }
}

loadBooks();
