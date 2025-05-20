import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form input states
  const [currentIsbn, setCurrentIsbn] = useState('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [currentAuthor, setCurrentAuthor] = useState('');

  // State to manage which book is being edited
  const [editingBook, setEditingBook] = useState(null); // null if not editing, or the book object if editing

  const [actionMessage, setActionMessage] = useState({ text: '', type: '' });

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // --- Function to fetch all books ---
  const fetchBooks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}books`);
      if (!response.ok) {
        if (response.status === 204) setBooks([]);
        else throw new Error(`HTTP error fetching books! Status: ${response.status}`);
      } else {
        if (response.headers.get("content-length") === "0" || response.status === 204) setBooks([]);
        else setBooks(await response.json());
      }
    } catch (err) {
      console.error("Failed to fetch books:", err);
      setError(err.message);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  // --- Clear form and messages ---
  const resetForm = () => {
    setCurrentIsbn('');
    setCurrentTitle('');
    setCurrentAuthor('');
    setEditingBook(null);
    // setActionMessage({ text: '', type: '' }); // Optionally clear message on form reset
  };

  // --- Handler for initiating an edit ---
  const handleEditBook = (bookToEdit) => {
    setEditingBook(bookToEdit);
    setCurrentIsbn(bookToEdit.isbn);
    setCurrentTitle(bookToEdit.title);
    setCurrentAuthor(bookToEdit.author);
    setActionMessage({ text: `Editing book: ${bookToEdit.title}`, type: 'info' });
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top where form is
  };

  // --- Handler for form submission (Add or Update) ---
  const handleSubmitForm = async (event) => {
    event.preventDefault();
    setActionMessage({ text: '', type: '' });

    const bookData = {
      isbn: currentIsbn, // For updates, this should match editingBook.isbn
      title: currentTitle,
      author: currentAuthor,
    };

    if (editingBook) { // ---- UPDATE Book ----
      if (editingBook.isbn !== currentIsbn) {
         // Usually, ISBN (primary key) should not be changed during an update.
         // Or, if it IS allowed, the API must handle it (e.g. treat as new ID or specific PK update logic)
         setActionMessage({ text: 'Error: ISBN cannot be changed during an update for this example.', type: 'error'});
         return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/${editingBook.isbn}`, { // Use original ISBN for endpoint
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookData), // Send updated data, including potentially "changed" ISBN if your API supports it
        });
        if (!response.ok) {
          let errorMessage = `HTTP error updating book! Status: ${response.status}`;
          try { const errorData = await response.json(); errorMessage = errorData.message || errorData.error || `Server error: ${response.statusText}`; }
          catch (e) { errorMessage = `Failed to update book. Server responded with: ${response.status} ${response.statusText}`; }
          throw new Error(errorMessage);
        }
        setActionMessage({ text: `Book "${bookData.title}" updated successfully!`, type: 'success' });
        resetForm();
        fetchBooks();
      } catch (err) {
        console.error("Failed to update book:", err);
        setActionMessage({ text: `Error updating book: ${err.message}`, type: 'error' });
      }
    } else { // ---- ADD Book ----
      try {
        const response = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookData),
        });
        if (!response.ok) {
          let errorMessage = `HTTP error adding book! Status: ${response.status}`;
          try { const errorData = await response.json(); errorMessage = errorData.message || errorData.error || `Server error: ${response.statusText}`; }
          catch (e) { errorMessage = `Failed to add book. Server responded with: ${response.status} ${response.statusText}`; }
          throw new Error(errorMessage);
        }
        setActionMessage({ text: `Book "${bookData.title}" added successfully!`, type: 'success' });
        resetForm();
        fetchBooks();
      } catch (err) {
        console.error("Failed to add book:", err);
        setActionMessage({ text: `Error adding book: ${err.message}`, type: 'error' });
      }
    }
  };

  // --- Handler for deleting a book ---
  const handleDeleteBook = async (bookIsbn, bookTitle) => {
    setActionMessage({ text: '', type: '' });
    if (window.confirm(`Are you sure you want to delete "${bookTitle}" (ISBN: ${bookIsbn})?`)) {
      try {
        const response = await fetch(`${API_BASE_URL}/${bookIsbn}`, { method: 'DELETE' });
        if (!response.ok && response.status !== 204) { // 204 is success for delete
          let errorMessage = `HTTP error deleting book! Status: ${response.status}`;
          try { const errorData = await response.json(); errorMessage = errorData.message || errorData.error || `Server error: ${response.statusText}`; }
          catch (e) { if(response.status === 404) errorMessage = "Book not found on server."; else errorMessage = `Failed to delete book. Server responded with: ${response.status} ${response.statusText}`; }
          throw new Error(errorMessage);
        }
        setActionMessage({ text: `Book "${bookTitle}" deleted successfully!`, type: 'success' });
        fetchBooks();
      } catch (err) {
        console.error("Failed to delete book:", err);
        setActionMessage({ text: `Error deleting book: ${err.message}`, type: 'error' });
      }
    }
  };

  // --- JSX ---
  if (loading) return <div>Loading books...</div>;
  if (error) return <div>Error fetching books: {error}</div>;

  return (
    <div className="App">
      <h1>Book Manager (React GUI)</h1>

      {actionMessage.text && (
        <p style={{ color: actionMessage.type === 'error' ? 'red' : actionMessage.type === 'success' ? 'green' : 'blue', border: '1px solid', padding: '10px', margin: '10px 0' }}>
          {actionMessage.text}
        </p>
      )}

      <div className="form-container" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc' }}>
        <h2>{editingBook ? 'Edit Book' : 'Add New Book'}</h2>
        <form onSubmit={handleSubmitForm}>
          <div>
            <label htmlFor="isbnInput">ISBN: </label>
            <input
              type="text"
              id="isbnInput"
              value={currentIsbn}
              onChange={(e) => setCurrentIsbn(e.target.value)}
              required
              readOnly={!!editingBook} // ISBN is read-only when editing in this example
            />
          </div>
          <div>
            <label htmlFor="titleInput">Title: </label>
            <input
              type="text"
              id="titleInput"
              value={currentTitle}
              onChange={(e) => setCurrentTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="authorInput">Author: </label>
            <input
              type="text"
              id="authorInput"
              value={currentAuthor}
              onChange={(e) => setCurrentAuthor(e.target.value)}
              required
            />
          </div>
          <button type="submit">{editingBook ? 'Update Book' : 'Add Book'}</button>
          {editingBook && (
            <button type="button" onClick={resetForm} style={{ marginLeft: '10px' }}>
              Cancel Edit
            </button>
          )}
        </form>
      </div>

      <h2>Book List</h2>
      {/* ... (table for books remains largely the same, but ensure Edit button calls handleEditBook correctly) ... */}
      {books.length === 0 ? (
        <p>No books found.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>ISBN</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>Title</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>Author</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f0f0f0' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.isbn}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{book.isbn}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{book.title}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{book.author}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <button onClick={() => handleEditBook(book)} style={{marginRight: '5px'}}>Edit</button> {/* Pass the whole book object */}
                  <button onClick={() => handleDeleteBook(book.isbn, book.title)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
       <button onClick={() => { fetchBooks(); setActionMessage({text: '', type: ''}); }} style={{ marginTop: '10px' }}>Refresh Book List</button>
    </div>
  );
}

export default App;
