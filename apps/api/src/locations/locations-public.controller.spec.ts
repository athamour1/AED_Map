import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LocationsPublicController } from './locations-public.controller';
import { PrismaService } from '../prisma/prisma.service';

interface QueryArgs {
  select?: Record<string, unknown>;
  include?: unknown;
}

// Structural regression guard for the public/private data boundary (see plan §4):
// the public controller must never select or return the `devices` relation.
describe('LocationsPublicController', () => {
  let controller: LocationsPublicController;
  let prisma: {
    location: {
      findMany: jest.Mock<Promise<unknown>, [QueryArgs]>;
      findUnique: jest.Mock<Promise<unknown>, [QueryArgs]>;
    };
  };

  beforeEach(async () => {
    prisma = {
      location: {
        findMany: jest
          .fn<Promise<unknown>, [QueryArgs]>()
          .mockResolvedValue([{ id: '1', name: 'Test AED' }]),
        findUnique: jest
          .fn<Promise<unknown>, [QueryArgs]>()
          .mockResolvedValue({ id: '1', name: 'Test AED' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationsPublicController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get(LocationsPublicController);
  });

  it('findAll never selects the devices relation', async () => {
    await controller.findAll();
    const [args] = prisma.location.findMany.mock.calls[0];
    expect(args.select).not.toHaveProperty('devices');
    expect(args.include).toBeUndefined();
  });

  it('findOne never selects the devices relation', async () => {
    await controller.findOne('1');
    const [args] = prisma.location.findUnique.mock.calls[0];
    expect(args.select).not.toHaveProperty('devices');
    expect(args.include).toBeUndefined();
  });

  it('findOne throws NotFoundException for a missing location', async () => {
    prisma.location.findUnique.mockResolvedValueOnce(null);
    await expect(controller.findOne('missing')).rejects.toThrow(
      NotFoundException,
    );
  });
});
