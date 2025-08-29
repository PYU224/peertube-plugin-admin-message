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
      
      // Markdownを完全にパースしてHTMLに変換
      messageContainer.innerHTML = parseMarkdownToHtml(messageContent)

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

  // 完全なMarkdownパーサー関数
  function parseMarkdownToHtml(markdown: string): string {
    if (!markdown) return ''
    
    // HTMLタグを一時的にエスケープ（後で必要なものだけ復元）
    let html = markdown
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    // コードブロックを保護
    const codeBlocks: string[] = []
    html = html.replace(/```[\s\S]*?```/g, (match) => {
      codeBlocks.push(match)
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`
    })
    
    // インラインコードを保護
    const inlineCodes: string[] = []
    html = html.replace(/`[^`]+`/g, (match) => {
      inlineCodes.push(match)
      return `__INLINE_CODE_${inlineCodes.length - 1}__`
    })
    
    // 見出し (h1-h6)
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')
    
    // 水平線
    html = html.replace(/^---+$/gm, '<hr>')
    html = html.replace(/^\*\*\*+$/gm, '<hr>')
    
    // リスト処理
    // 番号付きリスト
    html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<li>$2</li>')
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
      return '<ol>' + match + '</ol>'
    })
    
    // 箇条書きリスト（ネストも考慮）
    const processUnorderedLists = (text: string): string => {
      const lines = text.split('\n')
      const result: string[] = []
      let inList = false
      let listDepth = 0
      
      for (const line of lines) {
        const match = line.match(/^(\s*)[-*+]\s+(.+)$/)
        if (match) {
          const indent = match[1].length
          const content = match[2]
          const depth = Math.floor(indent / 2)
          
          if (!inList) {
            result.push('<ul>')
            inList = true
            listDepth = depth
          }
          
          while (listDepth < depth) {
            result.push('<ul>')
            listDepth++
          }
          while (listDepth > depth) {
            result.push('</ul>')
            listDepth--
          }
          
          result.push(`<li>${content}</li>`)
        } else {
          if (inList) {
            while (listDepth >= 0) {
              result.push('</ul>')
              listDepth--
            }
            inList = false
            listDepth = 0
          }
          result.push(line)
        }
      }
      
      if (inList) {
        while (listDepth >= 0) {
          result.push('</ul>')
          listDepth--
        }
      }
      
      return result.join('\n')
    }
    
    html = processUnorderedLists(html)
    
    // 引用
    html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>')
    html = html.replace(/(<blockquote>.*<\/blockquote>\n?)+/g, (match) => {
      const content = match.replace(/<\/?blockquote>/g, '')
      return '<blockquote>' + content + '</blockquote>'
    })
    
    // テーブル（基本的なサポート）
    const processTable = (text: string): string => {
      const lines = text.split('\n')
      let result = text
      let inTable = false
      let tableContent: string[] = []
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.includes('|')) {
          if (!inTable) {
            inTable = true
            tableContent = []
          }
          tableContent.push(line)
        } else if (inTable) {
          // テーブル終了、変換実行
          if (tableContent.length >= 2) {
            const headerLine = tableContent[0]
            const separatorLine = tableContent[1]
            
            if (separatorLine.match(/^\|?[\s-:|]+\|?$/)) {
              let tableHtml = '<table><thead><tr>'
              const headers = headerLine.split('|').filter(h => h.trim())
              headers.forEach(h => {
                tableHtml += `<th>${h.trim()}</th>`
              })
              tableHtml += '</tr></thead><tbody>'
              
              for (let j = 2; j < tableContent.length; j++) {
                const cells = tableContent[j].split('|').filter(c => c.trim())
                if (cells.length > 0) {
                  tableHtml += '<tr>'
                  cells.forEach(c => {
                    tableHtml += `<td>${c.trim()}</td>`
                  })
                  tableHtml += '</tr>'
                }
              }
              tableHtml += '</tbody></table>'
              
              const tableText = tableContent.join('\n')
              result = result.replace(tableText, tableHtml)
            }
          }
          inTable = false
          tableContent = []
        }
      }
      
      return result
    }
    
    html = processTable(html)
    
    // 強調表現
    // 太字（**text** または __text__）
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>')
    
    // イタリック（*text* または _text_）
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>')
    
    // 取り消し線（~~text~~）
    html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>')
    
    // リンク処理
    // [text](url) 形式
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    
    // 画像
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%;">')
    
    // 自動リンク化
    // URL
    html = html.replace(/(^|[^"])(https?:\/\/[^\s<>"']+)/gi, '$1<a href="$2" target="_blank" rel="noopener">$2</a>')
    html = html.replace(/\b(www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s<>"']*)?)/gi, '<a href="http://$1" target="_blank" rel="noopener">$1</a>')
    
    // メールアドレス
    html = html.replace(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})\b/gi, '<a href="mailto:$1">$1</a>')
    
    // コードブロックを復元
    codeBlocks.forEach((code, index) => {
      const codeContent = code.replace(/```(\w*)\n?/, '').replace(/```$/, '')
      const language = code.match(/```(\w+)/)?.[1] || ''
      const escapedCode = codeContent
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      html = html.replace(
        `__CODE_BLOCK_${index}__`,
        `<pre><code class="language-${language}">${escapedCode}</code></pre>`
      )
    })
    
    // インラインコードを復元
    inlineCodes.forEach((code, index) => {
      const codeContent = code.slice(1, -1)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      html = html.replace(
        `__INLINE_CODE_${index}__`,
        `<code>${codeContent}</code>`
      )
    })
    
    // 改行処理
    // 段落の処理
    html = html.split('\n\n').map(paragraph => {
      // 既にHTMLタグで囲まれている場合はそのまま
      if (paragraph.match(/^<[^>]+>/)) {
        return paragraph
      }
      // 空行でない場合は<p>タグで囲む
      if (paragraph.trim()) {
        return `<p>${paragraph.replace(/\n/g, '<br>')}</p>`
      }
      return paragraph
    }).join('\n')
    
    // セキュリティ: 危険なタグやイベントハンドラを除去
    html = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
    
    return html
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