import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, ApprovalStatus } from '../schemas/comment.schema';
import { Deal } from '../schemas/deals.schema';
import { CreateCommentDto, UpdateCommentDto } from './comment.dto';
import { Types } from 'mongoose';
import { DealsService } from '../deals/deals.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { LogActions, LogEntity } from 'src/schemas/activity-log.schema';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
    private readonly dealService: DealsService,
    private readonly activityLogService: ActivityLogService
  ) {}

  // Create a new comment
  async create(createCommentDto: CreateCommentDto): Promise<Comment> {
    const { investorId, dealId } = createCommentDto;

    // Check if an investor has already commented on this deal
    const existingComment = await this.commentModel.findOne({
      investorId,
      dealId,
    });
    if (existingComment) {
      throw new BadRequestException(
        'Investor has already commented on this deal.'
      );
    }

    const newComment = new this.commentModel(createCommentDto);
    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: createCommentDto.investorId.toString(),
        action: LogActions.CREATE,
        entity: LogEntity.COMMENT,
        entityId: newComment._id.toString(),
      });
    } catch {}
    return newComment.save();
  }

  async findAllForDeal({
    dealId,
    page = 1,
    limit = 10,
    isHidden = false,
    isDeleted = false,
    searchTerm,
    sortByCreatedAt,
    approvalStatus,
  }: {
    dealId: string;
    page?: number;
    limit?: number;
    isHidden?: boolean;
    isDeleted?: boolean;
    searchTerm?: string;
    sortByCreatedAt?: string;
    approvalStatus?: ApprovalStatus;
  }) {
    const filter: any = {
      isHidden,
      isDeleted,
      dealId: new Types.ObjectId(dealId),
    };
    if (searchTerm) {
      filter.comment = { $regex: searchTerm, $options: 'i' };
    }

    if (approvalStatus) {
      filter.approvalStatus = approvalStatus;
    }
    let commentsQuery = this.commentModel.find(filter);
    if (sortByCreatedAt) {
      commentsQuery = commentsQuery.sort({
        createdAt: sortByCreatedAt === 'asc' ? 1 : -1,
      });
    }

    let totalDocuments = await this.commentModel.countDocuments(filter).exec();
    if (page && limit) {
      const skip = (page - 1) * limit;
      commentsQuery = commentsQuery.skip(skip).limit(limit);
    }

    const comments = await commentsQuery
      .populate({
        path: 'investorId',
        select: 'name email role',
      })
      .lean();

    // Return comments with pagination details if limit is provided
    if (page && limit) {
      return {
        total: totalDocuments,
        page,
        limit,
        data: comments,
      };
    }

    // Return comments without pagination details if no pagination is applied
    return {
      total: totalDocuments,
      data: comments,
    };
  }

  // Find a specific comment by ID
  async findOne(commentId: string): Promise<Comment> {
    const comment = await this.commentModel.findById(commentId);
    if (!comment) {
      throw new NotFoundException('Comment not found.');
    }
    return comment;
  }

  // Update a comment (only the comment creator can update)
  async update(
    commentId: string,
    updateCommentDto: UpdateCommentDto,
    currentUserId: string // Pass the current authenticated user's ID here
  ): Promise<Comment> {
    const comment = await this.commentModel.findById(commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found.');
    }

    // Check if the current user is the creator of the comment
    if (comment.investorId.toString() !== currentUserId) {
      throw new ForbiddenException(
        'You are not authorized to update this comment.'
      );
    }

    // Update the comment if the user is the owner
    Object.assign(comment, updateCommentDto);

    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: currentUserId,
        action: LogActions.UPDATE,
        entity: LogEntity.COMMENT,
        entityId: commentId,
      });
    } catch {}
    return comment.save();
  }

  // Soft delete a comment
  async softDelete(commentId: string, currentUserId: string): Promise<Comment> {
    const comment = await this.commentModel.findById(commentId);

    if (!comment) {
      throw new NotFoundException('Comment not found.');
    }

    // Ensure that the current user is the creator of the comment
    if (comment.investorId.toString() !== currentUserId) {
      throw new ForbiddenException(
        'You are not authorized to delete this comment.'
      );
    }

    comment.isDeleted = true;

    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: currentUserId,
        action: LogActions.DELETE,
        entity: LogEntity.COMMENT,
        entityId: commentId,
      });
    } catch {}

    return comment.save();
  }

  // Approve or reject a comment
  async changeApprovalStatus(
    commentId: string,
    status: ApprovalStatus,
    userId?: string //used for Activity Log Purposes only
  ): Promise<Comment> {
    const updatedComment = await this.commentModel.findByIdAndUpdate(
      commentId,
      { approvalStatus: status },
      { new: true } // Return the updated document
    );
    if (!updatedComment) {
      throw new NotFoundException('Comment not found.');
    }
    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: userId,
        action: LogActions.APPROVAL_STATUS,
        entity: LogEntity.COMMENT,
        entityId: commentId,
      });
    } catch {}
    return updatedComment;
  }

  async getUserDealsAndComments(
    userId: string,
    page?: number,
    limit?: number,
    approvalStatus?: ApprovalStatus
  ) {
    // Step 1: Use the findAll method from the DealService to get all deals for the user
    const dealResult = await this.dealService.findAll({
      fundManager: userId,
    });

    const deals = dealResult.data;
    if (!deals.length) {
      // If no deals are found, return an empty response
      return {
        comments: [],
        currentPage: null,
        totalPages: 0,
        totalComments: 0,
      };
    }

    // Step 2: Extract dealIds from the deals
    const dealIds = deals.map(deal => deal._id);
    let filter: any = {
      dealId: { $in: dealIds },
      isDeleted: false,
    };
    if (approvalStatus) {
      filter.approvalStatus = approvalStatus;
    }

    // Step 3: Fetch total number of comments (for pagination purposes)
    const totalComments = await this.commentModel.countDocuments(filter).exec();

    // Step 4: Apply pagination logic if page and limit are provided
    const currentPage = page || 1; // Default to page 1 if not provided
    const perPage = limit || 10; // Default to 10 comments per page if not provided
    const skip = (currentPage - 1) * perPage;

    // Step 5: Fetch comments for the deals with optional pagination
    const commentsQuery = this.commentModel
      .find(filter) // Find comments by dealIds
      .populate('dealId', 'dealName lookupCode investmentType raiseAmount') // Populate deal information
      .populate('investorId', 'name email');

    if (limit) {
      commentsQuery.skip(skip).limit(perPage); // Apply skip and limit if limit is provided
    }

    const comments = await commentsQuery.exec();

    // Step 6: Calculate total pages for pagination
    const totalPages = limit ? Math.ceil(totalComments / perPage) : 1;

    return {
      comments,
      currentPage,
      totalPages,
      totalComments,
    };
  }
}
