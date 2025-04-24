# Time Travel Camera

An example web application that uses Cloudflare Workers, R2 and OpenAI's image generation capabilities to transform your photos into different time periods.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/rickyrobinett/timetravel-camera)

## Overview

Time Travel Camera is a web-based camera application that runs on [Cloudflare Workers](https://workers.cloudflare.com/) and lets you take photos and "time travel" them to different historical and futuristic periods. The app features.
## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or newer)
- npm or yarn
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works fine)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler`)
- An [OpenAI API key](https://platform.openai.com/api-keys)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/rickyrobinett/timetravel-camera.git
cd timetravel-camera
```

2. Install dependencies:
```bash
npm install
```

3. Create an R2 bucket using Wrangler:
   ```bash
   npx wrangler r2 bucket create timetravel-images
   ```

4. Set up your environment variables by creating a `.dev.vars` file in the root directory with:
```
OPENAI_API_KEY=your_openai_api_key_here
```

5. Configure your `wrangler.jsonc` file if needed (the defaults should work for most cases)

## Development

To run the application in development mode:

```bash
npm run dev
```

This will start a local development server at `http://localhost:8787`. The Wrangler dev environment automatically provides HTTPS which is required for camera access.

## API Endpoints

The application provides the following API endpoints through Cloudflare Workers:

- `/api/health` - Health check endpoint
- `/api/time-periods` - Returns a list of available time periods
- `/api/time-travel` - Transforms an image to a selected time period using OpenAI's GPT-Image-1
- `/api/images/:filename` - Retrieves a stored image from R2 by filename
- `/api/images` - Lists all stored images in the R2 bucket

## Deployment

To deploy the application to Cloudflare Workers:

1. Make sure you're logged in to Cloudflare:
```bash
npx wrangler login
```

2. Deploy to Cloudflare Workers:
```bash
npm run deploy
```

3. Set your environment variable in Cloudflare:
```bash
npx wrangler secret put OPENAI_API_KEY
```

Once deployed, your application will be available at a `*.workers.dev` domain provided by Cloudflare, or you can configure a custom domain through the Cloudflare dashboard.

## Cloudflare Workers Configuration

This project uses Cloudflare Workers for serverless deployment. Key configuration:

- `wrangler.jsonc` - Contains Cloudflare Workers configuration
- `worker-configuration.d.ts` - TypeScript definitions for the Worker environment

For more information on Cloudflare Workers, see the [official documentation](https://developers.cloudflare.com/workers/).

## Generating Types

For generating/synchronizing types based on your Worker configuration:

```bash
npm run cf-typegen
```

## How It Works

1. The application captures an image from your device's camera
2. The image is sent to the Cloudflare Worker backend API with the selected time period
3. The backend uses OpenAI's gpt-image-1 model to transform the photo
4. The transformed image is stored in Cloudflare R2 for persistent storage
5. The image URL is returned to the frontend and displayed
6. Future requests for the same image are served directly from R2 storage

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: [Cloudflare Workers](https://workers.cloudflare.com/) (serverless platform)
- **Storage**: [Cloudflare R2](https://www.cloudflare.com/products/r2/) (object storage for transformed images)
- **Framework**: [Hono](https://hono.dev/) (lightweight web framework for Cloudflare Workers)
- **AI**: [OpenAI GPT-Image-1](https://platform.openai.com/docs/guides/images) model

## Resources

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Hono Documentation](https://hono.dev/)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

Vibe coded with ❤️ in Brooklyn NYC using Claude Code and Cursor