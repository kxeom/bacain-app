import './style.css'
import axios from 'axios'
import Navigo from 'navigo'
import Swal from 'sweetalert2'

const apiBaseUrl = 'https://kurokami.vercel.app/api'

const app = {
  init() {
    this.app = document.getElementById('app')
    if (!this.app) {
      alert('Element #app tidak ditemukan!')
      return
    }
    this.currentManhwaId = null
    this.currentManhwaImage = null
    this.sidebarOpen = false
    this.renderPage()
    this.setupRouter()
  },

  setupRouter() {
    this.router = new Navigo('/', { hash: false })
    this.router
      .on({
        '/': () => {
          this.loadRecommendations()
        },
        '/detail/:manhwaId': (params) => {
          this.currentManhwaId = params.data.manhwaId
          this.loadManhwaDetail(params.data.manhwaId)
        },
        '/chapter/:chapterId': (params) => {
          this.loadChapterDetail(params.data.chapterId)
        }
      })
      .resolve()
  },

  saveBookmark(manhwaTitle, chapterTitle, chapterId, imageSrc) {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || []
    const existing = bookmarks.find(b => b.chapterId === chapterId)
    if (!existing) {
      bookmarks.push({ manhwaTitle, chapterTitle, chapterId, imageSrc })
      localStorage.setItem('bookmarks', JSON.stringify(bookmarks))
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        text: 'Chapter berhasil ditambahkan ke bookmark!',
        timer: 1500,
        showConfirmButton: false
      })
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Sudah Ada',
        text: 'Chapter ini sudah ada di bookmark!',
        timer: 1500,
        showConfirmButton: false
      })
    }
  },

  removeBookmark(chapterId) {
    let bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || []
    bookmarks = bookmarks.filter(b => b.chapterId !== chapterId)
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks))
    this.renderSidebar(bookmarks)
  },

  renderPage() {
    this.app.innerHTML = `
      <div class="container">
        <header class="header">
          <div class="logo">
            <img src="https://mystickermania.com/cdn/stickers/anime/kaguya-sama-cat-512x512.png" alt="Bacain Icon" class="logo-icon">
            <span class="logo-text">Bacain</span>
          </div>
          <div class="header-actions">
            <button id="search-button"><i class="fas fa-search"></i></button>
            <button id="menu-button"><i class="fas fa-bars"></i></button>
          </div>
        </header>
        <div class="search-bar hidden">
          <input type="text" id="search-input" placeholder="Cari manhwa...">
        </div>
        <div class="sidebar" id="sidebar">
          <div class="sidebar-header">
            <h2>Bookmarks</h2>
            <button id="close-sidebar"><i class="fas fa-times"></i></button>
          </div>
          <div class="sidebar-content" id="sidebar-content"></div>
        </div>
        <div class="content" id="content"></div>
      </div>
    `
    this.content = document.getElementById('content')
    this.searchInput = document.getElementById('search-input')
    this.searchButton = document.getElementById('search-button')
    this.menuButton = document.getElementById('menu-button')
    this.closeSidebarButton = document.getElementById('close-sidebar')
    this.sidebar = document.getElementById('sidebar')
    this.sidebarContent = document.getElementById('sidebar-content')
    this.searchBar = document.querySelector('.search-bar')

    // Debugging: Pastikan elemen ada
    console.log('Search Button:', this.searchButton)
    console.log('Menu Button:', this.menuButton)
    console.log('Close Sidebar Button:', this.closeSidebarButton)
    console.log('Sidebar:', this.sidebar)

    this.loadBookmarksWithImages()
    this.bindEvents()
  },

  bindEvents() {
    if (!this.searchButton || !this.menuButton || !this.closeSidebarButton) {
      console.error('One or more buttons not found!')
      return
    }

    this.searchButton.addEventListener('click', () => {
      console.log('Search button clicked')
      this.searchBar.classList.toggle('hidden')
      this.searchInput.focus()
    })

    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = this.searchInput.value.trim()
        if (query) this.searchManhwa(query)
      }
    })

    this.menuButton.addEventListener('click', () => {
      console.log('Menu button clicked')
      this.sidebar.classList.add('open')
      this.sidebarOpen = true
    })

    this.closeSidebarButton.addEventListener('click', () => {
      console.log('Close sidebar button clicked')
      this.sidebar.classList.remove('open')
      this.sidebarOpen = false
    })

    this.app.addEventListener('click', (e) => {
      const card = e.target.closest('.manhwa-card')
      if (card) {
        const manhwaId = card.dataset.id
        this.currentManhwaId = manhwaId
        this.router.navigate(`/detail/${manhwaId}`)
      }
      const backButton = e.target.closest('#back-button')
      if (backButton) {
        this.router.navigate('/')
      }
      const chapterLink = e.target.closest('.chapter-link')
      if (chapterLink) {
        e.preventDefault()
        const chapterUrl = chapterLink.getAttribute('href')
        const chapterId = chapterUrl.split('/').filter(Boolean).pop()
        this.router.navigate(`/chapter/${chapterId}`)
      }
      const prevButton = e.target.closest('#prev-chapter')
      if (prevButton) {
        const chapterUrl = prevButton.dataset.url
        if (chapterUrl && chapterUrl !== 'null') {
          const chapterId = chapterUrl.split('/').filter(Boolean).pop()
          this.router.navigate(`/chapter/${chapterId}`)
        }
      }
      const nextButton = e.target.closest('#next-chapter')
      if (nextButton) {
        const chapterUrl = nextButton.dataset.url
        if (chapterUrl && chapterUrl !== 'null') {
          const chapterId = chapterUrl.split('/').filter(Boolean).pop()
          this.router.navigate(`/chapter/${chapterId}`)
        }
      }
      const backToDetailButton = e.target.closest('#back-to-detail')
      if (backToDetailButton) {
        if (this.currentManhwaId) {
          this.router.navigate(`/detail/${this.currentManhwaId}`)
        } else {
          this.router.navigate('/')
        }
      }
      const bookmarkButton = e.target.closest('#bookmark-button')
      if (bookmarkButton) {
        const { manhwaTitle, chapterTitle, chapterId } = bookmarkButton.dataset
        this.saveBookmark(manhwaTitle, chapterTitle, chapterId, this.currentManhwaImage)
        this.loadBookmarksWithImages()
      }
      const removeBookmarkButton = e.target.closest('.remove-bookmark')
      if (removeBookmarkButton) {
        const chapterId = removeBookmarkButton.dataset.chapterId
        this.removeBookmark(chapterId)
      }
    })
  },

  showLoading() {
    this.content.innerHTML = `
      <div class="loading">
        <img src="https://mystickermania.com/cdn/stickers/anime/kaguya-sama-cat-512x512.png" alt="Loading" class="loading-image">
        <p>Loading...</p>
      </div>
    `
  },

  async loadRecommendations() {
    try {
      this.showLoading()
      const response = await axios.get(`${apiBaseUrl}/manhwa-recommendation`)
      this.renderRecommendations(response.data)
    } catch (error) {
      this.content.innerHTML = `<p class="error">Gagal memuat rekomendasi: ${error.message}</p>`
    }
  },

  async searchManhwa(query) {
    try {
      this.showLoading()
      const response = await axios.get(`${apiBaseUrl}/search/${encodeURIComponent(query)}`)
      if (!response.data.seriesList || response.data.seriesList.length === 0) {
        this.content.innerHTML = '<p class="error">Tidak ada hasil untuk "' + query + '"</p>'
      } else {
        this.renderRecommendations(response.data.seriesList)
      }
    } catch (error) {
      this.content.innerHTML = `<p class="error">Gagal mencari manhwa: ${error.message}</p>`
    }
  },

  async loadManhwaDetail(manhwaId) {
    try {
      this.showLoading()
      const cleanManhwaId = manhwaId.trim().toLowerCase().replace(/\/$/, '')
      const response = await axios.get(`${apiBaseUrl}/manhwa-detail/${cleanManhwaId}`)
      this.currentManhwaImage = response.data.imageSrc || 'https://via.placeholder.com/200x300?text=No+Image'
      this.renderManhwaDetail(response.data)
    } catch (error) {
      this.content.innerHTML = `<p class="error">Gagal memuat detail: ${error.message} (ID: ${manhwaId})</p>`
    }
  },

  async loadChapterDetail(chapterId) {
    try {
      this.showLoading()
      const cleanChapterId = chapterId.trim().toLowerCase().replace(/\/$/, '')
      const response = await axios.get(`${apiBaseUrl}/chapter/${cleanChapterId}`)
      this.renderChapterDetail(response.data, cleanChapterId)
    } catch (error) {
      this.content.innerHTML = `<p class="error">Gagal memuat chapter: ${error.message} (ID: ${chapterId})</p>`
    }
  },

  loadBookmarksWithImages() {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || []
    this.renderSidebar(bookmarks)
  },

  renderSidebar(bookmarks) {
    this.sidebarContent.innerHTML = `
      ${bookmarks.length > 0 ? `
        <div class="bookmark-list">
          ${bookmarks.map(item => `
            <div class="bookmark-item">
              <img src="${item.imageSrc || 'https://via.placeholder.com/50x50?text=No+Image'}" alt="${item.manhwaTitle}" class="bookmark-image">
              <div class="bookmark-info">
                <p><strong>${item.manhwaTitle}</strong> - ${item.chapterTitle}</p>
                <div class="bookmark-actions">
                  <a href="${item.chapterId ? `https://komikstation.co/${item.chapterId}/` : '#'}" class="chapter-link">Baca</a>
                  <button class="remove-bookmark" data-chapter-id="${item.chapterId}">Hapus</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '<p>Tidak ada bookmark tersedia.</p>'}
    `
  },

  renderRecommendations(data) {
    this.content.innerHTML = `
      <h2>Recommendations</h2>
      <div class="manhwa-grid">
        ${data.map(item => {
          const urlOrLink = item.url || item.link || ''
          const manhwaId = urlOrLink ? urlOrLink.split('/').filter(Boolean).pop() : 'unknown'
          return `
            <div class="manhwa-card" data-id="${manhwaId}">
              <img src="${item.imageSrc || item.image || 'https://via.placeholder.com/150x200?text=No+Image'}" alt="${item.title}">
              <div class="manhwa-info">
                <h3>${item.title || 'No Title'}</h3>
                <p class="chapter">${item.chapter || item.latestChapter || 'N/A'}</p>
                <p class="rating"> ${item.rating || 'N/A'}</p>
              </div>
            </div>
          `
        }).join('')}
      </div>
    `
  },

  renderManhwaDetail(data) {
    const chapters = (data.chapters || []).reverse()

    this.content.innerHTML = `
      <div class="detail-header">
        <button id="back-button"><i class="fas fa-arrow-left"></i> Kembali</button>
        <h2>${data.title || 'Detail Manhwa'}</h2>
      </div>
      <div class="manhwa-detail">
        <img src="${data.imageSrc || 'https://via.placeholder.com/200x300?text=No+Image'}" alt="${data.title}">
        <div class="detail-info">
          <p><strong>Judul:</strong> ${data.title || 'N/A'}</p>
          <p><strong>Alternative:</strong> ${data.alternative || 'N/A'}</p>
          <p><strong>Rating:</strong>  ${data.rating || 'N/A'}</p>
          <p><strong>Diikuti:</strong> ${data.followedBy || 'N/A'}</p>
          <p><strong>Status:</strong> ${data.status || 'N/A'}</p>
          <p><strong>Tipe:</strong> ${data.type || 'N/A'}</p>
          <p><strong>Rilis:</strong> ${data.released || 'N/A'}</p>
          <p><strong>Author:</strong> ${data.author || 'N/A'}</p>
          <p><strong>Artist:</strong> ${data.artist || 'N/A'}</p>
          <p><strong>Terakhir Diperbarui:</strong> ${data.updatedOn || 'N/A'}</p>
          <p><strong>Genres:</strong> ${data.genres ? data.genres.map(g => `<a href="${g.genreLink}" class="genre-link">${g.genreName}</a>`).join(', ') : 'N/A'}</p>
          <p><strong>Sinopsis:</strong> ${data.synopsis || 'Tidak ada deskripsi'}</p>
          <div class="chapter-list">
            <h3>Chapter</h3>
            <p class="chapter-item">
              <strong>First:</strong> ${data.firstChapter?.title || 'N/A'} 
              <a href="${data.firstChapter?.link || '#'}" class="chapter-link">Baca</a>
            </p>
            <p class="chapter-item">
              <strong>Latest:</strong> ${data.latestChapter?.title || 'N/A'} 
              <a href="${data.latestChapter?.link || '#'}" class="chapter-link">Baca</a>
            </p>
            ${chapters.length > 0 ? `
              <h3>Daftar Chapter</h3>
              <div class="chapter-scroll">
                ${chapters.map(ch => `
                  <p class="chapter-item">
                    ${ch.chapterNum || 'N/A'} 
                    (${ch.chapterDate || 'N/A'}) 
                    - <a href="${ch.chapterLink || '#'}" class="chapter-link">Baca</a>
                    ${ch.downloadLink ? ` | <a href="${ch.downloadLink}" class="download-link">Download</a>` : ''}
                  </p>
                `).join('')}
              </div>
            ` : '<p>Tidak ada daftar chapter tersedia</p>'}
          </div>
        </div>
      </div>
    `
  },

  renderChapterDetail(data, chapterId) {
    const manhwaTitle = data.title.split(' Chapter')[0]
    this.content.innerHTML = `
      <div class="chapter-detail">
        <div class="chapter-header">
          <button id="back-to-detail"><i class="fas fa-arrow-left"></i> Kembali ke Detail</button>
          <h2>${data.title || 'Chapter'}</h2>
          <button id="bookmark-button" data-manhwa-title="${manhwaTitle}" data-chapter-title="${data.title}" data-chapter-id="${chapterId}"><i class="fas fa-bookmark"></i> Bookmark</button>
        </div>
        <div class="chapter-navigation">
          <button id="prev-chapter" data-url="${data.prevChapter || 'null'}" ${!data.prevChapter ? 'disabled' : ''}>Previous</button>
          <button id="next-chapter" data-url="${data.nextChapter || 'null'}" ${!data.nextChapter ? 'disabled' : ''}>Next</button>
        </div>
        <div class="chapter-images">
          ${data.images && data.images.length > 0 ? data.images.map(img => `
            <img src="${img}" alt="Page" class="chapter-image">
          `).join('') : '<p>Tidak ada gambar tersedia</p>'}
        </div>
        <div class="chapter-navigation">
          <button id="prev-chapter" data-url="${data.prevChapter || 'null'}" ${!data.prevChapter ? 'disabled' : ''}>Previous</button>
          <button id="next-chapter" data-url="${data.nextChapter || 'null'}" ${!data.nextChapter ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    `
  }
}

app.init()