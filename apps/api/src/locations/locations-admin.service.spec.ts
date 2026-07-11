import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { LocationsAdminService } from './locations-admin.service';
import { PrismaService } from '../prisma/prisma.service';

function notFoundError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Record not found', {
    code: 'P2025',
    clientVersion: 'test',
  });
}

describe('LocationsAdminService', () => {
  let service: LocationsAdminService;
  let prisma: {
    location: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      location: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsAdminService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(LocationsAdminService);
  });

  it('findAll includes devices (unlike the public controller)', async () => {
    prisma.location.findMany.mockResolvedValue([]);
    await service.findAll();
    const [args] = prisma.location.findMany.mock.calls[0] as [
      { include?: unknown },
    ];
    expect(args.include).toEqual({ devices: true });
  });

  it('findOne throws NotFoundException when the location does not exist', async () => {
    prisma.location.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('update translates a Prisma P2025 into NotFoundException', async () => {
    prisma.location.update.mockRejectedValue(notFoundError());
    await expect(service.update('missing', { name: 'x' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('remove translates a Prisma P2025 into NotFoundException', async () => {
    prisma.location.delete.mockRejectedValue(notFoundError());
    await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
  });

  it('remove rethrows unrelated errors unchanged', async () => {
    const other = new Error('connection lost');
    prisma.location.delete.mockRejectedValue(other);
    await expect(service.remove('id')).rejects.toBe(other);
  });
});
