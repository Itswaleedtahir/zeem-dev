import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsMongoId,
  IsEnum,
} from 'class-validator';
import { LogActions, LogEntity } from 'src/schemas/activity-log.schema';

export class CreateActivityLogDto {
  @IsNotEmpty()
  @IsMongoId({ message: 'Invalid userId format' })
  readonly userId: string;

  @IsOptional()
  @IsMongoId({ message: 'Invalid dealId format' })
  readonly dealId?: string;

  @IsNotEmpty({ message: 'Action is required' })
  @IsEnum(LogActions, {
    message: `Action must be one of: ${Object.values(LogActions).join(', ')}`,
  })
  readonly action: LogActions;

  @IsOptional()
  @IsEnum(LogEntity, {
    message: `Entity must be one of: ${Object.values(LogEntity).join(', ')}`,
  })
  readonly entity?: LogEntity;

  @IsOptional()
  @IsMongoId({ message: 'Invalid entityId format' })
  readonly entityId?: string;
}
