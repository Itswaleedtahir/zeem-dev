import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseInterceptors,
  UseGuards,
  Req,
  Put,
  BadRequestException,
} from '@nestjs/common';
import { DealsService } from './deals.service';
import {
  CreateDealDisclosureDto,
  CreateDealDto,
  UpdateDealDto,
  UpdateInvestorDetailsDto,
} from './deals.dto';
import { InjectUserIdInterceptor } from '../middleware/inject-userid.interceptor';
import { JwtAuthGuard } from '../middleware/jwt-auth.guard';
import { Request } from 'express';
import { UsersService } from '../users/users.service';
import { DocumentsService } from '../documents/documents.service';
import { JwtPayload } from '../middleware/jwt-payload.interface';
import { UserRole } from '../schemas/user.schema';
import { FundManagerGuard } from '../middleware/custom.guard';
import {
  DealDisclosure,
  SoftCommitEnum,
  StatusEnum,
} from 'src/schemas/dealDisclosure.schema';

@UseGuards(JwtAuthGuard)
@Controller('deals')
export class DealsController {
  constructor(
    private readonly dealsService: DealsService,
    private readonly usersService: UsersService,
    private readonly documentsService: DocumentsService
  ) {}

  @UseGuards(FundManagerGuard)
  @Post()
  @UseInterceptors(InjectUserIdInterceptor)
  async create(@Body() createDealDto: CreateDealDto) {
    return await this.dealsService.create(createDealDto);
  }

  @Get()
  async findAll(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('fundManager') fundManager?: string,
    @Query('isDeleted') isDeleted: boolean = false,
    @Query('isInvestment') isInvestment: boolean = false,
    @Query('searchTerm') searchTerm?: string,
    @Query('sort') sort?: string
  ) {
    const user = req.user as JwtPayload;

    // Set fundManager based on user role if not provided
    if (!fundManager) {
      if (user.role === UserRole.FUND_MANAGER) {
        fundManager = user.userId;
      } else if (user.role === UserRole.INVESTOR) {
        const investorDetails = await this.usersService.findById(user.userId);
        fundManager = investorDetails.addedBy.toString();
      }
    }

    if (sort || sort == '') {
      sort = sort.toLowerCase();
      if (!['asc', 'desc'].includes(sort)) {
        throw new BadRequestException(
          'Invalid sort order. Use "asc" or "desc"'
        );
      }
    }

    // Call the service method with the new parameters
    return await this.dealsService.findAll({
      page,
      limit,
      fundManager,
      isDeleted,
      isInvestment,
      searchTerm,
      sortByCreatedAt: sort,
    });
  }

  @UseGuards(FundManagerGuard)
  @Put(':id')
  @UseInterceptors(InjectUserIdInterceptor)
  async update(@Param('id') id: string, @Body() updateDealDto: UpdateDealDto) {
    return await this.dealsService.update(id, updateDealDto);
  }

  @Delete(':id')
  async softDelete(@Param('id') id: string) {
    return await this.dealsService.softDelete(id);
  }

  @UseGuards(FundManagerGuard)
  @Put(':id/images')
  async addImageUrl(
    @Param('id') id: string,
    @Body() image: { path: string; url: string }
  ) {
    return await this.dealsService.addImageUrl(id, image);
  }

  @UseGuards(FundManagerGuard)
  @Post('deal-disclosure')
  async createDealDisclosure(
    @Body() data: CreateDealDisclosureDto
  ): Promise<DealDisclosure> {
    return this.dealsService.saveDealDisclosure(data);
  }

  @UseGuards(FundManagerGuard)
  @Get('deal-disclosure')
  async getAllDealDisclosures(
    @Query('page') page: number,
    @Query('limit') limit: number
  ): Promise<{
    total: number;
    page: number;
    limit: number;
    data: DealDisclosure[];
  }> {
    console.log('testing results');
    return this.dealsService.getAllDealDisclosures(page, limit);
  }

  @Get('deal-disclosure/search')
  async searchInvestorDetails(
    @Query('dealId') dealId: string,
    @Query('status') status?: string,
    @Query('softCommit') softCommit?: string
  ) {
    return this.dealsService.searchInvestorDetails(dealId, status, softCommit);
  }

  @Put('deal-disclosure/investor')
  async updateInvestorDetails(
    @Body() updateInvestorDetailsDto: UpdateInvestorDetailsDto
  ) {
    const { investorId, status, softCommit, viewDocument } =
      updateInvestorDetailsDto;

    return this.dealsService.updateInvestorDetails(
      investorId,
      status,
      viewDocument,
      softCommit
    );
  } 

  @Get(':id')
  async findOne(@Param('id') id: string) {
    let documents = {};
    const deal = await this.dealsService.findOne(id);
    try {
      documents = await this.documentsService.getDocumentsByDealId(id);
    } catch (error) {}

    return { deal, documents };
  }
}
