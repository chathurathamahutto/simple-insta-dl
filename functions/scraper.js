// ============================================
// FILE: functions/scraper.js
// ============================================

const fetch = require('node-fetch');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Get Instagram URL from query parameter
    const url = event.queryStringParameters?.url;

    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Instagram URL is required. Use ?url=YOUR_INSTAGRAM_URL'
        })
      };
    }

    // Validate Instagram URL
    if (!url.includes('instagram.com')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid Instagram URL'
        })
      };
    }

    // Call instadown.org API
    const apiUrl = 'https://instadown.org/wp-json/visolix/api/download';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Origin': 'https://instadown.org',
        'Referer': 'https://instadown.org/'
      },
      body: JSON.stringify({
        url: url,
        format: '',
        captcha_response: null
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.status) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to fetch video data from Instagram'
        })
      };
    }

    // Parse HTML content
    const $ = cheerio.load(data.data);
    
    // Extract thumbnail
    const thumbnailUrl = $('img[alt="Preview image"]').attr('src');
    
    // Extract download link
    const downloadUrl = $('a.visolix-download-media').attr('href');
    
    // Extract video type
    const isVideo = $('img[alt="Icon"]').attr('src')?.includes('video.svg');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          url: url,
          thumbnail: thumbnailUrl || null,
          download_url: downloadUrl || null,
          type: isVideo ? 'video' : 'image',
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
};


