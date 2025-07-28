export interface AdminMessageSettings {
  'enable-admin-message': boolean;
  'message-language': SupportedLanguage;
  'message-title-ja': string;
  'message-title-en': string;
  'message-content-ja': string;
  'message-content-en': string;
  'message-style': MessageStyle;
  'show-close-button': boolean;
  'display-condition': DisplayCondition;
  'target-categories': string;
}

export type MessageStyle = 'info' | 'warning' | 'success' | 'error';
export type DisplayCondition = 'all' | 'category' | 'specific';
export type SupportedLanguage = 'ja' | 'en';

export interface AdminMessageData {
  enabled: boolean;
  title: string;
  content: string;
  style: MessageStyle;
  showCloseButton: boolean;
  displayCondition: DisplayCondition;
  targetCategories: string[];
  language: SupportedLanguage;
}