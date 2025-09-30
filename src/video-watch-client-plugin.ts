import { RegisterClientOptions } from '@peertube/peertube-types/client'

function register(options: RegisterClientOptions) {
  const { registerHook, peertubeHelpers } = options

  console.log('Admin Message Plugin: Registering hooks for PeerTube 7.2.1')

  // CSSを強制的に読み込む
  const loadCSS = () => {
    const cssId = 'admin-message-styles'
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link')
      link.id = cssId
      link.rel = 'stylesheet'
      link.href = '/plugins/peertube-plugin-admin-message/admin-message-styles.css'
      document.head.appendChild(link)
      console.log('Admin Message Plugin: CSS loaded')
    }
  }

  // 動画視聴ページが読み込まれた時のフック
  registerHook({
    target: 'action:video-watch.init',
    handler: () => {
      console.log('Admin Message Plugin: Video watch page initialized')
      loadCSS()
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
        loadCSS()
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
        settings = await peertubeHelpers.getSettings()
        console.log('Admin Message Plugin: Raw settings object:', settings)
        console.log('Admin Message Plugin: Settings keys:', Object.keys(settings))
      } catch (error) {
        console.error('Admin Message Plugin: Error getting settings', error)
        return
      }

      // 設定値を取得（直接アクセス）
      const isEnabled = settings['enable-admin-message']
      const messageContent = settings['admin-message-content']
      const messageStyle = settings['message-style'] || 'info'
      const fontSize = settings['font-size'] || 'normal'
      const showOnVideo = settings['show-on-video-pages']
      const showOnLive = settings['show-on-live-pages']
      const insertPosition = settings['insert-position'] || 'after-description'

      console.log('Admin Message Plugin: Processed settings:', {
        isEnabled,
        messageContent: messageContent ? (messageContent.substring(0, 50) + '...') : 'empty',
        messageStyle,
        fontSize,
        showOnVideo,
        showOnLive,
        insertPosition
      })

      // メッセージが無効の場合
      if (isEnabled === false || isEnabled === 'false' || isEnabled === 0) {
        console.log('Admin Message Plugin: Disabled in settings')
        return
      }

      // メッセージ内容が空の場合
      if (!messageContent || messageContent.trim() === '') {
        console.log('Admin Message Plugin: No message content found')
        return
      }

      // 現在のページタイプを判定
      const isLivePage = window.location.pathname.includes('/live/')
      const isVideoPage = window.location.pathname.includes('/watch/') || window.location.pathname.includes('/w/')

      // ページタイプごとの表示設定をチェック
      if (isLivePage && (showOnLive === false || showOnLive === 'false' || showOnLive === 0)) {
        console.log('Admin Message Plugin: Live page but live display disabled')
        return
      }
      if (isVideoPage && (showOnVideo === false || showOnVideo === 'false' || showOnVideo === 0)) {
        console.log('Admin Message Plugin: Video page but video display disabled')
        return
      }

      // DOM の準備を待つ
      await waitForDOMReady()

      // メッセージコンテナを作成
      const messageContainer = document.createElement('div')
      messageContainer.id = 'admin-message-container'
      
      // クラスを設定（CSSとインラインスタイルの両方を使用）
      let className = `admin-message admin-message-${messageStyle}`
      if (fontSize === 'large') {
        className += ' admin-message-large'
      } else if (fontSize === 'extra-large') {
        className += ' admin-message-extra-large'
      }
      messageContainer.className = className
      
      // インラインスタイルを強制適用
      const inlineStyles = getInlineStyles(messageStyle, fontSize)
      messageContainer.setAttribute('style', inlineStyles)
      console.log('Admin Message Plugin: Applied inline styles:', inlineStyles)
      
      // HTMLコンテンツを設定
      messageContainer.innerHTML = parseMarkdownToHtml(messageContent)

      console.log('Admin Message Plugin: Created message container')

      // メッセージを挿入
      const inserted = await insertMessageAtPosition(messageContainer, insertPosition)
      
      if (inserted) {
        console.log('Admin Message Plugin: Message successfully inserted')
        
        // 挿入後の即時確認
        const insertedElement = document.getElementById('admin-message-container')
        if (insertedElement) {
          const computedStyle = window.getComputedStyle(insertedElement)
          console.log('Admin Message Plugin: Computed styles:', {
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            opacity: computedStyle.opacity,
            backgroundColor: computedStyle.backgroundColor,
            color: computedStyle.color
          })
        }
        
        // 挿入後の確認（1秒後）
        setTimeout(() => {
          const verifyElement = document.getElementById('admin-message-container')
          if (verifyElement) {
            const rect = verifyElement.getBoundingClientRect()
            console.log('Admin Message Plugin: Message verification after 1 second:', {
              exists: true,
              visible: rect.width > 0 && rect.height > 0,
              position: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
            })
          } else {
            console.error('Admin Message Plugin: Message disappeared after insertion!')
          }
        }, 1000)
      } else {
        console.error('Admin Message Plugin: Failed to insert message')
      }

    } catch (error) {
      console.error('Admin Message Plugin: Error in displayAdminMessage', error)
    }
  }

  // インラインスタイルを生成する関数（より強力な!important適用）
  function getInlineStyles(messageStyle: string, fontSize: string): string {
    // フォントサイズ設定
    const fontSizeMap: { [key: string]: string } = {
      'normal': '16px',
      'large': '18px',
      'extra-large': '20px'
    }
    const selectedFontSize = fontSizeMap[fontSize] || '16px'

    // スタイル別の色設定
    const styleConfigs: { [key: string]: { bg: string, border: string, color: string } } = {
      'info': {
        bg: '#e3f2fd',
        border: '#2196f3',
        color: '#0d47a1'
      },
      'warning': {
        bg: '#fff3e0',
        border: '#ff9800',
        color: '#e65100'
      },
      'success': {
        bg: '#e8f5e8',
        border: '#4caf50',
        color: '#2e7d32'
      },
      'error': {
        bg: '#ffebee',
        border: '#f44336',
        color: '#c62828'
      },
      'transparent': {
        bg: 'transparent',
        border: 'transparent',
        color: 'inherit'
      },
      'default': {
        bg: '#f5f5f5',
        border: '#757575',
        color: '#424242'
      }
    }

    const config = styleConfigs[messageStyle] || styleConfigs['default']

    // 基本スタイル
    let styles = [
      'display: block !important',
      'visibility: visible !important',
      'opacity: 1 !important',
      'margin: 15px 0 !important',
      'padding: 15px !important',
      'border-radius: 8px !important',
      'position: relative !important',
      'line-height: 1.6 !important',
      'z-index: 1000 !important',
      'width: auto !important',
      'max-width: 100% !important',
      'height: auto !important',
      'box-sizing: border-box !important',
      `font-size: ${selectedFontSize} !important`,
      `background-color: ${config.bg} !important`,
      `color: ${config.color} !important`
    ]

    // transparent スタイルの特別処理
    if (messageStyle === 'transparent') {
      styles.push('border-left: none !important')
      styles.push('padding-left: 0 !important')
    } else {
      styles.push(`border-left: 4px solid ${config.border} !important`)
    }

    return styles.join('; ')
  }

  // DOM の準備を待つ関数（待機時間を延長）
  async function waitForDOMReady(): Promise<void> {
    const maxAttempts = 20  // 10から20に増加
    let attempts = 0

    return new Promise((resolve) => {
      const checkDOM = () => {
        attempts++
        
        const videoInfo = document.querySelector('my-video-watch-video-info')
        const videoDetails = document.querySelector('.video-info')
        const description = document.querySelector('.video-info-description')
        const mainCol = document.querySelector('.main-col, main')
        
        console.log(`Admin Message Plugin: DOM check attempt ${attempts}:`, {
          videoInfo: !!videoInfo,
          videoDetails: !!videoDetails,
          description: !!description,
          mainCol: !!mainCol
        })

        if (videoInfo || videoDetails || description || mainCol || attempts >= maxAttempts) {
          resolve()
        } else {
          setTimeout(checkDOM, 300)  // 500msから300msに短縮
        }
      }
      
      checkDOM()
    })
  }

  // Markdownパーサー関数
  function parseMarkdownToHtml(markdown: string): string {
    if (!markdown) return ''
    
    let html = markdown
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    // 見出し
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
    
    // 太字
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    
    // リンク
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    
    // URL自動リンク（メールアドレスも）
    html = html.replace(/(^|[^"])(https?:\/\/[^\s<>"']+)/gi, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
    html = html.replace(/(^|[^">])([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1<a href="mailto:$2">$2</a>')
    
    // リスト
    html = html.replace(/^\- (.+)$/gm, '<li>$1</li>')
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
    
    // 改行を<br>に
    html = html.replace(/\n/g, '<br>')
    
    return html
  }

  async function insertMessageAtPosition(messageElement: HTMLElement, position: string): Promise<boolean> {
    console.log('Admin Message Plugin: Attempting to insert at position:', position)
    
    logDOMStructure()
    
    // 複数回試行する
    const maxRetries = 3
    for (let i = 0; i < maxRetries; i++) {
      let success = false
      
      switch (position) {
        case 'before-description':
          success = insertBeforeDescription(messageElement)
          break
        case 'after-description':
          success = insertAfterDescription(messageElement)
          break
        case 'after-comments':
          success = insertAfterComments(messageElement)
          break
        default:
          success = insertAfterDescription(messageElement)
      }
      
      if (success) {
        return true
      }
      
      console.log(`Admin Message Plugin: Retry ${i + 1}/${maxRetries}`)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    return false
  }

  function logDOMStructure() {
    console.log('Admin Message Plugin: Current DOM structure:')
    
    const selectors = [
      'my-video-watch-video-info',
      '.video-info',
      '.video-info-description',
      '.video-info-name',
      '.video-info-first-row',
      'my-video-description',
      'my-video-comments',
      '.comments',
      '.main-col',
      'main'
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
    const selectors = [
      '.video-info-first-row',
      '.video-info-name',
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

    return insertFallback(messageElement)
  }

  function insertAfterDescription(messageElement: HTMLElement): boolean {
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

    return insertFallback(messageElement)
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

    return insertFallback(messageElement)
  }

  function insertFallback(messageElement: HTMLElement): boolean {
    // フォールバック: my-video-watch-video-info に追加
    const videoInfo = document.querySelector('my-video-watch-video-info')
    if (videoInfo) {
      videoInfo.appendChild(messageElement)
      console.log('Admin Message Plugin: Appended to my-video-watch-video-info')
      return true
    }

    // フォールバック2: .video-info に追加
    const videoInfoDiv = document.querySelector('.video-info')
    if (videoInfoDiv) {
      videoInfoDiv.appendChild(messageElement)
      console.log('Admin Message Plugin: Appended to .video-info')
      return true
    }

    // フォールバック3: main-col に追加
    const mainCol = document.querySelector('.main-col, main')
    if (mainCol) {
      const comments = document.querySelector('my-video-comments, .comments')
      if (comments) {
        mainCol.insertBefore(messageElement, comments)
        console.log('Admin Message Plugin: Inserted before comments in main-col')
      } else {
        mainCol.appendChild(messageElement)
        console.log('Admin Message Plugin: Appended to main-col')
      }
      return true
    }

    console.error('Admin Message Plugin: Could not find suitable insertion point')
    return false
  }
}

export { register }