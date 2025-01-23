import { Controller, Post, Req, Res, HttpStatus, Headers, UseGuards, Body, Get } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard'; // Adjust import based on actual location
import { PaymentStatus } from 'src/schemas/payment.schema';
import RequestWithRawBody from './requestWithRawBody.interface';
import { Types } from 'mongoose';
import { JwtPayload } from '../middleware/jwt-payload.interface';
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) { }

  @Post('stripe-create')
  @UseGuards(JwtAuthGuard) // Ensure only authenticated users can make payments
  async createPayment(@Req() req: Request, @Res() res: Response) {
    try {
      const userData = req.user; // Extract investor and fund manager IDs from the token
      console.log("data", userData)
      const { currency, totalAmount, dealId } = req.body;
      console.log("body", req.body)
      // Ensure all required payment details are present
      if (!totalAmount) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Missing required payment details'
        });
      }
      const dealDisclosure = await this.paymentService.findDealDisclosureByDealIdAndInvestorId(dealId, userData);

      const paymentIntent = await this.paymentService.handlePayment({
        userData,
        dealId,
        currency: currency || 'USD', // Default to USD if not specified
        totalAmount,
      },
        dealDisclosure);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Payment processed successfully',
        paymentIntent
      });
    } catch (error) {
      console.error('Payment Error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to process payment',
        error: error.message
      });
    }
  }

  @Post('update-status-stripe')
  @UseGuards(JwtAuthGuard) // Ensure only authenticated users can access this endpoint
  async updateBookingStatus(@Req() req: Request, @Res() res: Response) {
    try {
      const userData = req.user; // Extract user data from the token, assuming it contains the investorId
      console.log("user", userData)
      const { status, paymentIntentId, dealId } = req.body;

      const enumStatus = PaymentStatus[status.toUpperCase() as keyof typeof PaymentStatus];

      if (!enumStatus) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "Invalid status. It must be either 'Pending', 'Approved', or 'Rejected'."
        });
      }
      const paymentRecord = await this.paymentService.updatePaymentStatus(paymentIntentId, enumStatus);

      if (!paymentRecord) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: "Payment record not found."
        });
      }
      // Find the DealDisclosure document by dealId and investorId
      const dealDisclosure = await this.paymentService.findDealDisclosureByDealIdAndInvestorId(dealId, userData);

      if (!dealDisclosure) {
        return res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          message: "DealDisclosure record not found for the specified deal and investor."
        });
      }

      // Update the DealDisclosure document
      dealDisclosure.isPaid = true;
      dealDisclosure.paymentIntentId = paymentIntentId;
      await dealDisclosure.save();

      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Payment status updated to ${enumStatus}, DealDisclosure updated successfully.`,
        dealDisclosure
      });
    } catch (error) {
      console.error("Error: ", error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal Server Error",
        errorDetail: error.message
      });
    }
  }

  @Post('plaid-create')
  @UseGuards(JwtAuthGuard) // Ensure only authenticated users can make payments
  async createPaymentPlaid(@Req() req: Request, @Res() res: Response) {
    try {
      const userData = req.user; // Extract user data from the token
      const { publicToken, amount, legalName, dealId } = req.body;

      // // Ensure all required payment details are present
      if (!publicToken || !amount || !legalName) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Missing required payment details'
        });
      }
      const dealDisclosure = await this.paymentService.findDealDisclosureByDealIdAndInvestorId(dealId, userData);

      const transfer = await this.paymentService.processPayment(publicToken, amount, legalName, userData, dealId, dealDisclosure);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Plaid payment processed successfully',
        transfer: transfer
      });
    } catch (error) {
      console.error('Plaid Payment Error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to process Plaid payment',
        error: error.message
      });
    }
  }

  @Post('stripe-wire-transfer')
  @UseGuards(JwtAuthGuard) // Ensure only authenticated users can make payments
  async createStripeWiretransfer(@Req() req: Request, @Res() res: Response) {
    try {
      const userData = req.user; // Extract investor and fund manager IDs from the token
      console.log("data", userData)
      const { currency, totalAmount, dealId } = req.body;
      console.log("body", req.body)
      // Ensure all required payment details are present
      if (!totalAmount) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: 'Missing required payment details'
        });
      }
      console.log("userData ", userData)
      const dealDisclosure = await this.paymentService.findDealDisclosureByDealIdAndInvestorId(dealId, userData);
      console.log("dealDisclosure ", dealDisclosure)
      const paymentIntent = await this.paymentService.createWiretransfer({
        userData,
        dealId,
        currency: currency || 'USD', // Default to USD if not specified
        totalAmount,
      },
        dealDisclosure);
      console.log("paymentIntent ", paymentIntent)

      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Payment processed successfully',
        paymentIntent
      });
    } catch (error) {
      console.error('Payment Error:', error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to process payment',
        error: error.message
      });
    }
  }

  @Post('/webhook')
  async webhook(@Headers('stripe-signature') signature: string, @Req() req: RequestWithRawBody, @Res() res: Response) {
    console.log("req ", req)

    const payload = req.body;
    console.log("payload ", payload)
    const webhooks = await this.paymentService.handleWebhooks(payload, signature);
    res.status(HttpStatus.OK)
  }

  @Post('/connect/webhook')
  async connectWebhook(@Headers('stripe-signature') signature: string, @Req() req: RequestWithRawBody, @Res() res: Response) {
    console.log("req ", req)

    const payload = req.body;
    console.log("payload ", payload)
    const webhooks = await this.paymentService.handleConnectWebhooks(payload, signature);
    res.status(HttpStatus.OK)
  }

  @Post('withdraw-money')
  @UseGuards(JwtAuthGuard) // Ensure only authenticated users can make payments
  withdrawMoney(@Req() req: Request, @Body('amount') amount: number) {
    const userData: any = req.user; // Extract investor and fund manager IDs from the token
    console.log("data", userData)
    return this.paymentService.withdrawMoney(userData?.userId, amount);
  }

  @Get('/')
  @UseGuards(JwtAuthGuard) // Ensure only authenticated users can make payments
  async getPaymentLogs(@Req() req: Request, @Res() res: Response) {
    try {
      const userData: any = req.user; // Extract investor and fund manager IDs from the token
      console.log("data", userData)
      const logs = await this.paymentService.getPaymentLogs(userData?.userId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  @Get('/payouts')
  @UseGuards(JwtAuthGuard) // Ensure only authenticated users can make payments
  async getPayouts(@Req() req: Request, @Res() res: Response) {
    try {
      const userData: any = req.user; // Extract investor and fund manager IDs from the token
      console.log("data", userData)
      const payouts = await this.paymentService.getPayouts(userData?.userId);
      res.json(payouts);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}
