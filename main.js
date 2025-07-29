async function register({ registerSetting, settingsManager, storageManager, videoCategoryManager, videoLicenceManager, videoLanguageManager, peertubeHelpers }) {
  
  // プラグイン設定を登録
  registerSetting({
    name: 'enable-admin-message',
    label: 'Enable Admin Message',
    type: 'input-checkbox',
    default: true,
    descriptionHTML: 'Enable or disable the admin message display'
  })

  registerSetting({
    name: 'admin-message-content',
    label: 'Admin Message Content',
    type: 'input-textarea',
    default: 'Welcome to our PeerTube instance!',
    descriptionHTML: 'The content of the admin message (supports Markdown and safe HTML)',
    private: false
  })

  registerSetting({
    name: 'message-style',
    label: 'Message Style',
    type: 'select',
    options: [
      { label: 'Info', value: 'info' },
      { label: 'Warning', value: 'warning' },
      { label: 'Success', value: 'success' },
      { label: 'Error', value: 'error' },
      { label: 'Default', value: 'default' }
    ],
    default: 'info',
    descriptionHTML: 'The visual style of the admin message'
  })

  registerSetting({
    name: 'show-on-video-pages',
    label: 'Show on Video Pages',
    type: 'input-checkbox',
    default: true,
    descriptionHTML: 'Display the message on regular video pages'
  })

  registerSetting({
    name: 'show-on-live-pages',
    label: 'Show on Live Pages',
    type: 'input-checkbox',
    default: true,
    descriptionHTML: 'Display the message on live streaming pages'
  })

  console.log('PeerTube Admin Message Plugin registered successfully')
}

async function unregister() {
  console.log('PeerTube Admin Message Plugin unregistered')
}

module.exports = {
  register,
  unregister
}