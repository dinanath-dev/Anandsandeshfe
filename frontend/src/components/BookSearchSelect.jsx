import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

export default function BookSearchSelect({
  books,
  cart,
  fulfillmentMode,
  onSelectBook,
  formatInr,
  bookUnitPrice,
  placeholder,
  noResultsText,
  invalid = false
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const availableBooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((b) => {
      if (cart[b.id] > 0) return false;
      if (!q) return true;
      return String(b.name || '').toLowerCase().includes(q);
    });
  }, [books, cart, query]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, availableBooks.length]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  function selectBook(book) {
    onSelectBook(book.id);
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'Enter')) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, availableBooks.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const book = availableBooks[highlightIndex];
      if (book) selectBook(book);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  const showList = open && (availableBooks.length > 0 || query.trim());

  return (
    <div ref={rootRef} className={`book-search-select${open ? ' is-open' : ''}`}>
      <div className="book-search-select-input-wrap">
        <Search className="book-search-select-icon" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={invalid || undefined}
          className={`book-search-select-input donation-input ${invalid ? 'donation-input--invalid' : ''}`}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        {query ? (
          <button
            type="button"
            className="book-search-select-clear"
            onClick={() => {
              setQuery('');
              setOpen(true);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X size={16} aria-hidden />
          </button>
        ) : null}
      </div>

      {showList ? (
        <div className="book-search-select-panel">
          {availableBooks.length > 0 ? (
            <ul id={listId} role="listbox" className="book-search-select-list">
              {availableBooks.map((book, index) => {
                const unitPrice = bookUnitPrice(book, fulfillmentMode);
                return (
                  <li key={book.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={index === highlightIndex}
                      className={`book-search-select-option ${index === highlightIndex ? 'is-highlighted' : ''}`}
                      onMouseEnter={() => setHighlightIndex(index)}
                      onClick={() => selectBook(book)}
                    >
                      <span className="book-search-select-option-name">{book.name}</span>
                      <span className="book-search-select-option-rate">{formatInr(unitPrice)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="book-search-select-empty">{noResultsText}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
