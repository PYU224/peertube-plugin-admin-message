import {
  RegisterClientOptions
} from '@peertube/peertube-types/client'

// DOMPurifyの型定義
declare const DOMPurify: {
  sanitize: (dirty: string, config?: any) => string
}

// Markedの型定義
declare const marked: {
  parse: (markdown: string) => string
}

async function register({ registerHook, peertubeHelpers }: RegisterClientOptions) {
  console.log('Admin Message Plugin: Initializing...')

  // DOMPurifyとMarkedを動的にロード
  await loadExternalLibraries()

  // 動画ページでのフック
  registerHook({
    target: 'action:video-watch.video.loaded',
    handler: () => {
      console.log('Admin Message Plugin: Video loaded')
      displayAdminMessage('video')
    }
  })

  // ライブ配信については、動画と同じフックを使用
  // ページ変更時にも対応
  registerHook({
    target: 'action:router.navigation-end',
    handler: () => {
      console.log('Admin Message Plugin: Navigation end')
      // URLに基づいて動画またはライブ配信を判定
      setTimeout(() => {
        const currentPath = window.location.pathname
        if (currentPath.includes('/videos/watch/') || currentPath.includes('/w/')) {
          displayAdminMessage('video')
        }
      }, 500) // DOM更新を待つ
    }
  })

  // 外部ライブラリの動的ロード
  async function loadExternalLibraries(): Promise<void> {
    return new Promise((resolve, reject) => {
      let loadedCount = 0
      const totalLibraries = 2

      const checkComplete = () => {
        loadedCount++
        if (loadedCount === totalLibraries) {
          resolve()
        }
      }

      // DOMPurifyをロード
      const dompurifyScript = document.createElement('script')
      dompurifyScript.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.0.5/dist/purify.min.js'
      dompurifyScript.onload = checkComplete
      dompurifyScript.onerror = () => reject(new Error('Failed to load DOMPurify'))
      document.head.appendChild(dompurifyScript)

      // Markedをロード
      const markedScript = document.createElement('script')
      markedScript.src = 'https://cdn.jsdelivr.net/npm/marked@9.1.2/marked.min.js'
      markedScript.onload = checkComplete
      markedScript.onerror = () => reject(new Error('Failed to load Marked'))
      document.head.appendChild(markedScript)
    })
  }

  // 管理者メッセージを表示
  async function displayAdminMessage(type: 'video' | 'live') {
    try {
      const settings = await peertubeHelpers.getSettings()
      
      if (!settings.messageEnabled) {
        console.log('Admin Message Plugin: Message disabled')
        return
      }

      // ライブ配信かどうかの判定
      const isLive = document.querySelector('.video-info .live-badge') !== null ||
                     document.querySelector('[data-cy="video-live-status"]') !== null ||
                     window.location.pathname.includes('/live/')

      const actualType = isLive ? 'live' : 'video'
      const shouldShow = actualType === 'video' ? settings.showOnVideoWatch : settings.showOnLiveWatch
      
      if (!shouldShow) {
        console.log(`Admin Message Plugin: Message disabled for ${actualType}`)
        return
      }

      const message = settings.adminMessage
      // 型安全性を確保
      if (!message || typeof message !== 'string' || message.trim() === '') {
        console.log('Admin Message Plugin: No message configured')
        return
      }

      // 既存のメッセージを削除
      const existingMessage = document.querySelector('.admin-message-container')
      if (existingMessage) {
        existingMessage.remove()
      }

      // メッセージコンテナを作成
      const messageStyle = typeof settings.messageStyle === 'string' ? settings.messageStyle : 'info'
      const messageContainer = createMessageContainer(message, messageStyle)
      
      // 挿入ポイントを見つける
      const insertionPoint = findInsertionPoint()
      if (insertionPoint) {
        insertionPoint.parentNode?.insertBefore(messageContainer, insertionPoint.nextSibling)
        console.log('Admin Message Plugin: Message displayed')
      } else {
        console.warn('Admin Message Plugin: Could not find insertion point')
      }

    } catch (error) {
      console.error('Admin Message Plugin: Error displaying message:', error)
    }
  }

  // メッセージコンテナを作成
  function createMessageContainer(message: string, style: string): HTMLElement {
    const container = document.createElement('div')
    container.className = 'admin-message-container'
    
    // スタイルを適用
    const styleClasses = {
      info: 'admin-message-info',
      warning: 'admin-message-warning',
      success: 'admin-message-success',
      error: 'admin-message-error',
      default: 'admin-message-default'
    }
    
    container.className += ` ${styleClasses[style as keyof typeof styleClasses] || styleClasses.default}`

    // MarkdownをHTMLに変換してサニタイズ
    let processedMessage = message
    try {
      // Markdownを解析
      if (typeof marked !== 'undefined') {
        processedMessage = marked.parse(message)
      }
      
      // HTMLをサニタイズ
      if (typeof DOMPurify !== 'undefined') {
        processedMessage = DOMPurify.sanitize(processedMessage, {
          ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre'],
          ALLOWED_ATTR: ['href', 'title', 'target']
        })
      }
    } catch (error) {
      console.error('Admin Message Plugin: Error processing message:', error)
      processedMessage = message // フォールバック
    }

    container.innerHTML = `
      <div class="admin-message-header">
        <strong>📢 Administrator Message</strong>
      </div>
      <div class="admin-message-content">
        ${processedMessage}
      </div>
    `

    // CSS スタイルを追加
    addStyles()

    return container
  }

  // 挿入ポイントを見つける
  function findInsertionPoint(): Element | null {
    // 動画説明欄を探す（PeerTube v7の構造に基づく）
    const selectors = [
      '.video-info-description',
      '.video-description',
      '.description',
      '[data-title="Description"]',
      '.video-info .description',
      '.video-info'
    ]

    for (const selector of selectors) {
      const element = document.querySelector(selector)
      if (element) {
        return element
      }
    }

    // 最終的なフォールバック
    return document.querySelector('my-video-watch-info') || 
           document.querySelector('.video-watch') ||
           document.querySelector('main')
  }

  // CSSスタイルを追加
  function addStyles() {
    const styleId = 'admin-message-styles'
    if (document.getElementById(styleId)) {
      return // 既に追加済み
    }

    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      .admin-message-container {
        margin: 16px 0;
        padding: 16px;
        border-radius: 8px;
        border: 1px solid;
        font-family: inherit;
        line-height: 1.5;
      }

      .admin-message-header {
        margin-bottom: 8px;
        font-size: 14px;
        opacity: 0.8;
      }

      .admin-message-content {
        font-size: 14px;
      }

      .admin-message-content p:last-child {
        margin-bottom: 0;
      }

      .admin-message-content a {
        color: inherit;
        text-decoration: underline;
      }

      .admin-message-content code {
        background: rgba(0, 0, 0, 0.1);
        padding: 2px 4px;
        border-radius: 3px;
        font-family: monospace;
      }

      .admin-message-content pre {
        background: rgba(0, 0, 0, 0.1);
        padding: 8px;
        border-radius: 4px;
        overflow-x: auto;
      }

      .admin-message-info {
        background-color: #e3f2fd;
        border-color: #2196f3;
        color: #1565c0;
      }

      .admin-message-warning {
        background-color: #fff3e0;
        border-color: #ff9800;
        color: #e65100;
      }

      .admin-message-success {
        background-color: #e8f5e8;
        border-color: #4caf50;
        color: #2e7d32;
      }

      .admin-message-error {
        background-color: #ffebee;
        border-color: #f44336;
        color: #c62828;
      }

      .admin-message-default {
        background-color: #f5f5f5;
        border-color: #9e9e9e;
        color: #424242;
      }

      /* ダークモード対応 */
      @media (prefers-color-scheme: dark) {
        .admin-message-info {
          background-color: #0d47a1;
          border-color: #42a5f5;
          color: #bbdefb;
        }

        .admin-message-warning {
          background-color: #e65100;
          border-color: #ffb74d;
          color: #ffe0b2;
        }

        .admin-message-success {
          background-color: #1b5e20;
          border-color: #66bb6a;
          color: #c8e6c9;
        }

        .admin-message-error {
          background-color: #b71c1c;
          border-color: #ef5350;
          color: #ffcdd2;
        }

        .admin-message-default {
          background-color: #424242;
          border-color: #757575;
          color: #e0e0e0;
        }

        .admin-message-content code {
          background: rgba(255, 255, 255, 0.1);
        }

        .admin-message-content pre {
          background: rgba(255, 255, 255, 0.1);
        }
      }
    `
    document.head.appendChild(style)
  }
}

export { register }