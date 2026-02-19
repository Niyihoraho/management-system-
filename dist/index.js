const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Parse the request
    const { httpMethod, path, body, queryStringParameters } = event;
    
    // Route the request to appropriate handler
    let result;
    
    if (path.startsWith('/api/')) {
      // Handle API routes
      result = await handleApiRoute(path, httpMethod, body, queryStringParameters);
    } else {
      // Handle other routes (you might want to serve static files or redirect)
      result = {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Not found' }),
      };
    }

    return {
      ...result,
      headers: { ...headers, ...result.headers },
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  } finally {
    await prisma.$disconnect();
  }
};

async function handleApiRoute(path, method, body, queryParams) {
  // This is a basic router - you'll need to implement specific route handlers
  // based on your API structure
  
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    // Example: Handle different API endpoints
    if (path === '/api/members' && method === 'GET') {
      const members = await prisma.member.findMany();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(members),
      };
    }
    
    if (path === '/api/regions' && method === 'GET') {
      const regions = await prisma.region.findMany();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(regions),
      };
    }

    // Add more route handlers as needed
    // You can import and use your existing API route logic here

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'API endpoint not found' }),
    };
  } catch (error) {
    console.error('API Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'API error' }),
    };
  }
}
