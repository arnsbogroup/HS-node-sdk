/**
 * Heysender Node.js SDK
 *
 * A comprehensive SDK for interacting with the Heysender API
 *
 * @version 0.9.1
 * @link https://documentation.heysender.com/
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Anonymize Options Enum
 *
 * Anonymization options for email privacy compliance (e.g., GDPR)
 */
const AnonymizeOption = Object.freeze({
  NONE: 'none',
  ALL: 'all',
  RECIPIENT: 'recipient',
  SUBJECT: 'subject',
  CONTENT: 'content',

  /**
   * Get all anonymize option values as an array
   * @returns {string[]} Array of all anonymization option values
   */
  values: function() {
    return Object.keys(this)
      .filter(key => key !== 'values')
      .map(key => this[key]);
  }
});

/**
 * Event Types Enum
 *
 * Webhook event types for email tracking
 */
const EventType = Object.freeze({
  QUEUED: 'queued',
  SENT: 'sent',
  ATTEMPT: 'attempt',
  SOFT_BOUNCE: 'soft_bounce',
  HARD_BOUNCE: 'hard_bounce',
  COMPLAINT: 'complaint',
  UNSUBSCRIBE: 'unsubscribe',
  OPEN: 'open',
  CLICK: 'click',

  /**
   * Get all event type values as an array
   * @returns {string[]} Array of all event type values
   */
  values: function() {
    return Object.keys(this)
      .filter(key => key !== 'values')
      .map(key => this[key]);
  }
});

/**
 * Suppression Types Enum
 *
 * Suppression list types for managing blocked email addresses
 */
const SuppressionType = Object.freeze({
  BOUNCE: 'bounce',
  UNSUBSCRIBE: 'unsubscribe',
  COMPLAINT: 'complaint',

  /**
   * Get all suppression type values as an array
   * @returns {string[]} Array of all suppression type values
   */
  values: function() {
    return Object.keys(this)
      .filter(key => key !== 'values')
      .map(key => this[key]);
  }
});

/**
 * Custom error class for Heysender API errors
 */
class HeysenderError extends Error {
  constructor(message, statusCode = null, responseBody = null) {
    super(message);
    this.name = 'HeysenderError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

/**
 * Main Heysender API Client
 */
class HeysenderClient {
  /**
   * Create a new Heysender client
   *
   * @param {Object} config - Configuration object
   * @param {string} config.apiKey - Your Heysender API key
   * @param {string} config.apiSecret - Your Heysender API secret
   * @param {string} [config.baseUrl='https://app.heysender.com'] - Base URL for the API
   */
  constructor({ apiKey, apiSecret, baseUrl = 'https://app.heysender.com' }) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl;
  }

  /**
   * Make an HTTP request to the API
   *
   * @private
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} [body] - Request body
   * @returns {Promise<Object>} Response data
   */
  async request(method, endpoint, body = null) {
    const url = new URL(endpoint, this.baseUrl);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const credentials = Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64');

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'HS-node-sdk/0.9.1'
      }
    };

    if (body) {
      const jsonBody = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(jsonBody);
    }

    return new Promise((resolve, reject) => {
      const req = lib.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsedData = data ? JSON.parse(data) : {};

            if (res.statusCode >= 400) {
              reject(new HeysenderError(
                `API Error (${res.statusCode}): ${data}`,
                res.statusCode,
                data
              ));
            } else {
              resolve(parsedData);
            }
          } catch (error) {
            if (res.statusCode >= 400) {
              reject(new HeysenderError(
                `API Error (${res.statusCode}): ${data}`,
                res.statusCode,
                data
              ));
            } else {
              reject(new HeysenderError(`Failed to parse response: ${error.message}`));
            }
          }
        });
      });

      req.on('error', (error) => {
        reject(new HeysenderError(`Request failed: ${error.message}`));
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  // ==================== DOMAIN METHODS ====================

  /**
   * Get list of domains
   *
   * @returns {Promise<Array>} List of domains
   */
  async getDomains() {
    return this.request('GET', '/api/domains');
  }

  /**
   * Create a new domain
   *
   * @param {Object} options - Domain options
   * @param {string} options.url - Domain URL
   * @param {string} [options.customSelector] - Custom DKIM selector
   * @param {string} [options.dkimKey] - Custom DKIM private key
   * @returns {Promise<Object>} Created domain data
   */
  async createDomain({ url, customSelector, dkimKey }) {
    const body = { url };
    if (customSelector) body.custom_selector = customSelector;
    if (dkimKey) body.dkim_key = dkimKey;

    return this.request('POST', '/api/domains', body);
  }

  /**
   * Update domain with new DKIM key
   *
   * @param {string} domain - Domain name
   * @param {string} dkimKey - New DKIM private key
   * @returns {Promise<Object>} Response data
   */
  async updateDomain(domain, dkimKey) {
    return this.request('PUT', `/api/domains/${domain}`, { dkim_key: dkimKey });
  }

  /**
   * Delete a domain
   *
   * @param {string} domain - Domain name
   * @returns {Promise<Object>} Response data
   */
  async deleteDomain(domain) {
    return this.request('DELETE', `/api/domains/${domain}`);
  }

  /**
   * Validate domain SPF and DKIM
   *
   * @param {string} domain - Domain name
   * @returns {Promise<Object>} Validation status
   */
  async validateDomain(domain) {
    return this.request('GET', `/api/domains/${domain}/validate`);
  }

  /**
   * Get a single domain
   *
   * @param {string} domain - Domain name
   * @returns {Promise<Object>} Domain data
   */
  async getDomain(domain) {
    return this.request('GET', `/api/domains/${domain}`);
  }

  // ==================== SMTP USER METHODS ====================

  /**
   * Get SMTP users for a domain
   *
   * @param {number} domainId - Domain ID
   * @returns {Promise<Array>} List of SMTP users
   */
  async getSMTPUsers(domainId) {
    return this.request('GET', `/api/smtp/${domainId}`);
  }

  /**
   * Create SMTP user
   *
   * @param {number} domainId - Domain ID
   * @param {Object} options - SMTP user options
   * @param {string} options.smtpEmail - SMTP email address
   @param {Array<string|AnonymizeOption>} [options.anonymizeOptions=['none']] - Anonymization options (use AnonymizeOption enum or strings)
   * @returns {Promise<Array>} Created SMTP user with password
   */
  async createSMTPUser(domainId, { smtpEmail, anonymizeOptions = ['none'] }) {
    return this.request('POST', `/api/smtp/${domainId}`, {
      smtp_email: smtpEmail,
      anonymize_options: anonymizeOptions
    });
  }

  /**
   * Delete SMTP user
   *
   * @param {number} domainId - Domain ID
   * @param {number} userId - SMTP user ID
   * @returns {Promise<Object>} Response data
   */
  async deleteSMTPUser(domainId, userId) {
    return this.request('DELETE', `/api/smtp/${domainId}/${userId}`);
  }

  /**
   * Generate new password for SMTP user
   *
   * @param {number} domainId - Domain ID
   * @param {number} userId - SMTP user ID
   * @returns {Promise<Array>} New password data
   */
  async resetSMTPPassword(domainId, userId) {
    return this.request('GET', `/api/smtp/${domainId}/${userId}/newpassword`);
  }

  /**
   * Get a single SMTP user
   *
   * Note: unlike the list/create responses, this endpoint's response includes
   * a nested `domain` object.
   *
   * @param {number} domainId - Domain ID
   * @param {number} userId - SMTP user ID
   * @returns {Promise<Object>} SMTP user data (with nested domain object)
   */
  async getSMTPUser(domainId, userId) {
    return this.request('GET', `/api/smtp/${domainId}/${userId}`);
  }

  // ==================== WEBHOOK METHODS ====================

  /**
   * Get webhooks for a domain
   *
   * @param {string} domain - Domain name
   * @returns {Promise<Array>} List of webhooks
   */
  async getWebhooks(domain) {
    return this.request('GET', `/api/webhooks/${domain}`);
  }

  /**
   * Get specific webhook
   *
   * @param {string} domain - Domain name
   * @param {number} webhookId - Webhook ID
   * @returns {Promise<Object>} Webhook data
   */
  async getWebhook(domain, webhookId) {
    return this.request('GET', `/api/webhooks/${domain}/${webhookId}`);
  }

  /**
   * Create webhook
   *
   * @param {string} domain - Domain name
   * @param {Object} options - Webhook options
   * @param {string} options.url - Webhook URL
   * @param {Array<string|EventType>} [options.events=[]] - Event triggers (use EventType enum or strings)
   * @returns {Promise<Object>} Created webhook data
   */
  async createWebhook(domain, { url, events = [] }) {
    const body = { url };

    EventType.values().forEach(event => {
      body[event] = events.includes(event);
    });

    return this.request('POST', `/api/webhooks/${domain}`, body);
  }

  /**
   * Update webhook
   *
   * @param {string} domain - Domain name
   * @param {number} webhookId - Webhook ID
   * @param {Object} options - Webhook options
   * @param {string} options.url - Webhook URL
   * @param {Array<string|EventType>} [options.events] - New event triggers (use EventType enum or strings)
   * @returns {Promise<Object>} Response data
   */
  async updateWebhook(domain, webhookId, { url, events = [] }) {
    const body = { url };

    EventType.values().forEach(event => {
      body[event] = events.includes(event);
    });

    return this.request('PUT', `/api/webhooks/${domain}/${webhookId}`, body);
  }

  /**
   * Delete webhook
   *
   * @param {string} domain - Domain name
   * @param {number} webhookId - Webhook ID
   * @returns {Promise<Object>} Response data
   */
  async deleteWebhook(domain, webhookId) {
    return this.request('DELETE', `/api/webhooks/${domain}/${webhookId}`);
  }

  // ==================== MESSAGE METHODS ====================

  /**
   * Send an email message
   *
   * @param {Object} messageData - Message data
   * @returns {Promise<Array>} Message responses with status and message IDs
   */
  async sendMessage(messageData) {
    return this.request('POST', '/api/message', messageData);
  }

  /**
   * Get message information
   *
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>} Message information
   */
  async getMessage(messageId) {
    return this.request('GET', `/api/message/${messageId}`);
  }

  /**
   * Get message information for specific recipient
   *
   * @param {string} messageId - Message ID
   * @param {string} recipient - Recipient email
   * @returns {Promise<Object>} Message information
   */
  async getMessageByRecipient(messageId, recipient) {
    return this.request('GET', `/api/message/${messageId}/${recipient}`);
  }

  // ==================== SUPPRESSION METHODS ====================

  /**
   * Get suppressions by domain and type
   *
   * @param {string} domain - Domain name
   * @param {string|SuppressionType} type - Suppression type (use SuppressionType enum or strings: 'bounce', 'unsubscribe', 'complaint')
   * @returns {Promise<Object>} Paginated suppression list
   */
  async getSuppressions(domain, type) {
    return this.request('GET', `/api/suppressions/${domain}/${type}`);
  }

  /**
   * Remove email from bounce suppressions
   *
   * @param {string} domain - Domain name
   * @param {string} email - Email address to remove
   * @returns {Promise<Object>} Response data
   */
  async removeBounce(domain, email) {
    return this.request('DELETE', `/api/suppressions/${domain}/bounce/${email}`);
  }
}

/**
 * Message builder helper class
 */
class MessageBuilder {
  /**
   * Create a new MessageBuilder
   *
   * @param {Object} options - Message options
   * @param {string} options.fromEmail - Sender email address
   * @param {string} options.fromName - Sender name
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML body content
   */
  constructor({ fromEmail, fromName, subject, html }) {
    this.data = {
      from_email: fromEmail,
      from_name: fromName,
      subject: subject,
      html: html,
      to: []
    };
  }

  /**
   * Set plain text body
   *
   * @param {string} text - Plain text content
   * @returns {MessageBuilder} this for chaining
   */
  setText(text) {
    this.data.text = text;
    return this;
  }

  /**
   * Add TO recipient
   *
   * @param {string} email - Recipient email
   * @param {string} [name] - Recipient name
   * @returns {MessageBuilder} this for chaining
   */
  addTo(email, name = null) {
    const recipient = { email };
    if (name) recipient.name = name;
    this.data.to.push(recipient);
    return this;
  }

  /**
   * Add CC recipient
   *
   * @param {string} email - Recipient email
   * @param {string} [name] - Recipient name
   * @returns {MessageBuilder} this for chaining
   */
  addCC(email, name = null) {
    if (!this.data.cc) this.data.cc = [];
    const recipient = { email };
    if (name) recipient.name = name;
    this.data.cc.push(recipient);
    return this;
  }

  /**
   * Add BCC recipient
   *
   * @param {string} email - Recipient email
   * @returns {MessageBuilder} this for chaining
   */
  addBCC(email) {
    if (!this.data.bcc) this.data.bcc = [];
    this.data.bcc.push(email);
    return this;
  }

  /**
   * Set reply-to address
   *
   * @param {string|Array} replyTo - Single email or array of recipients
   * @returns {MessageBuilder} this for chaining
   */
  setReplyTo(replyTo) {
    this.data.reply_to = replyTo;
    return this;
  }

  /**
   * Add attachment
   *
   * @param {string} name - Filename with extension
   * @param {string} base64Content - Base64 encoded file content
   * @returns {MessageBuilder} this for chaining
   */
  addAttachment(name, base64Content) {
    if (!this.data.attachments) this.data.attachments = [];
    this.data.attachments.push({
      name: name,
      content: base64Content
    });
    return this;
  }

  /**
   * Add custom tag
   *
   * @param {string} key - Tag key
   * @param {string} value - Tag value
   * @returns {MessageBuilder} this for chaining
   */
  addTag(key, value) {
    if (!this.data.tags) this.data.tags = [];
    this.data.tags.push({ key, value });
    return this;
  }

  /**
   * Add custom header
   *
   * @param {string} key - Header key
   * @param {string} value - Header value
   * @returns {MessageBuilder} this for chaining
   */
  addHeader(key, value) {
    if (!this.data.headers) this.data.headers = [];
    this.data.headers.push({ key, value });
    return this;
  }

  /**
   * Set custom content for bulk messaging
   *
   * @param {Object} content - Object mapping recipient emails to custom variables
   * @returns {MessageBuilder} this for chaining
   */
  setCustomContent(content) {
    this.data.custom_content = content;
    return this;
  }

  /**
   * Enable or disable tracking
   *
   * @param {boolean} enabled - Whether to enable tracking
   * @returns {MessageBuilder} this for chaining
   */
  setTracking(enabled) {
    this.data.tracking = enabled;
    return this;
  }

  /**
   * Enable or disable list-unsubscribe header
   *
   * @param {boolean} enabled - Whether to enable list-unsubscribe
   * @returns {MessageBuilder} this for chaining
   */
  setListUnsubscribe(enabled) {
    this.data.list_unsubscribe = enabled;
    return this;
  }

  /**
   * Set message retention time in days
   *
   * @param {number} days - Number of days to retain message
   * @returns {MessageBuilder} this for chaining
   */
  setRetentionTime(days) {
    this.data.retention_time = days;
    return this;
  }

  /**
   * Set anonymization options
   *
   * @param {Array<string>} options - Fields to anonymize
   * @returns {MessageBuilder} this for chaining
   */
  setAnonymizeOptions(options) {
    this.data.anonymize_options = options;
    return this;
  }

  /**
   * Set custom webhook for this message
   *
   * @param {string} url - Webhook URL
   * @param {Array<string>} events - Events to trigger webhook
   * @returns {MessageBuilder} this for chaining
   */
  setWebhook(url, events) {
    this.data.webhook = { url, events };
    return this;
  }

  /**
   * Build and return the message data
   *
   * @returns {Object} Complete message data
   */
  build() {
    return this.data;
  }
}

// Export classes
module.exports = {
  HeysenderClient,
  MessageBuilder,
  HeysenderError,
  AnonymizeOption,
  SuppressionType,
  EventType
};
