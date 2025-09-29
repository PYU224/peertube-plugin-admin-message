async function register({ registerSetting, settingsManager, storageManager, videoCategoryManager, videoLicenceManager, videoLanguageManager, peertubeHelpers }) {
  
  console.log('Admin Message Plugin: Server-side registration starting for PeerTube 7.2.1')

  // プラグイン設定を登録
  registerSetting({
    name: 'enable-admin-message',
    label: 'メッセージ表示を有効化',
    type: 'input-checkbox',
    default: true,
    descriptionHTML: '管理者メッセージの表示を有効または無効にします',
    private: false
  })

  registerSetting({
    name: 'admin-message-content',
    label: '管理者メッセージ内容',
    type: 'input-textarea',
    default: 'Welcome to our PeerTube instance!\n\nThis is an admin message.',
    descriptionHTML: '管理者メッセージの内容（Markdown記法と安全なHTMLがサポートされています）',
    private: false
  })

  registerSetting({
    name: 'message-style',
    label: 'メッセージスタイル',
    type: 'select',
    options: [
      { label: '情報（青）', value: 'info' },
      { label: '警告（オレンジ）', value: 'warning' },
      { label: '成功（緑）', value: 'success' },
      { label: 'エラー（赤）', value: 'error' },
      { label: 'デフォルト（グレー）', value: 'default' },
      { label: 'その他（透明・無色）', value: 'transparent' }
    ],
    default: 'info',
    descriptionHTML: '管理者メッセージの外観スタイル',
    private: false
  })

  registerSetting({
    name: 'show-on-video-pages',
    label: '動画ページに表示',
    type: 'input-checkbox',
    default: true,
    descriptionHTML: '通常の動画ページにメッセージを表示します',
    private: false
  })

  registerSetting({
    name: 'show-on-live-pages',
    label: 'ライブページに表示',
    type: 'input-checkbox',
    default: true,
    descriptionHTML: 'ライブ配信ページにメッセージを表示します',
    private: false
  })

  registerSetting({
    name: 'insert-position',
    label: 'メッセージ挿入位置',
    type: 'select',
    options: [
      { label: '動画のすぐ下〜説明欄の間', value: 'before-description' },
      { label: '説明欄の下〜コメント欄の間（デフォルト）', value: 'after-description' },
      { label: 'コメント欄のすぐ下', value: 'after-comments' }
    ],
    default: 'after-description',
    descriptionHTML: 'ページ内でのメッセージ表示位置を選択してください',
    private: false
  })

  registerSetting({
    name: 'font-size',
    label: '文字サイズ',
    type: 'select',
    options: [
      { label: '標準（16px）', value: 'normal' },
      { label: '大（18px）', value: 'large' },
      { label: '特大（20px）', value: 'extra-large' }
    ],
    default: 'normal',
    descriptionHTML: 'メッセージの文字サイズを選択してください',
    private: false
  })

  console.log('Admin Message Plugin: Server-side registration completed successfully')
}

async function unregister() {
  console.log('Admin Message Plugin: Server-side unregistration completed')
}

module.exports = {
  register,
  unregister
}