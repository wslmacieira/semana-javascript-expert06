import { describe, test, jest, expect, beforeEach } from  '@jest/globals'
import { Controller } from '../../../server/controller.js'
import { Service } from '../../../server/service.js'
import TestUtil from '../_util/testUtil.js'
import config from '../../../server/config.js';

const { pages } = config;

let controller = new Controller();

describe('#Controller - test suite for api response', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('getFileStream - should return a fileStream', async () => {
    const mockFileStream = TestUtil.generateReadableStream(['data']);
    const expectedType = '.html';

    jest.spyOn(
      Service.prototype,
      Service.prototype.getFileStream.name
      ).mockResolvedValue({
        stream: mockFileStream,
        type: expectedType
      })

    await controller.getFileStream(pages.homeHTML)

    expect(Service.prototype.getFileStream).toBeCalledWith(pages.homeHTML)
  })
})