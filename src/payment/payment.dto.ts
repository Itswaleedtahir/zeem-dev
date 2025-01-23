import { IsMongoId, IsNotEmpty, IsOptional, IsNumber, IsString, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';


export class CreatePaymentDto {
    @IsMongoId()
    @IsNotEmpty()
    investorId: string;

    @IsMongoId()
    @IsNotEmpty()
    fundManager: string;

}
