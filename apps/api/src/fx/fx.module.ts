import { Module } from '@nestjs/common';
import { FxController } from './fx.controller';
import { FxRateService } from './fx.service';

@Module({
  controllers: [FxController],
  providers: [FxRateService],
  exports: [FxRateService],
})
export class FxModule {}
