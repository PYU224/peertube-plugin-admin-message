# PeerTube Admin Message Plugin

PeerTube v7以降で動画・配信ページの説明欄下にインスタンス管理者からのメッセージを表示するプラグインです。<br>
上手い使い道はあまり思いつかないんですが、何かに使ってくれれば幸いです。

## 機能

- 🎯 動画・ライブ配信ページでの管理者メッセージ表示
- 📝 Markdown & HTML対応（サニタイズ付き）
- 🎨 5種類のメッセージスタイル（Info, Warning, Success, Error, Default）
- 🌙 ダークモード対応
- ⚙️ 柔軟な表示設定（動画/ライブ個別切り替え可能）

## インストール

1. PeerTubeの管理画面にアクセス
2. **プラグイン** → **プラグインを探す/インストール** へ移動
3. このプラグインをアップロードまたはNPMからインストール

## 設定

管理画面の **プラグイン** → **インストール済み** から以下の設定が可能です：

### 基本設定
- **Enable Admin Message**: メッセージ表示のON/OFF
- **Admin Message Content**: 表示するメッセージ内容（Markdown/HTML対応）

### 表示設定
- **Message Style**: メッセージの見た目（Info/Warning/Success/Error/Default）
- **Show on Video Pages**: 動画ページでの表示ON/OFF
- **Show on Live Pages**: ライブ配信ページでの表示ON/OFF

## 使用例

### シンプルなテキストメッセージ
```
ようこそ我々のPeerTubeインスタンスへ！
```

### Markdownを使用
```markdown
## 重要なお知らせ

**メンテナンス予定**: 2024年12月25日 2:00-4:00 JST

詳細は [こちら](https://example.com/maintenance) をご確認ください。
```

### HTMLを使用
```html
<h3>🎉 新機能リリース</h3>
<p>新しい<strong>ライブ配信機能</strong>が追加されました！</p>
<ul>
  <li>HD画質対応</li>
  <li>チャット機能</li>
  <li>配信予約</li>
</ul>
```

## セキュリティ

- **DOMPurify**によるHTMLサニタイゼーション
- 許可されたHTMLタグ・属性のみ使用可能
- XSS攻撃対策済み

## ライセンス

AGPL-3.0 license

## サポート

問題や要望は [GitHub Issues](https://github.com/PYU224/peertube-plugin-admin-message/issues) まで。

## 変更履歴

増えてきたらChangelogに内容を移しますね。

### v1.0.0
- 初回リリース
- 基本的なメッセージ表示機能
- Markdown/HTML対応
- 5種類のスタイル
- ダークモード対応# peertube-plugin-admin-message
