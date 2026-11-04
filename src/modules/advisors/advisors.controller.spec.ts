import { Test, TestingModule } from '@nestjs/testing';
import { AdvisorsController } from './advisors.controller';

describe('AdvisorsController', () => {
  let controller: AdvisorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdvisorsController],
    }).compile();

    controller = module.get<AdvisorsController>(AdvisorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
