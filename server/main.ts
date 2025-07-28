import {
  RegisterServerOptions
} from '@peertube/peertube-types'

async function register(options: RegisterServerOptions) {
  const { registerSetting } = options

  // プラグイン設定の登録
  registerSetting({
    name: 'adminMessage',
    label: 'Admin Message',
    type: 'input-textarea',
    private: false,
    default: '',
    descriptionHTML: 'Message to display below video/live descriptions. Supports Markdown and HTML (sanitized).'
  })

  registerSetting({
    name: 'messageEnabled',
    label: 'Enable Admin Message',
    type: 'input-checkbox',
    private: false,
    default: true,
    descriptionHTML: 'Toggle to enable/disable the admin message display.'
  })

  registerSetting({
    name: 'messageStyle',
    label: 'Message Style',
    type: 'select',
    private: false,
    default: 'info',
    options: [
      { label: 'Info (Blue)', value: 'info' },
      { label: 'Warning (Orange)', value: 'warning' },
      { label: 'Success (Green)', value: 'success' },
      { label: 'Error (Red)', value: 'error' },
      { label: 'Default', value: 'default' }
    ],
    descriptionHTML: 'Choose the visual style for the admin message.'
  })

  registerSetting({
    name: 'showOnVideoWatch',
    label: 'Show on Video Watch Pages',
    type: 'input-checkbox',
    private: false,
    default: true,
    descriptionHTML: 'Display the message on video watch pages.'
  })

  registerSetting({
    name: 'showOnLiveWatch',
    label: 'Show on Live Watch Pages',
    type: 'input-checkbox',
    private: false,
    default: true,
    descriptionHTML: 'Display the message on live stream watch pages.'
  })
}

async function unregister() {
  return
}

// CommonJS形式でエクスポート
module.exports = {
  register,
  unregister
}