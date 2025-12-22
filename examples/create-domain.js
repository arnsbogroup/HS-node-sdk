const {
    HeysenderClient
} = require('../lib/heysender');


const client = new HeysenderClient({
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret'
});

async function createDomain() {
  try {
    console.log('Creating new domain');
    const newDomain = await client.createDomain({
      url: 'example.heysender.com'
    });
    console.log(`Domain: ${newDomain.url}`);
    console.log(`ID: ${newDomain.id}`);
    console.log(`Validated: ${newDomain.validated}\n`);

    console.log('Get all domains');
    const domains = await client.getDomains();

    domains.forEach((domain) => {
      console.log(`ID: ${domain.id}, URL: ${domain.url}, Validated: ${domain.validated == true}` );
    });
  } catch (error) {
    console.error(`Error: ${error.message}\n`);
  }
}

async function runExample() {
  await createDomain();
}

runExample().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
