import { RegisterClientOptions } from '@peertube/peertube-types/client'

function register(options: RegisterClientOptions) {
  const { registerHook, peertubeHelpers } = options

  console.log('Admin Message Plugin: Registering hooks for PeerTube 7.2.1')

  // 動画視聴ページが読み込まれた時のフック
  registerHook({
    target: 'action:video-watch.init',
    handler: () => {
      console.log('Admin Message Plugin: Video watch page initialized')
      // DOM の準備を待つためにより長い遅延
      setTimeout(() => displayAdminMessage(), 1500)
    }
  })

  // 動画データが読み込まれた時のフック
  registerHook({
    target: 'action:video-watch.video.loaded',
    handler: () => {
      console.log('Admin Message Plugin: Video loaded')
      setTimeout(() => displayAdminMessage(), 2000)
    }
  })

  // ページナビゲーション後のフック
  registerHook({
    target: 'action:router.navigation-end',
    handler: () => {
      if (window.location.pathname.includes('/watch/') || window.location.pathname.includes('/w/')) {
        console.log('Admin Message Plugin: Navigation ended on video page')
        setTimeout(() => displayAdminMessage(), 2500)
      }
    }
  })

  async function displayAdminMessage() {
    try {
      console.log('Admin Message Plugin: Starting displayAdminMessage()')
      
      // 既存のメッセージを削除
      const existingMessage = document.getElementById('admin-message-container')
      if (existingMessage) {
        existingMessage.remove()
        console.log('Admin Message Plugin: Removed existing message')
      }

      // プラグイン設定を取得
      let settings: any = {}
      
      try {
        // PeerTube 7.2.1 では getSettings() の挙動が安定している
        settings = await peertubeHelpers.getSettings()
        console.log('Admin Message Plugin: Raw settings object:', settings)
        console.log('Admin Message Plugin: Settings keys:', Object.keys(settings))
      } catch (error) {
        console.error('Admin Message Plugin: Error getting settings', error)
        return
      }

      // PeerTube 7.2.1 では設定キーにプラグイン名のプレフィックスが付く場合がある
      const getSettingValue = (key: string) => {
        return settings[key] ?? 
               settings[`admin-message-${key}`] ?? 
               settings[`peertube-plugin-admin-message-${key}`] ??
               null
      }

      const isEnabled = getSettingValue('enable-admin-message')
      console.log('Admin Message Plugin: Enable setting value:', isEnabled, typeof isEnabled)
      
      // boolean チェックを厳密に
      if (isEnabled === false || isEnabled === 'false') {
        console.log('Admin Message Plugin: Disabled in settings')
        return
      }

      const messageContent = getSettingValue('admin-message-content') as string
      const messageStyle = getSettingValue('message-style') as string || 'info'
      const fontSize = getSettingValue('font-size') as string || 'normal'
      const showOnVideo = getSettingValue('show-on-video-pages') ?? true
      const showOnLive = getSettingValue('show-on-live-pages') ?? true
      const insertPosition = getSettingValue('insert-position') as string || 'after-description'

      console.log('Admin Message Plugin: Processed settings:', {
        isEnabled,
        messageContent: messageContent?.substring(0, 50) + '...',
        messageStyle,
        fontSize,
        showOnVideo,
        showOnLive,
        insertPosition
      })

      if (!messageContent || messageContent.trim() === '') {
        console.log('Admin Message Plugin: No message content found')
        return
      }

      // 現在のページタイプを判定
      const isLivePage = window.location.pathname.includes('/live/')
      const isVideoPage = window.location.pathname.includes('/watch/') || window.location.pathname.includes('/w/')

      console.log('Admin Message Plugin: Page type check', { 
        isLivePage, 
        isVideoPage, 
        pathname: window.location.pathname,
        showOnVideo,
        showOnLive
      })

      if (isLivePage && showOnLive === false) {
        console.log('Admin Message Plugin: Live page but live display disabled')
        return
      }
      if (isVideoPage && showOnVideo === false) {
        console.log('Admin Message Plugin: Video page but video display disabled')
        return
      }

      // PeerTube 7.2.1 の DOM 構造を確認
      await waitForDOMReady()

      // メッセージコンテナを作成
      const messageContainer = document.createElement('div')
      messageContainer.id = 'admin-message-container'
      
      // スタイルクラスを設定
      let className = `admin-message admin-message-${messageStyle}`
      
      // 文字サイズクラスを追加
      if (fontSize === 'large') {
        className += ' admin-message-large'
      } else if (fontSize === 'extra-large') {
        className += ' admin-message-extra-large'
      }
      
      messageContainer.className = className
      messageContainer.innerHTML = sanitizeBasicHtml(messageContent)

      console.log('Admin Message Plugin: Created message container')

      // メッセージを挿入
      const inserted = await insertMessageAtPosition(messageContainer, insertPosition)
      
      if (inserted) {
        console.log('Admin Message Plugin: Message successfully inserted')
      } else {
        console.error('Admin Message Plugin: Failed to insert message')
      }

    } catch (error) {
      console.error('Admin Message Plugin: Error in displayAdminMessage', error)
    }
  }

  // DOM の準備を待つ関数
  async function waitForDOMReady(): Promise<void> {
    const maxAttempts = 10
    let attempts = 0

    return new Promise((resolve) => {
      const checkDOM = () => {
        attempts++
        
        // PeerTube 7.2.1 の主要な要素をチェック
        const videoInfo = document.querySelector('my-video-watch-video-info')
        const videoDetails = document.querySelector('.video-info')
        const description = document.querySelector('.video-info-description')
        
        console.log(`Admin Message Plugin: DOM check attempt ${attempts}:`, {
          videoInfo: !!videoInfo,
          videoDetails: !!videoDetails,
          description: !!description
        })

        if (videoInfo || videoDetails || description || attempts >= maxAttempts) {
          resolve()
        } else {
          setTimeout(checkDOM, 500)
        }
      }
      
      checkDOM()
    })
  }

  // 基本的なHTMLサニタイゼーション関数
  function sanitizeBasicHtml(html: string): string {
    let sanitized = html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    
    sanitized = sanitized
      .replace(/on\w+\s*=\s*["|'][^"']*["|']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    
    return sanitized
  }

  async function insertMessageAtPosition(messageElement: HTMLElement, position: string): Promise<boolean> {
    console.log('Admin Message Plugin: Attempting to insert at position:', position)
    
    // PeerTube 7.2.1 の DOM 構造をログ出力
    logDOMStructure()
    
    switch (position) {
      case 'before-description':
        return insertBeforeDescription(messageElement)
      case 'after-description':
        return insertAfterDescription(messageElement)
      case 'after-comments':
        return insertAfterComments(messageElement)
      default:
        return insertAfterDescription(messageElement)
    }
  }

  function logDOMStructure() {
    console.log('Admin Message Plugin: Current DOM structure:')
    
    // PeerTube 7.2.1 の主要な要素を確認
    const selectors = [
      'my-video-watch-video-info',
      '.video-info',
      '.video-info-description',
      '.video-info-name',
      '.video-info-first-row',
      'my-video-description',
      'my-video-comments',
      '.comments'
    ]

    selectors.forEach(selector => {
      const element = document.querySelector(selector)
      if (element) {
        console.log(`✓ Found: ${selector}`, element)
      } else {
        console.log(`✗ Not found: ${selector}`)
      }
    })
  }

  function insertBeforeDescription(messageElement: HTMLElement): boolean {
    // PeerTube 7.2.1 用のセレクタ
    const selectors = [
      '.video-info-name',
      '.video-info-first-row',
      'my-video-watch-video-info .video-info-name'
    ]

    for (const selector of selectors) {
      const targetElement = document.querySelector(selector)
      if (targetElement && targetElement.parentNode) {
        targetElement.parentNode.insertBefore(messageElement, targetElement.nextSibling)
        console.log(`Admin Message Plugin: Inserted before description using ${selector}`)
        return true
      }
    }

    // フォールバック
    const videoInfo = document.querySelector('my-video-watch-video-info, .video-info')
    if (videoInfo) {
      videoInfo.appendChild(messageElement)
      console.log('Admin Message Plugin: Appended to video info container')
      return true
    }

    return false
  }

  function insertAfterDescription(messageElement: HTMLElement): boolean {
    // PeerTube 7.2.1 用のセレクタ
    const selectors = [
      '.video-info-description',
      'my-video-description',
      '.video-info-description-more'
    ]

    for (const selector of selectors) {
      const descriptionElement = document.querySelector(selector)
      if (descriptionElement && descriptionElement.parentNode) {
        descriptionElement.parentNode.insertBefore(messageElement, descriptionElement.nextSibling)
        console.log(`Admin Message Plugin: Inserted after description using ${selector}`)
        return true
      }
    }

    // フォールバック: video-info コンテナの最後に追加
    const videoInfo = document.querySelector('my-video-watch-video-info, .video-info')
    if (videoInfo) {
      videoInfo.appendChild(messageElement)
      console.log('Admin Message Plugin: Appended to video info container as fallback')
      return true
    }

    // 最終フォールバック
    const mainCol = document.querySelector('.main-col, main')
    if (mainCol) {
      // コメント欄の前に挿入を試みる
      const comments = document.querySelector('my-video-comments, .comments')
      if (comments) {
        mainCol.insertBefore(messageElement, comments)
        console.log('Admin Message Plugin: Inserted before comments as final fallback')
      } else {
        mainCol.appendChild(messageElement)
        console.log('Admin Message Plugin: Appended to main column as ultimate fallback')
      }
      return true
    }

    console.error('Admin Message Plugin: Could not find suitable insertion point')
    return false
  }

  function insertAfterComments(messageElement: HTMLElement): boolean {
    const selectors = [
      'my-video-comments',
      '.comments',
      '.video-comments'
    ]

    for (const selector of selectors) {
      const commentsElement = document.querySelector(selector)
      if (commentsElement && commentsElement.parentNode) {
        commentsElement.parentNode.insertBefore(messageElement, commentsElement.nextSibling)
        console.log(`Admin Message Plugin: Inserted after comments using ${selector}`)
        return true
      }
    }

    // フォールバック
    const mainCol = document.querySelector('.main-col, main')
    if (mainCol) {
      mainCol.appendChild(messageElement)
      console.log('Admin Message Plugin: Appended to main column')
      return true
    }

    return false
  }
}

export { register }