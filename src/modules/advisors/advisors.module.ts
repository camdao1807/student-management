import { Module } from '@nestjs/common';
import { AdvisorsController } from './advisors.controller';
import { AdvisorsService } from './advisors.service';

@Module({ controllers: [AdvisorsController], providers: [AdvisorsService] })
export class AdvisorsModule {}