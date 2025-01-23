import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payment, PaymentStatus } from '../schemas/payment.schema';
import { DealDisclosure } from 'src/schemas/dealDisclosure.schema';
import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  ItemPublicTokenExchangeRequest,
  TransferAuthorizationCreateRequest,
  TransferCreateRequest,
  TransferType,
  TransferNetwork,
  ACHClass,
  AccountsGetRequest
} from 'plaid';
import Stripe from 'stripe';
import { Wallet } from 'src/schemas/wallet.schema';
import { User } from 'src/schemas/user.schema';
import { Payout } from 'src/schemas/payout.schema';

@Injectable()
export class PaymentService {
  private stripe: Stripe;
  private plaidClient: PlaidApi;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @InjectModel(DealDisclosure.name) private dealDisclosureModel: Model<DealDisclosure>, // Injection of DealDisclosure model
    @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Payout.name) private payoutModel: Model<Payout>,
  ) {
    // Initialize Stripe
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Initialize Plaid
    const configuration = new Configuration({
      basePath: PlaidEnvironments.sandbox, // Adjust this as per your environment
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
          'PLAID-SECRET': process.env.PLAID_SECRET,
        },
      },
    });
    this.plaidClient = new PlaidApi(configuration);
  }

  async handlePayment(data: any, dealDisclosure: any): Promise<Stripe.PaymentIntent> {
    console.log("data", data);
    const email = data.userData.email;
    const { totalAmount, currency, dealId } = data;

    // Convert total amount to cents for Stripe
    const amountInCents = Math.round(totalAmount * 100);

    // Check if customer already exists
    let customer = (await this.stripe.customers.list({ email })).data[0];
    if (!customer) {
      customer = await this.stripe.customers.create({ email });
    }

    // Create payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      customer: customer.id,
    });

    // Create a new payment document
    const newPayment = new this.paymentModel({
      investorId: data.userData.userId,
      fundManager: data.userData.addedById,
      paymentIntent: paymentIntent.id,
      customerId: paymentIntent.customer,
      dealDisId: dealDisclosure._id,
      status: 'Pending',
      paymentMethodUsed: "Stripe",
      dealId: dealId,
      amount: totalAmount,
      paymentIntentId: paymentIntent.id
    });

    await newPayment.save();
    return paymentIntent;
  }
  async createWiretransfer(data: any, dealDisclosure: any): Promise<Stripe.Checkout.Session | null> {
    console.log("data", data);
    const email = data.userData.email;
    const { totalAmount, currency, dealId } = data;
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['us_bank_account'], // Ensure this is enabled on your Stripe dashboard
        line_items: [{
          price_data: {
            currency: currency,
            product_data: {
              name: 'Payment for Deal',
              description: `Deal ID: ${dealId}`, // Optional
            },
            unit_amount: totalAmount * 100, // amount in cents
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: 'https://yourdomain.com/success?session_id={CHECKOUT_SESSION_ID}', // Adjust with actual success URL
        cancel_url: 'https://yourdomain.com/cancel', // Adjust with actual cancel URL
        metadata: {
          dealId: dealId,
          investorId: data.userData.userId,
          fundManagerId: data.userData.addedById,
        },
        // Uncomment the following if you have the customer's ID and want to link the session to a Stripe customer
        // customer: data.customerId,
      });
      console.log("session ", session)

      console.log('Checkout session created: ' + session.id);
      // Create a new payment document
      const newPayment = new this.paymentModel({
        investorId: data.userData.userId,
        fundManager: data.userData.addedById,
        sessionId: session.id,
        customerId: session.customer,
        dealDisId: dealDisclosure?._id,
        status: 'Pending',
        paymentMethodUsed: "Stripe",
        dealId: dealId,
        amount: totalAmount,
        paymentIntentId: session.id
      });
      await newPayment.save();
      return session;
    } catch (error) {
      console.log('Error creating checkout session:', error);
      return null;
    }
  }

  async updatePaymentStatus(paymentIntentId: string, status: PaymentStatus): Promise<Payment | null> {
    const paymentRecord = await this.paymentModel.findOne({ paymentIntentId });
    if (!paymentRecord) {
      return null;
    }

    paymentRecord.status = status; // No type error as status is already PaymentStatus
    await paymentRecord.save();
    return paymentRecord;
  }

  async findDealDisclosureByDealIdAndInvestorId(dealId: string, data: any): Promise<DealDisclosure | null> {
    console.log("Data", data);
    return this.dealDisclosureModel.findOne({
      dealId: dealId,
      'investorDetails.investorId': data.userId
    }).exec();
  }

  async processPayment(publicToken: string, amount: number, legalName: string, data: any, dealId: string, dealDisId: any): Promise<any> {
    try {
      // Exchange public token for access token
      console.log("dealid", dealId)
      const decimelAmout = amount.toFixed(2);
      const exchangeRequest: ItemPublicTokenExchangeRequest = { public_token: publicToken };

      const exchangeResponse = await this.plaidClient.itemPublicTokenExchange(exchangeRequest);
      const accessToken = exchangeResponse.data.access_token;

      const request: AccountsGetRequest = {
        access_token: accessToken,
      };
      const response = await this.plaidClient.accountsGet(request);
      const accountIdPlaid = response.data.accounts[0].account_id;

      const authorizationRequest: TransferAuthorizationCreateRequest = {
        access_token: accessToken,
        account_id: accountIdPlaid,
        type: TransferType.Debit,
        network: TransferNetwork.Ach,
        amount: decimelAmout,
        ach_class: ACHClass.Ppd,
        user: {
          legal_name: legalName,
        },
      };
      const authorizationResponse = await this.plaidClient.transferAuthorizationCreate(authorizationRequest);
      const authorizationId = authorizationResponse.data.authorization.id;

      // Create a transfer
      const transferRequest: TransferCreateRequest = {
        access_token: accessToken,
        account_id: accountIdPlaid,
        description: 'payment',
        authorization_id: authorizationId,
      };
      const transferResponse = await this.plaidClient.transferCreate(transferRequest);
      const transfer = transferResponse.data.transfer;
      console.log("transfer", transfer)
      console.log("data", data)
      // Create a new payment document
      const newPayment = new this.paymentModel({
        investorId: data.userId,
        fundManager: data.addedById,
        plaidTransferId: transfer.id,
        status: 'Pending',
        paymentMethodUsed: "Plaid",
        dealDisId: dealDisId._id,
        dealId: dealId,
        amount: decimelAmout,
      });

      await newPayment.save();
      return transfer
      console.log('Transfer successful:',);
    } catch (error) {
      console.error('Error processing payment:', error);
      throw new Error('Failed to process payment');
    }
  }
  async handleWebhooks(payload: any, signature: any): Promise<any> {
    try {
      console.log("payload ", payload);
      console.log("signature ", signature);

      const event = payload;
      console.log("event ", event);
      console.log(event.type, event.data);

      if (event.type === 'checkout.session.completed') {
        const checkoutObject = event.data.object;
        const paymentId = event.data.object.payment_intent.toString();
        const sessionId = event.data.object.id;
        const metadata = event.data.object.metadata;
        const { dealId, investorId, fundManagerId } = metadata;

        const paymentInfo = await this.paymentModel.findOne({
          dealId: dealId,
          investorId: investorId
        }).exec();

        if (!paymentInfo) throw new Error('Payment information not found');
        await this.paymentModel.updateOne(
          { _id: paymentInfo._id.toString() },
          { $set: { status: "successful" } }
        ).exec();

        console.log("paymentInfo.fundManager ", paymentInfo.fundManager);

        if (!paymentInfo.fundManager) throw new Error('Fund manager not found');
        let userId = new Types.ObjectId(paymentInfo.fundManager.toString())
        const walletInfo = await this.walletModel.findOne({
          userId: userId
        }).exec();

        console.log("walletInfo ", walletInfo);
        console.log("walletInfo?.balance ", walletInfo?.balance);
        console.log("checkoutObject.amount ", checkoutObject.amount_total)

        if (!walletInfo) throw new Error('Wallet information not found');

        const walletUpdate = await this.walletModel.updateOne(
          { userId: userId },
          { $set: { balance: walletInfo.balance + (checkoutObject.amount_total / 100) } }
        ).exec();

        console.log("walletUpdate ", walletUpdate);
      }
      // Additional webhook processing logic...
    } catch (error) {
      console.error('Error processing payment:', error);
      throw new Error('Failed to process payment');
    }
  }
  async handleConnectWebhooks(payload: any, signature: any): Promise<any> {
    try {
      console.log("payload ", payload);
      console.log("signature ", signature);

      const event = payload;
      console.log("event ", event);
      console.log(event.type, event.data);
      if (event.type === 'payout.paid') {
        const paidOutObject = event.data.object;

        const userInfo = await this.userModel.findOne({
          connectAccountId: event?.account
        }).exec();
        console.log("paidOutObject?.id ", paidOutObject?.id)
        const payoutUpdate = await this.payoutModel.findOneAndUpdate({
          stripePayoutId: paidOutObject?.id
        }, {
          $set: {
            status: "successful"
          }
        })
        let walletInfo = await this.walletModel.findOne({
          userId: userInfo?._id
        }).exec();
        console.log("walletInfo ", walletInfo)
        walletInfo.balance = walletInfo.balance - paidOutObject.amount
        await walletInfo.save()
      }
      // Additional webhook processing logic...
    } catch (error) {
      console.error('Error processing payment:', error);
      throw new Error('Failed to process payment');
    }
  }
  async withdrawMoney(userId: any, amount: number): Promise<any> {
    try {
      const userInfo = await this.userModel.findOne({
        _id: userId
      })
      userId = new Types.ObjectId(userId)
      const walletInfo = await this.walletModel.findOne({
        userId: userId
      })
      console.log("walletInfo ", walletInfo)
      console.log("amount ", amount)
      if (walletInfo?.balance < amount) {
        return {
          success: false,
          message: 'Insufficient balance',
        };
      }
      console.log("userInfo ", userInfo)
      const transfer = await this.stripe.transfers.create({
        amount: amount, // Amount in cents (500 cents = $5.00 USD)
        currency: "USD",
        destination: userInfo?.connectAccountId, // Replace with the destination Connect account ID
      });
      console.log("transfer ", transfer)
      //PAYING OUT TO CONNECTED ACCOUNT'S EXTERNAL BANK
      const payout = await this.stripe.payouts.create(
        {
          amount: amount,
          currency: "USD",
        },
        {
          stripeAccount: userInfo?.connectAccountId,
        }
      );
      console.log("payout ", payout)
      const newPayout = new this.payoutModel({
        userId: userId,
        amount: amount,
        stripePayoutId: payout?.id,
      });
      await newPayout.save();
    } catch (error) {
      console.log("error ", error)
      return {
        success: false,
        message: 'Failed to retrieve connected account details',
        error: error.message,
      };
    }
  }
  async getPaymentLogs(userId: string): Promise<Payment[]> {
    return this.paymentModel.find({
      $or: [{ investorId: userId }, { fundManager: userId }]
    })
      .populate('investorId fundManager dealId dealDisId')
      .exec();
  }
  async getPayouts(userId: any): Promise<Payout[]> {
    userId=new Types.ObjectId(userId)
    return this.payoutModel.find({
      userId: userId
    }).populate('userId').exec();
  }

}
