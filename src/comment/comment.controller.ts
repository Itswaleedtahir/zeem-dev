import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Req,
  Put,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto, UpdateCommentDto } from './comment.dto';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { FundManagerGuard, InvestorGuard } from '../middleware/custom.guard';
import { Request } from 'express';
import { JwtPayload } from '../middleware/jwt-payload.interface';
import { Types } from 'mongoose';
import { ApprovalStatus } from 'src/schemas/comment.schema';
import { DealsService } from '../deals/deals.service';

@UseGuards(JwtAuthGuard) // Authenticated users only
@Controller('comments')
export class CommentController {
  constructor(
    private readonly commentService: CommentService,
    private readonly dealService: DealsService
  ) {}

  @Get('all-comments')
  async getUserDealsAndComments(
    @Req() req: Request,
    @Query('userId') userId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('approvalStatus') approvalStatus?: ApprovalStatus
  ) {
    if (
      approvalStatus &&
      !Object.values(ApprovalStatus).includes(approvalStatus as ApprovalStatus)
    ) {
      throw new BadRequestException(
        `approvalStatus must be one of the following values: ${Object.values(ApprovalStatus).join(', ')}`
      );
    }
    return this.commentService.getUserDealsAndComments(
      userId || (req.user as JwtPayload).userId,
      page,
      limit,
      approvalStatus
    );
  }

  // Create a new comment - Investor only
  @UseGuards(InvestorGuard)
  @Post()
  async create(
    @Body() createCommentDto: CreateCommentDto,
    @Req() req: Request
  ) {
    const user = req.user as JwtPayload;

    createCommentDto.investorId = new Types.ObjectId(user.userId);
    createCommentDto.dealId = new Types.ObjectId(createCommentDto.dealId);

    // Check if the deal exists using DealService
    await this.dealService.findOne(createCommentDto.dealId.toString());
    return await this.commentService.create(createCommentDto);
  }

  // Get all comments for a specific deal with pagination and filtering
  @Get('deal/:dealId')
  async findAllForDeal(
    @Param('dealId') dealId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('isHidden') isHidden: boolean = false,
    @Query('isDeleted') isDeleted: boolean = false,
    @Query('searchTerm') searchTerm?: string,
    @Query('approvalStatus') approvalStatus?: ApprovalStatus,
    @Query('sort') sort?: string
  ) {
    if (sort || sort == '') {
      sort = sort.toLowerCase();
      if (!['asc', 'desc'].includes(sort)) {
        throw new BadRequestException(
          'Invalid sort order. Use "asc" or "desc"'
        );
      }
    }
    if (!dealId) {
      throw new BadRequestException('required dealId');
    }
    if (
      approvalStatus &&
      !Object.values(ApprovalStatus).includes(approvalStatus as ApprovalStatus)
    ) {
      throw new BadRequestException(
        `approvalStatus must be one of the following values: ${Object.values(ApprovalStatus).join(', ')}`
      );
    }

    return await this.commentService.findAllForDeal({
      dealId,
      page,
      limit,
      isHidden,
      isDeleted,
      searchTerm,
      sortByCreatedAt: sort,
      approvalStatus,
    });
  }

  // Find a specific comment by ID
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.commentService.findOne(id);
  }

  // Update a comment - Only the investor who created it can update
  @UseGuards(InvestorGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Req() req: Request
  ) {
    const user = req.user as JwtPayload;
    return await this.commentService.update(id, updateCommentDto, user.userId); // Pass investor ID to the service
  }

  // Soft delete a comment - Only the investor who created it can delete
  @UseGuards(InvestorGuard)
  @Delete(':id')
  async softDelete(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as JwtPayload;
    return await this.commentService.softDelete(id, user.userId); // Pass investor ID to the service
  }

  @UseGuards(FundManagerGuard)
  @Put(':id/approval')
  async changeApprovalStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body('approvalStatus') approvalStatus: string
  ) {
    // Convert the string to the ApprovalStatus enum
    const status =
      ApprovalStatus[
        approvalStatus.toUpperCase() as keyof typeof ApprovalStatus
      ];

    // Check if the provided status is valid
    if (!status) {
      throw new BadRequestException(
        `Invalid approval status: ${approvalStatus}`
      );
    }

    return await this.commentService.changeApprovalStatus(
      id,
      status,
      (req.user as JwtPayload).userId
    );
  }
}
