import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateDealDisclosureDto,
  CreateDealDto,
  UpdateDealDto,
} from './deals.dto';
import { Deal } from 'src/schemas/deals.schema';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { LogActions, LogEntity } from 'src/schemas/activity-log.schema';
import {
  DealDisclosure,
  SoftCommitEnum,
  StatusEnum,
} from 'src/schemas/dealDisclosure.schema';

@Injectable()
export class DealsService {
  constructor(
    @InjectModel(Deal.name) private dealModel: Model<Deal>,
    @InjectModel(DealDisclosure.name)
    private dealDisclosureModel: Model<DealDisclosure>,
    private readonly activityLogService: ActivityLogService
  ) {}

  async create(createDealDto: CreateDealDto): Promise<Deal> {
    const deal = new this.dealModel(createDealDto);
    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: createDealDto.fundManager,
        action: LogActions.CREATE,
        entity: LogEntity.DEALS,
        entityId: deal._id.toString(),
      });
    } catch {}
    return await deal.save();
  }

  async findAll({
    page = 1,
    limit = 10,
    fundManager,
    isDeleted = false,
    isInvestment = false,
    searchTerm,
    sortByCreatedAt,
  }: {
    page?: number;
    limit?: number;
    fundManager?: string;
    isDeleted?: boolean;
    isInvestment?: boolean;
    searchTerm?: string;
    sortByCreatedAt?: string;
  }) {
    const filter: any = {};

    if (fundManager) {
      filter['fundManager'] = fundManager;
    }
    if (isInvestment) {
      filter['isInvestment'] = true;
    } else {
      filter['isInvestment'] = false;
    }
    filter['isDeleted'] = isDeleted;
    if (searchTerm) {
      filter.$or = [
        { dealName: { $regex: searchTerm, $options: 'i' } },
        { address1: { $regex: searchTerm, $options: 'i' } },
      ];
    }

    // Initialize Mongoose query
    let mongooseQuery = this.dealModel
      .find(filter)
      .populate('sponsorId', 'name description email contactNumber')
      .populate('fundManager', 'name company email');

    // Sort by createdAt (ascending or descending)
    if (sortByCreatedAt) {
      mongooseQuery = mongooseQuery.sort({
        createdAt: sortByCreatedAt === 'asc' ? 1 : -1,
      });
    }

    // Pagination logic (only apply if page and limit are provided)
    let totalDocuments = 0;
    console.log('page: ', page);
    console.log('limit: ', limit);

    if (page && limit) {
      totalDocuments = await this.dealModel.countDocuments(filter).exec();
      const skip = (page - 1) * limit;
      mongooseQuery = mongooseQuery.skip(skip).limit(limit);
    }

    // Execute the query to fetch the deals
    const deals = await mongooseQuery.exec();

    // Return data along with pagination info if page and limit are set
    if (page && limit) {
      return { data: deals, totalDocuments, page, limit };
    }

    // Return data without pagination info if no pagination is applied
    return { data: deals };
  }

  // async findOne(id: string): Promise<Deal> {
  async findOne(id: string): Promise<Deal> {
    const deal = await this.dealModel
      .findById(id)
      .populate('sponsorId', 'name description email contactNumber')
      .populate('fundManager', 'name company email')
      .exec();
    if (!deal || deal.isDeleted) {
      throw new NotFoundException('Deal not found');
    }
    return deal;
  }

  async update(id: string, updateDealDto: UpdateDealDto): Promise<Deal> {
    const updatedDeal = await this.dealModel
      .findByIdAndUpdate(id, updateDealDto, { new: true })
      .populate('sponsorId', 'name description email contactNumber')
      .populate('fundManager', 'name company email')
      .exec();
    if (!updatedDeal || updatedDeal.isDeleted) {
      throw new NotFoundException('Deal not found');
    }
    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: updatedDeal.fundManager._id.toString(),
        action: LogActions.UPDATE,
        entity: LogEntity.DEALS,
        entityId: id,
      });
    } catch {}
    return updatedDeal;
  }

  async softDelete(id: string): Promise<Deal> {
    const deletedDeal = await this.dealModel
      .findByIdAndUpdate(id, { isDeleted: true }, { new: true })
      .exec();
    if (!deletedDeal) {
      throw new NotFoundException('Deal not found');
    }
    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: deletedDeal.fundManager.toString(),
        action: LogActions.DELETE,
        entity: LogEntity.DEALS,
        entityId: id,
      });
    } catch {}
    return deletedDeal;
  }

  async addImageUrl(
    id: string,
    image: { path: string; url: string }
  ): Promise<Deal> {
    const deal = await this.dealModel
      .findById(id)
      .populate('sponsorId', 'name description email contactNumber')
      .populate('fundManager', 'name company email')
      .exec();
    if (!deal || deal.isDeleted) {
      throw new NotFoundException('Deal not found');
    }

    deal.imagesUrl.push(image);

    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: deal.fundManager._id.toString(),
        action: LogActions.UPLOAD_DEAL_IMAGE,
        entity: LogEntity.DEALS,
        entityId: id,
      });
    } catch {}
    return await deal.save();
  }

  async saveDealDisclosure(
    data: CreateDealDisclosureDto
  ): Promise<DealDisclosure> {
    if (!data || typeof data !== 'object') {
      throw new BadRequestException(
        'Invalid input: data must be a non-empty object.'
      );
    }

    const requiredFields = [
      'dealId',
      'documentUrl',
      'documentType',
      'investorDetails',
    ];
    requiredFields.forEach(field => {
      if (!data[field]) {
        throw new BadRequestException(`Missing required field: ${field}`);
      }
    });

    if (
      !Array.isArray(data.investorDetails) ||
      data.investorDetails.length === 0
    ) {
      throw new BadRequestException(
        'investorDetails must be a non-empty array of investor objects.'
      );
    }

    for (let i = 0; i < data.investorDetails.length; i++) {
      const investor = data.investorDetails[i];
      if (!investor.investorId) {
        throw new BadRequestException(
          `Investor at index ${i} is missing 'investorId'.`
        );
      }
      if (!investor.softCommit) {
        throw new BadRequestException(
          `Investor at index ${i} is missing 'softCommit'.`
        );
      }
      if (!investor.status) {
        throw new BadRequestException(
          `Investor at index ${i} is missing 'status'.`
        );
      }
    }

    console.log('Received data for saving:', JSON.stringify(data, null, 2));

    const dealDisclosureDocument = new this.dealDisclosureModel({
      dealId: data.dealId,
      documentUrl: data.documentUrl,
      documentType: data.documentType,
      investorDetails: data.investorDetails.map(investor => ({
        investorId: investor.investorId,
        softCommit: investor.softCommit,
        status: investor.status,
        viewDocument: investor.viewDocument || false, // Default false if not provided
        documentType: investor.documentType,
      })),
    });

    console.log(
      'Prepared DealDisclosure document for saving:',
      JSON.stringify(dealDisclosureDocument, null, 2)
    );

    try {
      const savedDocument = await dealDisclosureDocument.save();

      console.log(
        'Successfully saved DealDisclosure:',
        JSON.stringify(savedDocument, null, 2)
      );

      return savedDocument;
    } catch (error) {
      console.error(
        'Error while saving DealDisclosure document:',
        error.message
      );
      throw new InternalServerErrorException(
        'An error occurred while saving the DealDisclosure document to the database.'
      );
    }
  }

  async getAllDealDisclosures(
    page: number = 1,
    limit: number = 10
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    data: DealDisclosure[];
  }> {
    page = Number(page) || 1;
    limit = Number(limit) || 10;

    if (page < 1 || limit < 1) {
      throw new BadRequestException(
        'Page and limit must be positive integers.'
      );
    }

    const skip = (page - 1) * limit;

    const total = await this.dealDisclosureModel.countDocuments();

    const data = await this.dealDisclosureModel
      .find({ isDeleted: false })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    return {
      total,
      page,
      limit,
      data,
    };
  }

  async searchInvestorDetails(
    dealId: string,
    status?: string,
    softCommit?: string
  ): Promise<any> {
    if (!dealId) {
      throw new BadRequestException('dealId is required');
    }

    // Build the query filter dynamically
    const investorFilter: any[] = [];
    if (status) investorFilter.push({ $eq: ['$$investor.status', status] });
    if (softCommit)
      investorFilter.push({ $eq: ['$$investor.softCommit', softCommit] });

    // Aggregation pipeline
    const pipeline: any[] = [
      {
        $match: {
          dealId: dealId, // Match by dealId
          isDeleted: false, // Exclude soft-deleted records
        },
      },
      {
        $project: {
          _id: 1,
          dealId: 1,
          documentUrl: 1,
          documentType: 1,
          investorDetails: {
            $filter: {
              input: '$investorDetails',
              as: 'investor',
              cond:
                investorFilter.length > 0
                  ? { $and: investorFilter }
                  : { $literal: true },
              // If no filters are provided, return all investorDetails
            },
          },
        },
      },
      {
        $match: {
          'investorDetails.0': { $exists: true }, // Ensure investorDetails array has at least one item
        },
      },
    ];

    // Execute the aggregation pipeline
    const results = await this.dealDisclosureModel.aggregate(pipeline);

    if (!results || results.length === 0) {
      throw new NotFoundException(
        'No matching investor details found for the given criteria'
      );
    }

    return results;
  }

  async updateInvestorDetails(
    investorId: string,
    status?: StatusEnum,
    viewDocument?: boolean,
    softCommit?: SoftCommitEnum
  ): Promise<any> {
    if (!investorId) {
      throw new BadRequestException('investorId is required.');
    }

    // Dynamically build the $set object
    const updateFields: any = {};
    if (status !== undefined)
      updateFields['investorDetails.$[elem].status'] = status;
    if (viewDocument !== undefined)
      updateFields['investorDetails.$[elem].viewDocument'] = viewDocument;
    if (softCommit !== undefined)
      updateFields['investorDetails.$[elem].softCommit'] = softCommit;

    if (Object.keys(updateFields).length === 0) {
      throw new BadRequestException(
        'At least one field (status, viewDocument, softCommit) must be provided.'
      );
    }

    // Perform the update
    const updatedDocument = await this.dealDisclosureModel.findOneAndUpdate(
      { 'investorDetails.investorId': investorId }, // Match document containing the investorId
      { $set: updateFields }, // Update only provided fields
      {
        arrayFilters: [{ 'elem.investorId': investorId }], // Target the specific investorDetails
        new: true, // Return the updated document
        runValidators: true, // Ensure schema validation
      }
    );

    if (!updatedDocument) {
      throw new NotFoundException(
        `No record found for investorId: ${investorId}`
      );
    }

    return {
      message: 'Investor details updated successfully',
      updatedDocument,
    };
  }
}
