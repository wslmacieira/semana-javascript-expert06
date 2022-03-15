import { describe, test, jest, expect, beforeEach } from  '@jest/globals'
import fs from  'fs'
import fsPromises from 'fs/promises';
import { join, extname } from 'path';
import { Service } from '../../../server/service.js'
import TestUtil from '../_util/testUtil.js'
import config from '../../../server/config.js';

const {
  dir: {
    publicDirectory
  }
} = config

let service = new Service();

describe('#Service - test suite for api response', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('createFileStream - should return a read stream', async () => {
    const mockFileStream = TestUtil.generateReadableStream(['data']);
    const filename = '/index.html'

    jest.spyOn(
      fs,
      fs.createReadStream.name
      ).mockResolvedValue(mockFileStream);

      service.createFileStream(filename)

    expect(fs.createReadStream).toBeCalledWith(filename)
  });

  test('getFileInfo - should return a type and name', async () => {
    const file = '/index.html'
    const fullFilepath =  join(publicDirectory, file)
    const fileType = extname(fullFilepath);

    jest.spyOn(
      fsPromises,
      fsPromises.access.name
      ).mockResolvedValue({
        type: fileType,
        name: fullFilepath
      });

      await service.getFileInfo(file)

    expect(fsPromises.access).toBeCalledWith(fullFilepath)
  });

  test('getFileStream - should return a stream and type', async () => {
    const file = '/index.html'
    const mockFileStream = TestUtil.generateReadableStream(['data']);
    const fullFilepath =  join(publicDirectory, file)
    const fileType = extname(fullFilepath);

    jest.spyOn(
      service,
      service.getFileInfo.name
      ).mockResolvedValue({
        type: fileType,
        name: fullFilepath
      });

      jest.spyOn(
        service,
        service.createFileStream.name
        ).mockResolvedValue(mockFileStream);

      await service.getFileStream(file)

    expect(service.getFileInfo).toBeCalledWith(file)
  })
})