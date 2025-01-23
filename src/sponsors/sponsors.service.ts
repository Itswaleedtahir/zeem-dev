import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sponsor } from '../schemas/sponsors.schema';
import { CreateSponsorDto, UpdateSponsorDto } from './sponsors.dto';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { LogActions, LogEntity } from 'src/schemas/activity-log.schema';

@Injectable()
export class SponsorsService {
  constructor(
    @InjectModel(Sponsor.name) private sponsorModel: Model<Sponsor>,
    private readonly activityLogService: ActivityLogService
  ) {}

  // Create a new sponsor
  async create(createSponsorDto: CreateSponsorDto): Promise<Sponsor> {
    const createdSponsor = new this.sponsorModel(createSponsorDto);
    try {
      // Log the activity
      try {
        await this.activityLogService.logActivity({
          userId: createSponsorDto.fundManager,
          action: LogActions.CREATE,
          entity: LogEntity.SPONSOR,
          entityId: createdSponsor._id.toString(),
        });
      } catch {}
      return await createdSponsor.save();
    } catch (error) {
      if (error.code === 11000) {
        // Handle duplicate key error
        throw new ConflictException('Sponsor with this email already exists.');
      }
      throw error; // Re-throw any other errors
    }
  }

  // Find all sponsors with optional pagination
  async findAll(
    page?: number,
    limit?: number,
    fundManagerId?: string
  ): Promise<{ data: Sponsor[]; total: number }> {
    let sponsorsQuery = this.sponsorModel
      .find({ isDeleted: false, fundManager: fundManagerId })
      .populate('fundManager', 'name company email');

    if (page && limit) {
      const skip = (page - 1) * limit;
      sponsorsQuery = sponsorsQuery.skip(skip).limit(limit);
    }
    const sponsors = await sponsorsQuery.exec();

    const total = await this.sponsorModel.countDocuments({
      isDeleted: false,
      fundManager: fundManagerId,
    });

    return { data: sponsors, total };
  }

  // Find a single sponsor by ID
  async findOne(id: string): Promise<Sponsor> {
    const sponsor = await this.sponsorModel
      .findOne({ _id: id, isDeleted: false })
      .populate('fundManager', 'name company email')
      .exec();
    if (!sponsor) {
      throw new NotFoundException(`Sponsor with ID ${id} not found`);
    }
    return sponsor;
  }

  // Update a sponsor by ID
  async update(
    id: string,
    updateSponsorDto: UpdateSponsorDto
  ): Promise<Sponsor> {
    const updatedSponsor = await this.sponsorModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, updateSponsorDto, {
        new: true,
      })
      .populate('fundManager', 'name company email')
      .exec();
    if (!updatedSponsor) {
      throw new NotFoundException(`Sponsor with ID ${id} not found`);
    }

    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: updatedSponsor.fundManager.toString(),
        action: LogActions.UPDATE,
        entity: LogEntity.SPONSOR,
        entityId: updatedSponsor._id.toString(),
      });
    } catch {}

    return updatedSponsor;
  }

  // Soft delete a sponsor by setting isDeleted to true
  async remove(id: string): Promise<Sponsor> {
    const sponsor = await this.findOne(id);
    if (sponsor) {
      sponsor.isDeleted = true;

      // Log the activity
      try {
        await this.activityLogService.logActivity({
          userId: sponsor.fundManager.toString(),
          action: LogActions.DELETE,
          entity: LogEntity.SPONSOR,
          entityId: sponsor._id.toString(),
        });
      } catch {}

      return sponsor.save();
    }
    throw new NotFoundException(`Sponsor with ID ${id} not found`);
  }

  // Restore a soft-deleted sponsor by setting isDeleted to false
  async restore(id: string): Promise<Sponsor> {
    const sponsor = await this.sponsorModel
      .findOne({ _id: id, isDeleted: true })
      .exec();
    if (!sponsor) {
      throw new NotFoundException(
        `Sponsor with ID ${id} not found or is not deleted`
      );
    }
    sponsor.isDeleted = false;

    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: sponsor.fundManager.toString(),
        action: LogActions.RESTORE,
        entity: LogEntity.SPONSOR,
        entityId: sponsor._id.toString(),
      });
    } catch {}

    return sponsor.save();
  }

  // Find all sponsors with optional pagination
  async findAllDeleted(
    page?: number,
    limit?: number,
    fundManagerId?: string
  ): Promise<{ data: Sponsor[]; total: number }> {
    let sponsorsQuery = this.sponsorModel
      .find({ isDeleted: true, fundManager: fundManagerId })
      .populate('fundManager', 'name company email');

    if (page && limit) {
      const skip = (page - 1) * limit;
      sponsorsQuery = sponsorsQuery.skip(skip).limit(limit);
    }

    const sponsors = await sponsorsQuery.exec();
    const total = await this.sponsorModel.countDocuments({
      isDeleted: true,
      fundManager: fundManagerId,
    });

    return { data: sponsors, total };
  }
}
