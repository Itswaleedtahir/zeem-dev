import * as nodemailer from 'nodemailer';
import axios from 'axios';
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';

import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

//Microsoft Mail Service
export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<any> {
  await checkEmailRules(to, subject, body);
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  const tenantId = process.env.MS_TENANT_ID;
  const senderEmail = process.env.MS_EMAIL;

  // Validate input (optional: adjust as needed)
  if (!to || !subject || !body) {
    throw new Error(
      "Invalid email parameters. 'to', 'subject', and 'body' are required."
    );
  }

  // Step 1: Get Access Token
  const config = {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret,
    },
  };

  const app = new ConfidentialClientApplication(config);
  let accessToken: string;
  try {
    const tokenResponse = await app.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default'],
    });
    accessToken = tokenResponse.accessToken;
  } catch (error) {
    console.error('Error fetching access token:', error);
    throw new Error('Unable to fetch access token');
  }

  // Step 2: Send Email
  const client = Client.init({
    authProvider: done => done(null, accessToken),
  });

  const email = {
    message: {
      subject,
      body: {
        contentType: 'HTML', // Ensures email body is rendered as HTML
        content: body,
      },
      toRecipients: [
        {
          emailAddress: {
            address: to,
          },
        },
      ],
    },
  };

  try {
    await client.api(`/users/${senderEmail}/sendMail`).post(email);
    console.log(`Email sent successfully to ${to}`);
    return `Email sent successfully to ${to}`;
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Unable to send email');
  }
}

export const checkEmailRules = async (
  to: string,
  subject: string,
  body: string
) => {
  // Validate email address format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    throw new BadRequestException('Invalid email address format.');
  }

  // Fetch the latest disposable email domains list
  const disposableEmailDomains = await getDisposableEmailDomains();

  // Ensure the email does not belong to a disposable email domain
  const emailDomain = to.split('@')[1].toLowerCase();
  if (disposableEmailDomains.includes(emailDomain)) {
    throw new ForbiddenException(
      'Email address belongs to a disposable email provider, which is not allowed.'
    );
  }

  // Ensure subject and body are not empty
  if (!subject.trim()) {
    throw new BadRequestException('Email subject cannot be empty.');
  }

  if (!body.trim()) {
    throw new BadRequestException('Email body cannot be empty.');
  }
};

export const getDisposableEmailDomains = async () => {
  try {
    const response = await axios.get(
      'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf'
    );
    return response.data
      .split('\n')
      .map((domain: string) => domain.trim())
      .filter(domain => domain);
  } catch (error) {
    console.error(
      'Failed to fetch disposable email domains list:',
      error.message
    );
    throw new BadRequestException(
      'Unable to verify email domain at this time.'
    );
  }
};

// brevo mail service currently not using
export const sendMail = async (to: string, subject: string, html?: string) => {
  await checkEmailRules(to, subject, html);
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.BERVO_EMAIL,
      pass: process.env.BERVO_PASS,
    },
  });

  const mailOptions = {
    from: process.env.BERVO_FROM_EMAIL,
    to,
    subject,
    text: html.replace(/<[^>]+>/g, ''),
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return { message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new InternalServerErrorException(
      'Error sending email. Please try again later.'
    );
  }
};
