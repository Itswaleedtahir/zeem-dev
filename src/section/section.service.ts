import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Section } from '../schemas/section.schema';
import { Types } from 'mongoose';
import { CreateSectionDto, UpdateSectionDto } from './section.dto';
import { LogActions, LogEntity } from 'src/schemas/activity-log.schema';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class SectionService {
  constructor(
    @InjectModel(Section.name) private sectionModel: Model<Section>,
    private readonly activityLogService: ActivityLogService
  ) {}

  // Create a new section
  async create(createSectionDto: CreateSectionDto): Promise<Section> {
    const userId = new Types.ObjectId(createSectionDto.userId);
    const dealId = new Types.ObjectId(createSectionDto.dealId);
    const newSection = new this.sectionModel({
      ...createSectionDto,
      userId,
      dealId,
    });
    try {
      await this.activityLogService.logActivity({
        userId: createSectionDto.userId,
        action: LogActions.CREATE,
        entity: LogEntity.SECTION,
        entityId: newSection._id.toString(),
      });
    } catch {}
    return newSection.save();
  }

  async findAll(
    dealId: string,
    page?: number,
    limit?: number,
    searchTerm?: string, // Optional search term for the 'section' field
    sortByCreatedAt?: string // Optional sort order for createdAt
  ): Promise<{
    data: Section[];
    totalDocuments?: number;
    page?: number;
    limit?: number;
  }> {
    const query: any = {
      dealId: new Types.ObjectId(dealId),
    };

    if (searchTerm) {
      query.section = { $regex: searchTerm, $options: 'i' };
    }
    let mongooseQuery = this.sectionModel.find(query);
    if (sortByCreatedAt) {
      mongooseQuery = mongooseQuery.sort({
        createdAt: sortByCreatedAt === 'asc' ? 1 : -1,
      });
    }

    let totalDocuments = 0;
    if (page && limit) {
      totalDocuments = await this.sectionModel.countDocuments(query).exec();
      const skip = (page - 1) * limit;
      mongooseQuery = mongooseQuery.skip(skip).limit(limit);
    }
    console.log('mongooseQuery: ', mongooseQuery);

    const data = await mongooseQuery
      .populate('userId', 'name email role')
      .exec();

    if (page && limit) {
      return { data, totalDocuments, page, limit };
    }

    return { data };
  }

  // Find a section by ID
  async findOne(id: string): Promise<Section> {
    const section = await this.sectionModel
      .findById(id)
      .populate('userId', 'name email role')
      .exec();
    if (!section) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }
    return section;
  }

  // Update a section by ID
  async update(
    id: string,
    updateSectionDto: UpdateSectionDto
  ): Promise<Section> {
    const updatedSection = await this.sectionModel
      .findByIdAndUpdate(id, updateSectionDto, { new: true })
      .exec();
    if (!updatedSection) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }
    try {
      await this.activityLogService.logActivity({
        userId: updatedSection.userId.toString(),
        action: LogActions.UPDATE,
        entity: LogEntity.SECTION,
        entityId: updatedSection._id.toString(),
      });
    } catch {}
    return updatedSection;
  }

  // Delete a section by ID
  async remove(id: string): Promise<Section> {
    const deletedSection = await this.sectionModel.findByIdAndDelete(id).exec();
    if (!deletedSection) {
      throw new NotFoundException(`Section with ID ${id} not found`);
    }
    try {
      await this.activityLogService.logActivity({
        userId: deletedSection.userId.toString(),
        action: LogActions.DELETE,
        entity: LogEntity.SECTION,
        entityId: deletedSection._id.toString(),
      });
    } catch {}
    return deletedSection;
  }
}
