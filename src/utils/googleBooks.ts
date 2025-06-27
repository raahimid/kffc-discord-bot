import axios from 'axios';

export interface GoogleBook {
  description?: string;
  title: string;
  author: string;
  image: string;
}

export async function fetchBookFromGoogleBooks(title: string, author?: string): Promise<GoogleBook | null> {
  const query = `intitle:${encodeURIComponent(title)}` + (author ? `+inauthor:${encodeURIComponent(author)}` : '');
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`;
  try {
    const res = await axios.get(url);
    const data = res.data;
    if (!data.items || !data.items.length) return null;
    const book = data.items[0].volumeInfo;
    return {
      title: book.title,
      author: (book.authors && book.authors.join(', ')) || 'Unknown',
      image: (book.imageLinks && book.imageLinks.thumbnail) || '',
      description: typeof book.description === 'string' ? book.description : '',
    };
  } catch (err) {
    return null;
  }
}
