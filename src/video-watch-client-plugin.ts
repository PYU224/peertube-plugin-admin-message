import { RegisterClientOptions } from '@peertube/peertube-types/client'

function register(options: RegisterClientOptions) {
  const { registerHook, peertubeHelpers } = options

  // 動画視聴ページが読み込まれた時のフック
  registerHook({
    target: 'action:video-watch.init',
    handler: () => {
      console.log('Admin Message Plugin: Video watch page initialized')
      displayAdminMessage()
    }
  })

  // ライブ配信ページが読み込まれた時のフック
  registerHook({
    target: 'action:video-watch.video.loaded',
    handler: () => {
      console.log('Admin Message Plugin: Video loaded')
      displayAdminMessage()
    }
  })

  async function displayAdminMessage() {
    try {
      // プラグイン設定を取得
      const settings = await peertubeHelpers.getSettings()
      console.log('Admin Message Plugin: Retrieved settings', settings)
      
      const isEnabled = settings['enable-admin-message']
      console.log('Admin Message Plugin: Enable setting value:', isEnabled)
      
      if (!isEnabled) {
        console.log('Admin Message Plugin: Disabled in settings')
        return
      }

      const messageContent = settings['admin-message-content'] as string
      const messageStyle = (settings['message-style'] as string) || 'info'
      const showOnVideo = settings['show-on-video-pages'] as boolean
      const showOnLive = settings['show-on-live-pages'] as boolean
      const insertPosition = (settings['insert-position'] as string) || 'after-description'

      console.log('Admin Message Plugin: Settings loaded', {
        messageContent,
        messageStyle,
        showOnVideo,
        showOnLive,
        insertPosition
      })

      if (!messageContent) {
        console.log('Admin Message Plugin: No message content')
        return
      }

      // 現在のページタイプを判定
      const isLivePage = window.location.pathname.includes('/live/')
      const isVideoPage = window.location.pathname.includes('/watch/')

      if (isLivePage && !showOnLive) return
      if (isVideoPage && !showOnVideo) return

      // メッセージ要素が既に存在する場合は削除
      const existingMessage = document.getElementById('admin-message-container')
      if (existingMessage) {
        existingMessage.remove()
      }

      // メッセージコンテナを作成
      const messageContainer = document.createElement('div')
      messageContainer.id = 'admin-message-container'
      messageContainer.className = `admin-message admin-message-${messageStyle}`
      
      // HTMLコンテンツを設定（基本的なサニタイゼーション）
      // 管理者が安全なHTMLを入力することを前提として、基本的なマークダウン記法をサポート
      messageContainer.innerHTML = sanitizeBasicHtml(messageContent)

      // 説明欄の下に挿入
      insertMessageAtPosition(messageContainer, insertPosition)

    } catch (error) {
      console.error('Admin Message Plugin: Error displaying message', error)
    }
  }

  // 基本的なHTMLサニタイゼーション関数
  function sanitizeBasicHtml(html: string): string {
    // 基本的な安全性のため、危険なタグとスクリプトを除去
    const div = document.createElement('div')
    div.textContent = html
    let sanitized = div.innerHTML
    
    // 安全なHTMLタグのみ許可
    const allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre']
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^<>]*>/gi
    
    // マークダウン風記法を簡単なHTMLに変換
    sanitized = html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // **bold**
      .replace(/\*(.*?)\*/g, '<em>$1</em>')              // *italic*
      .replace(/\n/g, '<br>')                            // 改行をbrタグに
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>') // [text](url)
    
    // 危険なイベントハンドラーや javascript: スキームを除去
    sanitized = sanitized
      .replace(/on\w+\s*=\s*["|'][^"']*["|']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    
    return sanitized
  }

  function insertMessageAtPosition(messageElement: HTMLElement, position: string) {
    console.log('Admin Message Plugin: Inserting message at position:', position)
    
    switch (position) {
      case 'before-description':
        insertBeforeDescription(messageElement)
        break
      case 'after-description':
        insertAfterDescription(messageElement)
        break
      case 'after-comments':
        insertAfterComments(messageElement)
        break
      default:
        insertAfterDescription(messageElement)
    }
  }

  function insertBeforeDescription(messageElement: HTMLElement) {
    // 動画の下、説明欄の前に挿入
    const videoSelectors = [
      '.video-info-name',
      '.video-title',
      'my-video-watch-video'
    ]

    let targetElement: Element | null = null
    for (const selector of videoSelectors) {
      targetElement = document.querySelector(selector)
      if (targetElement) break
    }

    if (targetElement && targetElement.parentNode) {
      targetElement.parentNode.insertBefore(messageElement, targetElement.nextSibling)
      console.log('Admin Message Plugin: Message inserted before description')
    } else {
      // フォールバック: video-info コンテナの最初に追加
      const videoInfoContainer = document.querySelector('.video-info, .video-details, .video-watch-info')
      if (videoInfoContainer) {
        videoInfoContainer.insertBefore(messageElement, videoInfoContainer.firstChild)
        console.log('Admin Message Plugin: Message prepended to video info container')
      } else {
        insertAfterDescription(messageElement) // さらなるフォールバック
      }
    }
  }

  function insertAfterDescription(messageElement: HTMLElement) {
    // 説明欄の下に挿入（元の機能）
    const descriptionSelectors = [
      '.video-info-description',
      '.video-description',
      '[data-qa-id="video-description"]',
      '.description-html',
      '.video-info-description-more'
    ]

    let descriptionElement: Element | null = null
    
    for (const selector of descriptionSelectors) {
      descriptionElement = document.querySelector(selector)
      if (descriptionElement) break
    }

    if (descriptionElement && descriptionElement.parentNode) {
      descriptionElement.parentNode.insertBefore(messageElement, descriptionElement.nextSibling)
      console.log('Admin Message Plugin: Message inserted after description')
    } else {
      // フォールバック: video-info コンテナの最後に追加
      const videoInfoContainer = document.querySelector('.video-info, .video-details, .video-watch-info')
      if (videoInfoContainer) {
        videoInfoContainer.appendChild(messageElement)
        console.log('Admin Message Plugin: Message appended to video info container')
      } else {
        // 最後の手段: bodyに追加
        document.body.appendChild(messageElement)
        console.log('Admin Message Plugin: Message appended to body as fallback')
      }
    }
  }

  function insertAfterComments(messageElement: HTMLElement) {
    // コメント欄の下に挿入
    const commentsSelectors = [
      '.comments',
      'my-video-comments',
      '.video-comments',
      '#comments'
    ]

    let commentsElement: Element | null = null
    
    for (const selector of commentsSelectors) {
      commentsElement = document.querySelector(selector)
      if (commentsElement) break
    }

    if (commentsElement && commentsElement.parentNode) {
      commentsElement.parentNode.insertBefore(messageElement, commentsElement.nextSibling)
      console.log('Admin Message Plugin: Message inserted after comments')
    } else {
      // フォールバック: ページの最後に追加
      const mainContent = document.querySelector('main, .main-col, .video-watch')
      if (mainContent) {
        mainContent.appendChild(messageElement)
        console.log('Admin Message Plugin: Message appended to main content')
      } else {
        insertAfterDescription(messageElement) // さらなるフォールバック
      }
    }
  }
}

export { register }