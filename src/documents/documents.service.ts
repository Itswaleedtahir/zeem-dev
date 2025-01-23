import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentEntity, DocumentType } from '../schemas/document.schema';
import { dynamicFileUpload, deleteFile } from '../utils/upload.utils'; // Adjust the path as necessary
import { CreateDealDocumentDto, CreateDocumentDto } from './documents.dto';
import { Types } from 'mongoose';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { LogActions, LogEntity } from 'src/schemas/activity-log.schema';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentEntity.name)
    private documentModel: Model<DocumentEntity>,
    private readonly activityLogService: ActivityLogService
  ) {}

  async getStandardizedFileType(extension: string) {
    extension = extension.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg'];
    const videoExtensions = ['mp4', 'mov', 'avi', 'wmv', 'mkv', 'flv'];
    const audioExtensions = ['mp3', 'wav', 'aac', 'ogg', 'flac', 'm4a'];
    const documentExtensions = [
      'pdf',
      'doc',
      'docx',
      'xls',
      'xlsx',
      'ppt',
      'pptx',
      'txt',
      'csv',
      'odt',
    ];
    if (imageExtensions.includes(extension)) return 'image';
    if (videoExtensions.includes(extension)) return 'video';
    if (audioExtensions.includes(extension)) return 'audio';
    if (documentExtensions.includes(extension)) return 'document';
    return 'other';
  }

  async addDocument(
    file: Express.Multer.File,
    createDocumentDto: CreateDocumentDto
  ): Promise<DocumentEntity> {
    const userId = new Types.ObjectId(createDocumentDto.userId);
    const fileType = await this.getStandardizedFileType(
      file.originalname.split('.').pop()
    );

    const { filePath, fileUrl, message } = await dynamicFileUpload(file);

    const newDocument = new this.documentModel({
      ...createDocumentDto,
      userId,
      path: filePath,
      url: fileUrl,
      type: fileType,
    });

    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: createDocumentDto.userId,
        action: LogActions.UPLOAD_USER_DOCUMENT,
        entity: LogEntity.DOCUMENT,
        entityId: newDocument._id.toString(),
      });
    } catch {}

    return newDocument.save();
  }

  async deleteDocument(id: string): Promise<{ message: string }> {
    const document = await this.documentModel.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: document.userId.toString(),
        action: LogActions.DELETE,
        entity: LogEntity.DOCUMENT,
        entityId: null,
      });
    } catch {}

    await deleteFile(document.path);

    await document.deleteOne();

    return { message: 'Document deleted successfully' };
  }

  async getDocumentById(id: string): Promise<DocumentEntity> {
    const document = await this.documentModel
      .findById(id)
      .populate('userId', 'name email role')
      .populate('sectionId', 'section')
      .exec();

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }
    return document;
  }

  async getDocumentsByUserId(userId: string): Promise<DocumentEntity[]> {
    const documents = await this.documentModel
      .find({
        userId: new Types.ObjectId(userId),
        documentType: DocumentType.PROFILE,
      })
      .populate('userId', 'name email role') // Populate userId with selected fields
      .exec();

    if (!documents || documents.length === 0) {
      throw new NotFoundException(
        `No documents found for user with ID ${userId}`
      );
    }
    return documents;
  }

  async addDealDocument(
    file: Express.Multer.File,
    createDealDocumentDto: CreateDealDocumentDto
  ): Promise<DocumentEntity> {
    const userId = new Types.ObjectId(createDealDocumentDto.userId);
    const dealId = new Types.ObjectId(createDealDocumentDto.dealId);
    const sectionId = new Types.ObjectId(createDealDocumentDto.sectionId);
    const fileType = await this.getStandardizedFileType(
      file.originalname.split('.').pop()
    );

    const { filePath, fileUrl, message } = await dynamicFileUpload(file);

    const newDocument = new this.documentModel({
      ...createDealDocumentDto,
      userId,
      dealId,
      sectionId,
      path: filePath,
      url: fileUrl,
      type: fileType,
    });

    // Log the activity
    try {
      await this.activityLogService.logActivity({
        userId: createDealDocumentDto.userId,
        action: LogActions.UPLOAD_DEAL_DOCUMENT,
        entity: LogEntity.DOCUMENT,
        entityId: newDocument._id.toString(),
      });
    } catch {}

    return newDocument.save();
  }

  //simple api for getting a list of all the documents
  // async getDocumentsByDealId(dealId: string): Promise<DocumentEntity[]> {
  //   const documents = await this.documentModel
  //     .find({
  //       dealId: new Types.ObjectId(dealId),
  //       documentType: DocumentType.DEAL,
  //     })
  //     .populate('userId', 'name email role')
  //     .populate('sectionId', 'section')
  //     .exec();

  //   if (!documents || documents.length === 0) {
  //     throw new NotFoundException(
  //       `No documents found for user with DEAL ID ${dealId}`
  //     );
  //   }
  //   return documents;
  // }

  async getDocumentsByDealId(dealId: string): Promise<any> {
    const documents = await this.documentModel
      .find({
        dealId: new Types.ObjectId(dealId),
        documentType: DocumentType.DEAL,
      })
      .populate('userId', 'name email role')
      .populate('sectionId', 'section')
      .exec();

    if (!documents || documents.length === 0) {
      throw new NotFoundException(`No documents found for DEAL ID ${dealId}`);
    }

    // Group documents by sectionId
    const groupedDocuments = documents.reduce((result, document) => {
      // Convert sectionId to string to avoid ObjectId issues
      const sectionId = document.sectionId?._id?.toString() || 'null';
      const sectionName =
        document.sectionId &&
        typeof document.sectionId === 'object' &&
        'section' in document.sectionId
          ? document.sectionId.section
          : 'No Section';

      // If sectionId group doesn't exist, initialize it
      if (!result[sectionId]) {
        result[sectionId] = {
          sectionId,
          sectionName,
          documents: [],
        };
      }

      // Add the document to the respective sectionId group
      result[sectionId].documents.push(document);
      return result;
    }, {});

    // Convert groupedDocuments from object to array format
    const groupedArray = Object.values(groupedDocuments);

    return groupedArray;
  }

  async searchDocuments(
    documentType: DocumentType,
    searchTerm: string,
    userId: string
  ): Promise<DocumentEntity[]> {
    return this.documentModel
      .find({
        documentType: documentType,
        userId: new Types.ObjectId(userId),
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } }, // Case-insensitive search on title
          { keywords: { $regex: searchTerm, $options: 'i' } }, // Case-insensitive search on keywords
        ],
      })
      .exec();
  }
}
