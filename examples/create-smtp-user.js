const {
  HeysenderClient,
  AnonymizeOption
} = require('../lib/heysender');

async function createSMTPUser() {
  try {
    const domains = await client.getDomains();

    console.log(`Get domains to create smtp user for\n`);
    if (domains.length === 0) {
      console.log('No domains found\n');
      return;
    }

    const firstDomain = domains[0];

    console.log('Create SMTP user');
    const smtpUser = await client.createSMTPUser(firstDomain.id, {
      smtpEmail: `example@${firstDomain.url}`,
      anonymizeOptions: [AnonymizeOption.RECIPIENT, AnonymizeOption.CONTENT]
    });

    console.log(`SMTP user id: ${smtpUser.id}`);
    console.log(`Domain id: ${smtpUser.domain_id}`);
    console.log(`Email: ${smtpUser.smtp_email}`);
    console.log(`Password: ${smtpUser.smtp_password}`);
    console.log(`Anonymize Options: [${smtpUser.anonymize_options.join(', ')}]\n`);

    console.log('Get all smtp users for domain');
    const smtpUserPage = await client.getSMTPUsers(firstDomain.id);

    const smtpUsers = smtpUserPage.data;
    smtpUsers.forEach((user) => {
      console.log(`Id: ${user.id}, Email: ${user.smtp_email}, Domain Id: ${user.domain_id}, Anonymize Options: [ all: ${user.anonymize_all == true}, none: ${user.anonymize_none == true}, subject: ${user.anonymize_subject == true}, content: ${user.anonymize_content == true}, recipient: ${user.anonymize_recipient == true} ]`);
    });
  } catch (error) {
    console.error(`Error: ${error.message}\n`);
  }
}

async function runExample() {
  await createSMTPUser();
}

runExample().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
