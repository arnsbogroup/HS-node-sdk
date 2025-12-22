const {
  HeysenderClient,
  MessageBuilder
} = require('../lib/heysender');

const client = new HeysenderClient({
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret'
});

async function sendMessage() {
  try {
    const message = new MessageBuilder({
      fromEmail: 'sender@yourdomain.com',
      fromName: 'Your Name',
      subject: 'Test Email',
      html: '<h1>Hello</h1><p>World!</p>'
    })
      .addTo('recipient@example.com', 'Mr. Receiver')
      .addCC('manager@example.com')
      .setTracking(true)
      .addTag('tag', 'some value')
      .build();

    const responses = await client.sendMessage(message);

    responses.forEach(resp => {
      console.log(`Status: ${resp.status}, Message ID: ${resp.message_id}, Recipient: ${resp.recipient}`);
    });

    console.log('Message sent\n');
  } catch (error) {
    console.log('Message failed sending\n');
    console.error(`Error: ${error.message}\n`);
  }
}

async function runExample() {
  await sendMessage();
}

runExample().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
