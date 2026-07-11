import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DevicesService } from './devices.service';
import { PrismaService } from '../prisma/prisma.service';

function notFoundError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Record not found', {
    code: 'P2025',
    clientVersion: 'test',
  });
}

describe('DevicesService', () => {
  let service: DevicesService;
  let prisma: {
    device: { create: jest.Mock; update: jest.Mock; delete: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      device: { create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DevicesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(DevicesService);
  });

  it('create converts date-string fields to Date objects and attaches the locationId', async () => {
    prisma.device.create.mockResolvedValue({});
    await service.create('loc-1', {
      serialNumber: 'SN-1',
      batteryExpirationDate: '2027-01-01',
    });

    const [args] = prisma.device.create.mock.calls[0] as [
      { data: Record<string, unknown> },
    ];
    expect(args.data.locationId).toBe('loc-1');
    expect(args.data.batteryExpirationDate).toBeInstanceOf(Date);
  });

  it('update throws NotFoundException for a Prisma P2025', async () => {
    prisma.device.update.mockRejectedValue(notFoundError());
    await expect(service.update('missing', { model: 'x' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('remove throws NotFoundException for a Prisma P2025', async () => {
    prisma.device.delete.mockRejectedValue(notFoundError());
    await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
  });
});
