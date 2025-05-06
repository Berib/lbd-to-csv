// Helper: Get current page number from URL
function currentPageNumber() {
  const match = window.location.pathname.match(/\/page\/(\d+)/);
  return match ? parseInt(match[1]) : 1;
}

// Fetch list page HTML
async function fetchListPage(pageNum) {
  const url = `${window.location.origin}${window.location.pathname.replace(/\/page\/\d+/, '')}/page/${pageNum}/`;
  try {
    const response = await fetch(url);
    if (response.status === 404) return null;
    return new DOMParser().parseFromString(await response.text(), 'text/html');
  } catch {
    return null;
  }
}

// Scrape movie titles
function scrapePage(dom) {
  const movies = [];
  const posters = dom.querySelectorAll('li.poster-container');
  
  posters.forEach(poster => {
    const title = poster.querySelector('img[alt]')?.getAttribute('alt')?.split('(')[0]?.trim();
    if (title) movies.push({ title });
  });
  
  return movies;
}

// Main scraping function
async function scrapeAllPages() {
  let allMovies = scrapePage(document);
  let currentPage = currentPageNumber();
  
  console.log(`Scraped page ${currentPage}: ${allMovies.length} movies`);

  while (true) {
    currentPage++;
    try {
      const dom = await fetchListPage(currentPage);
      if (!dom) break;
      
      const pageMovies = scrapePage(dom);
      if (pageMovies.length === 0) break;
      
      allMovies = [...allMovies, ...pageMovies];
      console.log(`Scraped page ${currentPage}: ${pageMovies.length} movies (Total: ${allMovies.length})`);
    } catch {
      console.log(`Stopped at page ${currentPage}`);
      break;
    }
  }

  console.log(`Finished. Total movies: ${allMovies.length}`);
  return allMovies;
}

// Get list name from meta tag
function getListName() {
  const title = document.querySelector('meta[property="og:title"]')?.content;
  if (title) {
    return title.replace(' - Letterboxd', '')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s-]+/g, '-');
  }
  return 'letterboxd-list';
}

// Generate CSV from movies
function generateCSV(movies) {
  return 'title\n' + movies.map(m => `"${m.title.replace(/"/g, '""')}"`).join('\n');
}

// Create export button
function createDownloadButton() {
  const button = document.createElement('button');
  button.textContent = 'Export to CSV';
  button.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;padding:10px;background:#00a0d6;color:white;border:none;border-radius:4px;cursor:pointer;';

  button.onclick = async () => {
    button.textContent = 'Exporting...';
    try {
      const movies = await scrapeAllPages();
      const csv = generateCSV(movies);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${getListName()}-export.csv`;
      a.click();

      button.textContent = `Exported ${movies.length} movies`;
    } catch (e) {
      console.error('Export failed:', e);
      button.textContent = 'Export Failed';
    }
  };
  
  document.body.appendChild(button);
  return button;
}

// Initialize
createDownloadButton();