# 6529 ID Please Generator

A web application for generating 6529-style passport/ID images. This is a standalone, client-side application that can be easily deployed to any static hosting service.

## Features

- Generate 6529-style passport/ID images in the browser
- No server-side processing required
- Responsive design that works on all devices
- Download generated IDs as PNG files
- Customizable fields for personalization
- Matches the main 6529 website styling

## Project Structure

```text
.
├── assets/                    # Static assets
│   └── id-please-bg-large.jpg  # Background image for the ID
├── css/                       # Stylesheets
│   ├── main.css              # Core styles
│   └── id-generator.css      # ID generator specific styles
├── js/                        # JavaScript files
│   ├── main.js               # Global JavaScript
│   └── id-generator.js       # ID generator functionality
├── index.html                # Main application file
└── README.md                 # This file
```

## Quick Start

1. Clone this repository
2. Open `index.html` in a web browser
   - For local development, use a local server (e.g., `python3 -m http.server 8000`)
3. Fill in the form and click "Generate & Download"

## Deployment

This application can be deployed to any static hosting service. Here are instructions for popular platforms:

### Netlify

1. Install the Netlify CLI:

   ```bash
   npm install -g netlify-cli
   ```

2. Deploy:

   ```bash
   netlify deploy --prod
   ```

### Vercel

1. Install the Vercel CLI:

   ```bash
   npm install -g vercel
   ```

2. Deploy:

   ```bash
   vercel --prod
   ```

### GitHub Pages

1. Push the repository to GitHub
2. Go to Settings > Pages
3. Select the main branch and click "Save"

## Configuration

### Background Image

The default background image is located at `assets/id-please-bg-large.jpg`. To change it:

1. Replace the file at `assets/id-please-bg-large.jpg` with your own image
2. Recommended dimensions: 1095x768px for best results

### Customization

- **Styling**: Edit files in the `css/` directory
- **Functionality**: Modify `js/id-generator.js`
- **Content**: Update `index.html`

## Subdomain Setup

To serve this from a subdomain (e.g., `id.6529.com`):

1. Deploy the application to your preferred hosting service
2. In your DNS settings, add a CNAME record pointing to your hosting service

   ```dns
   id CNAME your-deployment.vercel.app
   ```

3. Configure your hosting service to recognize the custom domain

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Development

1. Clone the repository
2. Start a local server:

   ```bash
   # Using Python
   python3 -m http.server 8000
   ```

3. Open `http://localhost:8000` in your browser

## License

MIT

## Credits

6529 ID Please Generator - Part of the 6529 ecosystem
