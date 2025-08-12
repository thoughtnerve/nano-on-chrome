# Chrome AI Assistant Extension

A Chrome extension that demonstrates the power of on-device AI using Chrome's built-in Gemini Nano model via the Prompt API.

## Features

- **💬 Chat Interface**: Modern chatbot-style interface with message bubbles and smooth animations
- **🔒 Complete Privacy**: All processing happens locally on your device - your data never leaves your computer
- **⚡ Instant Responses**: No network latency since AI runs directly in your browser
- **🌐 Page Context**: Automatically analyzes current webpage content to answer questions about what you're reading
- **📱 Offline Ready**: Works perfectly without an internet connection
- **🎨 shadcn/ui Design**: Beautiful, modern interface following shadcn/ui design principles
- **🎛️ Model Controls**: Adjustable temperature and top-k settings for fine-tuning responses

## Requirements

- Chrome 138+ (currently in development)
- At least 22 GB of free storage space
- GPU with more than 4 GB of VRAM
- Windows 10/11, macOS 13+, or Linux

## Installation

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the extension
4. Open Chrome and go to `chrome://extensions/`
5. Enable "Developer mode"
6. Click "Load unpacked" and select the `dist` folder

## Usage

1. Click the extension icon to open the AI assistant
2. Start chatting! The AI can help with:
   - Summarizing the current webpage
   - Answering questions about page content
   - General writing and analysis tasks
   - Creative projects

## Privacy & Security

This extension prioritizes your privacy:
- **Zero data transmission**: Everything processes locally on your device
- **No cloud dependencies**: Works completely offline
- **No data storage**: Conversations aren't saved or logged anywhere
- **Open source**: Full transparency in how your data is handled

## Technology

- **Gemini Nano**: Google's on-device AI model
- **Chrome Prompt API**: Direct access to built-in AI capabilities
- **shadcn/ui**: Modern, accessible design system
- **Vanilla JavaScript**: No heavy frameworks, optimized for performance

## Development

```bash
# Install dependencies
npm install

# Build for development
npm run build

# The built extension will be in the `dist` directory
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

Licensed under the Apache 2.0 License.