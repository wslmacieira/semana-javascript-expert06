import { describe, test, jest, expect, beforeEach } from  '@jest/globals'
import { Controller } from '../../../server/controller.js'
import { Service } from '../../../server/service.js'
import TestUtil from '../_util/testUtil.js'
import config from '../../../server/config.js';

const { pages } = config;


describe('#Controller - test suite for api response', () => {
  const controller = new Controller();
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('#getFileStream - should return a fileStream', async () => {
    const mockFileStream = TestUtil.generateReadableStream(['data']);
    const mockType = '.html';

    jest.spyOn(
      Service.prototype,
      Service.prototype.getFileStream.name
      ).mockResolvedValue({
        stream: mockFileStream,
        type: mockType
      })

    const { stream, type } = await controller.getFileStream(pages.homeHTML)

    expect(stream).toStrictEqual(mockFileStream)
    expect(type).toStrictEqual(mockType)
  });

  test('#createClientStream', async () => {
    const mockStream = TestUtil.generateReadableStream(['test'])
    const mockId = '1'
    jest.spyOn(
      Service.prototype,
      Service.prototype.createClientStream.name,
    ).mockReturnValue({
      id: mockId,
      clientStream: mockStream
    })

    jest.spyOn(
      Service.prototype,
      Service.prototype.removeClientStream.name,
    ).mockReturnValue()

    const {
      stream,
      onClose
    } = controller.createClientStream()

    onClose()

    expect(stream).toStrictEqual(mockStream)
    expect(Service.prototype.removeClientStream).toHaveBeenCalledWith(mockId)
    expect(Service.prototype.createClientStream).toHaveBeenCalled()
  });

  describe('handleCommand', () => {
    const controller = new Controller();
    const data = { command: 'stop' };

    test('command stop', async () => {
      jest.spyOn(
        Service.prototype,
        Service.prototype.stopStreaming.name,
        ).mockResolvedValue()

      const result = await controller.handleCommand(data);
      expect(result).toStrictEqual({
        result: 'ok'
      })
      expect(Service.prototype.stopStreaming).toHaveBeenCalled()
    })

    test('command start', async () => {
      jest.spyOn(
        Service.prototype,
        Service.prototype.startStreaming.name,
      ).mockResolvedValue()

      const data = {
        command: 'start'
      }
      const result = await controller.handleCommand(data)
      expect(result).toStrictEqual({
        result: 'ok'
      })
      expect(Service.prototype.startStreaming).toHaveBeenCalled()
    })

    test('non existing command', async () => {
      jest.spyOn(
        Service.prototype,
        Service.prototype.startStreaming.name,
      ).mockResolvedValue()

      const data = {
        command: 'NON EXISTING'
      }
      const result = await controller.handleCommand(data)
      expect(result).toStrictEqual({
        result: 'ok'
      })
      expect(Service.prototype.startStreaming).not.toHaveBeenCalled()
    });
  })
})